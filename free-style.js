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
    'column-count': true,
    'fill-opacity': true,
    'flex': true,
    'flex-grow': true,
    'flex-shrink': true,
    'font-weight': true,
    'line-clamp': true,
    'line-height': true,
    'opacity': true,
    'order': true,
    'orphans': true,
    'stroke-opacity': true,
    'widows': true,
    'z-index': true,
    'zoom': true
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
    return value != null && typeof value === 'object' && !Array.isArray(value)
  }

  /**
   * Normalize a CSS property.
   *
   * @param  {String} str
   * @return {String}
   */
  function normalizeProperty (str) {
    return hyphenate(str.trim())
  }

  /**
   * Normalize a CSS value string.
   *
   * @param  {String} value
   * @param  {String} property
   * @return {String}
   */
  function normalizeValueString (value, property) {
    if (value == null) {
      return null
    }

    value = String(value)

    if (!isNaN(value) && !CSS_NUMBER[property]) {
      value += 'px'
    }

    return value.replace(/([\{\}\[\]])/g, '\\$1')
  }

  /**
   * Normalize a CSS value.
   *
   * @param  {(String|Array)} value
   * @param  {String}         property
   * @return {(String|Array)}
   */
  function normalizeValue (value, property) {
    if (Array.isArray(value)) {
      return value.map(function (str) {
        return normalizeValueString(str, property)
      })
    }

    return normalizeValueString(value, property)
  }

  /**
   * Copy styles from one object to another.
   *
   * @param  {Object} dest
   * @param  {Object} src
   * @return {Object}
   */
  function copyStyles (dest, src) {
    Object.keys(src).forEach(function (key) {
      var prop = normalizeProperty(key)
      var value = src[key]

      if (isNestedDefinition(value)) {
        dest[prop] = normalizeStyles(dest[prop] || {}, value)

        return
      }

      if (value != null) {
        dest[prop] = normalizeValue(value, prop)
      }
    })

    return dest
  }

  /**
   * Sort an object keys.
   *
   * @param  {Object} obj
   * @return {Object}
   */
  function sortKeys (obj) {
    var sorted = {}

    Object.keys(obj).sort().forEach(function (key) {
      sorted[key] = obj[key]
    })

    return sorted
  }

  /**
   * Normalize one or more objects.
   *
   * @param  {Object} ...src
   * @return {Object}
   */
  function normalizeStyles (/* ...src */) {
    var dest = {}

    for (var i = 0; i < arguments.length; i++) {
      copyStyles(dest, arguments[i])
    }

    return sortKeys(dest)
  }

  /**
   * Turn a single style into a string.
   *
   * @param  {String} property
   * @param  {String} value
   * @return {String}
   */
  function styleStringToString (property, value) {
    return value == null ? '' : property + ':' + value + ';'
  }

  /**
   * Turn a style declaration into a rule.
   *
   * @param  {String} property
   * @param  {String} value
   * @return {String}
   */
  function styleToString (property, value) {
    if (Array.isArray(value)) {
      return value.map(function (value) {
        return styleStringToString(property, value)
      }).join('')
    }

    return styleStringToString(property, value)
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
   * Hash a style object.
   *
   * @param  {Object} style
   * @return {String}
   */
  function hashStyle (style) {
    return hash(JSON.stringify(style))
  }

  /**
   * Create a namespaced CSS instance.
   *
   * @param {Object} style
   */
  function Namespace (style) {
    this.style = style
    this.className = 'n' + hashStyle(this.style)
    this.selector = '.' + this.className
  }

  /**
   * Get the unique hash.
   *
   * @return {String}
   */
  Namespace.prototype.getHash = function () {
    return this.className
  }

  /**
   * Return styles as a string.
   *
   * @return {String}
   */
  Namespace.prototype.getStyles = function () {
    return stylesToString(this.style, this.selector)
  }

  /**
   * Create keyframes object.
   *
   * @param {Object} style
   */
  function Keyframes (style) {
    this.style = style
    this.name = 'k' + hashStyle(this.style)
  }

  /**
   * Get the unique hash.
   *
   * @return {String}
   */
  Keyframes.prototype.getHash = function () {
    return this.name
  }

  /**
   * Return keyframes style string.
   *
   * @return {String}
   */
  Keyframes.prototype.getStyles = function () {
    return [
      nestedStylesToString(this.style, '@-webkit-keyframes ' + this.name),
      nestedStylesToString(this.style, '@keyframes ' + this.name)
    ].join('')
  }

  /**
   * Global style constructor.
   */
  function FreeStyle () {
    this.cache = {}
  }

  /**
   * Expose constructors.
   */
  FreeStyle.prototype.FreeStyle = FreeStyle
  FreeStyle.prototype.Namespace = Namespace
  FreeStyle.prototype.Keyframes = Keyframes

  /**
   * Create a fresh instance.
   *
   * @return {FreeStyle}
   */
  FreeStyle.prototype.fresh = function () {
    return new FreeStyle()
  }

  /**
   * Add an object to the style cache.
   *
   * @param {Object} o
   */
  FreeStyle.prototype.add = function (o) {
    this.cache[o.getHash()] = o

    return o
  }

  /**
   * Check if the style exists in the cache.
   *
   * @param  {Object}  o
   * @return {Boolean}
   */
  FreeStyle.prototype.has = function (o) {
    return !!this.cache[o.getHash()]
  }

  /**
   * Remove item from the cache.
   *
   * @param {Object} o
   */
  FreeStyle.prototype.remove = function (o) {
    delete this.cache[o.getHash()]
  }

  /**
   * Clear the cache.
   */
  FreeStyle.prototype.empty = function () {
    this.cache = {}
  }

  /**
   * Create a new style class.
   *
   * @param  {Object}    ...style
   * @return {Namespace}
   */
  FreeStyle.prototype.createClass = function (/* ...style */) {
    return new Namespace(normalizeStyles.apply(null, arguments))
  }

  /**
   * Create and register a new style class.
   *
   * @param  {Object}    ...style
   * @return {Namespace}
   */
  FreeStyle.prototype.registerClass = function (/* ...style */) {
    return this.add(this.createClass.apply(this, arguments))
  }

  /**
   * Create a keyframes object.
   *
   * @param  {Object}    ...style
   * @return {Keyframes}
   */
  FreeStyle.prototype.createKeyframes = function (/* ...style */) {
    return new Keyframes(normalizeStyles.apply(null, arguments))
  }

  /**
   * Create and register a keyframes object.
   *
   * @param  {Object}    ...style
   * @return {Keyframes}
   */
  FreeStyle.prototype.registerKeyframes = function (/* ...style */) {
    return this.add(this.createKeyframes.apply(this, arguments))
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
   * @param  {String} ...class
   * @return {String}
   */
  FreeStyle.prototype.join = function (/* ...class */) {
    var classNames = []

    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i]

      if (typeof value === 'string') {
        classNames.push(value)
      } else if (value != null) {
        Object.keys(value).forEach(function (key) {
          if (value[key]) {
            classNames.push(key)
          }
        })
      }
    }

    return classNames.join(' ')
  }

  /**
   * Create a CSS string from styles.
   *
   * @return {String}
   */
  FreeStyle.prototype.getStyles = function () {
    var cache = this.cache

    return Object.keys(cache).map(function (key) {
      return cache[key].getStyles()
    }).join('')
  }
  /**
   * Inject the styles into the DOM.
   *
   * @param {Element} [target]
   */
  /* istanbul ignore next */
  FreeStyle.prototype.inject = function (target) {
    target = target || document.head

    var node = document.createElement('style')
    node.innerHTML = this.getStyles()
    target.appendChild(node)

    return node
  }

  /**
   * Export a `FreeStyle` instance.
   */
  return new FreeStyle()
})
