# Free-style

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

**Free-style** is designed to make CSS easier and more maintainable by using inline style objects.

## Installation

```
npm install free-style --save
bower install free-style --save
```

## Usage

```js
var freeStyle = require('free-style')

var button = freeStyle.createClass({
  backgroundColor: 'red'
})

freeStyle.inject()

React.render(
  <div className={button.className}>Submit</button>,
  document.body
)
```

### Namespaced Styles

```js
var button = freeStyle.createClass({
  backgroundColor: 'red',
  padding: 10
})

console.log(button.className) //=> "n1c471b35"
```

#### Multiple Style Declarations

```js
freeStyle.createClass({
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
freeStyle.createClass({
  color: 'red',
  '@media (min-width: 500px)': {
    color: 'blue'
  }
})
```

#### Nested Selectors

**Please note:** Although this is possible, it is not recommended. It circumvents the usefulness of componentized styles, but it is useful for styling legacy DOM components.

```js
freeStyle.createClass({
  '.classname': {
    color: 'blue'
  }
})
```

#### Selector Parent Reference

```js
var style = freeStyle.createClass({
  '&:hover': {
    color: 'blue'
  }
})
```

### Keyframes

```js
var animation = freeStyle.createKeyframes({
  from: { color: 'red' },
  to: { color: 'blue' }
})

freeStyle.registerClass({
  animationName: animation.name,
  animationDuration: '1s'
})
```

#### Nested @-rules

```js
freeStyle.createKeyframes({
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

```
freeStyle.inject()
```

### Utilities

#### URL

```js
freeStyle.url('http://example.com') //=> 'url("http://example.com")'
```

#### Join

```js
freeStyle.join(class.className, 'class-name') //=> "n1c471b35 class-name"
```

#### Create a new instance

```js
freeStyle.fresh()
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
