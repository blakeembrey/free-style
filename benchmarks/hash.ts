import fnv32a from './hashes/fnv32a'
import fnv32h from './hashes/fnv32h'
import murmurhash2 from './hashes/murmurhash2-32-gc'
import murmurhash3 from './hashes/murmurhash3-32-gc'
import stringHash from './hashes/string-hash'

const tests: string[] = []
const cssProperties = require('just-css-properties')
const cssValues = [
  'block',
  'flex',
  'top',
  'right',
  'bottom',
  'left',
  'red',
  'orange',
  '#000',
  'pink',
  'blue',
  '#0e0000',
  'rgba(240,11,160,.8)',
  'content("test")',
  'content("")',
  'url("http://example.com/test.png")',
  'url(\'background.png\')'
]

// Generate numeric values.
for (let i = 0; i < 2000; i += Math.floor(Math.random() * 5) + 1) {
  cssValues.push(`${i}px`, `${i}%`, `${i}em`, `${i}rem`)
}

// Generate test cases.
for (const property of cssProperties) {
  for (const value of cssValues) {
    tests.push(`${property}:${value}`)
  }
}

// Create longer test cases.
for (let i = 0, l = tests.length; i < 40000; i++) {
  const len = Math.floor(Math.random() * 8) + 2
  let value = ''

  for (let j = 0; j < len; j++) {
    value += tests[Math.floor(Math.random() * l)] + ';'
  }

  tests.push(value)
}

// The result of running hash tests.
interface Result {
  time: number[]
  map: { [key: string]: string[] }
}

function runTests (fn: (value: string, seed?: number) => number | string): Result {
  const map: { [value: string]: string[] } = {}
  const start = process.hrtime()

  for (const test of tests) {
    const key = fn(test, 0)
    map[key] = map[key] || []
    map[key].push(test)
  }

  const time = process.hrtime(start)

  return { time, map }
}

function printResults (name: string, { time, map }: Result) {
  const keys = Object.keys(map)
  const conflicts: [string, string[]][] = []

  for (const key of keys) {
    const length = map[key].length

    if (length > 1) {
      conflicts.push([key, map[key]])
    }
  }

  const timer = `${time[0]}s ${~~(time[1] / 1000000)}ms`
  console.log(`${name}: ${keys.length} hashes / ${conflicts.length} conflicts / ${timer}`)
}

console.log(`Ready to run ${tests.length} tests!`)

printResults('fnv32a', runTests(fnv32a))
printResults('fnv32h', runTests(fnv32h))
printResults('murmurhash2', runTests(murmurhash2))
printResults('murmurhash3', runTests(murmurhash3))
printResults('stringHash', runTests(stringHash))
