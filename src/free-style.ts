/**
 * Increment through IDs for FreeStyle, which can't generate hashed IDs.
 */
let instanceId = 0

/**
 * Valid CSS property names.
 */
export type PropertyName = string

/**
 * Valid CSS property values.
 */
export type PropertyValue = void | number | string | string[] | number[]

/**
 * CSS styles object.
 */
export interface Styles {
  [propertyName: string]: PropertyValue
}

/**
 * Storing properties alphabetically ordered during parse.
 */
type Properties = Array<[PropertyName, PropertyValue]>
type NestedStyles = Array<[PropertyName, UserStyles]>

/**
 * CSS properties that are valid unit-less numbers.
 */
const CSS_NUMBER: { [propertyName: string]: boolean } = {
  'box-flex': true,
  'box-flex-group': true,
  'column-count': true,
  'flex': true,
  'flex-grow': true,
  'flex-positive': true,
  'flex-shrink': true,
  'flex-negative': true,
  'font-weight': true,
  'line-clamp': true,
  'line-height': true,
  'opacity': true,
  'order': true,
  'orphans': true,
  'tab-size': true,
  'widows': true,
  'z-index': true,
  'zoom': true,

  // SVG properties.
  'fill-opacity': true,
  'stroke-dashoffset': true,
  'stroke-opacity': true,
  'stroke-width': true
}

/**
 * CSS vendor prefixes.
 */
const VENDOR_PREFIXES = ['-webkit-', '-ms-', '-moz-', '-o-']

// Add vendor prefixes to all unit-less properties.
for (const property of Object.keys(CSS_NUMBER)) {
  for (const prefix of VENDOR_PREFIXES) {
    CSS_NUMBER[prefix + property] = true
  }
}

/**
 * Transform a JavaScript property into a CSS property.
 */
function hyphenate (propertyName: PropertyName): PropertyName {
  return propertyName
    .replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
    .toLowerCase()
}

/**
 * Check if a property name should pop to the top level of CSS.
 */
function isAtRule (propertyName: PropertyName): boolean {
  return propertyName.charAt(0) === '@'
}

/**
 * Check if a value is a nested style definition.
 */
function isNestedStyle (value: any): boolean {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Generate a hash value from a string.
 */
function hash (str: string, seed?: number): number {
  let value = seed || 5381
  let i = str.length

  while (i) {
    value = (value * 33) ^ str.charCodeAt(--i)
  }

  return value >>> 0;
}

/**
 * Convert a hash to a string.
 */
function hashToString (hash: number): string {
  return hash.toString(36)
}

/**
 * Generate a hash string from a string.
 */
function hashString (str: string): string {
  return hashToString(hash(str))
}

/**
 * Transform a style string to a CSS string.
 */
function styleStringToString (name: PropertyName, value: string | number | void) {
  if (value == null) {
    return ''
  }

  if (typeof value === 'number' && value !== 0 && !CSS_NUMBER[name]) {
    value += 'px'
  }

  return `${name}:${String(value).replace(/([\{\}\[\]])/g, '\\$1')}`
}

/**
 * Transform a style into a CSS string.
 */
function styleToString (name: PropertyName, value: PropertyValue): string {
  if (Array.isArray(value)) {
    return (<Array<any>> value).map(value => {
      return styleStringToString(name, value)
    }).join(';')
  }

  return styleStringToString(name, <string | number | void> value)
}

/**
 * Sort an array of tuples by first value.
 */
function sortTuples <T> (value: T[]): T[] {
  return value.sort((a: any, b: any) => a[0] > b[0] ? 1 : -1)
}

/**
 * Categorize user styles.
 */
function parseUserStyles (styles: UserStyles) {
  const properties: Properties = []
  const nestedStyles: NestedStyles = []

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const value = styles[key]

    if (isNestedStyle(value)) {
      nestedStyles.push([key.trim(), value])
    } else {
      properties.push([hyphenate(key.trim()), value])
    }
  }

  return {
    properties: sortTuples(properties),
    nestedStyles: sortTuples(nestedStyles)
  }
}

/**
 * Stringify an array of property tuples.
 */
function stringifyProperties (properties: Properties) {
  return properties.map(p => styleToString(p[0], p[1])).join(';')
}

/**
 * Interpolate CSS selectors.
 */
function interpolate (selector: string, parent: string) {
  if (selector.indexOf('&') > -1) {
    return selector.replace(/&/g, parent)
  }

  return `${parent} ${selector}`
}

/**
 * Register all styles, but collect for post-selector correction using the hash.
 */
function collectHashedStyles (container: Cache<any>, styles: UserStyles, shouldInterpolate: boolean) {
  const instances: [string, Style][] = []

  let currentHash = 0

  function stylize (container: Cache<any>, styles: UserStyles, selector: string) {
    const { properties, nestedStyles } = parseUserStyles(styles)
    const styleString = stringifyProperties(properties)
    const style = container.add(new Style(styleString))

    currentHash = hash(styleString, currentHash)
    instances.push([selector, style])

    for (const [name, value] of nestedStyles) {
      currentHash = hash(name, currentHash)

      if (isAtRule(name)) {
        stylize(container.add(new Rule(name)), value, selector)
      } else {
        stylize(container, value, shouldInterpolate ? interpolate(name, selector) : name)
      }
    }
  }

  stylize(container, styles, '&')

  return { currentHash, instances }
}

/**
 * Recursively register styles on a container instance.
 */
function registerUserStyles (container: FreeStyle | Rule, styles: UserStyles): string {
  const { currentHash, instances } = collectHashedStyles(container, styles, true)

  const currentClassName = `f${hashToString(currentHash)}`
  const currentSelector = `.${currentClassName}`

  for (const [selector, style] of instances) {
    style.add(new Selector(interpolate(selector, currentSelector)))
  }

  return currentClassName
}

/**
 * Create user rule. Simplified collect styles, since it doesn't need hashing.
 */
function registerUserRule (container: FreeStyle | Rule, selector: string, styles: UserStyles): void {
  const instances: [string, Style][] = []
  const { properties, nestedStyles } = parseUserStyles(styles)
  const styleString = stringifyProperties(properties)
  const rule = container.add(new Rule(selector, styleString))

  for (const [name, value] of nestedStyles) {
    registerUserRule(rule, name, value)
  }
}

/**
 * Parse and register keyframes on the current instance.
 */
function registerUserHashedRule (container: FreeStyle | Rule, selector: string, styles: UserStyles) {
  const bucket = new Cache<Rule | Style>()
  const { currentHash, instances } = collectHashedStyles(bucket, styles, false)

  for (const [rule, style] of instances) {
    style.add(new Selector(rule))
  }

  const currentIdentifier = `h${hashToString(currentHash)}`
  const atRule = container.add(new Rule(`@${selector} ${currentIdentifier}`))
  atRule.merge(bucket)
  return currentIdentifier
}

/**
 * Get the styles string for a container class.
 */
function getStyles (container: FreeStyle | Rule) {
  return container.values().map(style => style.getStyles()).join('')
}

/**
 * User styles object.
 */
export type UserStyles = any

/**
 * Cacheable interface.
 */
export interface ICacheable <T> {
  id: string
  clone (): T
}

/**
 * Common interface all style classes conform to.
 */
export interface IStyle <T> extends ICacheable <T> {
  getStyles (): string
}

/**
 * Change listeners are registered to react to CSS changes.
 */
export interface ChangeListenerFunction {
  (type?: string, style?: ICacheable<any>[], parent?: any): any
}

/**
 * Implement a cache/event emitter.
 */
export class Cache <T extends ICacheable<any>> {

  private _children: { [id: string]: T } = {}
  private _childrenCount: { [id: string]: number } = {}
  private _listeners: Array<ChangeListenerFunction> = []
  private _mergeListener: ChangeListenerFunction
  private _childListener: ChangeListenerFunction

  constructor () {
    this._mergeListener = (type: string, path: T[]) => {
      const finalItem = path.pop()
      let item: any = this

      for (const cacheItem of path) {
        item = this.get(cacheItem)
      }

      return type === 'add' ? item.add(finalItem) : this.remove(finalItem)
    }

    this._childListener = (type, path, parent) => {
      this.emitChange(type, [parent].concat(path))
    }
  }

  values (): T[] {
    return Object.keys(this._children).map(x => this._children[x])
  }

  empty () {
    for (const key of Object.keys(this._children)) {
      const item = this._children[key]
      let len = this.count(item)

      while (len--) {
        this.remove(item)
      }
    }
  }

  add <U extends T> (style: U): U {
    const count = this._childrenCount[style.id] || 0

    this._childrenCount[style.id] = count + 1

    if (count === 0) {
      this._children[style.id] = style.clone()
      this.emitChange('add', [style])
    }

    const item = <U> this._children[style.id]

    if (style instanceof Cache) {
      if (count === 0) {
        (<any> item).addChangeListener(this._childListener)
      }

      for (const cacheItem of (<any> style).values()) {
        (<any> item).add(cacheItem)
      }
    }

    return item
  }

  get (style: T) {
    return this._children[style.id]
  }

  count (style: T): number {
    return this._childrenCount[style.id] || 0
  }

  remove (style: T): void {
    const count = this._childrenCount[style.id]

    if (count > 0) {
      this._childrenCount[style.id] = count - 1

      const item = this._children[style.id]

      if (count === 1) {
        delete this._children[style.id]
        this.emitChange('remove', [style])
      }

      if (style instanceof Cache) {
        if (count === 1) {
          (<any> item).removeChangeListener(this._childListener)
        }

        for (const cacheItem of (<any> style).values()) {
          (<any> item).remove(cacheItem)
        }
      }
    }
  }

  addChangeListener (fn: ChangeListenerFunction): void {
    this._listeners.push(fn)
  }

  removeChangeListener (fn: ChangeListenerFunction): void {
    const listeners = this._listeners
    const index = listeners.indexOf(fn)

    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  emitChange (type: string, path: ICacheable<any>[]): void {
    for (const listener of this._listeners) {
      listener(type, path, this)
    }
  }

  merge <U extends Cache<T>> (style: U) {
    for (const cacheItem of style.values()) {
      this.add(cacheItem)
    }

    style.addChangeListener(this._mergeListener)
  }

  unmerge <U extends Cache<T>> (style: U) {
    for (const cacheItem of style.values()) {
      this.remove(cacheItem)
    }

    style.removeChangeListener(this._mergeListener)
  }

}

/**
 * Selector is a dumb class made to represent nested CSS selectors.
 */
export class Selector implements ICacheable<Selector> {

  constructor (public selector: string, public id = `s${hashString(selector)}`) {}

  clone () {
    return new Selector(this.selector, this.id)
  }

}

/**
 * The style container registers a style string with selectors.
 */
export class Style extends Cache<Selector> implements IStyle<Style> {

  constructor (public style: string, public id = `c${hashString(style)}`) {
    super()
  }

  getStyles (): string {
    const { style } = this

    return style ? `${this.values().map(x => x.selector).join(',')}{${style}}` : ''
  }

  clone () {
    return new Style(this.style, this.id)
  }

}

/**
 * Implement rule logic for style output.
 */
export class Rule extends Cache<Rule | Style> implements IStyle<Rule> {

  constructor (public rule: string, public style = '', public id = `a${hashString(rule + style)}`) {
    super()
  }

  getStyles (): string {
    return `${this.rule}{${this.style}${getStyles(this)}}`
  }

  clone () {
    return new Rule(this.rule, this.style, this.id)
  }

}

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle extends Cache<Rule | Style> implements IStyle<FreeStyle> {

  constructor (public id = `f${hashToString(++instanceId)}`) {
    super()
  }

  url (url: string): string {
    return 'url("' + encodeURI(url) + '")'
  }

  join (...classList: Array<string | Object | void | string[]>) {
    const classNames: string[] = []

    for (const value of classList) {
      if (typeof value === 'string') {
        classNames.push(value)
      } else if (Array.isArray(value)) {
        classNames.push(this.join.apply(this, value))
      } else if (value != null) {
        for (const key of Object.keys(value)) {
          if ((<any> value)[key]) {
            classNames.push(key)
          }
        }
      }
    }

    return classNames.join(' ')
  }

  registerStyle (styles: UserStyles) {
    return registerUserStyles(this, styles)
  }

  registerRule (rule: string, styles: UserStyles) {
    return registerUserRule(this, rule, styles)
  }

  registerKeyframes (keyframes: UserStyles) {
    return registerUserHashedRule(this, 'keyframes', keyframes)
  }

  /* istanbul ignore next */
  inject (target?: HTMLElement): HTMLElement {
    target = target || document.head

    const node = document.createElement('style')
    node.innerHTML = this.getStyles()
    target.appendChild(node)

    return node
  }

  getStyles () {
    return getStyles(this)
  }

  clone () {
    return new FreeStyle(this.id)
  }

}

/**
 * Exports a simple function to create a new instance.
 */
export function create () {
  return new FreeStyle()
}
