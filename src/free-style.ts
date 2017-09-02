/**
 * The unique id is used to get a unique hash on styles (no merging).
 */
let uniqueId = 0

/**
 * Valid CSS property values.
 */
export type PropertyValue = null | undefined | number | boolean | string | Array<number | boolean | string>

/**
 * User styles object.
 */
export interface Styles {
  [selector: string]: PropertyValue | Styles
}

/**
 * Storing properties alphabetically ordered during parse.
 */
type Properties = Array<[string, PropertyValue]>
type NestedStyles = Array<[string, Styles]>

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
function hyphenate (propertyName: string): string {
  return propertyName
    .replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
    .toLowerCase()
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
function styleToString (key: string, value: string | number | boolean) {
  if (typeof value === 'number' && value !== 0 && !CSS_NUMBER[key]) {
    value = `${value}px`
  }

  return `${key}:${value}`
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
function parseStyles (styles: Styles, hasNestedStyles: boolean) {
  const properties: Properties = []
  const nestedStyles: NestedStyles = []
  let isUnique = false

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const value = styles[key]

    if (key === IS_UNIQUE) {
      isUnique = !!value
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
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
  const result: string[] = []

  for (const [name, value] of properties) {
    if (value != null) {
      if (Array.isArray(value)) {
        for (const val of value) {
          result.push(styleToString(name, val))
        }
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
function stylize (cache: Cache<any>, selector: string, styles: Styles, list: [string, Style][], parent?: string) {
  const { properties, nestedStyles, isUnique } = parseStyles(styles, !!selector)
  const styleString = stringifyProperties(properties)
  let pid = styleString

  if (selector.charCodeAt(0) === 64 /* @ */) {
    const rule = cache.add(new Rule(selector, parent ? undefined : styleString, cache.hash))

    // Nested styles support (e.g. `.foo > @media > .bar`).
    if (styleString && parent) {
      const style = rule.add(new Style(styleString, rule.hash, isUnique ? `u${(++uniqueId).toString(36)}` : undefined))
      list.push([parent, style])
    }

    for (const [name, value] of nestedStyles) {
      pid += name + stylize(rule, name, value, list, parent)
    }
  } else {
    const key = parent ? interpolate(selector, parent) : selector

    if (styleString) {
      const style = cache.add(new Style(styleString, cache.hash, isUnique ? `u${(++uniqueId).toString(36)}` : undefined))
      list.push([key, style])
    }

    for (const [name, value] of nestedStyles) {
      pid += name + stylize(cache, name, value, list, key)
    }
  }

  return pid
}

/**
 * Register all styles, but collect for selector interpolation using the hash.
 */
function composeStyles (container: FreeStyle, selector: string, styles: Styles, isStyle: boolean, displayName?: string) {
  const cache = new Cache<Rule | Style>(container.hash)
  const list: [string, Style][] = []
  const pid = stylize(cache, selector, styles, list)

  const hash = `f${cache.hash(pid)}`
  const id = displayName ? `${displayName}_${hash}` : hash

  for (const [selector, style] of list) {
    const key = isStyle ? interpolate(selector, `.${id}`) : selector
    style.add(new Selector(key, style.hash, undefined, pid))
  }

  return { cache, pid, id }
}

/**
 * Get the styles string for a container class.
 */
function toStyles (container: Cache<Container<any>>, sep = '') {
  return container.values().map(x => x.getStyles()).join(sep)
}

/**
 * Propagate change events.
 */
export interface Changes {
  add (style: Container<any>, index: number): void
  change (style: Container<any>, oldIndex: number, newIndex: number): void
  remove (style: Container<any>, index: number): void
}

/**
 * Noop changes.
 */
const noopChanges: Changes = {
  add: () => undefined,
  change: () => undefined,
  remove: () => undefined
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
 * Implement a cache/event emitter.
 */
export class Cache <T extends Container<any>> {

  changeId = 0

  private _children: { [id: string]: T } = Object.create(null)
  private _keys: string[] = []
  private _counters: { [id: string]: number } = Object.create(null)

  private _cacheStyles: string
  private _cacheChangeId: number

  constructor (public hash = stringHash, public changes: Changes = noopChanges) {}

  values (): T[] {
    return this._keys.map(x => this._children[x])
  }

  add <U extends T> (style: U): U {
    const count = this._counters[style.id] || 0
    const item = this._children[style.id] || style.clone()

    this._counters[style.id] = count + 1

    if (count === 0) {
      this._keys.push(item.id)
      this._children[item.id] = item
      this.changeId++
      this.changes.add(item, this._keys.length - 1)
    } else {
      // Check if contents are different.
      if (item.getIdentifier() !== style.getIdentifier()) {
        throw new TypeError(`Hash collision: ${style.getStyles()} === ${item.getStyles()}`)
      }

      const oldIndex = this._keys.indexOf(style.id)
      const newIndex = this._keys.length - 1
      const prevChangeId = this.changeId

      if (oldIndex !== newIndex) {
        this._keys.splice(oldIndex, 1)
        this._keys.push(style.id)
        this.changeId++
      }

      if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.merge(style)

        if (item.changeId !== prevChangeId) {
          this.changeId++
        }
      }

      if (this.changeId !== prevChangeId) {
        this.changes.change(item, oldIndex, newIndex)
      }
    }

    return item as U
  }

  remove (style: T): void {
    const count = this._counters[style.id]

    if (count > 0) {
      this._counters[style.id] = count - 1

      const item = this._children[style.id]
      const index = this._keys.indexOf(item.id)

      if (count === 1) {
        delete this._counters[style.id]
        delete this._children[style.id]

        this._keys.splice(index, 1)
        this.changeId++
        this.changes.remove(item, index)
      } else if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.unmerge(style)

        if (item.changeId !== prevChangeId) {
          this.changeId++
          this.changes.change(item, index, index)
        }
      }
    }
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

  computeStyles () {
    return ''
  }

  getStyles (): string {
    if (this._cacheChangeId !== this.changeId) {
      this._cacheChangeId = this.changeId
      this._cacheStyles = this.computeStyles()
    }

    return this._cacheStyles
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

  computeStyles (): string {
    return `${toStyles(this, ',')}{${this.style}}`
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

  computeStyles (): string {
    return `${this.rule}{${this.style}${toStyles(this)}}`
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

  constructor (
    public hash = stringHash,
    public debug = typeof process !== 'undefined' && process.env['NODE_ENV'] !== 'production',
    public id = `f${(++uniqueId).toString(36)}`,
    changes?: Changes
  ) {
    super(hash, changes)
  }

  registerStyle (styles: Styles, displayName?: string) {
    const { cache, id } = composeStyles(this, '&', styles, true, this.debug ? displayName : undefined)
    this.merge(cache)
    return id
  }

  registerKeyframes (keyframes: Styles, displayName?: string) {
    return this.registerHashRule('@keyframes', keyframes, displayName)
  }

  registerHashRule (prefix: string, styles: Styles, displayName?: string) {
    const { cache, pid, id } = composeStyles(this, '', styles, false, this.debug ? displayName : undefined)
    const rule = new Rule(`${prefix} ${id}`, undefined, this.hash, undefined, pid)
    this.add(rule.merge(cache))
    return id
  }

  registerRule (rule: string, styles: Styles) {
    this.merge(composeStyles(this, rule, styles, false).cache)
  }

  registerCss (styles: Styles) {
    this.merge(composeStyles(this, '', styles, false).cache)
  }

  computeStyles (): string {
    return toStyles(this)
  }

  getIdentifier () {
    return this.id
  }

  clone (): FreeStyle {
    return new FreeStyle(this.hash, this.debug, this.id, this.changes).merge(this)
  }

}

/**
 * Exports a simple function to create a new instance.
 */
export function create (hash?: HashFunction, debug?: boolean, changes?: Changes) {
  return new FreeStyle(hash, debug, undefined, changes)
}
