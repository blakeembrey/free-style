type CssNumber = { [styleProp: string]: boolean }

type PropertyName = string

type PropertyValue = string | Array<string>

/**
 * Add an ID to each instance.
 */
var id: number = 0

/**
 * Allowed unit-less CSS properties.
 */
var CSS_NUMBER: CssNumber = {
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
 * Transform a JavaScript property into a CSS property.
 */
function hyphenate (str: PropertyName): PropertyName {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
    .toLowerCase()
}

/**
 * Check if a property name should pop to the top level of CSS.
 */
function isTopLevelProperty (propertyName: PropertyName): boolean {
  return propertyName.charAt(0) === '@'
}

/**
 * Check if a value is a nested style definition.
 */
function isNestedDefinition (value: any): boolean {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Normalize a CSS property name.
 */
function normalizePropertyName (propertyName: PropertyName): string {
  return hyphenate(propertyName.trim())
}

/**
 * Normalize a CSS property value string.
 */
function normalizePropertyValueString (value: string, propertyName: PropertyName): string {
  if (value == null) {
    return null
  }

  value = String(value)

  if (Number(value) && !CSS_NUMBER[propertyName]) {
    value += 'px'
  }

  return value.replace(/([\{\}\[\]])/g, '\\$1')
}

/**
 * Normalize a CSS property value.
 */
function normalizePropertyValue (value: PropertyValue, propertyName: PropertyName): PropertyValue {
  if (Array.isArray(value)) {
    return (<Array<string>> value).map(function (str: string): string {
      return normalizePropertyValueString(str, propertyName)
    })
  }

  return normalizePropertyValueString(<string> value, propertyName)
}

/**
 * Copy styles from one object to another.
 */
function copyStyles (dest: StyleObject, src?: StyleObject): StyleObject {
  if (src) {
    Object.keys(src).forEach(function (key) {
      var propertyName = normalizePropertyName(key)
      var propertyValue = src[key]

      if (isNestedDefinition(propertyValue)) {
        dest[propertyName] = normalizeStyles(dest[propertyName] || {}, propertyValue)

        return
      }

      if (propertyValue != null) {
        dest[propertyName] = normalizePropertyValue(propertyValue, propertyName)
      }
    })
  }

  return dest
}

/**
 * Consistently sort object key order.
 */
function sortKeys (obj: StyleObject): StyleObject {
  var sorted: StyleObject = {}

  Object.keys(obj).sort().forEach(function (key) {
    sorted[key] = obj[key]
  })

  return sorted
}

/**
 * Normalize one or more style objects.
 */
function normalizeStyles (...src: StyleObject[]): StyleObject {
  var dest: StyleObject = {}

  for (var i = 0; i < src.length; i++) {
    copyStyles(dest, src[i])
  }

  return sortKeys(dest)
}

/**
 * Transform a style string into a string.
 */
function styleStringToString (propertyName: PropertyName, value: string | void): string {
  return value == null ? '' : propertyName + ':' + value + ';'
}

/**
 * Transform a style into a string.
 */
function styleToString (propertyName: PropertyName, value: string | string[] | void): string {
  if (Array.isArray(value)) {
    return (<Array<string>> value).map(function (value) {
      return styleStringToString(propertyName, value)
    }).join('')
  }

  return styleStringToString(propertyName, <string | void> value)
}

/**
 * Transform a style object to a string.
 */
function stylesToString (style: StyleObject, selector: string): string {
  var rules = ''
  var toplevel = ''

  Object.keys(style).forEach(function (key) {
    var value = style[key]

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
 * Transform a style object to a string for nested style objects.
 *
 * E.g. `@keyframes`, `@supports`, etc.
 */
function nestedStylesToString (style: StyleObject, identifier: string): string {
  var rules = ''
  var toplevel = ''

  Object.keys(style).forEach(function (key) {
    var value = style[key]

    // Support CSS @-rules inside keyframes (`@supports`).
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
 * Generate a hash value from a string.
 */
function hash (str: string, seed?: string): string {
  var value = seed ? parseInt(seed, 16) : 0x811c9dc5

  for (var i = 0; i < str.length; i++) {
    value ^= str.charCodeAt(i)
    value += (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24)
  }

  return (value >>> 0).toString(16)
}

/**
 * Hash a style object.
 */
function hashStyle (style: StyleObject): string {
  return hash(JSON.stringify(style))
}

/**
 * Stringify a style instance.
 */
function freeStyleToString (f: FreeStyle): string {
  return f.values().map(function (style) {
    return style.getStyles()
  }).join('')
}

export type StyleObject = { [propertyName: string]: any }

export type StyleType = Style | Keyframes

export type ChangeListenerFunction = (type?: string, style?: StyleType, src?: FreeStyle) => void

/**
 * Create a namespaced style object.
 */
export class Style {
  constructor (style: StyleObject) {
    this.style = style
    this.className = 'n' + hashStyle(this.style)
    this.id = this.className
    this.selector = '.' + this.className

    this._styleString = stylesToString(this.style, this.selector)
  }

  getStyles (): string {
    return this._styleString
  }

  id: string
  selector: string
  className: string
  style: StyleObject

  private _styleString: string
}

/**
 * Create a keyframes object.
 */
export class Keyframes {
  constructor (style: StyleObject) {
    this.style = style
    this.name = 'k' + hashStyle(this.style)
    this.id = this.name

    this._styleString = [
      nestedStylesToString(this.style, '@-webkit-keyframes ' + this.name),
      nestedStylesToString(this.style, '@keyframes ' + this.name)
    ].join('')
  }

  getStyles (): string {
    return this._styleString
  }

  id: string
  name: string
  style: StyleObject

  private _styleString: string
}

/**
 * Create a style handling object.
 */
export class FreeStyle {
  id: string = 'f' + id++

  private _cache: { [id: string]: StyleType } = {}
  private _cacheCount: { [id: string]: number } = {}
  private _children: { [id: string]: FreeStyle } = {}
  private _childrenCount: { [id: string]: number } = {}
  private _listeners: Array<ChangeListenerFunction> = []
  private _styleString: string = ''
  private _invalidStyleString: boolean = false

  add (o: StyleType): StyleType {
    var count = this._cacheCount[o.id] || 0

    this._cacheCount[o.id] = count + 1

    if (count === 0) {
      this._cache[o.id] = o
      this.emitChange('add', o)
    }

    return o
  }

  has (o: StyleType): boolean {
    return this._cacheCount[o.id] > 0
  }

  remove (o: StyleType): void {
    var count = this._cacheCount[o.id]

    if (count > 0) {
      this._cacheCount[o.id] = count - 1

      if (count === 1) {
        delete this._cache[o.id]
        this.emitChange('remove', o)
      }
    }
  }

  attach (f: FreeStyle): void {
    var count = this._childrenCount[f.id] || 0

    this._childrenCount[f.id] = count + 1

    if (count === 0) {
      this._children[f.id] = f

      f.addChangeListener(this._childListener)

      f.values().forEach((style) => {
        this.add(style)
      })
    }
  }

  detach (f: FreeStyle): void {
    var count = this._childrenCount[f.id]

    if (count > 0) {
      this._childrenCount[f.id] = count - 1

      if (count === 1) {
        this._children[f.id] = undefined

        f.removeChangeListener(this._childListener)

        f.values().forEach((style) => {
          this.remove(style)
        })
      }
    }
  }

  createStyle (...style: StyleObject[]): Style {
    return new Style(normalizeStyles.apply(null, style))
  }

  registerStyle (...style: StyleObject[]): Style {
    return <Style> this.add(this.createStyle.apply(this, style))
  }

  createKeyframes (...style: StyleObject[]): Keyframes {
    return new Keyframes(normalizeStyles.apply(null, style))
  }

  registerKeyframes (...style: StyleObject[]): Keyframes {
    return <Keyframes> this.add(this.createKeyframes.apply(this, style))
  }

  url (url: string): string {
    return 'url("' + encodeURI(url) + '")'
  }

  join (...classList: Array<string | Object | void>): string {
    var classNames: string[] = []

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

  values (): StyleType[] {
    var cache = this._cache

    return Object.keys(cache).map(function (key) {
      return cache[key]
    })
  }

  getStyles (): string {
    if (this._invalidStyleString) {
      this._styleString = freeStyleToString(this)
      this._invalidStyleString = false
    }

    return this._styleString
  }

  /* istanbul ignore next */
  inject (target?: HTMLElement): HTMLElement {
    target = target || document.head

    var node = document.createElement('style')
    node.innerHTML = this.getStyles()
    target.appendChild(node)

    return node
  }

  addChangeListener (fn: ChangeListenerFunction): void {
    this._listeners.push(fn)
  }

  removeChangeListener (fn: ChangeListenerFunction): void {
    var listeners = this._listeners
    var index = listeners.indexOf(fn)

    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  emitChange (type: string, o: StyleType): void {
    var listeners = this._listeners

    // Invalidate the current style string (add/remove occured).
    this._invalidStyleString = true

    for (var i = 0; i < listeners.length; i++) {
      var fn = listeners[i]
      fn(type, o, this)
    }
  }

  private _childListener = (type: string, o: StyleType): void => {
    if (type === 'add') {
      this.add(o)
    } else {
      this.remove(o)
    }
  }
}

/**
 * Create a Free Style container instance.
 */
export function create () {
  return new FreeStyle()
}
