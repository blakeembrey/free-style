# Free Style

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> **Free Style** is designed to make CSS easier and more maintainable by using inline style objects.

## Installation

```
npm install free-style --save
bower install free-style --save
```

## Why?

There's a [great presentation by Christopher Chedeau](https://speakerdeck.com/vjeux/react-css-in-js) you should check out.

**Solved by using CSS in JS**

* No global variables (Where and what is `.button`? Why does it conflict?)
* Built in dependency system (CommonJS, Require.js, `<script />`)
* Dead code elimination (Automatically remove unused styles)
* Minification (Minify JS with existing tools)
* Shared constants and reusable styles (Using variables and objects)
* Isolation (Every style is automatically namespaced)
* Extensible (Just use JavaScript - everything from [math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) to [color manipulation](https://github.com/gka/chroma.js) built in!)

**Also solved by using Free Style**

* Works with legacy DOM components (You can nest `.class-name` in your style)
* Easily expose third-party and semantic hooks through normal class names (`.button`)
* Consistently generate styles and class names (Generates the exact same on the client and server, and will magically merges duplicate styles)
* Develop the component right beside the style (No more hunting for that `ul > li > a`)
* Create isomorphic applications by serving styles for *only* the components rendered (See [React Free Style](http://github.com/blakeembrey/react-free-style))
* Continue using the CSS you already know (`{ '&:hover': { ... } }`)
* Automatically namespace `@`-rules (`{ '@media (min-width: 500px)': { ... } }`)
* Define duplicate rules using arrays (`{ backgroundColor: ['red', 'linear-gradient(to right, red 0%, blue 100%)'] }`)
* Integrates with any third-party system
* Extremely small and powerful API that works with any ecosystem

**How?**

**Free Style** generates a consistent hash from the style contents, after alphabetical property ordering and formatting, to use as the class name. The allows duplicate styles to automatically be merged by duplicate hash. Every style is "registered" and assigned to a variable to get the most out of linters and features like dead code minification, which warn on unused variables. Using "create" returns the class name to the `Style` instance and multiple style instances (`create()`) enables the composure of stylesheets at runtime to render _only_ the styles we used (See [React Free Style](http://github.com/blakeembrey/react-free-style)). Every style instance is created outside of the application run loop (E.g. `render`) which improves performance by calculating the CSS string and hash once only. Any time a style is added/removed/merge/unmerged an event is triggered which allows other libraries and instances to propagate style changes.

## Usage

```js
var FreeStyle = require('free-style')

// Create a new instance.
var Style = FreeStyle.create()

var STYLE = Style.registerStyle({
  backgroundColor: 'red'
}) //=> "f14svl5e"

// Injects a `<style />` element into the `<head>`.
// Note: This is an extremely simple integration.
Style.inject()

React.render(
  <div className={STYLE}>Hello world!</div>,
  document.body
)
```

### Namespace Styles

```js
var BUTTON_STYLE = Style.registerStyle({
  backgroundColor: 'red',
  padding: 10
})

console.log(BUTTON_STYLE) //=> "f65pi0b"
```

#### Multiple CSS Values

```js
Style.registerStyle({
  background: [
    'red',
    '-moz-linear-gradient(left, red 0%, blue 100%)',
    '-webkit-linear-gradient(left, red 0%, blue 100%)',
    '-o-linear-gradient(left, red 0%, blue 100%)',
    '-ms-linear-gradient(left, red 0%, blue 100%)',
    'linear-gradient(to right, red 0%, blue 100%)'
  ]
}) //=> "f1n85iiq"
```

#### Nested @-rules

```js
Style.registerStyle({
  color: 'red',
  '@media (min-width: 500px)': {
    color: 'blue'
  }
}) //=> "fk9tfor"
```

#### Nested Selectors

```js
Style.registerStyle({
  '.classname': {
    color: 'blue'
  }
}) //=> "fc1zv17"
```

#### Parent Selector Reference

```js
Style.registerStyle({
  '&:hover': {
    color: 'blue'
  }
}) //=> "f1h42yg6"
```

#### Use JavaScript to Mix Styles

```js
var extend = require('xtend')

var ellipsisStyle = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}

var RED_ELLIPSIS_STYLE = Style.registerStyle(extend({
  color: 'red'
}, ellipsisStyle)) //=> "fvxl8qs"
```

### Keyframes

```js
var COLOR_ANIM = Style.registerKeyframes({
  from: { color: 'red' },
  to: { color: 'blue' }
}) //=> "h1j3ughx"

var STYLE = Style.registerStyle({
  animationName: COLOR_ANIM,
  animationDuration: '1s'
}) //=> "fibanyf"
```

### Other @-rules

```js
Style.registerRule('@font-face', {
  fontFamily: '"Bitstream Vera Serif Bold"',
  src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")'
})

Style.registerRule('@media print', {
  body: {
    color: 'red'
  }
})
```

### Multiple Instances

```js
var Style1 = FreeStyle.create()
var Style2 = FreeStyle.create()

// Changes in `Style2` get reflected in `Style1`.
// Use this to compose entire stylesheets or components!
Style1.merge(Style2)
Style1.unmerge(Style2)
```

### Output

#### CSS String

```js
Style.getStyles() //=> ".f65pi0b{background-color:red;padding:10px}"
```

#### Inject Styles

**Please note:** This is a thin wrapper around `Style.getStyles()` that creates and appends a `<style />` element to the head (or target element). A more complex solution would listen and react to change events.

```js
Style.inject(/* optional target */)
```

### Utilities

#### URL

```js
Style.url('http://example.com') //=> 'url("http://example.com")'
```

#### Join

```js
Style.join(STYLE, 'string', { yes: true, no: false }) //=> "f1e8b20b string yes"
```

### Lower Level Methods

#### Creating Instances Manually

```js
FreeStyle.FreeStyle // Main stylesheet instance - returned from `create()`.
FreeStyle.Style // Style's hold CSS and a generate a consistent hash of the contents.
FreeStyle.AtRule // AtRule's are lighter-weight containers that can be nested inside `FreeStyle`.
FreeStyle.Selector // Selector's hold the CSS selector and can be nested inside `Style`.
FreeStyle.Cache // `FreeStyle`, `Style` and `AtRule` all extend the cache which maintains reference counts.
```

#### Change Events

```js
Style.addChangeListener(fn)
Style.removeChangeListener(fn)
```

#### Other Methods

```js
Style.add(Style | AtRule) // Add to internal cache and emit change.
Style.has(Style | AtRule) // Check if the style already exists.
Style.remove(Style | AtRule) // Remove from internal cache and emit change.
Style.count(Style | AtRule) // Return the number of instances mounted.

var ChildStyle = Style.create()

Style.merge(ChildStyle) // Merge the child styles and manage changes from instance.
Style.unmerge(ChildStyle) // Unmerge the child styles and stop listening for changes.
```

## Legacy Browsers

To support legacy browsers (<= IE8) you'll need to [polyfill](https://github.com/es-shims/es5-shim) some ES5 features, such as `Object.keys`, `Array.isArray` and `Array.prototype.map`.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/free-style.svg?style=flat
[npm-url]: https://npmjs.org/package/free-style
[downloads-image]: https://img.shields.io/npm/dm/free-style.svg?style=flat
[downloads-url]: https://npmjs.org/package/free-style
[travis-image]: https://img.shields.io/travis/blakeembrey/free-style.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/free-style
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/free-style.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/free-style?branch=master
