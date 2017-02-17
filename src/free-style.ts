/**
 * Increment through IDs for FreeStyle, which can't generate hashed IDs.
 */
let instanceId = 0

/**
 * The unique id is used to get a unique hash on styles (no merging).
 */
let uniqueId = 0

/**
 * Valid CSS property names.
 */
export type PropertyName = string

/**
 * Valid CSS property values.
 */
export type PropertyValue = null | undefined | number | boolean | string | Array<null | undefined | number | boolean | string>

/**
 * User styles object.
 */
export interface Styles {
  [selector: string]: PropertyValue | Styles
}

/**
 * Storing properties alphabetically ordered during parse.
 */
type Properties = Array<[PropertyName, PropertyValue]>
type NestedStyles = Array<[PropertyName, Styles]>

/**
 * Tag styles with this string to get unique hash outputs.
 */
export const IS_UNIQUE = '__DO_NOT_DEDUPE_STYLE__'

/**
 * CSS properties that are valid unit-less numbers.
 */
const CSS_NUMBER: { [propertyName: string]: boolean } = {
  'animation-iteration-count': true,
  'box-flex': true,
  'box-flex-group': true,
  'column-count': true,
  'counter-increment': true,
  'counter-reset': true,
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

// Add vendor prefixes to all unit-less properties.
for (const prefix of ['-webkit-', '-ms-', '-moz-', '-o-']) {
  for (const property of Object.keys(CSS_NUMBER)) {
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
function isNestedStyle (value: any): value is Styles {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Hash algorithm interface.
 */
export type HashFunction = (str: string) => string

/**
 * Generate a hash value from a string.
 */
export function stringHash (str: string): string {
  let value = 5381
  let i = str.length

  while (i) {
    value = (value * 33) ^ str.charCodeAt(--i)
  }

  return (value >>> 0).toString(36)
}

/**
 * Transform a style string to a CSS string.
 */
function styleToString (name: PropertyName, value: string | number | boolean) {
  if (typeof value === 'number' && value !== 0 && !CSS_NUMBER[name]) {
    value = `${value}px`
  }

  return `${name}:${String(value).replace(/([\{\}\[\]])/g, '\\$1')}`
}

/**
 * Sort an array of tuples by first value.
 */
function sortTuples <T extends any[]> (value: T[]): T[] {
  return value.sort((a, b) => a[0] > b[0] ? 1 : -1)
}

/**
 * Categorize user styles.
 */
function parseUserStyles (styles: Styles, hasNestedStyles: boolean) {
  const properties: Properties = []
  const nestedStyles: NestedStyles = []
  let isUnique = false

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const value = styles[key]

    if (key === IS_UNIQUE) {
      isUnique = !!value
    } else if (isNestedStyle(value)) {
      nestedStyles.push([key.trim(), value])
    } else {
      properties.push([hyphenate(key.trim()), value])
    }
  }

  return {
    properties: sortTuples(properties),
    nestedStyles: hasNestedStyles ? nestedStyles : sortTuples(nestedStyles),
    isUnique
  }
}

/**
 * Stringify an array of property tuples.
 */
function stringifyProperties (properties: Properties) {
  let result: string[] = []

  for (const [name, value] of properties) {
    if (value != null) {
      if (Array.isArray(value)) {
        value.forEach(function (value) {
          value && result.push(styleToString(name, value))
        })
      } else {
        result.push(styleToString(name, value))
      }
    }
  }

  return result.join(';')
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
 * Recursive loop building styles with deferred selectors.
 */
function stylize (cache: Cache<any>, userStyles: Styles, selector: string, list: [Cache<any>, string, Style][], isStyle: boolean) {
  const { properties, nestedStyles, isUnique } = parseUserStyles(userStyles, isStyle)
  const styleString = stringifyProperties(properties)
  let pid = styleString

  // Only create style instances when styles exists.
  if (styleString) {
    const style = new Style(styleString, cache.hash, isUnique ? `u${(++uniqueId).toString(36)}` : undefined)
    cache.add(style)
    list.push([cache, selector, style])
  }

  for (const [name, value] of nestedStyles) {
    pid += name

    if (isAtRule(name)) {
      const rule = cache.add(new Rule(name, undefined, cache.hash))
      pid += stylize(rule, value, selector, list, isStyle)
    } else {
      pid += stylize(cache, value, isStyle ? interpolate(name, selector) : name, list, isStyle)
    }
  }

  return pid
}

/**
 * Register all styles, but collect for selector interpolation using the hash.
 */
function collectHashedStyles (cache: Cache<Style | Rule>, userStyles: Styles, isStyle: boolean, displayName?: string) {
  const list: [Cache<any>, string, Style][] = []
  const pid = stylize(cache, userStyles, '&', list, isStyle)

  const hash = `f${cache.hash(pid)}`
  const id = displayName ? `${displayName}_${hash}` : hash

  for (const [cache, selector, style] of list) {
    const key = isStyle ? interpolate(selector, `.${id}`) : selector
    cache.get(style).add(new Selector(key, style.hash, undefined, pid))
  }

  return { pid, id }
}

/**
 * Recursively register styles on a container instance.
 */
function registerStyle (container: FreeStyle, styles: Styles, displayName?: string): string {
  const cache = new Cache<Rule | Style>(container.hash)
  const { id } = collectHashedStyles(cache, styles, true, displayName)
  container.merge(cache)
  return id
}

/**
 * Parse and register keyframes on the current instance.
 */
function registerHashRule (container: FreeStyle, prefix: string, styles: Styles, displayName?: string) {
  const cache = new Cache<Rule | Style>(container.hash)
  const { pid, id } = collectHashedStyles(cache, styles, false, displayName)

  const atRule = new Rule(`${prefix} ${id}`, undefined, container.hash, undefined, pid)
  atRule.merge(cache)
  container.add(atRule)
  return id
}

/**
 * Create user rule. Simplified collection of styles, since it doesn't need a unique id hash.
 */
function registerRule (container: FreeStyle | Rule, selector: string, styles: Styles, parent?: string): void {
  const { properties, nestedStyles, isUnique } = parseUserStyles(styles, true)
  const styleString = stringifyProperties(properties)

  if (isAtRule(selector)) {
    const rule = new Rule(selector, styleString, container.hash, isUnique ? `u${(++uniqueId).toString(36)}` : undefined)

    for (const [name, value] of nestedStyles) {
      registerRule(rule, name, value, parent)
    }

    container.add(rule)
  } else {
    const style = new Style(styleString, container.hash, isUnique ? `u${(++uniqueId).toString(36)}` : undefined)
    const key = parent ? interpolate(selector, parent) : selector

    style.add(new Selector(key, style.hash, undefined))
    container.add(style)

    for (const [name, value] of nestedStyles) {
      registerRule(container, name, value, key)
    }
  }
}

/**
 * Get the styles string for a container class.
 */
function getStyles (container: FreeStyle | Rule) {
  return container.values().map(style => style.getStyles()).join('')
}

/**
 * Cacheable interface.
 */
export interface Container <T> {
  id: string
  clone (): T
  getIdentifier (): string
  getStyles (): string
}

/**
 * Change listeners are registered to react to CSS changes.
 */
export interface ChangeListenerFunction {
  (style: Container<any>): any
}

/**
 * Implement a cache/event emitter.
 */
export class Cache <T extends Container<any>> {

  changeId = 0

  private _children: { [id: string]: T } = {}
  private _keys: string[] = []
  private _counts: { [id: string]: number } = {}

  constructor (public hash: HashFunction) {}

  values (): T[] {
    return this._keys.map(x => this._children[x])
  }

  add <U extends T> (style: U): U {
    const count = this._counts[style.id] || 0
    const item = this._children[style.id] || style.clone()

    this._counts[style.id] = count + 1

    if (count === 0) {
      this._keys.push(item.id)
      this._children[item.id] = item
      this.changeId++
    } else {
      // Check if contents are different.
      if (item.getIdentifier() !== style.getIdentifier()) {
        throw new TypeError(`Hash collision: ${style.getStyles()} === ${item.getStyles()}`)
      }

      this._keys.splice(this._keys.indexOf(style.id), 1)
      this._keys.push(style.id)

      if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.merge(style)

        if (item.changeId !== prevChangeId) {
          this.changeId++
        }
      }
    }

    return item as U
  }

  remove (style: T): void {
    const count = this._counts[style.id]

    if (count > 0) {
      this._counts[style.id] = count - 1

      const item = this._children[style.id]

      if (count === 1) {
        delete this._counts[style.id]
        delete this._children[style.id]
        this._keys.splice(this._keys.indexOf(style.id), 1)
        this.changeId++
      } else if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.unmerge(style)

        if (item.changeId !== prevChangeId) {
          this.changeId++
        }
      }
    }
  }

  get (container: Container<any>) {
    return this._children[container.id]
  }

  merge <U extends Cache<any>> (cache: U) {
    for (const value of cache.values()) {
      this.add(value)
    }

    return this
  }

  unmerge <U extends Cache<any>> (cache: U) {
    for (const value of cache.values()) {
      this.remove(value)
    }

    return this
  }

  clone () {
    return new Cache(this.hash).merge(this)
  }

}

/**
 * Selector is a dumb class made to represent nested CSS selectors.
 */
export class Selector implements Container<Selector> {

  constructor (
    public selector: string,
    public hash: HashFunction,
    public id = `s${hash(selector)}`,
    public pid = ''
  ) {}

  getStyles () {
    return this.selector
  }

  getIdentifier () {
    return `${this.pid}.${this.selector}`
  }

  clone () {
    return new Selector(this.selector, this.hash, this.id, this.pid)
  }

}

/**
 * The style container registers a style string with selectors.
 */
export class Style extends Cache<Selector> implements Container<Style> {

  constructor (public style: string, public hash: HashFunction, public id = `c${hash(style)}`) {
    super(hash)
  }

  getStyles (): string {
    return `${this.values().map(x => x.selector).join(',')}{${this.style}}`
  }

  getIdentifier () {
    return this.style
  }

  clone (): Style {
    return new Style(this.style, this.hash, this.id).merge(this)
  }

}

/**
 * Implement rule logic for style output.
 */
export class Rule extends Cache<Rule | Style> implements Container<Rule> {

  constructor (
    public rule: string,
    public style = '',
    public hash: HashFunction,
    public id = `a${hash(`${rule}.${style}`)}`,
    public pid = ''
  ) {
    super(hash)
  }

  getStyles (): string {
    return `${this.rule}{${this.style}${getStyles(this)}}`
  }

  getIdentifier () {
    return `${this.pid}.${this.rule}.${this.style}`
  }

  clone (): Rule {
    return new Rule(this.rule, this.style, this.hash, this.id, this.pid).merge(this)
  }

}

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle extends Cache<Rule | Style> implements Container<FreeStyle> {

  constructor (public hash: HashFunction, public debug: boolean, public id = `f${(++instanceId).toString(36)}`) {
    super(hash)
  }

  registerStyle (styles: Styles, displayName?: string) {
    return registerStyle(this, styles, this.debug ? displayName : undefined)
  }

  registerKeyframes (keyframes: Styles, displayName?: string) {
    return registerHashRule(this, '@keyframes', keyframes, this.debug ? displayName : undefined)
  }

  registerHashRule (rule: string, styles: Styles, displayName?: string) {
    return registerHashRule(this, rule, styles, this.debug ? displayName : undefined)
  }

  registerRule (rule: string, styles: Styles) {
    return registerRule(this, rule, styles)
  }

  getStyles () {
    return getStyles(this)
  }

  getIdentifier () {
    return this.id
  }

  clone (): FreeStyle {
    return new FreeStyle(this.hash, this.debug, this.id).merge(this)
  }

}

/**
 * Exports a simple function to create a new instance.
 */
export function create (hash = stringHash, debug = process.env['NODE_ENV'] !== 'production') {
  return new FreeStyle(hash, debug)
}
