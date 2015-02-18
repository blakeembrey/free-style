# Free-style

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

**Free-style** is designed to make cross-browser style objects easier to work with.

## Installation

```
npm install free-style --save
bower install free-style --save
```

## Features

* Merge multiple style objects
  * `style({ padding: 10 }, this.props.style)`
* Expand short hand syntax
  * `style({ flex: '1 0 auto' }) //=> { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' }`
* Append `px` to numbers
  * `style({ marginBottom: 10 }) //=> { marginBottom: '10px' }`
* Support vendor prefixed properties
  * `style({ borderRadius: 5 }) //=> { webkitBorderRadius: '5px' }`
  * No invalid prefixes with output
  * Also prefixes property values

## Usage

```js
var style = require('free-style')

style({
  padding: 10,
  backgroundImage: style.url('http://example.com/background.png')
}, {
  paddingTop: 5
});
// {
//   paddingTop: '5px',
//   paddingRight: '10px',
//   paddingBottom: '10px',
//   paddingLeft: '10px',
//   backgroundImage: 'url("http://example.com/background.png")'
// }
```

### Integration with React

The most common use-case for this module is with React.

```js
var React = require('react')
var style = require('free-style')

/**
 * Create a new React element that allows passed in styles.
 */
module.exports = React.createClass({

  render: function () {
    return <div style={style({ padding: 10 }, this.props.style)} />
  }

})
```

### Legacy Browsers

To support legacy browsers (<= IE8) you'll need to [polyfill](https://github.com/es-shims/es5-shim) some ES5 features, such as `Array.prototype.forEach` and `Object.keys`.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/free-style.svg?style=flat
[npm-url]: https://npmjs.org/package/free-style
[downloads-image]: https://img.shields.io/npm/dm/free-style.svg?style=flat
[downloads-url]: https://npmjs.org/package/free-style
