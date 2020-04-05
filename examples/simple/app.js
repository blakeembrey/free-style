var insertCss = require("insert-css");
var FreeStyle = require("../..");

var Style = FreeStyle.create();

var buttonStyle = Style.registerStyle({
  $displayName: "button",
  borderRadius: 3,
  background: "red",
  color: "#fff",
  border: 0,
  padding: 10,
  transition: "0.2s ease-in-out transform",
});

var sectionStyle = Style.registerStyle({
  $displayName: "section",
  width: 200,
  height: 200,
  background: "blue",
  padding: 10,
  ["&:hover > ." + buttonStyle]: {
    transform: "translate(100px, 100px)",
  },
});

function app(targetEl) {
  var appEl = document.createElement("div");
  var btnEl = document.createElement("button");
  btnEl.textContent = "Click me!";
  appEl.className = sectionStyle;
  btnEl.className = buttonStyle;
  appEl.appendChild(btnEl);
  targetEl.appendChild(appEl);
}

insertCss(Style.getStyles());

app(document.body);
