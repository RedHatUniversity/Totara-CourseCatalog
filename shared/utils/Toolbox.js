/*eslint no-undef: "error"*/
/*eslint-env node*/

/*
 Collected utility functions
 */

/*******************************************************************************
 * String
 *******************************************************************************/

const existy = (x) => {
  return x != null; // eslint-disable-line eqeqeq
};

const truthy = (x) => {
  return (x !== false) && existy(x);
};

const falsey = (x) => {
  return !truthy(x);
};

module.exports.existy = existy;
module.exports.truthy = truthy;
module.exports.falsey = falsey;

module.exports.isFunction = (object) => {
  return typeof object === "function";
};

module.exports.isObject = (object) => {
  var type = {}.toString;
  return type.call(object) === "[object Object]";
};

module.exports.isString = (object) => {
  var type = {}.toString;
  return type.call(object) === "[object String]";
};

module.exports.isPromise = (promise) => {
  return promise && typeof promise.then === 'function';
};

module.exports.isObservable = (observable) => {
  return observable && typeof observable.subscribe === 'function';
};

/*******************************************************************************
 * String
 *******************************************************************************/

module.exports.capitalizeFirstLetterStr = (str) => {
  return str.charAt(0).toUpperCase() + str.substring(1);
};

module.exports.toTitleCaseStr = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
  });
};

module.exports.removeTagsStr = (str) => {
  return str.replace(/(<([^>]+)>)/ig, '');
};

module.exports.removeEntityStr = (str) => {
  return str.replace(/(&(#?)(?:[a-z\d]+|#\d+|#x[a-f\d]+);)/ig, '');
};

module.exports.ellipsesStr = (str, len) => {
  return (str.length > len) ? str.substr(0, len) + "..." : str;
};

/*******************************************************************************
 * Array
 *******************************************************************************/

// http://www.shamasis.net/2009/09/fast-algorithm-to-find-unique-items-in-javascript-array/
module.exports.uniqueArry = (arry) => {
  var o = {},
      i,
      l = arry.length,
      r = [];
  for (i = 0; i < l; i += 1) {
    o[arry[i]] = arry[i];
  }
  for (i in o) {
    r.push(o[i]);
  }
  return r;
};

module.exports.getArryDifferences = (arr1, arr2) => {
  var dif = [];

  arr1.forEach((value) => {
    var present = false,
        i       = 0,
        len     = arr2.length;

    for (; i < len; i++) {
      if (value === arr2[i]) {
        present = true;
        break;
      }
    }

    if (!present) {
      dif.push(value);
    }

  });

  return dif;
};

module.exports.arryArryToArryObj = (src, keys) => {
  return src.reduce((p, c) => {
    var row = {};
    keys.forEach((col, i) => {
      row[col] = c[i];
    });
    p.push(row);
    return p;
  }, []);
};

/*******************************************************************************
 * Objects
 *******************************************************************************/

/**
 * Test for
 * Object {"": undefined}
 * Object {undefined: undefined}
 * @param obj
 * @returns {boolean}
 */
module.exports.isNullObj = (obj) => {
  var isnull = false;

  if (falsey(obj)) {
    return true;
  }

  for (var prop in obj) {
    if (prop === undefined || obj[prop] === undefined) {
      isnull = true;
    }
    break;
  }

  return isnull;
};

module.exports.dynamicSortObjArry = (property) => {
  return (a, b) => {
    return a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
  };
};

/**
 * Turn an object of {paramname:value[,...]} into paramname=value[&...] for a
 * URL rest query
 */
module.exports.getParameterString = (objArry) => {
  return Object.keys(objArry).reduce((p, c, i) => {
    p += (i > 0 ? '&' : '') + c + '=' + encodeURIComponent(objArry[c]);
    return p;
  }, '');
};

module.exports.decodeParameterString = (str) => {
  return str.split('&').reduce((p, c) => {
    let pair   = c.split('=');
    p[pair[0]] = decodeURIComponent(pair[1]);
    return p;
  }, {});
};