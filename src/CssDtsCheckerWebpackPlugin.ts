import webpack from "webpack";
import glob from "glob";

interface Options {
  files: [];
}
class CssDtsCheckerWebpackPlugin {
  /**
   * Current version of the plugin
   */
  static readonly version: string = "{{VERSION}}"; // will be replaced by the @semantic-release/exec

  private readonly options: Options;
  private readonly errors: { message: string }[];

  constructor(options: Options = { files: [] }, errors: []) {
    this.options = options || {};
    this.errors = errors || [];
  }

  // public static getCompilerHooks(compiler: webpack.Compiler) {
  //   return getForkTsCheckerWebpackPluginHooks(compiler);
  // }

  apply(compiler: webpack.Compiler) {
    const options = this.options;
    let errors = this.errors;

    console.log("jojo start");

    // throw new Error(
    //   `ForkTsCheckerWebpackPlugin is configured to not use any issue reporter. It's probably a configuration issue.`
    // );

    const handle = () => {
      // _this.errors = [
      //   { message: "hier ist alles falsch" },
      //   { message: "und hier ist auch alles flasch" },
      // ];

      if (options.files === undefined) {
        errors = [{ message: "files not found" }];
      }
      // glob(options.files, {}, function (_er, files) {
      //   console.log(files);
      //   // files is an array of filenames.
      //   // If the `nonull` option is set, and nothing
      //   // was found, then files is ["**/*.js"]
      //   // er is an error object or null.
      // });
    };

    compiler.hooks.emit.tapAsync(
      "MyExampleWebpackPlugin",
      (compilation, callback) => {
        if (errors.length > 0) {
          //throw new Error(_this.errors.map((err) => err.message || err));

          compilation.errors = [
            {
              name: "ss",
              message: "Hier ist ein Fehler passiert...",
              details: "",
              module: "" as any,
              loc: "" as any,
              hideStack: false,
              chunk: false as any,
              file: "filenam",
              serialize: () => null,
              deserialize: () => null,
            },

            // new Error(errors.map((err) => err.message || err)),
          ];
        }

        // compilation.errors.push(new Error("explain why the build failed"));

        // Manipulate the build using the plugin API provided by webpack

        callback();
      }
    );
    compiler.hooks.run.tap("write-file-webpack-plugin", handle);
  }
}

export { CssDtsCheckerWebpackPlugin };
