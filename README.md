# Free-Style

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> **Free-Style** is designed to make CSS easier and more maintainable by using JavaScript.

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

### Also solved with Free-Style

* Working with legacy DOM components (You can nest `.class-name` in your styles)
* Expose third-party and semantic hooks/theming through ordinary class names (`.button`)
* Consistently generates styles and class names (Generates the exact same on client and server, and will magically merges duplicate styles)
* Develop components alongside the style (No more hunting CSS files for estranged `ul > li > a`)
* Create isomorphic applications by serving styles for *only* the components rendered (With third-parties, see [React Free-Style](http://github.com/blakeembrey/react-free-style))
* Continue using CSS you already know (`{ '&:hover': { ... } }`)
* Automatically namespace `@`-rule styles (`{ '@media (min-width: 500px)': { ... } }`)
* Overload CSS properties using arrays (`{ backgroundColor: ['red', 'linear-gradient(to right, red 0%, blue 100%)'] }`)
* Integrates with any third-party system
* Extremely small and powerful API that works with any ecosystem (~360 SLOC)

### But How?

**Free-Style** generates a consistent hash from the style, after alphabetical property ordering and formatting, to use as the class name. This allows duplicate styles to automatically be merged on duplicate hashes. Every style is "registered" and assigned to a variable, which gets the most out of linters that will warn on unused variables and features like dead code minification. Using "register" returns the class name used for the `Style` instance and style instances (returned by `create()`) can be merged together at runtime to output _only_ the styles on page (see [React Free-Style](http://github.com/blakeembrey/react-free-style)). Styles should usually be created outside of the application run loop (E.g. `render`) so the CSS string and hashes are only generated once.

### Ways to Use

* [`stylin`](https://github.com/ajoslin/stylin) - The simplest abstraction, create styles, rules and keyframes, and the `<style />` stays in sync.
* [`easy-style`](https://github.com/jkroso/easy-style) - Light-weight singleton API for browsers and node
* [`react-free-style`](https://github.com/blakeembrey/react-free-style) - React implementation that renders styles used on the current page (universal use-case)
* **This module!** - Create, compose and manipulate style instances

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

#### Overload CSS Properties

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

#### Nest Rules

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

**Tip:** The second argument to `registerStyle` and `registerKeyframes` is a "display name". The display name will be used as the class name prefix in development (`process.env.NODE_ENV !== 'production'`).

#### Use JavaScript

```js
var extend = require('xtend')

var ellipsisStyle = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}

var RED_ELLIPSIS_STYLE = Style.registerStyle(extend(
  {
    color: 'red'
  },
  ellipsisStyle
)) //=> "fvxl8qs"
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

**Tip:** The string returned by `registerKeyframes` the name of the animation, which is a hash of the rule (you can also add a "display name" in development!).

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

### CSS String

```js
Style.getStyles() //=> ".f65pi0b{background-color:red;padding:10px}"
```

### Useful Libraries

* [`color`](https://github.com/MoOx/color)
* [`postcss-js`](https://github.com/postcss/postcss-js)
* [`prefix-lite`](https://github.com/namuol/prefix-lite)
* [`inline-style-prefixer`](https://github.com/rofrischmann/inline-style-prefixer)
* [`classnames`](https://github.com/JedWatson/classnames)
* [`insert-css`](https://github.com/substack/insert-css)
* [`image-url`](https://github.com/ajoslin/image-url)
* [**Add yours!**](https://github.com/blakeembrey/free-style/issues/new)

### Custom Hash Algorithm

Initialize **Free-Style** with a custom CSS class hash algorithm (by default it uses a simple, internal string hash).

```js
create(hashFunction) //=> `FreeStyle.FreeStyle`
```

### Classes

```js
FreeStyle.FreeStyle // Similar to writing a CSS file, holds styles and rules - returned from `create()`.
FreeStyle.Style // Styles hold the CSS string and a generate a consistent hash of their contents.
FreeStyle.Rule // Rules are lighter-weight containers that can be nested inside `FreeStyle` instances.
FreeStyle.Selector // Selectors hold the CSS selector and can be nested inside `Style` instances.
FreeStyle.Cache // `FreeStyle`, `Style` and `Rule` all extend the cache which maintains reference counts.
```

### Other Properties and Methods

```js
var ChildStyle = Style.create()

// The `changeId` property increments every time a new style is added. The allows implementors to skip style
// element updates when duplicate styles are inserted, as the `changeId` property would remain the same.
ChildStyle.changeId

// Clones the style instance. This is useful when add/removing or merging/unmerging styles. If you didn't clone
// the instance beforehand, it's possible a user to modify the style state (E.g. new styles/selectors) and the
// next time you unmerge/remove the instance will remove too many styles.
ChildStyle.clone()

Style.merge(ChildStyle) // Merge the child styles into the current instance.
Style.unmerge(ChildStyle) // Unmerge the child styles from the current instance.
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
