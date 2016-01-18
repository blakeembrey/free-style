# Free Style

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> **Free Style** is designed to make CSS easier and more maintainable by using JavaScript.

## Installation

```
npm install free-style --save
```

## Why?

There's a [great presentation by Christopher Chedeau](https://speakerdeck.com/vjeux/react-css-in-js) you should check out.

### Solved by using CSS in JS

* No global variables (Where and what is `.button`? Why does it conflict?)
* Built in dependency system (CommonJS, Require.js, `<script />`)
* Dead code elimination (Automatically remove unused styles)
* Minification (Minify JS with existing tools)
* Shared constants and reusable styles (Using variables and objects)
* Isolation (Every style is automatically namespaced)
* Extensible (Just use JavaScript - everything from [math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) to [color manipulation](https://github.com/MoOx/color) already exists!)

### Also solved with Free Style

* Working with legacy DOM components (You can nest `.class-name` in your styles)
* Expose third-party and semantic hooks/theming through ordinary class names (`.button`)
* Consistently generates styles and class names (Generates the exact same on client and server, and will magically merges duplicate styles)
* Develop components alongside the style (No more hunting CSS files for estranged `ul > li > a`)
* Create isomorphic applications by serving styles for *only* the components rendered (With third-parties, see [React Free Style](http://github.com/blakeembrey/react-free-style))
* Continue using CSS you already know (`{ '&:hover': { ... } }`)
* Automatically namespace `@`-rule styles (`{ '@media (min-width: 500px)': { ... } }`)
* Define multiple rules with arrays (`{ backgroundColor: ['red', 'linear-gradient(to right, red 0%, blue 100%)'] }`)
* Integrates with any third-party system
* Extremely small and powerful API that works with any ecosystem (~360 SLOC)

### But How?

**Free Style** generates a consistent hash from the style, after alphabetical property ordering and formatting, to use as the class name. This allows duplicate styles to automatically be merged by checking for duplicate hashes. Every style is "registered" and assigned to a variable, which gets the most out of linters and features like dead code minification that will warn on unused variables. Using "register" returns the class name to the `Style` instance and style instances (returned by `create()`) can be merged together at runtime to output _only_ the styles on page (see [React Free Style](http://github.com/blakeembrey/react-free-style)). Styles should generally be created outside of the application run loop (E.g. `render`) so the CSS string and hash are generated once only. Any time a style is added/removed/merge/unmerged an event is triggered that allows libraries and other `FreeStyle` instances to propagate style changes.

### Ways to Use

* [easy-style](https://github.com/jkroso/easy-style) Light-weight singleton API design for browsers
* [react-free-style](https://github.com/blakeembrey/react-free-style) React implementation that automatically renders the styles on the current page
* **This module!** Create, compose and manipulate multiple instances

## Usage

```js
var FreeStyle = require('free-style')

// Create a container instance.
var Style = FreeStyle.create()

// Register a new, uniquely hashed style.
var STYLE = Style.registerStyle({
  backgroundColor: 'red'
}) //=> "f14svl5e"

// Inject a `<style />` element into the `<head>`.
Style.inject()

// Figure out how to render the class name after registering.
React.render(
  <div className={STYLE}>Hello world!</div>,
  document.body
)
```

### Styles

```js
var BUTTON_STYLE = Style.registerStyle({
  backgroundColor: 'red',
  padding: 10
})

console.log(BUTTON_STYLE) //=> "f65pi0b"
```

**Tip:** The string returned by `registerStyle` is a unique hash of the content and should be used as a class in HTML.

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

#### Nest @-rules

```js
Style.registerStyle({
  color: 'red',
  '@media (min-width: 500px)': {
    color: 'blue'
  }
}) //=> "fk9tfor"
```

#### Nest Selectors

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

**Tip:** The ampersand (`&`) will be replaced by the parent selector at runtime. In this example, the result is `.f1h42yg6:hover`.

#### Use JavaScript

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

**Tip:** This is a shallow extend example. There are modules on NPM for deep extending objects. You can also take advantage of new JavaScript features, such as `const` and computed properties:

```js
const mediaQuery = '@media (min-width: 400px)'

const style = Style.registerStyle({
  backgroundColor: 'red',
  [mediaQuery]: {
    backgroundColor: 'pink'
  }
})
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

**Tip:** The string returned by `registerKeyframes` is a hash of the contents, and the name of the animation.

### Rules

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

Style.registerRule('body', {
  margin: 0,
  padding: 0
})
```

**Tip:** Interpolation is not supported with `registerRule`.

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

**Please note:** This is a thin wrapper around `Style.getStyles()` that creates and appends a `<style />` element to the head (or a target element). A more complex solution would listen and react to style changes.

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

### Useful Libraries

* [color](https://github.com/MoOx/color)
* [postcss-js](https://github.com/postcss/postcss-js)
* [prefix-lite](https://github.com/namuol/prefix-lite)
* [inline-style-prefixer](https://github.com/rofrischmann/inline-style-prefixer)
* [Add yours!](https://github.com/blakeembrey/free-style/issues/new)

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
