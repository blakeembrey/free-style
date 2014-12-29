# Free-style

[![NPM version][npm-image]][npm-url]

**Free-style** is designed to make cross-browser style objects easier to work with.

## Installation

```bash
npm install free-style --save
bower install free-style --save
```

## Usage

Free-style exports a function that can be called with any number of objects.

**Features:**

* Merge multiple objects into one
* Extract long-hand syntax from short-hand properties
* Automatically append `px` to numbers
* Automatically support vendor prefixed properties
* Automatically support vendor prefixes in values
* Ignore used vendor prefixes in output object

```js
var style = require('free-style');

style({
  padding: 10
}, {
  paddingTop: 5
});
//=> { paddingTop: '5px', paddingRight: '10px', paddingBottom: '10px', paddingLeft: '10px' }
```

### Integrate with React

The most common use-case for the module is to transform inline CSS with React.

```js
var React = require('react');
var style = require('free-style');

/**
 * Create a React element that supports passed in styles.
 */
module.exports = React.createElement('div', {
  style: style({ padding: 10 }, this.props.style)
});
```

### Legacy

To support legacy browsers (<= IE8) you'll need to [polyfill](https://github.com/es-shims/es5-shim) some ES5 features, such as `Array.prototype.forEach` and `Object.keys`.

## Notes

There is still work to be done for global value support (E.g. `transitionProperty: transform` to `WebkitTransitionProperty: -webkit-transform`). Support will likely transform over time.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/free-style.svg?style=flat
[npm-url]: https://npmjs.org/package/free-style
