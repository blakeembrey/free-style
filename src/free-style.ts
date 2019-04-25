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

const upperCasePattern = /[A-Z]/g
const msPattern = /^ms-/
const interpolatePattern = /&/g
const escapePattern = /[ !#$%&()*+,./;<=>?@[\]^`{|}~"'\\]/g
const propLower = (m: string) => `-${m.toLowerCase()}`

/**
 * CSS properties that are valid unit-less numbers.
 *
 * Ref: https://github.com/facebook/react/blob/master/packages/react-dom/src/shared/CSSProperty.js
 */
const CSS_NUMBER_PROPERTIES = [
  'animation-iteration-count',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'box-flex',
  'box-flex-group',
  'box-ordinal-group',
  'column-count',
  'columns',
  'counter-increment',
  'counter-reset',
  'flex',
  'flex-grow',
  'flex-positive',
  'flex-shrink',
  'flex-negative',
  'flex-order',
  'font-weight',
  'grid-area',
  'grid-column',
  'grid-column-end',
  'grid-column-span',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-span',
  'grid-row-start',
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
  'flood-opacity',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width'
]

/**
 * Map of css number properties.
 */
const CSS_NUMBER: { [key: string]: true } = Object.create(null)

// Add vendor prefixes to all unit-less properties.
for (const prefix of ['-webkit-', '-ms-', '-moz-', '-o-', '']) {
  for (const property of CSS_NUMBER_PROPERTIES) {
    CSS_NUMBER[prefix + property] = true
  }
}

/**
 * Escape a CSS class name.
 */
export const escape = (str: string) => str.replace(escapePattern, '\\$&')

/**
 * Transform a JavaScript property into a CSS property.
 */
export function hyphenate (propertyName: string): string {
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
function styleToString (key: string, value: PropertyValue) {
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
  const properties: Array<[string, PropertyValue | PropertyValue[]]> = []
  const nestedStyles: Array<[string, Styles]> = []
  let isUnique = false

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const value = styles[key]

    if (value !== null && value !== undefined) {
      if (key === IS_UNIQUE) {
        isUnique = true
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        nestedStyles.push([key.trim(), value])
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
function stringifyProperties (properties: Array<[string, PropertyValue | PropertyValue[]]>) {
  return properties.map(([name, value]) => {
    if (!Array.isArray(value)) return styleToString(name, value)

    return value.map(x => styleToString(name, x)).join(';')
  }).join(';')
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

interface Stylize {
  rules: [string, Stylize, string][] // rule, nested, style
  styles: [string, string, boolean][] // selector, style, isUnique
}

/**
 * Recursive loop building styles with deferred selectors.
 */
function stylize (
  selector: string,
  styles: Styles,
  self: Stylize,
  parent?: string
) {
  const { styleString, nestedStyles, isUnique } = parseStyles(styles, selector !== '')
  let pid = styleString

  if (selector.charCodeAt(0) === 64 /* @ */) {
    const child: Stylize = { rules: [], styles: [] }
    self.rules.push([selector, child, parent ? '' : styleString])

    // Nested styles support (e.g. `.foo > @media > .bar`).
    if (styleString && parent) child.styles.push([parent, styleString, isUnique])

    for (const [name, value] of nestedStyles) {
      pid += name + stylize(name, value, child, parent)
    }
  } else {
    const key = parent ? interpolate(selector, parent) : selector

    if (styleString) self.styles.push([key, styleString, isUnique])

    for (const [name, value] of nestedStyles) {
      pid += name + stylize(name, value, self, key)
    }
  }

  return pid
}

/**
 * Transform `Stylize` tree into actual styles.
 */
function composeStylize (cache: Cache<Rule | Style>, pid: string, stylize: Stylize, className: string, isStyle: boolean) {
  for (const [selector, styleString, isUnique] of stylize.styles) {
    const key = isStyle ? interpolate(selector, className) : selector
    const id = isUnique ? `u\0${(++uniqueId).toString(36)}` : `s\0${pid}\0${styleString}`
    const style = new Style(styleString, id)
    style.add(new Selector(key, `k\0${pid}\0${key}`))
    cache.add(style)
  }

  for (const [selector, nested, styleString] of stylize.rules) {
    const rule = new Rule(selector, styleString, `r\0${pid}\0${selector}\0${styleString}`)
    composeStylize(rule, pid, nested, className, isStyle)
    cache.add(rule)
  }
}

/**
 * Cache to list to styles.
 */
function join (arr: string[]): string {
  let res = ''
  for (let i = 0; i < arr.length; i++) res += arr[i]
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
  getStyles (): string
}

/**
 * Implement a cache/event emitter.
 */
export class Cache <T extends Container<any>> {
  sheet: string[] = []
  changeId = 0

  private _keys: string[] = []
  private _children: Record<string, T | undefined> = Object.create(null)
  private _counters: Record<string, number | undefined> = Object.create(null)

  constructor (public changes: Changes = noopChanges) {}

  add <U extends T> (style: U): U {
    const count = this._counters[style.id] || 0
    const item: U = this._children[style.id] || style.clone()

    this._counters[style.id] = count + 1

    if (count === 0) {
      this._children[item.id] = item
      this._keys.push(item.id)
      this.sheet.push(item.getStyles())
      this.changeId++
      this.changes.add(item, this._keys.length - 1)
    } else if (item instanceof Cache && style instanceof Cache) {
      const curIndex = this._keys.indexOf(style.id)
      const prevItemChangeId = item.changeId

      item.merge(style)

      if (item.changeId !== prevItemChangeId) {
        this.sheet.splice(curIndex, 1, item.getStyles())
        this.changeId++
        this.changes.change(item, curIndex, curIndex)
      }
    }

    return item
  }

  remove (style: T): void {
    const count = this._counters[style.id]

    if (count !== undefined && count > 0) {
      this._counters[style.id] = count - 1

      const item = this._children[style.id]!
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

  values (): T[] {
    return this._keys.map(key => this._children[key]!)
  }

  merge (cache: Cache<any>) {
    for (const item of cache.values()) this.add(item)
    return this
  }

  unmerge (cache: Cache<any>) {
    for (const item of cache.values()) this.remove(item)
    return this
  }

  clone (): Cache<T> {
    return new Cache<T>().merge(this)
  }
}

/**
 * Selector is a dumb class made to represent nested CSS selectors.
 */
export class Selector implements Container<Selector> {
  constructor (public selector: string, public id: string) {}

  getStyles () {
    return this.selector
  }

  clone (): Selector {
    return new Selector(this.selector, this.id)
  }
}

/**
 * The style container registers a style string with selectors.
 */
export class Style extends Cache<Selector> implements Container<Style> {
  constructor (public style: string, public id: string) {
    super()
  }

  getStyles (): string {
    return `${this.sheet.join(',')}{${this.style}}`
  }

  clone (): Style {
    return new Style(this.style, this.id).merge(this)
  }
}

/**
 * Implement rule logic for style output.
 */
export class Rule extends Cache<Rule | Style> implements Container<Rule> {
  constructor (
    public rule: string,
    public style: string,
    public id: string
  ) {
    super()
  }

  getStyles (): string {
    return `${this.rule}{${this.style}${join(this.sheet)}}`
  }

  clone (): Rule {
    return new Rule(this.rule, this.style, this.id).merge(this)
  }
}

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle extends Cache<Rule | Style> implements Container<FreeStyle> {
  constructor (
    public hash: HashFunction,
    public debug: boolean,
    public id: string,
    changes?: Changes
  ) {
    super(changes)
  }

  registerStyle (styles: Styles, displayName?: string) {
    const self: Stylize = { rules: [], styles: [] }
    const pid = stylize('&', styles, self)
    const hash = `f${this.hash(pid)}`
    const id = this.debug && displayName ? `${displayName}_${hash}` : hash
    composeStylize(this, pid, self, `.${escape(id)}`, true)
    return id
  }

  registerKeyframes (keyframes: Styles, displayName?: string) {
    return this.registerHashRule('@keyframes', keyframes, displayName)
  }

  registerHashRule (prefix: string, styles: Styles, displayName?: string) {
    const self: Stylize = { rules: [], styles: [] }
    const pid = stylize('', styles, self)
    const hash = `f${this.hash(pid)}`
    const id = displayName ? `${displayName}_${hash}` : hash
    const rule = new Rule(`${prefix} ${escape(id)}`, '', `h\0${pid}\0${prefix}`)
    composeStylize(rule, pid, self, '', false)
    this.add(rule)
    return id
  }

  registerRule (rule: string, styles: Styles) {
    const self: Stylize = { rules: [], styles: [] }
    const pid = stylize(rule, styles, self)
    return composeStylize(this, pid, self, '', false)
  }

  registerCss (styles: Styles) {
    return this.registerRule('', styles)
  }

  getStyles (): string {
    return join(this.sheet)
  }

  clone (): FreeStyle {
    return new FreeStyle(this.hash, this.debug, this.id, this.changes).merge(this)
  }
}

/**
 * Exports a simple function to create a new instance.
 */
export function create (
  hash: HashFunction = stringHash,
  debug: boolean = typeof (process as any) !== 'undefined' && (process.env as any).NODE_ENV !== 'production',
  changes: Changes = noopChanges
) {
  return new FreeStyle(hash, debug, `f${(++uniqueId).toString(36)}`, changes)
}
