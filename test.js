/* global describe, it */

var expect = require('chai').expect
var freeStyle = require('./')

describe('free style', function () {
  describe('class', function () {
    it('should create a class', function () {
      var style = freeStyle.createClass({
        color: 'red',
        backgroundColor: 'blue'
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{color:red;background-color:blue;}'
      )
    })

    it('should support multiple style values', function () {
      var style = freeStyle.createClass({
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
      var style = freeStyle.createClass({
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
      var style = freeStyle.createClass({
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
      var style = freeStyle.createClass({
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
      var style = freeStyle.createClass({})

      expect(style.getStyles()).to.equal('')
      expect(freeStyle.getStyles()).to.equal('')
    })

    it('should support vendor prefixes', function () {
      var style = freeStyle.createClass({
        msBorderRadius: 5,
        WebkitBorderRadius: 5,
        borderRadius: 5
      })

      expect(freeStyle.getStyles()).to.equal(
        style.selector + '{-ms-border-radius:5px;-webkit-border-radius:5px;border-radius:5px;}'
      )
    })
  })

  describe('keyframes', function () {
    it('should create keyframes instance', function () {
      var style = freeStyle.createKeyframes({
        from: { color: 'red' },
        to: { color: 'blue' }
      })

      expect(freeStyle.getStyles()).to.equal(
        '@keyframes ' + style.name + '{from{color:red;}to{color:blue;}}'
      )
    })

    it('should support @-rules', function () {
      var style = freeStyle.createKeyframes({
        '@supports (animation-name: test)': {
          from: { color: 'red' },
          to: { color: 'blue' }
        }
      })

      expect(freeStyle.getStyles()).to.equal(
        '@supports (animation-name: test){@keyframes ' + style.name + '{from{color:red;}to{color:blue;}}}'
      )
    })

    it('should be able to combine keyframes with styles', function () {
      var animation = freeStyle.createKeyframes({
        from: { color: 'red' },
        to: { color: 'blue' }
      })

      var style = freeStyle.createClass({
        animationName: animation.name,
        animationDuration: '1s'
      })

      expect(freeStyle.getStyles()).to.equal(
        '@keyframes ' + animation.name + '{from{color:red;}to{color:blue;}}' +
        style.selector + '{animation-name:' + animation.name + ';animation-duration:1s;}'
      )
    })
  })

  describe('utils', function () {
    it('should create a url attribute', function () {
      expect(freeStyle.url('http://example.com')).to.equal('url("http://example.com")')
    })

    it('should join strings together', function () {
      expect(freeStyle.join('test', 'class')).to.equal('test class')
    })

    it('fresh', function () {
      var newStyle = freeStyle.fresh()

      var newClass = newStyle.createClass({ color: 'red' })
      var oldClass = freeStyle.createClass({ color: 'blue' })

      expect(newStyle.getStyles()).to.equal(newClass.selector + '{color:red;}')
      expect(freeStyle.getStyles()).to.equal(oldClass.selector + '{color:blue;}')
    })
  })
})
