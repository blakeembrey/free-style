/**
 * Tag styles with this string to get unique hash outputs.
 */
export const IS_UNIQUE = '__DO_NOT_DEDUPE_STYLE__'

/**
 * CSS properties that are valid unit-less numbers.
 */
export const CSS_NUMBER: { [propertyName: string]: boolean } = {
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
 * The unique id is used to get a unique hash on styles (no merging).
 */
export const GLOBALS = {
  uniqueId: 0,
}
