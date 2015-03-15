/* global describe, it, afterEach */

var expect = require('chai').expect
var freeStyle = require('./')

describe('free style', function () {
  afterEach(function () {
    freeStyle.empty()
  })

  describe('class', function () {
    it('should create a class', function () {
      var style = freeStyle.registerClass({
        color: 'red',
        backgroundColor: 'blue'
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{background-color:blue;color:red;}'
      )
    })

    it('should support multiple style values', function () {
      var style = freeStyle.registerClass({
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
      var style = freeStyle.registerClass({
        color: 'red',
        '@media (min-width: 500px)': {
          color: 'blue'
        }
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{color:red;}@media (min-width: 500px){' + style.selector + '{color:blue;}}'
      )
    })

    it('should support nested selectors', function () {
      var style = freeStyle.registerClass({
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
      var style = freeStyle.registerClass({
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
      var style = freeStyle.registerClass({})

      expect(freeStyle.getStyles()).to.equal('')
    })

    it('should support vendor prefixes', function () {
      var style = freeStyle.registerClass({
        msBorderRadius: 5,
        WebkitBorderRadius: 5,
        borderRadius: 5
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{-ms-border-radius:5px;-webkit-border-radius:5px;border-radius:5px;}'
      )
    })

    it('should merge style defintions', function () {
      var style = freeStyle.registerClass({
        color: 'red'
      }, {
        background: 'blue'
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{background:blue;color:red;}'
      )
    })

    it('should result to the same hash of similar objects', function () {
      var firstStyle = freeStyle.registerClass({
        color: 'red',
        backgroundColor: 'blue'
      })

      var secondStyle = freeStyle.registerClass({
        backgroundColor: 'blue',
        color: 'red'
      })

      expect(firstStyle.className).to.equal(secondStyle.className)
    })

    it('should omit empty styles', function () {
      var style = freeStyle.registerClass({
        color: 'red',
        backgroundColor: null
      })

      expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')
    })

    it('should omit empty values in an array', function () {
      var style = freeStyle.registerClass({
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

      var style = freeStyle.registerClass({
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

    describe('fresh', function () {
      it('fresh', function () {
        var newStyle = freeStyle.fresh()

        var newClass = newStyle.registerClass({ color: 'red' })
        var oldClass = freeStyle.registerClass({ color: 'blue' })

        expect(newStyle.getStyles()).to.equal(newClass.selector + '{color:red;}')
        expect(freeStyle.getStyles()).to.equal(oldClass.selector + '{color:blue;}')
      })
    })

    describe('add, remove, empty', function () {
      it('should remove a style', function () {
        var style = freeStyle.registerClass({
          color: 'red'
        })

        expect(freeStyle.getStyles()).to.equal(style.selector + '{color:red;}')

        freeStyle.remove(style)

        expect(freeStyle.getStyles()).to.equal('')
      })
    })
  })
})
