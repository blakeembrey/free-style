import { create } from '../src/free-style'

const cssProperties = require('just-css-properties')

const Style = create()
const start = process.hrtime()
const count = Math.pow(10, 4.5)

for (let i = 0; i < count; i += 3) {
  const p1 = cssProperties[(i + 1) % cssProperties.length]
  const p2 = cssProperties[(i + 2) % cssProperties.length]
  const p3 = cssProperties[(i + 3) % cssProperties.length]

  Style.registerStyle({ [p1]: i + 1, [p2]: i + 2, [p3]: i + 3 })
  Style.getStyles()
}

const end = process.hrtime(start)
const timer = `${end[0]}s ${~~(end[1] / 1000000)}ms`

console.log(`${Style.sheet.length} styles / ${Style.getStyles().length} size / ${timer}`)
