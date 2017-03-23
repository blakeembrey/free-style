var FreeStyle = require('./dist/free-style')

var globalSheet

exports.style = function(object) {
  requestInject()
  return globalSheet.registerStyle(object)
}

exports.rule = function(query, object) {
  requestInject()
  return globalSheet.registerRule(query, object)
}

var requestInject = function() {
  if (globalSheet) return
  globalSheet = FreeStyle.create()
  requestAnimationFrame(function() {
    globalSheet.inject()
    globalSheet = null
  })
}
