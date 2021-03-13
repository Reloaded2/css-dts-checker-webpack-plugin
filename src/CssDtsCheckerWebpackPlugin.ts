import webpack from "webpack";

import { compile } from "./TsCompiler";
import { globPromise } from "./utils";
import path from "path";

interface Options {
  files: string | null;
}
class CssDtsCheckerWebpackPlugin {
  /**
   * Current version of the plugin
   */
  static readonly version: string = "{{VERSION}}"; // will be replaced by the @semantic-release/exec

  private readonly options: Options;
  private readonly errors: { messages: string[]; file: string }[];

  constructor(options: Options = { files: null }, errors: []) {
    this.options = options || {};
    this.errors = errors || [];
  }

  // public static getCompilerHooks(compiler: webpack.Compiler) {
  //   return getForkTsCheckerWebpackPluginHooks(compiler);
  // }

  apply(compiler: webpack.Compiler) {
    const options = this.options;
    let errors = this.errors;

    // throw new Error(
    //   `ForkTsCheckerWebpackPlugin is configured to not use any issue reporter. It's probably a configuration issue.`
    // );

    const handle = async () => {
      if (options.files === null) {
        errors = [{ messages: ["files not found"], file: "" }];
      } else {
        let allFiles: string[] = [];
        try {
          allFiles = await globPromise(options.files, {});
        } catch (error) {
          console.log("erro");
        }

        if (allFiles.length > 0) {
          const notFoundedCssClasses = compile(allFiles, {});

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
