# Free-Style

> **Free-Style** is designed to make CSS easier and more maintainable by using JavaScript.

## Installation

```
npm install free-style --save
```

## Why?

There's a [great presentation by Christopher Chedeau](https://speakerdeck.com/vjeux/react-css-in-js) you should check out.

### Solved by using CSS in JS

- No global variables (What and where is `.button`? Why is it conflicting?)
- Defined dependency systems (CommonJS, Require.js, `<script />`)
- Dead code elimination automatically removes unused styles
- Minification through JavaScript tooling
- Shared constants and reusable styles
- Every style is isolated, tested and namespaced to the JS component
- Extensible - everything from [Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) to [color manipulation](https://github.com/MoOx/color) already exists!

### Also solved with Free-Style

- Works with third-party DOM components (You can nest regular `.class-name` in your styles)
- Deterministically generates styles and class names, and automatically merges duplicate styles
- Develop components alongside the style (No more hunting CSS files for estranged `ul > li > a`)
- Create universal applications and serve styles for **only** the components rendered (see [React Free-Style](http://github.com/blakeembrey/react-free-style))
- Write the CSS you already know (`{ '&:hover': { ... } }`)
- Automatically namespace `@`-rule styles (`{ '@media (min-width: 500px)': { ... } }`)
- Overload CSS properties using arrays (`{ backgroundColor: ['red', 'linear-gradient(to right, red 0%, blue 100%)'] }`)
- Small and powerful API that works with any ecosystem (~360 SLOC)

### But How?

**Free-Style** generates a hash from the style to use as the class name. This allows duplicate styles to automatically be merged on duplicate hashes. Every style is "registered" and assigned to a variable, which gets the most out of linters that will warn on unused variables and features like dead code minification. Styles should usually be created outside of the application run loop (e.g. `render()`) so the CSS string and hashes are only generated once.

### Ways to Use

- [`typestyle`](https://github.com/typestyle/typestyle) - Popular type-safe interface for working with CSS
- [`react-free-style`](https://github.com/blakeembrey/react-free-style) - React implementation that renders styles on the current page (for universal apps)
- [`stylin`](https://github.com/ajoslin/stylin) - Simplest abstraction for creating styles, rules, and keyframes, and keeps `<style />` in sync
- [`ethcss`](https://github.com/ethorz/ethcss) - Library for writing CSS with literal objects
- **This module!** - Manually create, compose and manipulate style instances

## Usage

```js
import { create } from "free-style";

// Create a stylesheet instance.
const sheet = create();

// Register a new style, returning a class name to use.
const backgroundStyle = sheet.registerStyle({
  backgroundColor: "red",
}); //=> "f14svl5e"

// Inject `<style>` into the `<head>`.
const styleElement = document.createElement("style");
styleElement.textContent = sheet.getStyles();
document.head.appendChild(styleElement);

// Render the style by using the class name.
React.render(
  <div className={backgroundStyle}>Hello world!</div>,
  document.body,
);
```

### Style

```js
const buttonStyle = sheet.registerStyle({
  $displayName: "button",
  backgroundColor: "red",
  padding: 10,
});

console.log(buttonStyle); //=> "button_f65pi0b"
```

**Tip:** The string returned by `registerStyle` is a unique hash of the content and used as the HTML class name. The `$displayName` is only used during development, and stripped in production (`process.env.NODE_ENV === 'production'`).

#### Overload CSS properties

```js
Style.registerStyle({
  background: [
    "red",
    "-moz-linear-gradient(left, red 0%, blue 100%)",
    "-webkit-linear-gradient(left, red 0%, blue 100%)",
    "-o-linear-gradient(left, red 0%, blue 100%)",
    "-ms-linear-gradient(left, red 0%, blue 100%)",
    "linear-gradient(to right, red 0%, blue 100%)",
  ],
}); //=> "f1n85iiq"
```

#### Nested rules

```js
Style.registerStyle({
  color: "red",
  "@media (min-width: 500px)": {
    //=> "@media (min-width: 500px){.fk9tfor{color:blue}}"
    color: "blue",
  },
}); //=> "fk9tfor"
```

#### Nested selectors

```js
Style.registerStyle({
  color: "red",
  ".classy": {
    //=> ".fc1zv17 .classy"
    color: "blue",
  },
}); //=> "fc1zv17"
```

#### Parent selector

```js
Style.registerStyle({
  color: "red",
  "&:hover": {
    //=> ".f1h42yg6:hover"
    color: "blue",
  },
}); //=> "f1h42yg6"
```

**Tip:** The ampersand (`&`) will be replaced by the parent selector at runtime.

#### Use JavaScript

```js
const ellipsisStyle = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const redEllipsisStyle = Style.registerStyle({
  color: "red",
  ...ellipsisStyle,
}); //=> "fvxl8qs"

// Share rule between styles using computed properties.
const mediaQuery = "@media (min-width: 400px)";

const style = Style.registerStyle({
  backgroundColor: "red",
  [mediaQuery]: {
    backgroundColor: "pink",
  },
});
```

#### Unique style output

Sometimes you need to skip the de-duping behavior of `free-style`. Use `$unique` to force separate styles:

```js
Style.registerStyle({
  color: "blue",
  "&::-webkit-input-placeholder": {
    color: `rgba(0, 0, 0, 0)`,
    $unique: true,
  },
  "&::-moz-placeholder": {
    color: `rgba(0, 0, 0, 0)`,
    $unique: true,
  },
  "&::-ms-input-placeholder": {
    color: `rgba(0, 0, 0, 0)`,
    $unique: true,
  },
}); //=> "f13byakl"

Style.getStyles(); //=> ".f13byakl{color:blue}.f13byakl::-webkit-input-placeholder{color:rgba(0, 0, 0, 0)}.f13byakl::-moz-placeholder{color:rgba(0, 0, 0, 0)}.f13byakl::-ms-input-placeholder{color:rgba(0, 0, 0, 0)}"
```

### Rules

```js
const colorAnimation = Style.registerStyle({
  $global: true,
  "@keyframes &": {
    from: { color: "red" },
    to: { color: "blue" },
  },
}); //=> "h1j3ughx"

const style = Style.registerStyle({
  animationName: colorAnimation,
  animationDuration: "1s",
}); //=> "fibanyf"
```

#### Global rules and styles

```js
Style.registerStyle({
  $global: true,
  "@font-face": {
    fontFamily: '"Bitstream Vera Serif Bold"',
    src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")',
  },
});

Style.registerStyle({
  $global: true,
  "@media print": {
    body: {
      color: "red",
    },
  },
});

Style.registerStyle({
  $global: true,
  body: {
    margin: 0,
    padding: 0,
  },
});

Style.registerStyle({
  $global: true,
  body: {
    margin: 0,
    padding: 0,
    "@print": {
      color: "#000",
    },
  },
  h1: {
    fontSize: "2em",
  },
});
```

### CSS string

```js
Style.getStyles(); //=> ".f65pi0b{background-color:red;padding:10px}"
```

## TypeScript and ESM

This package is a [pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) and ships with TypeScript definitions. It cannot be `require`'d or used with CommonJS module resolution in TypeScript.

## Useful libraries

- [`polished`](https://polished.js.org)
- [`classnames`](https://github.com/JedWatson/classnames)
- [`color`](https://github.com/MoOx/color)
- [`style-helper`](https://github.com/blakeembrey/style-helper)
- [`postcss-js`](https://github.com/postcss/postcss-js)
- [`inline-style-prefixer`](https://github.com/rofrischmann/inline-style-prefixer)
- [`insert-css`](https://github.com/substack/insert-css)
- [`image-url`](https://github.com/ajoslin/image-url)
- [**Add yours!**](https://github.com/blakeembrey/free-style/issues/new)

## Implementation details

### Debugging

Display names will automatically be removed when `process.env.NODE_ENV === "production"`.

### Changes

The only argument to `create()` is a map of change function handlers. All functions are required:

- `add(style: Container<any>, index: number)`
- `change(style: Container<any>, index: number)`
- `remove(style: Container<any>, index: number)`

All styles implement `Container`, so you can call `getStyles()` or `clone()`.

### Merging

`Sheet`, `Style`, and `Rule` have the ability to be merged.

```js
const otherSheet = create();

sheet.merge(otherSheet); // Merge the current styles of `otherSheet` into `sheet`.
sheet.unmerge(otherSheet); // Remove the current styles of `otherSheet` from `sheet`.
```

### Pre-process styles

If you plan to re-use styles across `Sheet`s, it will be more efficient to use `compile` once and `register` many times instead of `registerStyle`.

## License

MIT
