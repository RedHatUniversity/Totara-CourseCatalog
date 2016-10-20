/*eslint no-undef: "error"*/
/*eslint-env node*/

/**
 * Retrieves a list of categories, courses, unique category names based on the courses
 * and a guess at the possible mode of delivery for each course.
 */

let {request}        = require('./Rest'),
    {
      dynamicSortObjArry,
      uniqueArry,
      removeTagsStr,
      removeEntityStr,
      getParameterString
    }                = require('./../../../../shared/utils/Toolbox'), // Utilities
    webserviceConfig, // Obj holds URL and token information
    wsURL            = '/webservice/rest/server.php',
    deepLinkURL      = '/course/view.php?id=',
    categories, // loaded categories
    hiddenCategories = ['(hidden) Course Templates', 'n/a'], // Courses with these categories will be removed from the list
    catalog, // loaded catalog data
    courseCategoryList, // list of all categories present in the loaded data
    courseMODList; // list of all mode of deliveries present in the loaded data

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
module.exports.requestCatalog = (wsConfig) => {

  webserviceConfig = wsConfig;

  // TODO leverage promise.all here

  return new Promise((resolve, reject) => {

    function requestCategories() {
      request({
        json: true,
        url : createURL('core_course_get_categories')
      }).then((data)=> {
        categories = data;
        requestCatalog();
      }).catch((err)=> {
        reject('Error fetching categories', err);
      });
    }

    function requestCatalog() {
      request({
        json: true,
        url : createURL('core_course_get_courses')
      }).then((data)=> {
        catalog            = cleanCatalogData(data);
        courseCategoryList = buildCategoryList(catalog);
        courseMODList      = buildDeliveryModeList(catalog);
        resolve({categories, catalog, courseCategoryList, courseMODList});
      }).catch((err)=> {
        reject('Error fetching course catalog', err);
      });
    }

    requestCategories();

  });
};

function createURL(funct) {
  return webserviceConfig.urlStem + wsURL + '?' + getParameterString({
      wstoken           : webserviceConfig.token,
      wsfunction        : funct,
      moodlewsrestformat: 'json'
    });
}

// Cleans up the loaded catalog data, removes courses in any hidden categories
// then sorts them alphabetically by name
function cleanCatalogData(src) {
  return src.reduce((p, c) => {
    if(c.audiencevisible === 2) {
      p.push({
        category    : getCourseCategory(c.categoryid),
        datecreated : formatSecondsToDate(c.timecreated),
        datemodified: formatSecondsToDate(c.timemodified),
        startdate   : formatSecondsToDate(c.startdate),
        format      : c.format,
        id          : c.id,
        coursecode  : c.idnumber,
        lang        : c.lang,
        numsections : c.numsections,
        fullname    : c.fullname,
        shortname   : c.shortname,
        summary     : getShortSummary(c.summary),
        deliverymode: getCourseDeliveryMode(c),
        deeplink    : webserviceConfig.urlStem + deepLinkURL + c.id
      });
    }
    return p;
  }, [])
    .filter(isInAHiddenCategory)
    .sort(dynamicSortObjArry('fullname'));
}

// Iterate over the hidden categories array and remove any courses in those
// categories
function isInAHiddenCategory(courseObj) {
  let courseCategory = courseObj.category;
  return !hiddenCategories.reduce((p, c) => p || c === courseCategory, false);
}


// Match the ID of a course category to the loaded categories
function getCourseCategory(courseCategoryID) {
  let category = categories.filter((cat) => {
    return cat.id === courseCategoryID;
  })[0];

  // Course id === 1 has no category ID and will break filter
  // This seems to be a system default entry for the name of the LMS
  return category && category.hasOwnProperty('name') ? category.name : 'n/a';
}

//Totara stores time in seconds
function formatSecondsToDate(seconds) {
  return new Date(parseInt(seconds * 1000)).toLocaleDateString()
}

// Remove any entities and tags from the description
function getShortSummary(str) {
  return removeTagsStr(removeEntityStr(str));
}

/*
 Make a best guess at the mode of delivery. MoD is a custom field and doesn't come
 back via web service calls.
 */
function getCourseDeliveryMode(courseObj) {

  let format          = courseObj.format,
      coursetype      = courseObj.coursetype,
      coursefmt0Value = courseObj.courseformatoptions[0].value,
      numsections     = courseObj.hasOwnProperty('numsections') ? courseObj.numsections : null;

  // console.log(format, coursetype, coursefmt0Value, numsections);

  if (format === 'topics' && (coursetype === 0 || coursetype === 2) && coursefmt0Value === 1 && numsections === 1) {
    return 'ROLE'
  } else if (format === 'topics' && coursetype === 2 && (coursefmt0Value === 3 || coursefmt0Value === 4)) {
    return 'Instructor-led';
  } else if (format === 'topics' && coursetype === 2 && numsections === 10) {
    return 'n/a';
  }

  // Default to this
  // format === 'singleactivity' && coursetype === 0 && coursefmt0Value === 'scorm' && numsections === null
  return 'Online self paced';
}

// Extract unique categories from the loaded courses
function buildCategoryList(data) {
  return uniqueArry(data.map((course) => course.category));
}

// Extract unique MoDs from the loaded courses
function buildDeliveryModeList(data) {
  return uniqueArry(data.map((course) => course.deliverymode));
}