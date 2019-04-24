import test = require('blue-tape')
import crypto = require('crypto')
import { create, IS_UNIQUE, escape } from './free-style'

test('free style', (t) => {
  t.test('output hashed class names', t => {
    const Style = create()
    let changeId = Style.changeId

    const className = Style.registerStyle({
      color: 'red'
    })

    t.equal(Style.getStyles(), `.${className}{color:red}`)
    t.notEqual(Style.changeId, changeId)

    t.end()
  })

  t.test('multiple values', t => {
    const Style = create()

    const className = Style.registerStyle({
      background: [
        'red',
        'linear-gradient(to right, red 0%, green 100%)'
      ]
    })

    t.equal(
      Style.getStyles(),
      `.${className}{background:red;background:linear-gradient(to right, red 0%, green 100%)}`
    )

    t.end()
  })

  t.test('dash-case property names', t => {
    const Style = create()

    const className = Style.registerStyle({
      backgroundColor: 'red'
    })

    t.equal(Style.getStyles(), `.${className}{background-color:red}`)

    t.end()
  })

  t.test('nest @-rules', t => {
    const Style = create()

    const className = Style.registerStyle({
      color: 'red',
      '@media (min-width: 500px)': {
        color: 'blue'
      }
    })

    t.equal(
      Style.getStyles(),
      `.${className}{color:red}@media (min-width: 500px){.${className}{color:blue}}`
    )

    t.end()
  })

  t.test('interpolate selectors', t => {
    const Style = create()

    const className = Style.registerStyle({
      color: 'red',
      '& > &': {
        color: 'blue',
        '.class-name': {
          background: 'green'
        }
      }
    })

    t.equal(
      Style.getStyles(),
      `.${className}{color:red}.${className} > .${className}{color:blue}` +
      `.${className} > .${className} .class-name{background:green}`
    )

    t.end()
  })

  t.test('do not append "px" to whitelist properties', t => {
    const Style = create()

    const className = Style.registerStyle({
      flexGrow: 2,
      WebkitFlexGrow: 2
    })

    t.equal(Style.getStyles(), `.${className}{-webkit-flex-grow:2;flex-grow:2}`)

    t.end()
  })

  t.test('merge exactly duplicate styles', t => {
    const Style = create()
    let changeId = Style.changeId

    const className1 = Style.registerStyle({
      background: 'blue',
      color: 'red'
    })

    t.notEqual(Style.changeId, changeId)

    // Checking the duplicate style _does not_ trigger a "change".
    changeId = Style.changeId

    const className2 = Style.registerStyle({
      color: 'red',
      background: 'blue'
    })

    t.equal(Style.changeId, changeId)
    t.equal(className1, className2)
    t.equal(Style.getStyles(), `.${className1}{background:blue;color:red}`)

    t.end()
  })

  t.test('allow debug css prefixes', t => {
    const Style = create(undefined, true)
    let changeId = Style.changeId

    const className1 = Style.registerStyle(
      {
        color: 'red'
      },
      'className1'
    )

    t.notEqual(Style.changeId, changeId)

    changeId = Style.changeId

    const className2 = Style.registerStyle(
      {
        color: 'red'
      },
      'className2'
    )

    t.notEqual(Style.changeId, changeId)
    t.notEqual(className1, className2)
    t.equal(Style.getStyles(), `.${className1},.${className2}{color:red}`)

    t.end()
  })

  t.test('ignore debug prefixes in "production"', t => {
    const Style = create(undefined, false)
    let changeId = Style.changeId

    const className1 = Style.registerStyle(
      {
        color: 'red'
      },
      'className1'
    )

    t.notEqual(Style.changeId, changeId)

    changeId = Style.changeId

    const className2 = Style.registerStyle(
      {
        color: 'red'
      },
      'className2'
    )

    t.equal(Style.changeId, changeId)
    t.equal(className1, className2)
    t.equal(Style.getStyles(), `.${className1}{color:red}`)

    t.end()
  })

  t.test('sort keys by property name', t => {
    const Style = create()

    const className = Style.registerStyle({
      border: '5px solid red',
      borderWidth: 10,
      borderColor: 'blue'
    })

    t.equal(Style.getStyles(), `.${className}{border:5px solid red;border-color:blue;border-width:10px}`)

    t.end()
  })

  t.test('sort keys alphabetically after hyphenating', t => {
    const Style = create()

    const className = Style.registerStyle({
      borderRadius: 5,
      msBorderRadius: 5
    })

    t.equal(Style.getStyles(), `.${className}{-ms-border-radius:5px;border-radius:5px}`)

    t.end()
  })

  t.test('overloaded keys should stay sorted in insertion order', t => {
    const Style = create()

    const className = Style.registerStyle({
      foo: [15, 13, 11, 9, 7, 5, 3, 1, 14, 12, 10, 8, 6, 4, 2]
    })

    t.equal(Style.getStyles(), `.${className}{foo:15px;foo:13px;foo:11px;foo:9px;foo:7px;foo:5px;foo:3px;foo:1px;foo:14px;foo:12px;foo:10px;foo:8px;foo:6px;foo:4px;foo:2px}`)

    t.end()
  })

  t.test('merge duplicate nested style', t => {
    const Style = create()

    const className = Style.registerStyle({
      color: 'red',
      '.foo': {
        color: 'red'
      }
    })

    t.equal(
      Style.getStyles(),
      `.${className},.${className} .foo{color:red}`
    )

    t.end()
  })

  t.test('@-rules across multiple styles produce multiple rules', t => {
    const Style = create()
    const mediaQuery = '@media (min-width: 600px)'
    let changeId = Style.changeId

    const className1 = Style.registerStyle({
      [mediaQuery]: {
        color: 'red'
      }
    })

    t.notEqual(Style.changeId, changeId)

    // Checking the next register _does_ trigger a change.
    changeId = Style.changeId

    const className2 = Style.registerStyle({
      [mediaQuery]: {
        color: 'blue'
      }
    })

    t.notEqual(Style.changeId, changeId)

    t.equal(
      Style.getStyles(),
      `@media (min-width: 600px){.${className1}{color:red}}@media (min-width: 600px){.${className2}{color:blue}}`
    )

    t.end()
  })

  t.test('do not output empty styles', t => {
    const Style = create()

    Style.registerStyle({
      color: null
    })

    t.equal(Style.getStyles(), '')

    t.end()
  })

  t.test('support @-rules within @-rules', t => {
    const Style = create()

    const className = Style.registerStyle({
      '@media (min-width: 100em)': {
        '@supports (display: flexbox)': {
          maxWidth: 100
        }
      }
    })

    t.equal(
      Style.getStyles(),
      `@media (min-width: 100em){@supports (display: flexbox){.${className}{max-width:100px}}}`
    )

    t.end()
  })

  t.test('merge styles across instances', t => {
    const Style1 = create()
    const Style2 = create()
    const Style3 = create()

    const className1 = Style1.registerStyle({
      color: 'red'
    })

    Style2.registerStyle({ // Should duplicate `className1`.
      color: 'red'
    })

    const className3 = Style3.registerStyle({
      color: 'red',
      '@media (max-width: 600px)': {
        color: 'blue'
      }
    })

    Style2.merge(Style3)
    Style1.merge(Style2)

    t.equal(
      Style1.getStyles(),
      `.${className1}{color:red}.${className3}{color:red}@media (max-width: 600px){.${className3}{color:blue}}`
    )

    Style1.unmerge(Style2)

    t.equal(
      Style1.getStyles(),
      `.${className1}{color:red}`
    )

    t.end()
  })

  t.test('keyframes', t => {
    const Style = create()

    const keyframes = Style.registerKeyframes({
      from: { color: 'red' },
      to: { color: 'blue' }
    })

    t.equal(Style.getStyles(), `@keyframes ${keyframes}{from{color:red}to{color:blue}}`)

    t.end()
  })

  t.test('merge duplicate keyframes', t => {
    const Style = create()

    const keyframes1 = Style.registerKeyframes({
      from: { color: 'red' },
      to: { color: 'blue' }
    })

    const keyframes2 = Style.registerKeyframes({
      to: { color: 'blue' },
      from: { color: 'red' }
    })

    t.equal(keyframes1, keyframes2)
    t.equal(Style.getStyles(), `@keyframes ${keyframes1}{from{color:red}to{color:blue}}`)

    t.end()
  })

  t.test('register arbitrary at rule', t => {
    const Style = create()
    let changeId = Style.changeId

    Style.registerRule('@font-face', {
      fontFamily: '"Bitstream Vera Serif Bold"',
      src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")'
    })

    t.notEqual(Style.changeId, changeId)

    t.equal(
      Style.getStyles(),
      '@font-face{font-family:"Bitstream Vera Serif Bold";' +
      'src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}'
    )

    t.end()
  })

  t.test('does not merge arbitrary at rules with different styles', t => {
    const Style = create()

    Style.registerRule('@font-face', {
      fontFamily: '"Bitstream Vera Serif Bold"',
      src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")'
    })

    Style.registerRule('@font-face', {
      fontFamily: '"MyWebFont"',
      src: 'url("myfont.woff2")'
    })

    t.equal(
      Style.getStyles(),
      '@font-face{font-family:"Bitstream Vera Serif Bold";' +
      'src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}' +
      '@font-face{font-family:"MyWebFont";src:url("myfont.woff2")}'
    )

    t.end()
  })

  t.test('register base rule', t => {
    const Style = create()

    Style.registerRule('body', {
      margin: 0,
      padding: 0
    })

    t.equal(Style.getStyles(), 'body{margin:0;padding:0}')

    t.end()
  })

  t.test('register at rule with nesting', t => {
    const Style = create()

    Style.registerRule('@media print', {
      body: {
        color: 'red'
      }
    })

    t.equal(Style.getStyles(), '@media print{body{color:red}}')

    t.end()
  })

  t.test('de-dupe across styles and rules', t => {
    const Style = create()
    let changeId = Style.changeId

    const className1 = Style.registerStyle({
      color: 'red'
    })

    t.notEqual(Style.changeId, changeId)
    changeId = Style.changeId

    Style.registerRule('.test', {
      color: 'red'
    })

    t.notEqual(Style.changeId, changeId)
    t.equal(Style.getStyles(), `.${className1},.test{color:red}`)

    t.end()
  })

  t.test('retain insertion order', t => {
    const Style = create()

    const x = Style.registerStyle({
      background: 'red',
      '@media (min-width: 400px)': {
        background: 'yellow'
      }
    })

    const y = Style.registerStyle({
      background: 'palegreen',
      '@media (min-width: 400px)': {
        background: 'pink'
      }
    })

    t.equal(
      Style.getStyles(),
      `.${x}{background:red}@media (min-width: 400px){.${x}{background:yellow}}` +
      `.${y}{background:palegreen}@media (min-width: 400px){.${y}{background:pink}}`
    )

    t.end()
  })

  t.test('retain nested param order', t => {
    const Style = create()
    let changeId = Style.changeId

    const className = Style.registerStyle({
      width: '20rem',
      '@media screen and (min-width: 500px)': {
        width: 500
      },
      '@media screen and (min-width: 1000px)': {
        width: 1000
      }
    })

    t.notEqual(Style.changeId, changeId)

    t.equal(
      Style.getStyles(),
      `.${className}{width:20rem}@media screen and (min-width: 500px){.${className}{width:500px}}` +
        `@media screen and (min-width: 1000px){.${className}{width:1000px}}`
    )

    t.end()
  })

  t.test('should work with properties and nested styles in a single rule', t => {
    const Style = create()

    Style.registerRule('body', {
      height: '100%',
      a: {
        color: 'red'
      }
    })

    t.equal(Style.getStyles(), 'body{height:100%}body a{color:red}')
    t.end()
  })

  t.test('should interpolate recursively with a rule', t => {
    const Style = create()

    Style.registerRule('body', {
      height: '100%',
      a: {
        color: 'red'
      },
      '@print': {
        a: {
          color: 'blue'
        }
      }
    })

    t.equal(Style.getStyles(), 'body{height:100%}body a{color:red}@print{body a{color:blue}}')
    t.end()
  })

  t.test('customise hash algorithm', t => {
    const Style = create((str: string) => {
      return crypto.createHash('sha256').update(str).digest('hex')
    })

    const className1 = Style.registerStyle({
      color: 'red'
    })

    const className2 = Style.registerStyle({
      color: 'blue'
    })

    const keyframes = Style.registerKeyframes({
      from: {
        color: 'red'
      },
      to: {
        color: 'blue'
      }
    })

    t.equal(className2.length, 65)
    t.equal(className1.length, 65)
    t.equal(keyframes.length, 65)

    t.equal(
      Style.getStyles(),
      `.${className1}{color:red}.${className2}{color:blue}@keyframes ${keyframes}{from{color:red}to{color:blue}}`
    )

    t.end()
  })

  t.test('disable style de-dupe', t => {
    const Style = create()

    const className = Style.registerStyle({
      color: 'blue',
      '&::-webkit-input-placeholder': {
        color: `rgba(0, 0, 0, 0)`,
        [IS_UNIQUE]: true
      },
      '&::-moz-placeholder': {
        color: `rgba(0, 0, 0, 0)`,
        [IS_UNIQUE]: true
      },
      '&::-ms-input-placeholder': {
        color: `rgba(0, 0, 0, 0)`,
        [IS_UNIQUE]: true
      }
    })

    t.equal(
      Style.getStyles(),
      `.${className}{color:blue}` +
      `.${className}::-webkit-input-placeholder{color:rgba(0, 0, 0, 0)}` +
      `.${className}::-moz-placeholder{color:rgba(0, 0, 0, 0)}` +
      `.${className}::-ms-input-placeholder{color:rgba(0, 0, 0, 0)}`
    )

    t.end()
  })

  t.test('register a css object', t => {
    const Style = create()

    Style.registerCss({
      'body': {
        color: 'red',
        '@print': {
          color: 'blue'
        }
      },
      h1: {
        color: 'red',
        '@print': {
          color: '#000',
          a: {
            color: 'blue'
          }
        }
      }
    })

    t.equal(Style.getStyles(), 'body,h1{color:red}@print{body,h1 a{color:blue}h1{color:#000}}')

    t.end()
  })

  t.test('registering a hashed rule', t => {
    const Style = create()

    const animation1 = Style.registerHashRule('@keyframes', {
      from: {
        color: 'blue'
      },
      to: {
        color: 'red'
      }
    })

    const animation2 = Style.registerHashRule('@-webkit-keyframes', {
      from: {
        color: 'blue'
      },
      to: {
        color: 'red'
      }
    })

    t.equal(animation1, animation2)
    t.equal(Style.getStyles(), `@keyframes ${animation1}{from{color:blue}to{color:red}}@-webkit-keyframes ${animation2}{from{color:blue}to{color:red}}`)

    t.end()
  })

  t.test('change events', t => {
    const styles: string[] = []

    const Style = create(undefined, undefined, {
      add (style, index) {
        styles.splice(index, 0, style.getStyles())
      },
      change (style, oldIndex, newIndex) {
        styles.splice(oldIndex, 1)
        styles.splice(newIndex, 0, style.getStyles())
      },
      remove (_, index) {
        styles.splice(index, 1)
      }
    })

    Style.registerStyle({
      background: 'red',
      '@media (min-width: 400px)': {
        background: 'yellow'
      }
    })

    Style.registerStyle({
      background: 'palegreen',
      '@media (min-width: 400px)': {
        background: 'pink'
      }
    })

    t.equal(styles.join(''), Style.getStyles())
    t.end()
  })

  t.test('escape css selectors', t => {
    const Style = create()
    const displayName = 'Connect(App)'

    const animationName = Style.registerKeyframes(
      { from: { color: 'red' } },
      displayName
    )

    const className = Style.registerStyle(
      { animation: animationName, '.t': { color: 'red' } },
      displayName
    )

    t.ok(animationName.startsWith(displayName))
    t.ok(className.startsWith(displayName))

    t.equal(
      Style.getStyles(),
      `@keyframes ${escape(animationName)}{from{color:red}}` +
      `.${escape(className)}{animation:Connect(App)_ftl4afb}` +
      `.${escape(className)} .t{color:red}`
    )

    t.end()
  })
})
