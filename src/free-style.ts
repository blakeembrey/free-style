/**
 * The unique id is used for unique hashes.
 */
let uniqueId = 0;

/**
 * Valid CSS property values.
 */
export type PropertyValue = number | boolean | string;

/**
 * Input styles object.
 */
export interface Styles {
  [selector: string]:
    | null
    | undefined
    | PropertyValue
    | PropertyValue[]
    | Styles;
}

/**
 * Hash algorithm interface.
 */
export type HashFunction = (str: string) => string;

/**
 * Tag styles to get unique hashes (avoids de-duplication).
 */
export const IS_UNIQUE = "__IS_UNIQUE__";

/**
 * Tag styles to set the debug display name.
 */
export const DISPLAY_NAME = "__DISPLAY_NAME__";

/**
 * CSS properties that are valid unit-less numbers.
 *
 * Ref: https://github.com/facebook/react/blob/master/packages/react-dom/src/shared/CSSProperty.js
 */
const CSS_NUMBER: Record<string, true> = {
  "animation-iteration-count": true,
  "border-image-outset": true,
  "border-image-slice": true,
  "border-image-width": true,
  "box-flex": true,
  "box-flex-group": true,
  "box-ordinal-group": true,
  "column-count": true,
  columns: true,
  "counter-increment": true,
  "counter-reset": true,
  flex: true,
  "flex-grow": true,
  "flex-positive": true,
  "flex-shrink": true,
  "flex-negative": true,
  "flex-order": true,
  "font-weight": true,
  "grid-area": true,
  "grid-column": true,
  "grid-column-end": true,
  "grid-column-span": true,
  "grid-column-start": true,
  "grid-row": true,
  "grid-row-end": true,
  "grid-row-span": true,
  "grid-row-start": true,
  "line-clamp": true,
  "line-height": true,
  opacity: true,
  order: true,
  orphans: true,
  "tab-size": true,
  widows: true,
  "z-index": true,
  zoom: true,
  // SVG properties.
  "fill-opacity": true,
  "flood-opacity": true,
  "stop-opacity": true,
  "stroke-dasharray": true,
  "stroke-dashoffset": true,
  "stroke-miterlimit": true,
  "stroke-opacity": true,
  "stroke-width": true
};

// Add vendor prefixes to all unit-less properties.
for (const property of Object.keys(CSS_NUMBER)) {
  for (const prefix of ["-webkit-", "-ms-", "-moz-", "-o-"]) {
    CSS_NUMBER[prefix + property] = true;
  }
}

/**
 * Escape a CSS class name.
 */
export const escape = (str: string) =>
  str.replace(/[ !#$%&()*+,./;<=>?@[\]^`{|}~"'\\]/g, "\\$&");

/**
 * Transform a JavaScript property into a CSS property.
 */
export function hyphenate(propertyName: string): string {
  return propertyName
    .replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`)
    .replace(/^ms-/, "-ms-"); // Internet Explorer vendor prefix.
}

/**
 * Generate a hash value from a string.
 */
export function stringHash(str: string): string {
  let value = 5381;
  let len = str.length;
  while (len--) value = (value * 33) ^ str.charCodeAt(len);
  return (value >>> 0).toString(36);
}

/**
 * Transform a style string to a CSS string.
 */
function styleToString(key: string, value: PropertyValue) {
  if (
    typeof value === "number" &&
    value !== 0 &&
    !CSS_NUMBER.hasOwnProperty(key)
  ) {
    return `${key}:${value}px`;
  }

  return `${key}:${value}`;
}

/**
 * Sort an array of tuples by first value.
 */
function sortTuples<T extends any[]>(value: T[]): T[] {
  return value.sort((a, b) => (a[0] > b[0] ? 1 : -1));
}

/**
 * Categorize user styles.
 */
function parseStyles(styles: Styles, hasNestedStyles: boolean) {
  const properties: Array<[string, PropertyValue | PropertyValue[]]> = [];
  const nestedStyles: Array<[string, Styles]> = [];
  const isUnique = styles[IS_UNIQUE] != null;

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const name = key.trim();
    const value = styles[key];

    if (name[0] !== "_" && value != null) {
      if (typeof value === "object" && !Array.isArray(value)) {
        nestedStyles.push([name, value]);
      } else {
        properties.push([hyphenate(name), value]);
      }
    }
  }

  return {
    style: stringifyProperties(sortTuples(properties)),
    nested: hasNestedStyles ? nestedStyles : sortTuples(nestedStyles),
    isUnique
  };
}

/**
 * Stringify an array of property tuples.
 */
function stringifyProperties(
  properties: Array<[string, PropertyValue | PropertyValue[]]>
) {
  return properties
    .map(([name, value]) => {
      if (!Array.isArray(value)) return styleToString(name, value);

      return value.map(x => styleToString(name, x)).join(";");
    })
    .join(";");
}

/**
 * Interpolate CSS selectors.
 */
function interpolate(selector: string, parent: string) {
  if (selector.indexOf("&") === -1) return `${parent} ${selector}`;
  return selector.replace(/&/g, parent);
}

type StylizeStyle = { selector: string; style: string; isUnique: boolean };
type StylizeRule = {
  selector: string;
  style: string;
  rules: StylizeRule[];
  styles: StylizeStyle[];
};

/**
 * Recursive loop building styles with deferred selectors.
 */
function stylize(
  selector: string,
  styles: Styles,
  rulesList: StylizeRule[],
  stylesList: StylizeStyle[],
  parent?: string
) {
  const { style, nested, isUnique } = parseStyles(styles, selector !== "");
  let pid = style;

  if (selector.charCodeAt(0) === 64 /* @ */) {
    const child: StylizeRule = {
      selector,
      styles: [],
      rules: [],
      style: parent ? "" : style
    };
    rulesList.push(child);

    // Nested styles support (e.g. `.foo > @media > .bar`).
    if (style && parent) {
      child.styles.push({ selector: parent, style, isUnique });
    }

    for (const [name, value] of nested) {
      pid += name + stylize(name, value, child.rules, child.styles, parent);
    }
  } else {
    const key = parent ? interpolate(selector, parent) : selector;

    if (style) stylesList.push({ selector: key, style, isUnique });

    for (const [name, value] of nested) {
      pid += name + stylize(name, value, rulesList, stylesList, key);
    }
  }

  return pid;
}

/**
 * Transform `stylize` tree into style objects.
 */
function composeStylize(
  cache: Cache<Rule | Style>,
  pid: string,
  rulesList: StylizeRule[],
  stylesList: StylizeStyle[],
  className: string,
  isStyle: boolean
) {
  for (const { selector, style, isUnique } of stylesList) {
    const key = isStyle ? interpolate(selector, className) : selector;
    const id = isUnique
      ? `u\0${(++uniqueId).toString(36)}`
      : `s\0${pid}\0${style}`;
    const item = new Style(style, id);
    item.add(new Selector(key, `k\0${pid}\0${key}`));
    cache.add(item);
  }

  for (const { selector, style, rules, styles } of rulesList) {
    const item = new Rule(selector, style, `r\0${pid}\0${selector}\0${style}`);
    composeStylize(item, pid, rules, styles, className, isStyle);
    cache.add(item);
  }
}

/**
 * Cache to list to styles.
 */
function join(arr: string[]): string {
  let res = "";
  for (let i = 0; i < arr.length; i++) res += arr[i];
  return res;
}

/**
 * Propagate change events.
 */
export interface Changes {
  add(style: Container<any>, index: number): void;
  change(style: Container<any>, oldIndex: number, newIndex: number): void;
  remove(style: Container<any>, index: number): void;
}

/**
 * Noop changes.
 */
const noopChanges: Changes = {
  add: () => undefined,
  change: () => undefined,
  remove: () => undefined
};

/**
 * Cacheable interface.
 */
export interface Container<T> {
  id: string;
  clone(): T;
  getStyles(): string;
}

/**
 * Implement a cache/event emitter.
 */
export class Cache<T extends Container<any>> {
  sheet: string[] = [];
  changeId = 0;

  private _keys: string[] = [];
  private _children: Record<string, T | undefined> = Object.create(null);
  private _counters: Record<string, number | undefined> = Object.create(null);

  constructor(public changes: Changes = noopChanges) {}

  add<U extends T>(style: U): U {
    const count = this._counters[style.id] || 0;
    const item: U = this._children[style.id] || style.clone();

    this._counters[style.id] = count + 1;

    if (count === 0) {
      this._children[item.id] = item;
      this._keys.push(item.id);
      this.sheet.push(item.getStyles());
      this.changeId++;
      this.changes.add(item, this._keys.length - 1);
    } else if (item instanceof Cache && style instanceof Cache) {
      const curIndex = this._keys.indexOf(style.id);
      const prevItemChangeId = item.changeId;

      item.merge(style);

      if (item.changeId !== prevItemChangeId) {
        this.sheet.splice(curIndex, 1, item.getStyles());
        this.changeId++;
        this.changes.change(item, curIndex, curIndex);
      }
    }

    return item;
  }

  remove(style: T): void {
    const count = this._counters[style.id];

    if (count !== undefined && count > 0) {
      this._counters[style.id] = count - 1;

      const item = this._children[style.id]!;
      const index = this._keys.indexOf(item.id);

      if (count === 1) {
        delete this._counters[style.id];
        delete this._children[style.id];

        this._keys.splice(index, 1);
        this.sheet.splice(index, 1);
        this.changeId++;
        this.changes.remove(item, index);
      } else if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId;

        item.unmerge(style);

        if (item.changeId !== prevChangeId) {
          this.sheet.splice(index, 1, item.getStyles());
          this.changeId++;
          this.changes.change(item, index, index);
        }
      }
    }
  }

  values(): T[] {
    return this._keys.map(key => this._children[key]!);
  }

  merge(cache: Cache<any>) {
    for (const item of cache.values()) this.add(item);
    return this;
  }

  unmerge(cache: Cache<any>) {
    for (const item of cache.values()) this.remove(item);
    return this;
  }

  clone(): Cache<T> {
    return new Cache<T>().merge(this);
  }
}

/**
 * Selector is a dumb class made to represent nested CSS selectors.
 */
export class Selector implements Container<Selector> {
  constructor(public selector: string, public id: string) {}

  getStyles() {
    return this.selector;
  }

  clone(): Selector {
    return new Selector(this.selector, this.id);
  }
}

/**
 * The style container registers a style string with selectors.
 */
export class Style extends Cache<Selector> implements Container<Style> {
  constructor(public style: string, public id: string) {
    super();
  }

  getStyles(): string {
    return `${this.sheet.join(",")}{${this.style}}`;
  }

  clone(): Style {
    return new Style(this.style, this.id).merge(this);
  }
}

/**
 * Implement rule logic for style output.
 */
export class Rule extends Cache<Rule | Style> implements Container<Rule> {
  constructor(public rule: string, public style: string, public id: string) {
    super();
  }

  getStyles(): string {
    return `${this.rule}{${this.style}${join(this.sheet)}}`;
  }

  clone(): Rule {
    return new Rule(this.rule, this.style, this.id).merge(this);
  }
}

function key(
  pid: string,
  f: FreeStyle,
  styles: Styles,
  displayName?: string
): string {
  let key = `f${f.hash(pid)}`;
  if (f.debug) {
    if (styles[DISPLAY_NAME]) key = `${styles[DISPLAY_NAME]}_${key}`;
    if (displayName) key = `${displayName}_${key}`;
  }
  return key;
}

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle extends Cache<Rule | Style>
  implements Container<FreeStyle> {
  constructor(
    public hash: HashFunction,
    public debug: boolean,
    public id: string,
    changes?: Changes
  ) {
    super(changes);
  }

  registerStyle(styles: Styles, displayName?: string) {
    const rulesList: StylizeRule[] = [];
    const stylesList: StylizeStyle[] = [];
    const pid = stylize("&", styles, rulesList, stylesList);
    const id = key(pid, this, styles, displayName);
    composeStylize(this, pid, rulesList, stylesList, `.${escape(id)}`, true);
    return id;
  }

  registerKeyframes(keyframes: Styles, displayName?: string) {
    return this.registerHashRule("@keyframes", keyframes, displayName);
  }

  registerHashRule(prefix: string, styles: Styles, displayName?: string) {
    const rulesList: StylizeRule[] = [];
    const stylesList: StylizeStyle[] = [];
    const pid = stylize("", styles, rulesList, stylesList);
    const id = key(pid, this, styles, displayName);
    const rule = new Rule(
      `${prefix} ${escape(id)}`,
      "",
      `h\0${pid}\0${prefix}`
    );
    composeStylize(rule, pid, rulesList, stylesList, "", false);
    this.add(rule);
    return id;
  }

  registerRule(rule: string, styles: Styles) {
    const rulesList: StylizeRule[] = [];
    const stylesList: StylizeStyle[] = [];
    const pid = stylize(rule, styles, rulesList, stylesList);
    composeStylize(this, pid, rulesList, stylesList, "", false);
  }

  registerCss(styles: Styles) {
    return this.registerRule("", styles);
  }

  getStyles(): string {
    return join(this.sheet);
  }

  clone(): FreeStyle {
    return new FreeStyle(this.hash, this.debug, this.id, this.changes).merge(
      this
    );
  }
}

/**
 * Exports a simple function to create a new instance.
 */
export function create(
  hash: HashFunction = stringHash,
  debug: boolean = typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production",
  changes?: Changes
) {
  return new FreeStyle(hash, debug, `f${(++uniqueId).toString(36)}`, changes);
}
