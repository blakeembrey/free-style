/**
 * The unique id is used for unique hashes.
 */
let uniqueId = 0;

/**
 * Valid CSS property values.
 */
export type PropertyValue = number | boolean | string | null | undefined;

/**
 * Input styles object.
 */
export interface Styles {
  $unique?: boolean;
  $global?: boolean;
  $displayName?: string;
  [selector: string]: PropertyValue | PropertyValue[] | Styles;
}

/**
 * Quick dictionary lookup for unit-less numbers.
 */
const CSS_NUMBER = Object.create(null) as Record<string, true>;

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
 * Interpolate CSS selectors.
 */
function child(selector: string, parent: string) {
  if (selector.indexOf("&") === -1) return `${parent} ${selector}`;
  return interpolate(selector, parent);
}

export interface CompiledStyle {
  selector: string;
  style: string;
  isUnique: boolean;
}

export interface CompiledRule {
  selector: string;
  style: string;
  rules: CompiledRule[];
  styles: CompiledStyle[];
}

/**
 * Pre-registered container for cached styles and rules.
 */
export interface Compiled {
  id: string;
  rules: CompiledRule[];
  styles: CompiledStyle[];
  displayName: string | undefined;
}

/**
 * Sorted set of values used for style ordering.
 */
type Tuple<T> = [string, T];

/**
 * Transform a style string to a CSS string.
 */
function tupleToStyle([name, value]: Tuple<NonNullable<PropertyValue>>) {
  if (typeof value === "number" && value && !CSS_NUMBER[name]) {
    return `${name}:${value}px`;
  }

  return `${name}:${String(value)}`;
}

/**
 * Recursive loop building styles with deferred selectors.
 */
function stylize(
  rulesList: CompiledRule[],
  stylesList: CompiledStyle[],
  key: string,
  styles: Styles,
  parentClassName: string,
) {
  const properties: Array<Tuple<NonNullable<PropertyValue>>> = [];
  const nestedStyles: Array<Tuple<Styles>> = [];

  // Sort keys before adding to styles.
  for (const key of Object.keys(styles)) {
    const value = styles[key];

    if (key.charCodeAt(0) !== 36 /* $ */ && value != null) {
      if (Array.isArray(value)) {
        const name = hyphenate(key);
        for (let i = 0; i < value.length; i++) {
          const style = value[i];
          if (style != null) properties.push([name, style]);
        }
      } else if (typeof value === "object") {
        nestedStyles.push([key, value]);
      } else {
        properties.push([hyphenate(key), value]);
      }
    }
  }

  const isUnique = !!styles.$unique;
  const parent = styles.$global ? "" : parentClassName;
  const style = properties.map(tupleToStyle).join(";");
  let pid = style;
  let selector = parent;
  let childRules = rulesList;
  let childStyles = stylesList;

  if (key.charCodeAt(0) === 64 /* @ */) {
    childRules = [];
    childStyles = [];

    // Nested styles support (e.g. `.foo > @media`).
    if (parent && style) {
      childStyles.push({ selector, style, isUnique });
    }

    // Add new rule to parent.
    rulesList.push({
      selector: key,
      style: parent ? "" : style,
      rules: childRules,
      styles: childStyles,
    });
  } else {
    selector = parent ? (key ? child(key, parent) : parent) : key;

    if (style) {
      stylesList.push({ selector, style, isUnique });
    }
  }

  for (const [name, value] of nestedStyles) {
    pid += `|${name}#${stylize(
      childRules,
      childStyles,
      name,
      value,
      selector,
    )}`;
  }

  return pid;
}

/**
 * Transform `stylize` tree into style objects.
 */
function compose(
  cache: Cache<Rule | Style>,
  rulesList: CompiledRule[],
  stylesList: CompiledStyle[],
  id: string,
  name: string,
) {
  for (const { selector, style, isUnique } of stylesList) {
    const key = interpolate(selector, name);
    const item = new Style(style, isUnique ? (++uniqueId).toString(36) : id);
    item.add(new Selector(key));
    cache.add(item);
  }

  for (const { selector, style, rules, styles } of rulesList) {
    const key = interpolate(selector, name);
    const item = new Rule(key, style, id);
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
  changeId = 0;

  protected sheet: string[] = [];
  protected _children: T[] = [];
  protected _counters: Record<string, number | undefined> = Object.create(null);

  constructor(public changes?: Changes) {}

  add(style: T): void {
    const id = style.id;
    const count = this._counters[id] || 0;

    this._counters[id] = count + 1;

    if (count === 0) {
      const item = style.clone() as T;
      const index = this._children.push(item);
      this.sheet.push(style.getStyles());
      this.changeId++;
      if (this.changes) this.changes.add(item, index);
    } else if (style instanceof Cache) {
      const index = this._children.findIndex((x) => x.id === id);
      const item = this._children[index] as T & Cache<any>;
      const prevItemChangeId = item.changeId;

      item.merge(style);

      if (item.changeId !== prevItemChangeId) {
        this.sheet[index] = item.getStyles();
        this.changeId++;
        if (this.changes) this.changes.change(item, index, index);
      }
    }
  }

  remove(style: T): void {
    const id = style.id;
    const count = this._counters[id];

    if (count) {
      this._counters[id] = count - 1;

      const index = this._children.findIndex((x) => x.id === id);

      if (count === 1) {
        delete this._counters[id];
        this._children.splice(index, 1);
        this.sheet.splice(index, 1);
        this.changeId++;
        if (this.changes) this.changes.remove(this._children[index], index);
      } else if (style instanceof Cache) {
        const item = this._children[index] as T & Cache<any>;
        const prevChangeId = item.changeId;

        item.unmerge(style);

        if (item.changeId !== prevChangeId) {
          this.sheet[index] = item.getStyles();
          this.changeId++;
          if (this.changes) this.changes.change(item, index, index);
        }
      }
    }
  }

  values(): T[] {
    return this._children;
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
  constructor(public selector: string) {}

  get id() {
    return `k:${this.selector}`;
  }

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
  constructor(
    public style: string,
    private pid: string,
  ) {
    super();
  }

  get id() {
    return `s:${this.pid}:${this.style}`;
  }

  getStyles(): string {
    return `${this.sheet.join(",")}{${this.style}}`;
  }

  clone(): Style {
    return new Style(this.style, this.pid).merge(this);
  }
}

/**
 * Implement rule logic for style output.
 */
export class Rule extends Cache<Rule | Style> implements Container<Rule> {
  constructor(
    public rule: string,
    public style: string,
    private pid: string,
  ) {
    super();
  }

  get id() {
    return `r:${this.pid}:${this.rule}:${this.style}`;
  }

  getStyles(): string {
    return `${this.rule}{${this.style}${join(this.sheet)}}`;
  }

  clone(): Rule {
    return new Rule(this.rule, this.style, this.pid).merge(this);
  }
}

/**
 * The FreeStyle class implements the API for everything else.
 */
export class FreeStyle
  extends Cache<Rule | Style>
  implements Container<FreeStyle>
{
  constructor(
    public id: string,
    changes?: Changes,
  ) {
    super(changes);
  }

  register(compiled: Compiled) {
    const className = `${this.id}${compiled.id}`;

    if (process.env.NODE_ENV !== "production" && compiled.displayName) {
      const name = `${compiled.displayName}_${className}`;
      compose(this, compiled.rules, compiled.styles, compiled.id, escape(name));
      return name;
    }

    compose(this, compiled.rules, compiled.styles, compiled.id, className);
    return className;
  }

  registerStyle(styles: Styles) {
    return this.register(compile(styles));
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
export function create(changes?: Changes, prefix = "") {
  return new FreeStyle(prefix, changes);
}

/**
 * Compile styles into a registerable object.
 */
export function compile(styles: Styles): Compiled {
  const ruleList: CompiledRule[] = [];
  const styleList: CompiledStyle[] = [];
  const pid = stylize(ruleList, styleList, "", styles, ".&");
  return {
    id: stringHash(pid),
    rules: ruleList,
    styles: styleList,
    displayName: styles.$displayName,
  };
}
