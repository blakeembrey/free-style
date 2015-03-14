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

## Usage

Available using **Common.js**, **AMD** and **`window`**.

```js
var freeStyle = require('free-style')
// var freeStyle = window.freeStyle
// define(['free-style'], function () { ... })

var STYLE = freeStyle.registerClass({
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
var BUTTON_STYLE = freeStyle.registerClass({
  backgroundColor: 'red',
  padding: 10
})

console.log(BUTTON_STYLE.selector) //=> ".n1c471b35"
console.log(BUTTON_STYLE.className) //=> "n1c471b35"
console.log(BUTTON_STYLE.style) //=> { backgroundColor: 'red', padding: '10px' }
```

#### Multiple Style Declarations

```js
freeStyle.registerClass({
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
freeStyle.registerClass({
  color: 'red',
  '@media (min-width: 500px)': {
    color: 'blue'
  }
})
```

#### Nested Selectors

**Please note:** Although this is possible, it is not recommended. It circumvents the usefulness of componentized styles, but it is useful for styling legacy DOM components.

```js
freeStyle.registerClass({
  '.classname': {
    color: 'blue'
  }
})
```

#### Selector Parent Reference

```js
freeStyle.registerClass({
  '&:hover': {
    color: 'blue'
  }
})
```

#### Mixin Style Objects

```js
var ellipsisStyle = freeStyle.registerClass({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
})

var redEllipsisStyle = freeStyle.registerClass({
  color: 'red'
}, ellipsisStyle.style)
```

### Keyframes

```js
var ANIM = freeStyle.registerKeyframes({
  from: { color: 'red' },
  to: { color: 'blue' }
})

freeStyle.registerClass({
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

#### Style Element

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
freeStyle.fresh()
```

#### Manually Create Rules

```js
var STYLE = freeStyle.createClass({ ... })
var ANIM = freeStyle.createKeyframes({ ... })

freeStyle.add(STYLE) // Added to internal cache and `getStyles` output.
freeStyle.remove(STYLE) // Removed from internal cache.
freeStyle.empty() // Empties the internal cache.
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
