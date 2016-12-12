import * as test from 'blue-tape';
import * as crypto from 'crypto';
import { create, IS_UNIQUE } from './free-style'

test('free style', (t) => {
  t.test('output hashed classes', t => {
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

  t.test('do not append "px" to whitelisted properties', t => {
    const Style = create()

    const className = Style.registerStyle({
      flexGrow: 2,
      WebkitFlexGrow: 2
    })

    t.equal(Style.getStyles(), `.${className}{-webkit-flex-grow:2;flex-grow:2}`)

    t.end()
  })

  t.test('merge duplicate styles', t => {
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

  t.test('sort keys alphabetically after hyphenating', t => {
    const Style = create()

    const className = Style.registerStyle({
      borderRadius: 5,
      msBorderRadius: 5
    })

    t.equal(Style.getStyles(), `.${className}{-ms-border-radius:5px;border-radius:5px}`)

    t.end()
  })

  t.test('merge duplicate nested styles', t => {
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

  t.test('merge @-rules', t => {
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
      `@media (min-width: 600px){.${className1}{color:red}.${className2}{color:blue}}`
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

  t.test('merge duplicate styles across instances', t => {
    const Style1 = create()
    const Style2 = create()
    const Style3 = create()

    const className1 = Style1.registerStyle({
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
      `.${className1},.${className3}{color:red}@media (max-width: 600px){.${className3}{color:blue}}`
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

  t.test('cache order by latest insertion', t => {
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
      `.${x}{background:red}.${y}{background:palegreen}` +
      `@media (min-width: 400px){.${x}{background:yellow}.${y}{background:pink}}`
    )

    t.end()
  })

  t.test('keep order of nested params', t => {
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

  t.test('throw when using properties and nested styles with rule', t => {
    const Style = create()

    t.throws(
      () => {
        Style.registerRule('body', {
          height: '100%',
          a: {
            color: 'red'
          }
        })
      },
      TypeError
    )

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

  t.test('detect hash collisions', t => {
    const Style = create()
    const className = Style.registerStyle({ color: '#0008d0' })

    t.throws(
      () => Style.registerStyle({ color: '#000f82' }),
      'Hash collision: {color:#000f82} === .f1pqsan1{color:#0008d0}'
    )

    t.equal(Style.getStyles(), `.${className}{color:#0008d0}`)

    t.end()
  })

  t.test('detect hash collision for nested styles', t => {
    const Style = create()

    t.throws(
      () => {
        Style.registerStyle({
          div: { color: '#0009e8' },
          span: { color: 'red' }
        })

        Style.registerStyle({
          div: { color: '#000f75' },
          span: { color: 'red' }
        })
      },
      /Hash collision/
    )

    t.end()
  })

  t.test('detect hash collision for keyframes', t => {
    const Style = create()

    t.throws(
      () => {
        Style.registerKeyframes({
          from: { color: '#0008da' },
          to: { color: 'red' }
        })

        Style.registerKeyframes({
          from: { color: '#000f8c' },
          to: { color: 'red' }
        })
      },
      /Hash collision/
    )

    t.end()
  })

  t.test('disable style deduping', t => {
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
})
