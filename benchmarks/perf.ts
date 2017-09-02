import { create } from '../src/free-style'

const cssProperties = require('just-css-properties')

const Style = create()
const start = process.hrtime()
const count = Math.pow(10, 4)

for (let i = 0; i < count; i++) {
  const property = cssProperties[i % cssProperties.length]

  Style.registerStyle({ [property]: i })
  Style.getStyles()
}

const end = process.hrtime(start)
const timer = `${end[0]}s ${~~(end[1] / 1000000)}ms`

console.log(`${Style.values().length} styles / ${timer}`)
