import { create } from "./index";

describe("free style", () => {
  it("should output class name hash", () => {
    const Style = create();
    const changeId = Style.changeId;

    const className = Style.registerStyle({
      color: "red",
    });

    expect(Style.getStyles()).toEqual(`.${className}{color:red}`);
    expect(Style.changeId).not.toEqual(changeId);
  });

  it("should render multiple values", () => {
    const Style = create();

    const className = Style.registerStyle({
      background: ["red", "linear-gradient(to right, red 0%, green 100%)"],
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{background:red;background:linear-gradient(to right, red 0%, green 100%)}`
    );
  });

  it("should dash-case property names", () => {
    const Style = create();

    const className = Style.registerStyle({
      backgroundColor: "red",
    });

    expect(Style.getStyles()).toEqual(`.${className}{background-color:red}`);
  });

  it("should nest @-rules", () => {
    const Style = create();

    const className = Style.registerStyle({
      color: "red",
      "@media (min-width: 500px)": {
        color: "blue",
      },
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{color:red}@media (min-width: 500px){.${className}{color:blue}}`
    );
  });

  it("should interpolate selectors", () => {
    const Style = create();

    const className = Style.registerStyle({
      color: "red",
      "& > &": {
        color: "blue",
        ".class-name": {
          background: "green",
        },
      },
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{color:red}.${className} > .${className}{color:blue}` +
        `.${className} > .${className} .class-name{background:green}`
    );
  });

  it('should not append "px" to whitelisted properties', () => {
    const Style = create();

    const className = Style.registerStyle({
      flexGrow: 2,
      WebkitFlexGrow: 2,
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{-webkit-flex-grow:2;flex-grow:2}`
    );
  });

  it("should merge duplicate styles", () => {
    const Style = create();
    let changeId = Style.changeId;

    const className1 = Style.registerStyle({
      background: "blue",
      color: "red",
    });

    expect(Style.changeId).not.toEqual(changeId);

    // Checking the duplicate style _does not_ trigger a "change".
    changeId = Style.changeId;

    const className2 = Style.registerStyle({
      color: "red",
      background: "blue",
    });

    expect(Style.changeId).toEqual(changeId);
    expect(className1).toEqual(className2);
    expect(Style.getStyles()).toEqual(
      `.${className1}{background:blue;color:red}`
    );
  });

  it("should allow display names", () => {
    const Style = create();
    let changeId = Style.changeId;

    const className1 = Style.registerStyle({
      color: "red",
      $displayName: "className1",
    });

    expect(Style.changeId).not.toEqual(changeId);

    changeId = Style.changeId;

    const className2 = Style.registerStyle({
      color: "red",
      $displayName: "className2",
    });

    expect(Style.changeId).not.toEqual(changeId);
    expect(className1).not.toEqual(className2);
    expect(Style.getStyles()).toEqual(
      `.${className1},.${className2}{color:red}`
    );
  });

  it("should sort keys by property name", () => {
    const Style = create();

    const className = Style.registerStyle({
      border: "5px solid red",
      borderWidth: 10,
      borderColor: "blue",
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{border:5px solid red;border-color:blue;border-width:10px}`
    );
  });

  it("should sort keys alphabetically after hyphenating", () => {
    const Style = create();

    const className = Style.registerStyle({
      borderRadius: 5,
      msBorderRadius: 5,
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{-ms-border-radius:5px;border-radius:5px}`
    );
  });

  it("should keep overloaded values in order", () => {
    const Style = create();

    const className = Style.registerStyle({
      foo: [15, 13, 11, 9, 7, 5, 3, 1, 14, 12, 10, 8, 6, 4, 2],
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{foo:15px;foo:13px;foo:11px;foo:9px;foo:7px;foo:5px;foo:3px;foo:1px;foo:14px;foo:12px;foo:10px;foo:8px;foo:6px;foo:4px;foo:2px}`
    );
  });

  it("should merge duplicate nested styles", () => {
    const Style = create();

    const className = Style.registerStyle({
      color: "red",
      ".foo": {
        color: "red",
      },
    });

    expect(Style.getStyles()).toEqual(
      `.${className},.${className} .foo{color:red}`
    );
  });

  it("should produce multiple @-rules across styles", () => {
    const Style = create();
    const mediaQuery = "@media (min-width: 600px)";
    let changeId = Style.changeId;

    const className1 = Style.registerStyle({
      [mediaQuery]: {
        color: "red",
      },
    });

    expect(Style.changeId).not.toEqual(changeId);

    // Checking the next register _does_ trigger a change.
    changeId = Style.changeId;

    const className2 = Style.registerStyle({
      [mediaQuery]: {
        color: "blue",
      },
    });

    expect(Style.changeId).not.toEqual(changeId);

    expect(Style.getStyles()).toEqual(
      `@media (min-width: 600px){.${className1}{color:red}}@media (min-width: 600px){.${className2}{color:blue}}`
    );
  });

  it("should not output empty styles", () => {
    const Style = create();

    Style.registerStyle({
      color: null,
    });

    expect(Style.getStyles()).toEqual("");
  });

  it("should support @-rules within @-rules", () => {
    const Style = create();

    const className = Style.registerStyle({
      "@media (min-width: 100em)": {
        "@supports (display: flexbox)": {
          maxWidth: 100,
        },
      },
    });

    expect(Style.getStyles()).toEqual(
      `@media (min-width: 100em){@supports (display: flexbox){.${className}{max-width:100px}}}`
    );
  });

  it("should merge styles across instances", () => {
    const Style1 = create();
    const Style2 = create();
    const Style3 = create();

    const className1 = Style1.registerStyle({
      color: "red",
    });

    Style2.registerStyle({
      // Should duplicate `className1`.
      color: "red",
    });

    const className3 = Style3.registerStyle({
      color: "red",
      "@media (max-width: 600px)": {
        color: "blue",
      },
    });

    Style2.merge(Style3);
    Style1.merge(Style2);

    expect(Style1.getStyles()).toEqual(
      `.${className1}{color:red}.${className3}{color:red}@media (max-width: 600px){.${className3}{color:blue}}`
    );

    Style1.unmerge(Style2);

    expect(Style1.getStyles()).toEqual(`.${className1}{color:red}`);
  });

  it("should register keyframes", () => {
    const Style = create();

    const animation1 = Style.registerStyle({
      $global: true,
      "@keyframes &": {
        from: { color: "blue" },
        to: { color: "red" },
      },
    });

    const animation2 = Style.registerStyle({
      $global: true,
      "@-webkit-keyframes &": {
        from: { color: "blue" },
        to: { color: "red" },
      },
    });

    expect(Style.getStyles()).toEqual(
      `@keyframes ${animation1}{from{color:blue}to{color:red}}@-webkit-keyframes ${animation2}{from{color:blue}to{color:red}}`
    );
  });

  it("should merge duplicate keyframes", () => {
    const Style = create();

    const keyframes1 = Style.registerStyle({
      $global: true,
      "@keyframes &": {
        from: { color: "red" },
        to: { color: "blue" },
      },
    });

    const keyframes2 = Style.registerStyle({
      $global: true,
      "@keyframes &": {
        to: { color: "blue" },
        from: { color: "red" },
      },
    });

    expect(keyframes1).toEqual(keyframes2);

    expect(Style.getStyles()).toEqual(
      `@keyframes ${keyframes1}{from{color:red}to{color:blue}}`
    );
  });

  it("should register @-rule", () => {
    const Style = create();
    const changeId = Style.changeId;

    Style.registerStyle({
      $global: true,
      "@font-face": {
        fontFamily: '"Bitstream Vera Serif Bold"',
        src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")',
      },
    });

    expect(Style.changeId).not.toEqual(changeId);

    expect(Style.getStyles()).toEqual(
      '@font-face{font-family:"Bitstream Vera Serif Bold";' +
        'src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}'
    );
  });

  it("should not merge @-rules with different styles", () => {
    const Style = create();

    Style.registerStyle({
      $global: true,
      "@font-face": {
        fontFamily: '"Bitstream Vera Serif Bold"',
        src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")',
      },
    });

    Style.registerStyle({
      $global: true,
      "@font-face": {
        fontFamily: '"MyWebFont"',
        src: 'url("myfont.woff2")',
      },
    });

    expect(Style.getStyles()).toEqual(
      '@font-face{font-family:"Bitstream Vera Serif Bold";' +
        'src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}' +
        '@font-face{font-family:"MyWebFont";src:url("myfont.woff2")}'
    );
  });

  it("should register base rule", () => {
    const Style = create();

    Style.registerStyle({
      $global: true,
      body: {
        margin: 0,
        padding: 0,
      },
    });

    expect(Style.getStyles()).toEqual("body{margin:0;padding:0}");
  });

  it("should register @-rule with nesting", () => {
    const Style = create();

    Style.registerStyle({
      $global: true,
      "@media print": {
        body: {
          color: "red",
        },
      },
    });

    expect(Style.getStyles()).toEqual("@media print{body{color:red}}");
  });

  it("should create a different hash for nested css rules", () => {
    const Style = create();

    const className1 = Style.registerStyle({
      color: "red",
    });

    const className2 = Style.registerStyle({
      "&:first-child": {
        color: "red",
      },
    });

    expect(className1).not.toEqual(className2);
    expect(Style.getStyles()).toEqual(
      `.${className1}{color:red}.${className2}:first-child{color:red}`
    );
  });

  it("should retain insertion order", () => {
    const Style = create();

    const x = Style.registerStyle({
      background: "red",
      "@media (min-width: 400px)": {
        background: "yellow",
      },
    });

    const y = Style.registerStyle({
      background: "palegreen",
      "@media (min-width: 400px)": {
        background: "pink",
      },
    });

    expect(Style.getStyles()).toEqual(
      `.${x}{background:red}@media (min-width: 400px){.${x}{background:yellow}}` +
        `.${y}{background:palegreen}@media (min-width: 400px){.${y}{background:pink}}`
    );
  });

  it("should retain nested param order", () => {
    const Style = create();
    const changeId = Style.changeId;

    const className = Style.registerStyle({
      width: "20rem",
      "@media screen and (min-width: 500px)": {
        width: 500,
      },
      "@media screen and (min-width: 1000px)": {
        width: 1000,
      },
    });

    expect(Style.changeId).not.toEqual(changeId);

    expect(Style.getStyles()).toEqual(
      `.${className}{width:20rem}@media screen and (min-width: 500px){.${className}{width:500px}}` +
        `@media screen and (min-width: 1000px){.${className}{width:1000px}}`
    );
  });

  it("should work with properties and nested styles in a single rule", () => {
    const Style = create();

    Style.registerStyle({
      $global: true,
      body: {
        height: "100%",
        a: {
          color: "red",
        },
      },
    });

    expect(Style.getStyles()).toEqual("body{height:100%}body a{color:red}");
  });

  it("should interpolate recursively with a rule", () => {
    const Style = create();

    Style.registerStyle({
      $global: true,
      body: {
        height: "100%",
        a: {
          color: "red",
        },
        "@print": {
          a: {
            color: "blue",
          },
        },
      },
    });

    expect(Style.getStyles()).toEqual(
      "body{height:100%}body a{color:red}@print{body a{color:blue}}"
    );
  });

  it("should disable style de-dupe", () => {
    const Style = create();

    const className = Style.registerStyle({
      color: "blue",
      "&::-webkit-input-placeholder": {
        color: `rgba(0, 0, 0, 0)`,
        $unique: true,
      },
      "&::-moz-placeholder": {
        color: `rgba(0, 0, 0, 0)`,
        $unique: true,
      },
      "&::-ms-input-placeholder": {
        color: `rgba(0, 0, 0, 0)`,
        $unique: true,
      },
    });

    expect(Style.getStyles()).toEqual(
      `.${className}{color:blue}` +
        `.${className}::-webkit-input-placeholder{color:rgba(0, 0, 0, 0)}` +
        `.${className}::-moz-placeholder{color:rgba(0, 0, 0, 0)}` +
        `.${className}::-ms-input-placeholder{color:rgba(0, 0, 0, 0)}`
    );
  });

  it("should register a css object", () => {
    const Style = create();

    Style.registerStyle({
      $global: true,
      body: {
        color: "red",
        "@print": {
          color: "blue",
        },
      },
      h1: {
        color: "red",
        "@print": {
          color: "#000",
          a: {
            color: "blue",
          },
        },
      },
    });

    expect(Style.getStyles()).toEqual(
      "body,h1{color:red}@print{body,h1 a{color:blue}h1{color:#000}}"
    );
  });

  it("should emit changes", () => {
    const styles: string[] = [];

    const Style = create({
      add(style, index) {
        styles.splice(index, 0, style.getStyles());
      },
      change(style, oldIndex, newIndex) {
        styles.splice(oldIndex, 1);
        styles.splice(newIndex, 0, style.getStyles());
      },
      remove(_, index) {
        styles.splice(index, 1);
      },
    });

    Style.registerStyle({
      background: "red",
      "@media (min-width: 400px)": {
        background: "yellow",
      },
    });

    Style.registerStyle({
      background: "palegreen",
      "@media (min-width: 400px)": {
        background: "pink",
      },
    });

    expect(styles.join("")).toEqual(Style.getStyles());
  });

  it("should escape css selectors", () => {
    const Style = create();
    const $displayName = "Connect(App)";

    const animationName = Style.registerStyle({
      $global: true,
      $displayName,
      "@keyframes &": {
        from: { color: "red" },
      },
    });

    const className = Style.registerStyle({
      $displayName,
      animation: animationName,
      ".t": { color: "red" },
    });

    expect(animationName.startsWith($displayName)).toBe(true);
    expect(className.startsWith($displayName)).toBe(true);

    expect(Style.getStyles()).toEqual(
      `@keyframes ${animationName.replace(/[()]/g, "\\$&")}{from{color:red}}` +
        `.${className.replace(/[()]/g, "\\$&")}{animation:${animationName}}` +
        `.${className.replace(/[()]/g, "\\$&")} .t{color:red}`
    );
  });

  it("should clone a new style instance", () => {
    const Style = create();

    Style.registerStyle({ color: "red" });

    const Style2 = Style.clone();

    expect(Style.getStyles()).toEqual(Style2.getStyles());

    Style2.registerStyle({ color: "blue" });

    expect(Style.getStyles()).not.toEqual(Style2.getStyles());
  });

  it("should customize class name prefix", () => {
    const Style = create(undefined, "foo");

    const className = Style.registerStyle({
      color: "red",
    });

    expect(className.startsWith("foo")).toBe(true);
    expect(Style.getStyles()).toEqual(`.${className}{color:red}`);
  });

  describe("in production", () => {
    const PREV_NODE_ENV = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = "production";
    });

    afterAll(() => {
      process.env.NODE_ENV = PREV_NODE_ENV;
    });

    it("should ignore debug prefixes", () => {
      const Style = create(undefined);
      let changeId = Style.changeId;

      const className1 = Style.registerStyle({
        $displayName: "className1",
        color: "red",
      });

      expect(Style.changeId).not.toEqual(changeId);

      changeId = Style.changeId;

      const className2 = Style.registerStyle({
        $displayName: "className2",
        color: "red",
      });

      expect(Style.changeId).toEqual(changeId);
      expect(className1).toEqual(className2);
      expect(Style.getStyles()).toEqual(`.${className1}{color:red}`);
    });
  });
});
