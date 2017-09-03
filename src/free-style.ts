/**
 * The unique id is used for unique hashes.
 */
let uniqueId = 0

/**
 * Valid CSS property values.
 */
export type PropertyValue = number | boolean | string

/**
 * Input styles object.
 */
export interface Styles {
  [selector: string]: null | undefined | PropertyValue | PropertyValue[] | Styles
}

/**
 * Hash algorithm interface.
 */
export type HashFunction = (str: string) => string

/**
 * Tag styles with this string to get unique hashes.
 */
export const IS_UNIQUE = '__DO_NOT_DEDUPE_STYLE__'

type Properties = Array<[string, PropertyValue]>
type NestedStyles = Array<[string, Styles]>

const upperCasePattern = /[A-Z]/g
const msPattern = /^ms-/
const interpolatePattern = /&/g
const propLower = (m: string) => `-${m.toLowerCase()}`

/**
 * CSS properties that are valid unit-less numbers.
 */
const cssNumberProperties = [
  'animation-iteration-count',
  'box-flex',
  'box-flex-group',
  'column-count',
  'counter-increment',
  'counter-reset',
  'flex',
  'flex-grow',
  'flex-positive',
  'flex-shrink',
  'flex-negative',
  'font-weight',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
  // SVG properties.
  'fill-opacity',
  'stroke-dashoffset',
  'stroke-opacity',
  'stroke-width'
]

/**
 * Map of css number properties.
 */
const CSS_NUMBER = Object.create(null)

// Add vendor prefixes to all unit-less properties.
for (const prefix of ['-webkit-', '-ms-', '-moz-', '-o-', '']) {
  for (const property of cssNumberProperties) {
    CSS_NUMBER[prefix + property] = true
  }
}

/**
 * Transform a JavaScript property into a CSS property.
 */
function hyphenate (propertyName: string): string {
  return propertyName
    .replace(upperCasePattern, propLower)
    .replace(msPattern, '-ms-') // Internet Explorer vendor prefix.
}

/**
 * Generate a hash value from a string.
 */
export function stringHash (str: string): string {
  let value = 5381
  let len = str.length

  while (len--) value = (value * 33) ^ str.charCodeAt(len)

  return (value >>> 0).toString(36)
}

/**
 * Transform a style string to a CSS string.
 */
function styleToString (key: string, value: string | number | boolean) {
  if (typeof value === 'number' && value !== 0 && !CSS_NUMBER[key]) {
    return `${key}:${value}px`
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

    if (value !== null && value !== undefined) {
      if (key === IS_UNIQUE) {
        isUnique = true
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          const prop = hyphenate(key.trim())

          for (let i = 0; i < value.length; i++) {
            properties.push([prop, value[i]])
          }
        } else {
          nestedStyles.push([key.trim(), value])
        }
      } else {
        properties.push([hyphenate(key.trim()), value])
      }
    }
  }

  return {
    styleString: stringifyProperties(sortTuples(properties)),
    nestedStyles: hasNestedStyles ? nestedStyles : sortTuples(nestedStyles),
    isUnique
  }
}

/**
 * Stringify an array of property tuples.
 */
function stringifyProperties (properties: Properties) {
  const end = properties.length - 1
  let result = ''

  for (let i = 0; i < properties.length; i++) {
    const [name, value] = properties[i]

    result += styleToString(name, value) + (i === end ? '' : ';')
  }

  return result
}

/**
 * Interpolate CSS selectors.
 */
function interpolate (selector: string, parent: string) {
  if (selector.indexOf('&') > -1) {
    return selector.replace(interpolatePattern, parent)
  }

  return `${parent} ${selector}`
}

/**
 * Recursive loop building styles with deferred selectors.
 */
function stylize (cache: Cache<any>, selector: string, styles: Styles, list: [string, Style][], parent?: string) {
  const { styleString, nestedStyles, isUnique } = parseStyles(styles, !!selector)
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
 * Cache to list to styles.
 */
function join (strings: string[]): string {
  let res = ''
  for (const str of strings) res += str
  return res
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

  sheet: string[] = []
  changeId = 0

  private _keys: string[] = []
  private _children: { [id: string]: T } = Object.create(null)
  private _counters: { [id: string]: number } = Object.create(null)

  constructor (public hash = stringHash, public changes: Changes = noopChanges) {}

  add <U extends T> (style: U): U {
    const count = this._counters[style.id] || 0
    const item = this._children[style.id] || style.clone()

    this._counters[style.id] = count + 1

    if (count === 0) {
      this._children[item.id] = item
      this._keys.push(item.id)
      this.sheet.push(item.getStyles())
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
        if (oldIndex === newIndex) {
          this.sheet.splice(oldIndex, 1, item.getStyles())
        } else {
          this.sheet.splice(oldIndex, 1)
          this.sheet.splice(newIndex, 0, item.getStyles())
        }

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
        this.sheet.splice(index, 1)
        this.changeId++
        this.changes.remove(item, index)
      } else if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId

        item.unmerge(style)

        if (item.changeId !== prevChangeId) {
          this.sheet.splice(index, 1, item.getStyles())
          this.changeId++
          this.changes.change(item, index, index)
        }
      }
    }
  }

  merge (cache: Cache<any>) {
    for (const id of cache._keys) this.add(cache._children[id])

    return this
  }

  unmerge (cache: Cache<any>) {
    for (const id of cache._keys) this.remove(cache._children[id])

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
    return `${this.sheet.join(',')}{${this.style}}`
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
    return `${this.rule}{${this.style}${join(this.sheet)}}`
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

  getStyles (): string {
    return join(this.sheet)
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
