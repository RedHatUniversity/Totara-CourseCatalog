/*eslint no-undef: "error"*/
/*eslint-env node*/

/**
 * Retrieves a list of categories, courses, unique category names based on the courses
 * and a guess at the possible mode of delivery for each course.
 */

/*
 TODO
 - Get regions from time zone mapping
 - start end times as moment
 */

let moment            = require('moment'),
    html2json         = require('./../../../../shared/utils/html2json.js').html2json,
    {request}         = require('./Rest'),
    {
      dynamicSortObjArry,
      uniqueArry,
      getParameterString
    }                 = require('./../../../../shared/utils/Toolbox'), // Utilities
    {requestCatalog}  = require('./TotaraLoadCatalog'),
    webserviceConfig, // Obj holds URL and token information
    catalogData,
    wsURL             = '/webservice/rest/server.php',
    deepLinkURL       = '/course/view.php?id=',
    privateStr        = '(PRIVATE)',
    classFields       = ['Delivery&nbsp;Mode', 'Region', 'Country', 'City', 'Private', 'Class&nbsp;date/time', 'Duration', 'Room'],
    classFieldsKey    = ['mod', 'region', 'country', 'city', 'private', 'schedule', 'duration', 'room'],
    zoneRegionMap     = [{region: 'NA', zones: ['New_York']}, {
      region: 'EMEA',
      zones : ['Jerusalem', 'Europe']
    }, {region: 'APAC', zones: ['Asia', 'Australia']}, {
      region: 'LATAM',
      zones : ['San_Paulo']
    }],
    allClasses, // loaded calendar data
    uniqueCourseNames,
    calendar;

/**
 * Loads and cleans the courses.
 *
 * First we need to load the categories. Courses only have an ID for the category.
 * This must be matched to the ID of the category to get the text name for it.
 *
 * wsConfig should contain keys for url, token and courseLinkStem (for generating
 * deep links)
 * @param wsConfig
 * @returns {Promise}
 */
module.exports.requestCalendar = (wsConfig) => {

  webserviceConfig = wsConfig;

  return new Promise((resolve, reject) => {

    // Called first to get the catalog data
    function loadCatalog() {
      console.log('requesting the catalog');
      requestCatalog(wsConfig).then((data) => {
        console.log('Catalog loaded', data);
        catalogData = data;
        requestCalendar();
      }).catch((err) => {
        reject('Error fetching course catalog', err);
      });
    }

    function requestCalendar() {
      console.log('requsting calendar');
      request({
        json: true,
        url : createURL('core_calendar_get_calendar_events')
      }).then((data)=> {
        console.log('Got calendar data ...');
        allClasses = cleanClassData(data);
        console.log('Cleaned ...');
        uniqueCourseNames = uniqueArry(pickClassNames(allClasses));
        console.log('Uniqu\'d ...');
        calendar = organizeCourses(uniqueCourseNames, allClasses);
        console.log('Organized ...');
        resolve({
          classes : allClasses,
          calendar: calendar,
          catalog : catalogData
        });
      }).catch((err)=> {
        reject('Error fetching course calendar', err);
      });
    }

    loadCatalog();

  });
};

function createURL(funct) {
  return webserviceConfig.urlStem + wsURL + '?' + getParameterString({
      wstoken               : webserviceConfig.token,
      wsfunction            : funct,
      'events[eventids][0]' : 1,
      'events[courseids][0]': 0,
      'events[groupids][0]' : 0,
      'options[userevents]' : 0,
      'options[siteevents]' : 1,
      moodlewsrestformat    : 'json'
    });
}

// Cleans up the loaded calendar data, removes courses in any hidden categories
// then sorts them alphabetically by name
function cleanClassData(src) {
  // TODO faster to filter first rather than after
  // remove events with '(PRIVATE)' in the name

  return src.events.reduce((p, c) => {
    let classSchedule = html2json(c.description);
    p.push({
      courseid    : c.courseid,
      eventtype   : c.eventtype,
      format      : c.format,
      groupid     : c.groupid,
      id          : c.id,
      instance    : c.instance,
      uuid        : parseInt(c.uuid),
      fullname    : c.name,
      duration    : formatClassDuration(c.timeduration),
      deeplink    : webserviceConfig.urlStem + deepLinkURL + c.courseid,
      signupLink  : pickSignupLink(classSchedule),
      classDetails: pickDetails(classSchedule),
      datecreated : formatSecondsToDate(c.timecreated),
      datemodified: formatSecondsToDate(c.timemodified),
      startdate   : formatSecondsToDate(c.startdate)
    });
    return p;
  }, [])
    .filter((courseObj) => courseObj.fullname.indexOf(privateStr) < 0)
    .sort(dynamicSortObjArry('fullname'));
}

function pickClassNames(classes) {
  return classes.map((clss) => clss.fullname);
}

function pickSignupLink(obj) {
  return obj.child.reduce((p, c) => {
    if (c.tag === 'a') {
      p = c.attr.href;
    }
    return p;
  }, '');
}

function pickDetails(obj) {
  return obj.child.reduce((p, c) => {
    if (c.tag === 'dl') {
      classFields.forEach((field, i) => {
        p[classFieldsKey[i]] = pickDetailField(field, c.child);
      });
    }
    return p;
  }, {});
}

// Date/time needs to be special
// Room needs to be special
/*
 Look over the dt/dd list and find the data we want
 since a dd is the next element we're getting it with the i+1
 */
function pickDetailField(field, arry) {
  return arry.reduce((p, c, i) => {
    if (c.tag === 'dt') {
      if (c.child[0].text === field) {
        if (field === 'Class&nbsp;date/time') {
          p = convertDateStringToDateObj(arry[i + 1].child[0].text);
        } else if (field === 'Room') {
          // This is a list of spans we need to parse through
          p = {
            room    : arry[i + 1].child[0] ? arry[i + 1].child[0].child[0].text : '',
            building: arry[i + 1].child[1] ? arry[i + 1].child[1].child[0].text : '',
            address : arry[i + 1].child[2] ? arry[i + 1].child[2].child[0].text : ''
          };
        } else {
          // an element that we need to grab text node from
          p = arry[i + 1].child ? arry[i + 1].child[0].text : '';
        }
      }
    }
    return p;
  }, '');
}

// October 17, 2016 - October 18, 2016, 9:00 AM - 5:00 PM America/New_York
function convertDateStringToDateObj(str) {
  let dateRegx  = /\s*(?:(?:jan|feb)?r?(?:uary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|oct(?:ober)?|(?:sept?|nov|dec)(?:ember)?)\s+\d{1,2}\s*,?\s*\d{4}/ig,
      dates     = str.match(dateRegx),
      timeRegx  = /(\d{1,2})\s*:\s*(\d{2})\s*([ap]m?)/ig,
      times     = str.match(timeRegx).map((t) => convertTimeStrToHourStr(t, true)),
      parts     = str.split(' '),
      zone      = parts[parts.length - 1],
      startDate = dates[0] ? dates[0].trim() : 'January 1, 1970',
      endDate   = dates[1] ? dates[1].trim() : null;

  return {
    start : {
      date     : startDate,
      startTime: times[0],
      endTime  : times[1],
      zone     : zone
    }, end: {
      date     : endDate,
      startTime: times[0],
      endTime  : times[1],
      zone     : zone
    }
  }
}

// Convert one of these 9:00 AM - 5:00 PM to 09:00 or 17:00
function convertTimeStrToHourStr(str, is24) {
  let parts = str.toLowerCase().split(' '),
      time  = parts[0].split(':'),
      hr    = is24 ? hrTo24(time[0], (parts[1] === 'pm')) : time[0];
  return [hr, time[1]].join(':');
}

function hrTo24(hr, pm) {
  hr = parseInt(hr) + (pm ? 12 : 0);
  if (hr < 10) {
    hr = '0' + hr;
  }
  return hr;
}

/*
 Condense array of individual classes to a grouping of classes
 */
function organizeCourses(classnames, classdata) {
  return classnames.reduce((p, c) => {
    let courseClasses  = classdata.filter((cls) => cls.fullname === c),
        matchingCourse = getCourseByName(courseClasses[0].fullname);
    if (matchingCourse) {
      p.push({
        classes   : courseClasses,
        name      : c,
        // region    : matchingCourse.classDetails.region,
        id        : matchingCourse.id,
        coursecode: matchingCourse.shortname,
        mod       : matchingCourse.deliverymode,
        category  : matchingCourse.category,
        summary   : matchingCourse.summary,
        deeplink  : matchingCourse.deeplink,
        duration  : matchingCourse.duration
      });
    } else {
      console.warn('No classes for course ' + c);
    }
    // console.log(p[p.length-1]);

    return p;
  }, []);
}

function getRegionFromTimeZone(zone) {
  // console.log(courseClasses[0].classDetails.schedule.start.zone)//.classDetails.region
  return 'Earth';
}

function getCourseByName(name) {
  return catalogData.catalog.filter((course) => {
    return course.fullname === name;
  })[0];
}

//Totara stores time in seconds
function formatSecondsToDate(seconds) {
  return new Date(parseInt(seconds * 1000)).toLocaleDateString()
}

//Totara stores time in seconds
function formatSecondsToHHMM(seconds) {
  var d = Number(seconds);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m);
}

function formatClassDuration(seconds) {
  let hhmm   = formatSecondsToHHMM(seconds),
      split  = hhmm.split(':'),
      tothrs = parseInt(split[0]),
      days   = Math.floor(tothrs / 8),
      hrs    = tothrs % 8,
      mins   = parseInt(split[1]);

  return (days ? days + ' days' : '') + (hrs ? ' ' + hrs + ' hrs' : '') + (mins ? ' ' + mins + ' mins' : '');
}