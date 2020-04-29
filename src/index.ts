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
  $unique?: boolean;
  $global?: boolean;
  $displayName?: string;
  [selector: string]:
    | null
    | undefined
    | PropertyValue
    | PropertyValue[]
    | Styles;
}

/**
 * Quick dictionary lookup for unit-less numbers.
 */
const CSS_NUMBER: Record<string, true> = Object.create(null);

/**
 * CSS properties that are valid unit-less numbers.
 *
 * Ref: https://github.com/facebook/react/blob/master/packages/react-dom/src/shared/CSSProperty.js
 */
const CSS_NUMBER_KEYS = [
  "animation-iteration-count",
  "border-image-outset",
  "border-image-slice",
  "border-image-width",
  "box-flex",
  "box-flex-group",
  "box-ordinal-group",
  "column-count",
  "columns",
  "counter-increment",
  "counter-reset",
  "flex",
  "flex-grow",
  "flex-positive",
  "flex-shrink",
  "flex-negative",
  "flex-order",
  "font-weight",
  "grid-area",
  "grid-column",
  "grid-column-end",
  "grid-column-span",
  "grid-column-start",
  "grid-row",
  "grid-row-end",
  "grid-row-span",
  "grid-row-start",
  "line-clamp",
  "line-height",
  "opacity",
  "order",
  "orphans",
  "tab-size",
  "widows",
  "z-index",
  "zoom",
  // SVG properties.
  "fill-opacity",
  "flood-opacity",
  "stop-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
];

// Add vendor prefixes to all unit-less properties.
for (const property of CSS_NUMBER_KEYS) {
  for (const prefix of ["-webkit-", "-ms-", "-moz-", "-o-", ""]) {
    CSS_NUMBER[prefix + property] = true;
  }
}

/**
 * Escape a CSS class name.
 */
function escape(str: string) {
  return str.replace(/[ !#$%&()*+,./;<=>?@[\]^`{|}~"'\\]/g, "\\$&");
}

/**
 * Interpolate the `&` with style name.
 */
function interpolate(selector: string, styleName: string) {
  return selector.replace(/&/g, styleName);
}

/**
 * Transform a JavaScript property into a CSS property.
 */
function hyphenate(propertyName: string): string {
  return propertyName
    .replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`)
    .replace(/^ms-/, "-ms-"); // Internet Explorer vendor prefix.
}

/**
 * Generate a hash value from a string.
 */
function stringHash(str: string): string {
  let value = 5381;
  let len = str.length;
  while (len--) value = (value * 33) ^ str.charCodeAt(len);
  return (value >>> 0).toString(36);
}

/**
 * Transform a style string to a CSS string.
 */
function styleToString(name: string, value: PropertyValue) {
  const suffix =
    typeof value === "number" && value && !CSS_NUMBER[name] ? "px" : "";

  return `${name}:${value}${suffix}`;
}

/**
 * Sort an array of tuples by first value.
 */
function sortTuples<T extends any>(value: [string, T][]): [string, T][] {
  return value.sort((a, b) => (a[0] > b[0] ? 1 : -1));
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

      return value.map((x) => styleToString(name, x)).join(";");
    })
    .join(";");
}

/**
 * Interpolate CSS selectors.
 */
function child(selector: string, parent: string) {
  if (!selector) return parent;
  if (!selector.includes("&")) return `${parent} ${selector}`;
  return interpolate(selector, parent);
}

type StylizeStyle = {
  selector: string;
  style: string;
  isUnique: boolean;
};

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
  rulesList: StylizeRule[],
  stylesList: StylizeStyle[],
  key: string,
  styles: Styles,
  parentClassName: string
) {
  const properties: Array<[string, PropertyValue | PropertyValue[]]> = [];
  const nestedStyles: Array<[string, Styles]> = [];

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const value = styles[key];

    if (key.charCodeAt(0) !== 36 /* $ */ && value != null) {
      if (typeof value === "object" && !Array.isArray(value)) {
        nestedStyles.push([key, value]);
      } else {
        properties.push([hyphenate(key), value]);
      }
    }
  }

  const isUnique = !!styles.$unique;
  const parent = styles.$global ? "" : parentClassName;
  const nested = parent ? nestedStyles : sortTuples(nestedStyles);
  const style = stringifyProperties(sortTuples(properties));
  let pid = style;

  if (key.charCodeAt(0) === 64 /* @ */) {
    const childRules: StylizeRule[] = [];
    const childStyles: StylizeStyle[] = [];

    // Nested styles support (e.g. `.foo > @media`).
    if (parent && style) {
      pid += `:${parent}`;
      childStyles.push({ selector: parent, style, isUnique });
    }

    for (const [name, value] of nested) {
      pid += `:${stylize(childRules, childStyles, name, value, parent)}`;
    }

    // Add new rule to parent.
    rulesList.push({
      selector: key,
      rules: childRules,
      styles: childStyles,
      style: parent ? "" : style,
    });
  } else {
    const selector = parent ? child(key, parent) : key;

    pid += `:${selector}`;

    if (style) {
      stylesList.push({ selector, style, isUnique });
    }

    for (const [name, value] of nested) {
      pid += `:${stylize(rulesList, stylesList, name, value, selector)}`;
    }
  }

  return pid;
}

/**
 * Transform `stylize` tree into style objects.
 */
function compose(
  cache: Cache<Rule | Style>,
  rulesList: StylizeRule[],
  stylesList: StylizeStyle[],
  id: string,
  name: string
) {
  for (const { selector, style, isUnique } of stylesList) {
    const key = interpolate(selector, name);
    const item = new Style(
      style,
      `s:${isUnique ? (++uniqueId).toString(36) : id}:${style}`
    );
    item.add(new Selector(key, `k:${key}`));
    cache.add(item);
  }

  for (const { selector, style, rules, styles } of rulesList) {
    const key = interpolate(selector, name);
    const item = new Rule(key, style, `r:${id}:${key}:${style}`);
    compose(item, rules, styles, id, name);
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
 * Cache-able interface.
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

  constructor(public changes?: Changes) {}

  add(style: T): void {
    const count = this._counters[style.id] || 0;
    const item: T = this._children[style.id] || style.clone();

    this._counters[style.id] = count + 1;

    if (count === 0) {
      this._children[item.id] = item;
      this._keys.push(item.id);
      this.sheet.push(item.getStyles());
      this.changeId++;
      if (this.changes) this.changes.add(item, this._keys.length - 1);
    } else if (item instanceof Cache && style instanceof Cache) {
      const prevItemChangeId = item.changeId;

      item.merge(style);

      if (item.changeId !== prevItemChangeId) {
        const index = this._keys.indexOf(style.id);
        this.sheet.splice(index, 1, item.getStyles());
        this.changeId++;
        if (this.changes) this.changes.change(item, index, index);
      }
    }
  }

  remove(style: T): void {
    const count = this._counters[style.id];

    if (count) {
      this._counters[style.id] = count - 1;

      const item = this._children[style.id]!;
      const index = this._keys.indexOf(item.id);

      if (count === 1) {
        delete this._counters[style.id];
        delete this._children[style.id];

        this._keys.splice(index, 1);
        this.sheet.splice(index, 1);
        this.changeId++;
        if (this.changes) this.changes.remove(item, index);
      } else if (item instanceof Cache && style instanceof Cache) {
        const prevChangeId = item.changeId;

        item.unmerge(style);

        if (item.changeId !== prevChangeId) {
          this.sheet.splice(index, 1, item.getStyles());
          this.changeId++;
          if (this.changes) this.changes.change(item, index, index);
        }
      }
    }
  }

  values(): T[] {
    return this._keys.map((key) => this._children[key]!);
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
    return this;
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

/**
 * Generate class name from styles.
 */
function key(id: string, styles: Styles): string {
  if (process.env.NODE_ENV === "production" || !styles.$displayName) return id;
  return `${styles.$displayName}_${id}`;
}

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle extends Cache<Rule | Style>
  implements Container<FreeStyle> {
  constructor(public id: string, changes?: Changes) {
    super(changes);
  }

  registerStyle(css: Styles) {
    const ruleList: StylizeRule[] = [];
    const styleList: StylizeStyle[] = [];
    const pid = stylize(ruleList, styleList, "", css, ".&");
    const id = `f${stringHash(pid)}`;
    const name = key(id, css);
    compose(
      this,
      ruleList,
      styleList,
      id,
      // Escape selector used in CSS when needed for display names.
      process.env.NODE_ENV === "production" ? name : escape(name)
    );
    return name;
  }

  registerKeyframes(keyframes: Styles) {
    return this.registerHashRule("@keyframes", keyframes);
  }

  registerHashRule(prefix: string, styles: Styles) {
    return this.registerStyle({
      $global: true,
      $displayName: styles.$displayName,
      [`${prefix} &`]: styles,
    });
  }

  registerRule(rule: string, styles: Styles) {
    return this.registerStyle({ $global: true, [rule]: styles });
  }

  registerCss(styles: Styles) {
    return this.registerRule("", styles);
  }

  getStyles(): string {
    return join(this.sheet);
  }

  clone(): FreeStyle {
    return new FreeStyle(this.id, this.changes).merge(this);
  }
}

/**
 * Exports a simple function to create a new instance.
 */
export function create(changes?: Changes) {
  return new FreeStyle(`f${(++uniqueId).toString(36)}`, changes);
}
