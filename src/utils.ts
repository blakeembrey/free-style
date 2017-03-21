import { Cache } from './Cache';
import { Rule } from './Rule';
import { Style } from './Style';

import {
  NestedStyles,
  Styles,
  Properties,
} from './types';

import {
  IS_UNIQUE,
  CSS_NUMBER,
} from './constants';
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
 * Check if a property name should pop to the top level of CSS.
 */
function isAtRule (propertyName: string): boolean {
  return propertyName.charAt(0) === '@'
}

/**
 * Check if a value is a nested style definition.
 */
function isNestedStyle (value: any): value is Styles {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

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

  return `${key}:${String(value)}`
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
  const result: string[] = []

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
function stylize (cache: Cache<any>, selector: string, styles: Styles, list: [string, Style][], parent?: string) {
  const { properties, nestedStyles, isUnique } = parseStyles(styles, !!selector)
  const styleString = stringifyProperties(properties)
  let pid = styleString

  if (isAtRule(selector)) {
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
function composeStyles (container: Cache<Style | Rule>, selector: string, styles: Styles, isStyle: boolean, displayName?: string) {
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
function getStyles (container: FreeStyle | Rule) {
  return container.values().map(style => style.getStyles()).join('')
}