import test = require('blue-tape')
import { create } from './free-style'

test('free style', (t) => {
  t.test('output hashed classes', t => {
    const Style = create()

    const className = Style.registerStyle({
      color: 'red'
    })

    t.equal(Style.getStyles(), `.${className}{color:red}`)

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
      `.${className}{color:red}.${className} > .${className}{color:blue}.${className} > .${className} .class-name{background:green}`
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

    const className1 = Style.registerStyle({
      background: 'blue',
      color: 'red'
    })

    const className2 = Style.registerStyle({
      color: 'red',
      background: 'blue'
    })

    t.equal(className1, className2)
    t.equal(Style.getStyles(), `.${className1}{background:blue;color:red}`)

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

    const className1 = Style.registerStyle({
      [mediaQuery]: {
        color: 'red'
      }
    })

    const className2 = Style.registerStyle({
      [mediaQuery]: {
        color: 'blue'
      }
    })

    t.equal(
      Style.getStyles(),
      `@media (min-width: 600px){.${className1}{color:red}.${className2}{color:blue}}`)

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

    Style1.empty()

    t.equal(Style1.getStyles(), '')

    // Check private properties for remaining state.
    t.deepEqual((Style1 as any)._keys, [])
    t.deepEqual((Style1 as any)._counts, {})
    t.deepEqual((Style1 as any)._children, {})

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

    Style.registerRule('@font-face', {
      fontFamily: '"Bitstream Vera Serif Bold"',
      src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")'
    })

    t.equal(
      Style.getStyles(),
      '@font-face{font-family:"Bitstream Vera Serif Bold";src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}'
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
      '@font-face{font-family:"Bitstream Vera Serif Bold";src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}' +
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
      `.${x}{background:red}.${y}{background:palegreen}@media (min-width: 400px){.${x}{background:yellow}.${y}{background:pink}}`
    )

    t.end()
  })

  t.test('events', t => {
    t.test('propagate changes', t => {
      const Style1 = create()
      const Style2 = create()

      Style1.merge(Style2)

      t.equal(Style1.getStyles(), '')

      const className2 = Style2.registerStyle({
        color: 'red'
      })

      t.equal(Style1.getStyles(), `.${className2}{color:red}`)

      t.end()
    })
  })

  t.test('utils', t => {
    const Style = create()

    t.test('url', t => {
      t.equal(Style.url('http://example.com'), 'url("http://example.com")')

      t.end()
    })

    t.test('join', t => {
      t.equal(
        Style.join('a', { b: true, noop: false }, null, ['c', 'd']),
        'a b c d'
      )

      t.end()
    })
  })

  t.test('keep order of nested params', t => {
    const Style = create()

    const className = Style.registerStyle({
      width: '20rem',
      '@media screen and (min-width: 500px)': {
        width: 500
      },
      '@media screen and (min-width: 1000px)': {
        width: 1000
      }
    })

    t.equal(
      Style.getStyles(),
      `.${className}{width:20rem}@media screen and (min-width: 500px){.${className}{width:500px}}` +
        `@media screen and (min-width: 1000px){.${className}{width:1000px}}`
    )

    t.end()
  })
})
