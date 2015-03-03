/* global define */

(function (root, factory) {
  /* istanbul ignore next */
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof exports === 'object') {
    module.exports = factory()
  } else {
    root.freeStyle = factory()
  }
})(this, function () {
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
  }

  /**
   * Hyphenate the CSS property.
   *
   * @param  {String} str
   * @return {String}
   */
  function hyphenate (str) {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/^ms-/, '-ms-')
      .toLowerCase()
  }

  /**
   * Sanitize the styles value.
   *
   * @param  {String} value
   * @return {String}
   */
  function styleValue (property, value) {
    if (!isNaN(value) && !CSS_NUMBER[property]) {
      value += 'px'
    }

    return String(value).replace(/([\{\}\[\]])/g, '\\$1')
  }

  /**
   * Check if a property will render at the top level.
   *
   * @param  {String}  property
   * @return {Boolean}
   */
  function isTopLevelProperty (property) {
    return property.charAt(0) === '@'
  }

  /**
   * Check if a value is a nested style definition.
   *
   * @param  {*}       value
   * @return {Boolean}
   */
  function isNestedDefinition (value) {
    return typeof value === 'object' && !Array.isArray(value)
  }

  /**
   * Turn a single style into a rule.
   *
   * @param  {String} property
   * @param  {String} value
   * @return {String}
   */
  function styleToString (property, value) {
    var prop = hyphenate(property)

    if (!Array.isArray(value)) {
      value = [value]
    }

    return value.map(function (value) {
      return prop + ':' + styleValue(property, value) + ';'
    }).join('')
  }

  /**
   * Turn a style object into a string.
   *
   * @param  {Object} styles
   * @param  {String} selector
   * @return {String}
   */
  function stylesToString (styles, selector) {
    var rules = ''
    var toplevel = ''

    Object.keys(styles).forEach(function (key) {
      var value = styles[key]

      // Support CSS @-rules (`@media`, `@supports`, etc)
      if (isTopLevelProperty(key)) {
        toplevel += key + '{' + stylesToString(value, selector) + '}'

        return
      }

      // Support LESS-style nested syntax.
      if (isNestedDefinition(value)) {
        if (key.indexOf('&') > -1) {
          key = key.replace(/&/g, selector)
        } else {
          key = selector + ' ' + key
        }

        toplevel += stylesToString(value, key)

        return
      }

      rules += styleToString(key, value)
    })

    if (rules) {
      rules = selector + '{' + rules + '}'
    }

    return rules + toplevel
  }

  /**
   * Create a style object at the root.
   *
   * @param  {Object} styles
   * @return {String}
   */
  function nestedStylesToString (styles, identifier) {
    var rules = ''
    var toplevel = ''

    Object.keys(styles).forEach(function (key) {
      var value = styles[key]

      // Support CSS @-rules inside keyframes (`@supports`)
      if (isTopLevelProperty(key)) {
        toplevel += key + '{' + nestedStylesToString(value, identifier) + '}'

        return
      }

      if (isNestedDefinition(value)) {
        rules += nestedStylesToString(value, key)

        return
      }

      rules += styleToString(key, value)
    })

    if (rules) {
      rules = identifier + '{' + rules + '}'
    }

    return rules + toplevel
  }

  /**
   * Hash a string for use as the class name.
   *
   * @param  {String} str
   * @param  {String} [seed]
   * @return {String}
   */
  function hash (str, seed) {
    var value = seed || 0x811c9dc5

    for (var i = 0; i < str.length; i++) {
      value ^= str.charCodeAt(i)
      value += (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24)
    }

    return (value >>> 0).toString(16)
  }

  /**
   * Create a namespaced CSS instance.
   *
   * @param {Object} styles
   */
  function Namespace (styles) {
    this.styles = styles
    this.className = 'n' + hash(JSON.stringify(styles))
    this.selector = '.' + this.className
  }

  /**
   * Return styles as a string.
   *
   * @return {String}
   */
  Namespace.prototype.getStyles = function () {
    return stylesToString(this.styles, this.selector)
  }

  /**
   * Create keyframes object.
   *
   * @param {Object} styles
   */
  function Keyframes (styles) {
    this.styles = styles
    this.name = 'k' + hash(JSON.stringify(styles))
  }

  /**
   * Return keyframes style string.
   *
   * @return {String}
   */
  Keyframes.prototype.getStyles = function () {
    return nestedStylesToString(this.styles, '@keyframes ' + this.name)
  }

  /**
   * Global style constructor.
   */
  function FreeStyle () {
    this.cache = {}
  }

  /**
   * Create a fresh instance.
   *
   * @return {FreeStyle}
   */
  FreeStyle.prototype.fresh = function () {
    return new FreeStyle()
  }

  /**
   * Create a new style class.
   *
   * @param  {Object}    styles
   * @return {Namespace}
   */
  FreeStyle.prototype.createClass = function (styles) {
    var style = new Namespace(styles)

    this.cache[style.className] = style

    return style
  }

  /**
   * Create a keyframes style instance.
   *
   * @param  {Object}    styles
   * @return {Keyframes}
   */
  FreeStyle.prototype.createKeyframes = function (styles) {
    var keyframes = new Keyframes(styles)

    this.cache[keyframes.name] = keyframes

    return keyframes
  }

  /**
   * Create a valid CSS url string.
   *
   * @param  {String} url
   * @return {String}
   */
  FreeStyle.prototype.url = function (url) {
    return 'url("' + encodeURI(url) + '")'
  }

  /**
   * Join a list of class names together.
   *
   * @return {String}
   */
  FreeStyle.prototype.join = function (/* ...class */) {
    return Array.prototype.join.call(arguments, ' ')
  }

  /**
   * Create a CSS string from styles.
   *
   * @return {String}
   */
  FreeStyle.prototype.getStyles = function () {
    var str = ''
    var cache = this.cache

    Object.keys(cache).forEach(function (key) {
      str += cache[key].getStyles()
    })

    // Empty style cache.
    this.cache = {}

    return str
  }

  /**
   * Inject the styles into the DOM.
   */
  FreeStyle.prototype.inject = function () {
    var tag = document.createElement('style')
    tag.innerHTML = this.getStyles()
    document.head.appendChild(tag)
  }

  /**
   * Export a `FreeStyle` instance.
   */
  return new FreeStyle()
})
