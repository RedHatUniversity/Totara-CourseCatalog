/*
 Takes the output from TotaraLoadCalendar and reformats it for react-big-calendar

 TODO integrate this into the TotaraLoadCalendar module
 */

let moment        = require('moment'),
    {tzTable}     = require('./timezones'),
    {uniqueArry}  = require('./../../../../shared/utils/Toolbox');

function getReformattedData(data) {
  let events = reformatEventArray(data);
  return {
    events   : events,
    mod      : buildMoDList(events),
    category : buildCategoryList(events),
    region   : buildRegionList(events),
    country  : buildCountryList(events),
    city     : buildCityList(events),
    hierarchy: buildHierarchy(events)
  }
}

/*
 Reference
 https://github.com/intljusticemission/react-big-calendar/blob/master/examples/events.js
 title: 'All Day Event',
 allDay: true,
 start: new Date(2015, 3, 0),
 end: new Date(2015, 3, 0),
 desc: 'Big conference for important people'

 */
function reformatEventArray(data) {
  return data.reduce((evts, course) => {

    course.classes.forEach((cls) => {
      // console.log(cls);
      let startTime = cls.classDetails.schedule.start,
          endTime   = cls.classDetails.schedule.end;

      evts.push({
        title   : cls.fullname,
        allDay  : isAllDay(startTime, endTime),
        start   : getEventStartTime(startTime),
        end     : getEventEndTime(startTime, endTime),
        desc    : course.summary,
        link    : cls.signupLink,
        id      : cls.id,
        category: course.category,
        mod     : cls.classDetails.mod,
        region  : cls.classDetails.region,
        country : cls.classDetails.country,
        city    : cls.classDetails.city
      });
    });

    return evts;
  }, []);
}

// Extract unique categories from the loaded courses
function buildCategoryList(data) {
  return uniqueArry(data.map((course) => course.category));
}

// Extract unique MoDs from the loaded courses
function buildMoDList(data) {
  return uniqueArry(data.map((course) => course.mod));
}

// Extract unique MoDs from the loaded courses
function buildRegionList(data) {
  return uniqueArry(data.map((course) => course.region));
}

// Extract unique MoDs from the loaded courses
function buildCountryList(data) {
  return uniqueArry(data.map((course) => course.country));
}

// Extract unique MoDs from the loaded courses
function buildCityList(data) {
  return uniqueArry(data.map((course) => course.city));
}

/*
Builds an tree of the cities in countries and countries in regions for the
filtering menus. Keys are the names
 */
function buildHierarchy(data) {
  return data.reduce((hier, cls) => {
    if(!hier.hasOwnProperty(cls.region)) {
      hier[cls.region] = {};
    }
    if(!hier[cls.region].hasOwnProperty(cls.country)) {
      hier[cls.region][cls.country] = {};
    }
    if(!hier[cls.region][cls.country].hasOwnProperty(cls.city)) {
      hier[cls.region][cls.country][cls.city] = {};
    }
    return hier;
  }, {});
}

function isAllDay(start, end) {
  if (end.date) {
    return true;
  }
  let starthr = getHourFromTimeStr(start.startTime),
      endhr   = getHourFromTimeStr(start.endTime);

  // starts before 9 and ends after 4
  return (starthr <= 9 && endhr >= 16);
}

function getHourFromTimeStr(timestr) {
  return parseInt(timestr.split(':')[0]);
}

function convertDateTimeToMoment(date, time) {
  return moment(date + ' ' + time, 'MMMM D, YYYY HH:mm');
}

// http://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
function convertDateToTimeZone(date, zone) {
  let dlocalTime   = date.getTime(),
      dlocalOffset = date.getTimezoneOffset() * 60000,
      dutcMS       = dlocalTime + dlocalOffset,
      offset       = getTimeZoneOffset(zone),
      targetzonemc = dutcMS + (3600000 * offset),
      remote       = new Date(targetzonemc);

  // console.log(offset, date, remote);

  return (remote);
}

function getTimeZoneOffset(tgtzone) {
  let zoneObject = tzTable.filter((zone) => zone.utc.includes(tgtzone))[0];

  if (zoneObject) {
    return zoneObject.offset;
  }
  console.warn('No timezone found for', tgtzone);
  return 0;
}

function getEventStartTime(start) {
  let date = convertDateTimeToMoment(start.date, start.startTime).toDate();
  return convertDateToTimeZone(date, start.zone);
  // return date;
}

function getEventEndTime(start, end) {
  let date;
  if (!end.date) {
    date = convertDateTimeToMoment(start.date, start.endTime);
  } else {
    date = convertDateTimeToMoment(end.date, end.endTime);
  }
  // return date.toDate();
  return convertDateToTimeZone(date.toDate(), start.zone);
}

module.exports.getReformattedData = getReformattedData;