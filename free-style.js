(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.freeStyle = factory();
  }
})(this, function () {
  var ELEM = document.createElement('div');

  /**
   * Unit-less CSS properties.
   *
   * @type {Object}
   */
  var CSS_NUMBER = {
    columnCount: true,
    fillOpacity: true,
    flex: true,
    flexGrow: true,
    flexShrink: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    strokeOpacity: true,
    widows: true,
    zIndex: true,
    zoom: true
  };

  /**
   * Longhand transform functions.
   *
   * Source: mdn.io/shorthand+properties
   *
   * @type {Object}
   */
  var TRANSFORM_LONGHAND = {
    background: [
     'backgroundClip',
     'backgroundColor',
     'backgroundImage',
     'backgroundOrigin',
     'backgroundPosition',
     'backgroundRepeat',
     'backgroundSize',
     'backgroundAttachment'
    ],
    font: [
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontSize',
      'lineHeight',
      'fontFamily'
    ],
    margin: [
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft'
    ],
    border: [
      'borderTopWidth',
      'borderTopStyle',
      'borderTopColor',
      'borderRightWidth',
      'borderRightStyle',
      'borderRightColor',
      'borderBottomWidth',
      'borderBottomStyle',
      'borderBottomColor',
      'borderLeftWidth',
      'borderLeftStyle',
      'borderLeftColor'
    ],
    borderTop: [
      'borderTopWidth',
      'borderTopStyle',
      'borderTopColor'
    ],
    borderLeft: [
      'borderLeftWidth',
      'borderLeftStyle',
      'borderLeftColor'
    ],
    borderBottom: [
      'borderBottomWidth',
      'borderBottomStyle',
      'borderBottomColor'
    ],
    borderRight: [
      'borderRightWidth',
      'borderRightStyle',
      'borderRightColor'
    ],
    borderWidth: [
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth'
    ],
    borderColor: [
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor'
    ],
    borderStyle: [
      'borderTopStyle',
      'borderRightStyle',
      'borderBottomStyle',
      'borderLeftStyle'
    ],
    transition: [
      'transitionProperty',
      'transitionDuration',
      'transitionTimingFunction',
      'transitionDelay'
    ],
    padding: [
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft'
    ],
    listStyle: [
      'listStyleType',
      'listStyleImage',
      'listStylePosition'
    ],
    borderRadius: [
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomRightRadius',
      'borderBottomLeftRadius'
    ],
    flex: [
      'flexGrow',
      'flexShrink',
      'flexBasis'
    ],
    flexFlow: [
      'flexDirection',
      'flexWrap'
    ]
  };

  /**
   * Flexbox display values.
   *
   * @type {Array}
   */
  var DISPLAY_FLEX_VALUES = [
    'flex',
    '-webkit-flex',
    '-ms-flexbox',
    'box',
    '-moz-box',
    '-webkit-box'
  ];

  /**
   * Current browser CSS prefix.
   *
   * @type {String}
   */
  var PREFIXES = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'];

  /**
   * Cache vendor prefix lookups.
   *
   * @type {Object}
   */
  var PREFIX_CACHE = {};

  /**
   * Copy properties from `src` onto `dest`.
   *
   * @param  {Object} dest
   * @param  {Object} src
   * @return {Object}
   */
  function assign (dest, src) {
    Object.keys(src).forEach(function (key) {
      dest[key] = src[key];
    });

    return dest;
  }

  /**
   * Noop.
   */
  function noop () {}

  /**
   * Turn an array into an object with optional value.
   *
   * @param  {Array}  keys
   * @param  {String} value
   * @return {Object}
   */
  function object (keys, value) {
    var obj = {};

    keys.forEach(function (key) {
      obj[key] = value;
    });

    return obj;
  }

  /**
   * Check if a property value is supported.
   *
   * @param  {String}  prop
   * @param  {String}  value
   * @return {Boolean}
   */
  function isSupported (prop, value) {
    if (ELEM.style[prop] == null) {
      return false;
    }

    if (!value) {
      return true;
    }

    // Reset the element style and see if it sticks.
    ELEM.style[prop] = '';
    ELEM.style[prop] = value;

    return !!ELEM.style[prop];
  }

  /**
   * Get the browser prefixed property.
   *
   * @param  {String} prop
   * @param  {Object} [scope]
   * @return {String}
   */
  function getPrefix (prop, scope) {
    scope = scope || document.documentElement.style;

    if (scope[prop] != null) {
      return prop;
    }

    var upper = prop.charAt(0).toUpperCase() + prop.substr(1);

    for (var i = 0; i < PREFIXES.length; i++) {
      var prefix = PREFIXES[i] + upper;

      if (scope[prefix] != null) {
        return prefix;
      }
    }

    return prop;
  }

  /**
   * Return a cached lookup to the vendor prefix.
   *
   * @param {Object} style
   */
  function prefixProperties (style) {
    Object.keys(style).forEach(function (key) {
      var prefix = PREFIX_CACHE[key] || (PREFIX_CACHE[key] = getPrefix(key));

      if (prefix === key) {
        return;
      }

      style[prefix] = style[key];
      delete style[key];
    });
  }

  /**
   * Generate a function for transforming property values.
   *
   * @param  {String}   prop
   * @param  {Array}    values
   * @return {Function}
   */
  function values (prop, values) {
    var supported;

    for (var i = 0; i < values.length; i++) {
      if (isSupported(prop, values[i])) {
        supported = values[i];
        break;
      }
    }

    if (!supported) {
      return noop;
    }

    var cache = object(values, true);

    return function (style) {
      var value = style[prop];

      if (cache[value]) {
        style[prop] = supported;
      }
    };
  }

  /**
   * Transform a style object.
   *
   * @param  {Object} src
   * @return {Object}
   */
  var TRANSFORM_FNS = [
    prefixProperties,
    values('display', DISPLAY_FLEX_VALUES)
  ];

  /**
   * Transform a style object in-place.
   *
   * @param  {Object} style
   * @return {Object}
   */
  function transform (style) {
    // Run each transformation sequentially.
    TRANSFORM_FNS.forEach(function (fn) {
      fn(style);
    });

    return style;
  }

  /**
   * Transform shorthand expressions into longhand to merge properties.
   *
   * @param  {Object} src
   * @return {Object}
   */
  function longhand (src) {
    var style = {};

    if (!src) {
      return style;
    }

    Object.keys(src).forEach(function (key) {
      var props = TRANSFORM_LONGHAND[key];
      var value = src[key];

      if (value && !isNaN(value) && !CSS_NUMBER[key]) {
        value += 'px';
      }

      if (!props) {
        style[key] = value;

        return;
      }

      ELEM.style[key] = value;

      props.forEach(function (prop) {
        style[prop] = ELEM.style[prop];
      });
    });

    return style;
  }

  /**
   * Transform any number of style objects into a single object that is best
   * supported by the current browser.
   *
   * @param  {Object} [...styles]
   * @return {Object}
   */
  function freeStyle (/* ...styles */) {
    var style = {};

    // Assign to a single object, but make sure all properties are long-hand
    // first to avoid issues with the property ordering.
    for (var i = 0; i < arguments.length; i++) {
      assign(style, longhand(arguments[i]));
    }

    return transform(style);
  }

  return freeStyle;
});
