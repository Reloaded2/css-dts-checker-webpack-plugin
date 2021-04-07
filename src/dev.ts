import { compile } from "./TsCompiler";
import fastGlob from "fast-glob";
import path from "path";

const test = async () => {
  let allFiles: string[] = [];

  try {
    allFiles = await fastGlob(
      path.join(__dirname, "../", "examples/Loader", "**/*.tsx"),
      {
        ignore: ["**/*.test.tsx"],
      }
    );
  } catch (error) {
    console.log("erro");
  }

  if (allFiles.length > 0) {
    const notFoundedCssClasses = compile(allFiles, {
      extension: "css",
      jsxAttributeSearchName: "class",
    });

    if (notFoundedCssClasses.length > 0) {
      console.log(notFoundedCssClasses);
    }
  }

  // const test = compile(["./examples/FormGroup/index.tsx"], {
  //   extension: "css",
  //   jsxAttributeSearchName: "class",
  // });
};
test();
