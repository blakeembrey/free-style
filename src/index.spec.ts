import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { create } from "./index.js";

describe("free style", () => {
  it("should output class name hash", () => {
    const sheet = create();
    const changeId = sheet.changeId;

    const className = sheet.registerStyle({
      color: "red",
    });

    expect(sheet.getStyles()).toEqual(`.${className}{color:red}`);
    expect(sheet.changeId).not.toEqual(changeId);
  });

  it("should render multiple values", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      background: ["red", "linear-gradient(to right, red 0%, green 100%)"],
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{background:red;background:linear-gradient(to right, red 0%, green 100%)}`,
    );
  });

  it("should dash-case property names", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      backgroundColor: "red",
    });

    expect(sheet.getStyles()).toEqual(`.${className}{background-color:red}`);
  });

  it("should nest @-rules", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      color: "red",
      "@media (min-width: 500px)": {
        color: "blue",
      },
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{color:red}@media (min-width: 500px){.${className}{color:blue}}`,
    );
  });

  it("should interpolate selectors", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      color: "red",
      "& > &": {
        color: "blue",
        ".class-name": {
          background: "green",
        },
      },
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{color:red}.${className} > .${className}{color:blue}` +
        `.${className} > .${className} .class-name{background:green}`,
    );
  });

  it('should not append "px" to whitelisted properties', () => {
    const sheet = create();

    const className = sheet.registerStyle({
      WebkitFlexGrow: 2,
      flexGrow: 2,
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{-webkit-flex-grow:2;flex-grow:2}`,
    );
  });

  it("should merge duplicate styles", () => {
    const sheet = create();
    let changeId = sheet.changeId;

    const className1 = sheet.registerStyle({
      background: "blue",
      color: "red",
    });

    expect(sheet.changeId).not.toEqual(changeId);

    // Checking the duplicate style _does not_ trigger a "change".
    changeId = sheet.changeId;

    const className2 = sheet.registerStyle({
      background: "blue",
      color: "red",
    });

    expect(sheet.changeId).toEqual(changeId);
    expect(className1).toEqual(className2);
    expect(sheet.getStyles()).toEqual(
      `.${className1}{background:blue;color:red}`,
    );
  });

  it("should allow display names", () => {
    const sheet = create();
    let changeId = sheet.changeId;

    const className1 = sheet.registerStyle({
      color: "red",
      $displayName: "className1",
    });

    expect(sheet.changeId).not.toEqual(changeId);

    changeId = sheet.changeId;

    const className2 = sheet.registerStyle({
      color: "red",
      $displayName: "className2",
    });

    expect(sheet.changeId).not.toEqual(changeId);
    expect(className1).not.toEqual(className2);
    expect(sheet.getStyles()).toEqual(
      `.${className1},.${className2}{color:red}`,
    );
  });

  it("should maintain key ordering from object", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      borderStyle: "solid",
      borderColor: "transparent",
      borderBottomColor: "black",
      borderTopColor: "black",
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{border-style:solid;border-color:transparent;border-bottom-color:black;border-top-color:black}`,
    );
  });

  it("should sort keys alphabetically after hyphenating", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      msBorderRadius: 5,
      borderRadius: 5,
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{-ms-border-radius:5px;border-radius:5px}`,
    );
  });

  it("should keep overloaded values in order", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      foo: [15, 13, 11, 9, 7, 5, 3, 1, 14, 12, 10, 8, 6, 4, 2],
    });

    expect(sheet.getStyles()).toEqual(
      `.${className}{foo:15px;foo:13px;foo:11px;foo:9px;foo:7px;foo:5px;foo:3px;foo:1px;foo:14px;foo:12px;foo:10px;foo:8px;foo:6px;foo:4px;foo:2px}`,
    );
  });

  it("should merge duplicate nested styles", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      color: "red",
      ".foo": {
        color: "red",
      },
    });

    expect(sheet.getStyles()).toEqual(
      `.${className},.${className} .foo{color:red}`,
    );
  });

  it("should produce multiple @-rules across styles", () => {
    const sheet = create();
    const mediaQuery = "@media (min-width: 600px)";
    let changeId = sheet.changeId;

    const className1 = sheet.registerStyle({
      [mediaQuery]: {
        color: "red",
      },
    });

    expect(sheet.changeId).not.toEqual(changeId);

    // Checking the next register _does_ trigger a change.
    changeId = sheet.changeId;

    const className2 = sheet.registerStyle({
      [mediaQuery]: {
        color: "blue",
      },
    });

    expect(sheet.changeId).not.toEqual(changeId);

    expect(sheet.getStyles()).toEqual(
      `@media (min-width: 600px){.${className1}{color:red}}@media (min-width: 600px){.${className2}{color:blue}}`,
    );
  });

  it("should not output empty styles", () => {
    const sheet = create();

    sheet.registerStyle({
      color: null,
    });

    expect(sheet.getStyles()).toEqual("");
  });

  it("should support @-rules within @-rules", () => {
    const sheet = create();

    const className = sheet.registerStyle({
      "@media (min-width: 100em)": {
        "@supports (display: flexbox)": {
          maxWidth: 100,
        },
      },
    });

    expect(sheet.getStyles()).toEqual(
      `@media (min-width: 100em){@supports (display: flexbox){.${className}{max-width:100px}}}`,
    );
  });

  it("should merge styles across instances", () => {
    const sheet1 = create();
    const sheet2 = create();
    const sheet3 = create();

    const className1 = sheet1.registerStyle({
      color: "red",
    });

    sheet2.registerStyle({
      // Should duplicate `className1`.
      color: "red",
    });

    const className3 = sheet3.registerStyle({
      color: "red",
      "@media (max-width: 600px)": {
        color: "blue",
      },
    });

    sheet2.merge(sheet3);
    sheet1.merge(sheet2);

    expect(sheet1.getStyles()).toEqual(
      `.${className1}{color:red}.${className3}{color:red}@media (max-width: 600px){.${className3}{color:blue}}`,
    );

    sheet1.unmerge(sheet2);

    expect(sheet1.getStyles()).toEqual(`.${className1}{color:red}`);
  });

  it("should register keyframes", () => {
    const sheet = create();

    const animation1 = sheet.registerStyle({
      $global: true,
      "@keyframes &": {
        from: { color: "blue" },
        to: { color: "red" },
      },
    });

    const animation2 = sheet.registerStyle({
      $global: true,
      "@-webkit-keyframes &": {
        from: { color: "blue" },
        to: { color: "red" },
      },
    });

    expect(sheet.getStyles()).toEqual(
      `@keyframes ${animation1}{from{color:blue}to{color:red}}@-webkit-keyframes ${animation2}{from{color:blue}to{color:red}}`,
    );
  });

  it("should merge duplicate keyframes", () => {
    const sheet = create();

    const keyframes1 = sheet.registerStyle({
      $global: true,
      "@keyframes &": {
        from: { color: "red" },
        to: { color: "blue" },
      },
    });

    const keyframes2 = sheet.registerStyle({
      $global: true,
      "@keyframes &": {
        from: { color: "red" },
        to: { color: "blue" },
      },
    });

    expect(keyframes1).toEqual(keyframes2);

    expect(sheet.getStyles()).toEqual(
      `@keyframes ${keyframes1}{from{color:red}to{color:blue}}`,
    );
  });

  it("should register @-rule", () => {
    const sheet = create();
    const changeId = sheet.changeId;

    sheet.registerStyle({
      $global: true,
      "@font-face": {
        fontFamily: '"Bitstream Vera Serif Bold"',
        src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")',
      },
    });

    expect(sheet.changeId).not.toEqual(changeId);

    expect(sheet.getStyles()).toEqual(
      '@font-face{font-family:"Bitstream Vera Serif Bold";' +
        'src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}',
    );
  });

  it("should not merge @-rules with different styles", () => {
    const sheet = create();

    sheet.registerStyle({
      $global: true,
      "@font-face": {
        fontFamily: '"Bitstream Vera Serif Bold"',
        src: 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")',
      },
    });

    sheet.registerStyle({
      $global: true,
      "@font-face": {
        fontFamily: '"MyWebFont"',
        src: 'url("myfont.woff2")',
      },
    });

    expect(sheet.getStyles()).toEqual(
      '@font-face{font-family:"Bitstream Vera Serif Bold";' +
        'src:url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")}' +
        '@font-face{font-family:"MyWebFont";src:url("myfont.woff2")}',
    );
  });

  it("should register base rule", () => {
    const sheet = create();

    sheet.registerStyle({
      $global: true,
      body: {
        margin: 0,
        padding: 0,
      },
    });

    expect(sheet.getStyles()).toEqual("body{margin:0;padding:0}");
  });

  it("should register @-rule with nesting", () => {
    const sheet = create();

    sheet.registerStyle({
      $global: true,
      "@media print": {
        body: {
          color: "red",
        },
      },
    });

    expect(sheet.getStyles()).toEqual("@media print{body{color:red}}");
  });

  it("should create a different hash for nested css rules", () => {
    const sheet = create();

    const className1 = sheet.registerStyle({
      color: "red",
    });

    const className2 = sheet.registerStyle({
      "&:first-child": {
        color: "red",
      },
    });

    expect(className1).not.toEqual(className2);
    expect(sheet.getStyles()).toEqual(
      `.${className1}{color:red}.${className2}:first-child{color:red}`,
    );
  });

  it("should retain insertion order", () => {
    const sheet = create();

    const x = sheet.registerStyle({
      background: "red",
      "@media (min-width: 400px)": {
        background: "yellow",
      },
    });

    const y = sheet.registerStyle({
      background: "palegreen",
      "@media (min-width: 400px)": {
        background: "pink",
      },
    });

    expect(sheet.getStyles()).toEqual(
      `.${x}{background:red}@media (min-width: 400px){.${x}{background:yellow}}` +
        `.${y}{background:palegreen}@media (min-width: 400px){.${y}{background:pink}}`,
    );
  });

  it("should retain nested param order", () => {
    const sheet = create();
    const changeId = sheet.changeId;

    const className = sheet.registerStyle({
      width: "20rem",
      "@media screen and (min-width: 500px)": {
        width: 500,
      },
      "@media screen and (min-width: 1000px)": {
        width: 1000,
      },
    });

    expect(sheet.changeId).not.toEqual(changeId);

    expect(sheet.getStyles()).toEqual(
      `.${className}{width:20rem}@media screen and (min-width: 500px){.${className}{width:500px}}` +
        `@media screen and (min-width: 1000px){.${className}{width:1000px}}`,
    );
  });

  it("should work with properties and nested styles in a single rule", () => {
    const sheet = create();

    sheet.registerStyle({
      $global: true,
      body: {
        height: "100%",
        a: {
          color: "red",
        },
      },
    });

    expect(sheet.getStyles()).toEqual("body{height:100%}body a{color:red}");
  });

  it("should interpolate recursively with a rule", () => {
    const sheet = create();

    sheet.registerStyle({
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

    expect(sheet.getStyles()).toEqual(
      "body{height:100%}body a{color:red}@print{body a{color:blue}}",
    );
  });

  it("should disable style de-dupe", () => {
    const sheet = create();

    const className = sheet.registerStyle({
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

    expect(sheet.getStyles()).toEqual(
      `.${className}{color:blue}` +
        `.${className}::-webkit-input-placeholder{color:rgba(0, 0, 0, 0)}` +
        `.${className}::-moz-placeholder{color:rgba(0, 0, 0, 0)}` +
        `.${className}::-ms-input-placeholder{color:rgba(0, 0, 0, 0)}`,
    );
  });

  it("should register a css object", () => {
    const sheet = create();

    sheet.registerStyle({
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

    expect(sheet.getStyles()).toEqual(
      "body,h1{color:red}@print{body,h1 a{color:blue}h1{color:#000}}",
    );
  });

  it("should emit changes", () => {
    const styles: string[] = [];
    const added: unknown[] = [];

    const sheet = create({
      add(style, index) {
        added.push(style);
        styles.splice(index, 0, style.getStyles());
      },
      change(style, index) {
        styles[index] = style.getStyles();
      },
      remove(style, index) {
        expect(added).toContain(style);
        styles.splice(index, 1);
      },
    });

    sheet.registerStyle({
      background: "red",
      "@media (min-width: 400px)": {
        background: "yellow",
      },
    });

    const sheet2 = create();

    sheet2.registerStyle({
      background: "palegreen",
      "@media (min-width: 400px)": {
        background: "pink",
      },
    });

    sheet.merge(sheet2);
    expect(styles.join("")).toEqual(sheet.getStyles());

    sheet.unmerge(sheet2);
    expect(styles.join("")).toEqual(sheet.getStyles());

    expect(added).toHaveLength(4); // Style x2, @media x2.
  });

  it("should escape css selectors", () => {
    const sheet = create();
    const $displayName = "Connect(App)";

    const animationName = sheet.registerStyle({
      $global: true,
      $displayName,
      "@keyframes &": {
        from: { color: "red" },
      },
    });

    const className = sheet.registerStyle({
      $displayName,
      animation: animationName,
      ".t": { color: "red" },
    });

    expect(animationName.startsWith($displayName)).toBe(true);
    expect(className.startsWith($displayName)).toBe(true);

    expect(sheet.getStyles()).toEqual(
      `@keyframes ${animationName.replace(/[()]/g, "\\$&")}{from{color:red}}` +
        `.${className.replace(/[()]/g, "\\$&")}{animation:${animationName}}` +
        `.${className.replace(/[()]/g, "\\$&")} .t{color:red}`,
    );
  });

  it("should customize class name prefix", () => {
    const sheet = create(undefined, "foo");

    const className = sheet.registerStyle({
      color: "red",
    });

    expect(className.startsWith("foo")).toBe(true);
    expect(sheet.getStyles()).toEqual(`.${className}{color:red}`);
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
      const sheet = create(undefined);
      let changeId = sheet.changeId;

      const className1 = sheet.registerStyle({
        $displayName: "className1",
        color: "red",
      });

      expect(sheet.changeId).not.toEqual(changeId);

      changeId = sheet.changeId;

      const className2 = sheet.registerStyle({
        $displayName: "className2",
        color: "red",
      });

      expect(sheet.changeId).toEqual(changeId);
      expect(className1).toEqual(className2);
      expect(sheet.getStyles()).toEqual(`.${className1}{color:red}`);
    });
  });
});
