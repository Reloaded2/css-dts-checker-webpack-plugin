import { compile } from "./TsCompiler";

const test = compile(["./examples/Button/index.tsx"], {
  extension: "css",
  jsxAttributeSearchName: "class",
});

console.log("result", test);
