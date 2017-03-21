/**
 * Hash algorithm interface.
 */
export type HashFunction = (str: string) => string

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
export type Properties = Array<[string, PropertyValue]>
export type NestedStyles = Array<[string, Styles]>
