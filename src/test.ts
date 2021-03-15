import { compile } from "./TsCompiler";

const test = compile(["./examples/ColorPicker/index.tsx"], {
  extension: "css",
  jsxAttributeSearchName: "class",
});

console.log("result", test);
