/* global describe, it, afterEach */

var expect = require('chai').expect
var FreeStyle = require('./')

describe('free style', function () {
  var freeStyle

  beforeEach(function () {
    freeStyle = FreeStyle.create()
  })

  describe('class', function () {
    it('should create a class', function () {
      var style = freeStyle.registerStyle({
        color: 'red',
        backgroundColor: 'blue'
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{background-color:blue;color:red;}'
      )
    })

    it('should support multiple style values', function () {
      var style = freeStyle.registerStyle({
        background: [
          'red',
          'linear-gradient(to right, red 0%, green 100%)'
        ]
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{background:red;background:linear-gradient(to right, red 0%, green 100%);}'
      )
    })

    it('should support nested @-rules', function () {
      var style = freeStyle.registerStyle({
        color: 'red',
        '@media (min-width: 500px)': {
          color: 'blue'
        }
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{color:red;}@media (min-width: 500px){' + style.selector + '{color:blue;}}'
      )
    })

    it('should not append "px" to certain properties', function () {
      var style = freeStyle.registerStyle({
        flexGrow: 2,
        WebkitFlexGrow: 2
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{-webkit-flex-grow:2;flex-grow:2;}'
      )
    })

    it('should support nested selectors', function () {
      var style = freeStyle.registerStyle({
        color: 'red',
        'span': {
          color: 'blue'
        }
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{color:red;}' + style.selector + ' span{color:blue;}'
      )
    })

    it('should support nested styles with parent references', function () {
      var style = freeStyle.registerStyle({
        color: 'red',
        '&:hover': {
          color: 'blue'
        }
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{color:red;}' + style.selector + ':hover{color:blue;}'
      )
    })

    it('should omit empty rules', function () {
      freeStyle.registerStyle({})

      expect(freeStyle.getStyles()).to.equal('')
    })

    it('should support vendor prefixes', function () {
      var style = freeStyle.registerStyle({
        msBorderRadius: 5,
        WebkitBorderRadius: 5,
        borderRadius: 5
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{-ms-border-radius:5px;-webkit-border-radius:5px;border-radius:5px;}'
      )
    })

    it('should merge style defintions', function () {
      var style = freeStyle.registerStyle({
        color: 'red'
      }, {
        background: 'blue'
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{background:blue;color:red;}'
      )
    })

    it('should result to the same hash of similar objects', function () {
      var firstStyle = freeStyle.registerStyle({
        color: 'red',
        backgroundColor: 'blue'
      })

      var secondStyle = freeStyle.registerStyle({
        backgroundColor: 'blue',
        color: 'red'
      })

      expect(firstStyle.className).to.equal(secondStyle.className)
    })

    it('should omit empty styles', function () {
      var style = freeStyle.registerStyle({
        color: 'red',
        backgroundColor: null
      })

      expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')
    })

    it('should omit empty values in an array', function () {
      var style = freeStyle.registerStyle({
        color: ['red', null]
      })

      expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')
    })
  })

  describe('keyframes', function () {
    it('should create keyframes instance', function () {
      var style = freeStyle.registerKeyframes({
        from: { color: 'red' },
        to: { color: 'blue' }
      })

      expect(freeStyle.getStyles()).to.equal(
        '@-webkit-keyframes ' + style.name + '{from{color:red;}to{color:blue;}}' +
        '@keyframes ' + style.name + '{from{color:red;}to{color:blue;}}'
      )
    })

    it('should support @-rules', function () {
      var style = freeStyle.registerKeyframes({
        '@supports (animation-name: test)': {
          from: { color: 'red' },
          to: { color: 'blue' }
        }
      })

      expect(freeStyle.getStyles()).to.equal(
        '@supports (animation-name: test){@-webkit-keyframes ' + style.name + '{from{color:red;}to{color:blue;}}}' +
        '@supports (animation-name: test){@keyframes ' + style.name + '{from{color:red;}to{color:blue;}}}'
      )
    })

    it('should be able to combine keyframes with styles', function () {
      var animation = freeStyle.registerKeyframes({
        from: { color: 'red' },
        to: { color: 'blue' }
      })

      var style = freeStyle.registerStyle({
        animationName: animation.name,
        animationDuration: '1s'
      })

      expect(freeStyle.getStyles()).to.equal(
        '@-webkit-keyframes ' + animation.name + '{from{color:red;}to{color:blue;}}' +
        '@keyframes ' + animation.name + '{from{color:red;}to{color:blue;}}' +
        style.selector + '{animation-duration:1s;animation-name:' + animation.name + ';}'
      )
    })
  })

  describe('utils', function () {
    describe('url', function () {
      it('should create a url attribute', function () {
        expect(freeStyle.url('http://example.com')).to.equal('url("http://example.com")')
      })
    })

    describe('join', function () {
      it('should join strings together', function () {
        expect(freeStyle.join('test', 'class')).to.equal('test class')
      })

      it('should join maps', function () {
        expect(freeStyle.join('test', { yes: true, no: false }, undefined)).to.equal('test yes')
      })
    })

    describe('empty', function () {
      it('should empty the style cache', function () {
        var style = freeStyle.registerStyle({
          color: 'red'
        })

        expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')

        freeStyle.empty()

        expect(freeStyle.getStyles()).to.equal('')
      })
    })

    describe('change events', function () {
      it('should register function to trigger on change', function () {
        var triggered = false

        function onChange () {
          triggered = true
        }

        freeStyle.addChangeListener(onChange)

        freeStyle.registerStyle({ color: 'red' })

        freeStyle.removeChangeListener(onChange)

        expect(triggered).to.be.true
      })

      it('should silently succeed when removing a non-existent listener', function () {
        freeStyle.removeChangeListener(function () {})
      })
    })

    describe('third party methods', function () {
      it('should manually run lifecycle', function () {
        var style = freeStyle.registerStyle({
          color: 'red'
        })

        expect(freeStyle.has(style)).to.be.true
        expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')

        freeStyle.remove(style)

        expect(freeStyle.has(style)).to.be.false
        expect(freeStyle.getStyles()).to.equal('')
      })

      it('should only remove after the same number of adds', function () {
        var style = freeStyle.createStyle({
          color: 'red'
        })

        var str = style.selector + '{color:red;}'

        // 0
        expect(freeStyle.getStyles()).to.equal('')

        // 1
        freeStyle.add(style)
        expect(freeStyle.getStyles()).to.equal(str)

        // 2
        freeStyle.add(style)
        expect(freeStyle.getStyles()).to.equal(str)

        // 1
        freeStyle.remove(style)
        expect(freeStyle.getStyles()).to.equal(str)

        // 0
        freeStyle.remove(style)
        expect(freeStyle.getStyles()).to.equal('')

        // Already removed.
        freeStyle.remove(style)
        expect(freeStyle.getStyles()).to.equal('')
      })

      it('should attach and detach children', function (done) {
        var child = FreeStyle.create()

        var style = child.registerStyle({
          color: 'red'
        })

        freeStyle.addChangeListener(function listener () {
          expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')

          freeStyle.removeChangeListener(listener)
          freeStyle.detach(child)

          expect(freeStyle.getStyles()).to.equal('')

          return done()
        })

        freeStyle.attach(child)
      })

      it('should emit changes when the child changes', function (done) {
        var child = FreeStyle.create()

        freeStyle.addChangeListener(function listener (type, style) {
          expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')

          freeStyle.removeChangeListener(listener)
          freeStyle.detach(child)

          expect(freeStyle.getStyles()).to.equal('')

          return done()
        })

        freeStyle.attach(child)

        child.registerStyle({
          color: 'red'
        })
      })
    })
  })
})
