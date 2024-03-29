import webpack from "webpack";
import { compile } from "./TsCompiler";
import fastGlob from "fast-glob";

export interface stylesOption {
  extension: "scss" | "css";
  jsxAttributeSearchName: string | null;
}

interface Options {
  files: string | null;
  ignore: string[];
  stylesOption: stylesOption;
}
class CssDtsCheckerWebpackPlugin {
  private readonly options: Options;
  private readonly errors: { messages: string[]; file: string }[];

  constructor(
    options: Options = {
      files: null,
      ignore: [],
      stylesOption: { extension: "css", jsxAttributeSearchName: null },
    },
    errors: []
  ) {
    this.options = options || {};
    this.errors = errors || [];
  }

  apply(compiler: webpack.Compiler) {
    const options = this.options;
    let errors = this.errors;

    const handle = async () => {
      if (
        options.files === null ||
        options.stylesOption.jsxAttributeSearchName === null
      ) {
        errors = [{ messages: ["configuration error"], file: "" }];
      } else {
        let allFiles: string[] = [];
        try {
          allFiles = await fastGlob(options.files, { ignore: options.ignore });
        } catch (error) {
          console.log("erro");
        }

        if (allFiles.length > 0) {
          const notFoundedCssClasses = compile(allFiles, options.stylesOption);

          if (notFoundedCssClasses.length > 0) {
            errors = notFoundedCssClasses.map((item) => ({
              messages: item.classes,
              file: item.file,
            }));
          }
        }
      }
    };

    compiler.hooks.emit.tapAsync(
      "CssDtsCheckerWebpackPlugin",
      (compilation, callback) => {
        if (errors.length > 0) {
          //throw new Error(_this.errors.map((err) => err.message || err));

          compilation.errors = errors.map((item) => ({
            name: "FOOFOFOF",
            message: `the following styling classes are not used: ${item.messages.join(
              " "
            )}`,
            details: "my deatils",
            module: "" as any,
            loc: "" as any,
            hideStack: false,
            chunk: false as any,
            file: item.file,
            serialize: () => null,
            deserialize: () => null,
          }));
        }

        callback();
      }
    );
    compiler.hooks.run.tap("write-file-webpack-plugin", handle);
  }
}

export { CssDtsCheckerWebpackPlugin };
