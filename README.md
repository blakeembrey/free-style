# Free Style

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

**Free Style** is designed to make CSS easier and more maintainable by using inline style objects.

## Installation

```
npm install free-style --save
bower install free-style --save
```

## Why?

There's a really [great presentation by Christopher Chedeau](https://speakerdeck.com/vjeux/react-css-in-js) you should check out.

**Solved by using CSS in JS**

* No global variables (Where and what is `.button`? Why does it conflict?)
* Built in dependency system (CommonJS, Require.js, `<script />`)
* Dead code elimination (Automatically remove associated styles)
* Minification (Minify JS with existing tools)
* Shared constants (Using variables)
* Isolation (Every style is uniquely namespaced)
* Extensible (Just use JavaScript - everything from [math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) to [color manipulation](https://github.com/gka/chroma.js) built in!)

**Also solved by using Free Style**

* Works with legacy DOM components (You can nest `.class-name` in your style)
* Easily expose third-party theming hooks through semantic class names (`.button`)
* Consistently generated styles and class names (Generate on the server and merges duplicate style definitions)
* Develop the component right beside the style (No more hunting for that `ul > li > a`)
* Create isomorphic JavaScript applications by serving styles for *only* the components rendered (See [React Free Style](http://github.com/blakeembrey/react-free-style))
* Continue using the CSS you know (`{ '&:hover': { ... } }`)
* Automatically namespaced `@`-rules (`{ '@media (min-width: 500px)': { ... } }`)
* Easily merge multiple style definitions (`FreeStyle#registerStyle(a, b, c)`)
* Define duplicate rules using arrays (`{ backgroundColor: ['red', 'linear-gradient(to right, red 0%, blue 100%)'] }`)
* Integrates with any third-party system
* Extremely small and powerful API that works in any ecosystem

**How?**

**Free Style** generates a consistent hash from the style contents, after alphabetical ordering and reformatting, to use as the class name. The allows duplicate styles to automatically merge by key. Every style is "registered" and assigned to a variable to get the most out of linters and dead code minification, which warn on unused variables. Using "create" returns a `FreeStyle` instance and enables the composure of instances at runtime to render only the styles we used (See [React Free Style](http://github.com/blakeembrey/react-free-style)). Every style instance is created outside of the application run loop (E.g. `render`) which improves overall performance by only calculating the CSS string and hash once. Any time a style is registered/attached/detached an event is triggered which allows other libraries to live update styles.

## Usage

Available using **Common.js**, **AMD** and **`window`**.

```js
var FreeStyle = require('free-style')
// var FreeStyle = window.FreeStyle

// Create a new instance.
var freeStyle = FreeStyle.create()

var STYLE = freeStyle.registerStyle({
  backgroundColor: 'red'
})

// Injects a `<style />` element into the DOM.
freeStyle.inject()

React.render(
  <div className={STYLE.className}>Hello world!</div>,
  document.body
)
```

### Namespaced Styles

```js
var BUTTON_STYLE = freeStyle.registerStyle({
  backgroundColor: 'red',
  padding: 10
})

console.log(BUTTON_STYLE.selector) //=> ".n1c471b35"
console.log(BUTTON_STYLE.className) //=> "n1c471b35"
console.log(BUTTON_STYLE.style) //=> { backgroundColor: 'red', padding: '10px' }
```

#### Multiple Style Declarations

```js
freeStyle.registerStyle({
  background: [
    'red',
    '-moz-linear-gradient(left, red 0%, blue 100%)',
    '-webkit-linear-gradient(left, red 0%, blue 100%)',
    '-o-linear-gradient(left, red 0%, blue 100%)',
    '-ms-linear-gradient(left, red 0%, blue 100%)',
    'linear-gradient(to right, red 0%, blue 100%)'
  ]
})
```

#### Nested @-rules

```js
freeStyle.registerStyle({
  color: 'red',
  '@media (min-width: 500px)': {
    color: 'blue'
  }
})
```

#### Nested Selectors

**Please note:** Although this is possible, it is not recommended. It circumvents the usefulness of componentized styles, but it is useful for styling legacy DOM components.

```js
freeStyle.registerStyle({
  '.classname': {
    color: 'blue'
  }
})
```

#### Selector Parent Reference

```js
freeStyle.registerStyle({
  '&:hover': {
    color: 'blue'
  }
})
```

#### Mixin Style Objects

```js
var ellipsisStyle = freeStyle.registerStyle({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
})

var redEllipsisStyle = freeStyle.registerStyle({
  color: 'red'
}, ellipsisStyle.style)
```

### Keyframes

```js
var ANIM = freeStyle.registerKeyframes({
  from: { color: 'red' },
  to: { color: 'blue' }
})

freeStyle.registerStyle({
  animationName: ANIM.name,
  animationDuration: '1s'
})
```

#### Nested @-rules

```js
freeStyle.registerKeyframes({
  '@supports (animation-name: test)': {
    from: { color: 'red' },
    to: { color: 'blue' }
  }
})
```

### Output

#### CSS String

```js
freeStyle.getStyles() //=> ".n1c471b35{background-color:red;padding:10px;}"
```

#### Inject Styles

**Please note:** This is just a thin wrapper around `freeStyle.getStyles()` that creates and appends a `<style />` element to the head.

```js
freeStyle.inject(/* optional target */)
```

### Utilities

#### URL

```js
freeStyle.url('http://example.com') //=> 'url("http://example.com")'
```

#### Join

```js
freeStyle.join(style.className, 'string', { yes: true, no: false }) //=> "n1c471b35 string yes"
```

#### Create a New Instance

```js
new FreeStyle.FreeStyle() // Same as "FreeStyle.create()"
```

#### Change Events

```js
freeStyle.addChangeListener(fn)
freeStyle.removeChangeListener(fn)
```

#### Third-Party Methods

**Please note:** These methods should only be used by third-party implementers. The `add/remove` and `attach/detach` combinations keep track of counts so you need to remove the same number of times you add, if you want to remove it entirely.

```js
var STYLE = freeStyle.createStyle({ ... })
var ANIM = freeStyle.createKeyframes({ ... })

freeStyle.add(STYLE) // Add to internal cache and emit change.
freeStyle.has(STYLE) // Check if the style already exists.
freeStyle.remove(STYLE) // Remove from internal cache and emit change.

var child = freeStyle.create()

freeStyle.attach(child) // Attach the child styles and listen for changes.
freeStyle.detach(child) // Detach the child styles and stop listening for changes.
```

## Legacy Browsers

To support legacy browsers (<= IE8) you'll need to [polyfill](https://github.com/es-shims/es5-shim) some ES5 features, such as `Array.prototype.forEach` and `Object.keys`.

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
