import webpack from "webpack";

interface Options {
  files: [];
}
class CssDtsCheckerWebpackPlugin {
  /**
   * Current version of the plugin
   */
  static readonly version: string = "{{VERSION}}"; // will be replaced by the @semantic-release/exec

  private readonly options: Options;

  constructor(options: Options = { files: [] }) {
    this.options = options || {};
  }

  // public static getCompilerHooks(compiler: webpack.Compiler) {
  //   return getForkTsCheckerWebpackPluginHooks(compiler);
  // }

  apply(compiler: webpack.Compiler) {
    const options = this.options;
    console.log("huhu", this.options.files);

    // const configuration = createForkTsCheckerWebpackPluginConfiguration(
    //   compiler,
    //   this.options
    // );
    // const state = createForkTsCheckerWebpackPluginState();
    // const reporters: ReporterRpcClient[] = [];
    // if (configuration.typescript.enabled) {
    //   assertTypeScriptSupport(configuration.typescript);
    //   reporters.push(
    //     createTypeScriptReporterRpcClient(configuration.typescript)
    //   );
    // }
    // if (configuration.eslint.enabled) {
    //   assertEsLintSupport(configuration.eslint);
    //   reporters.push(createEsLintReporterRpcClient(configuration.eslint));
    // }
    // if (reporters.length) {
    //   const reporter = createAggregatedReporter(
    //     composeReporterRpcClients(reporters)
    //   );
    //   tapAfterEnvironmentToPatchWatching(compiler, state);
    //   tapStartToConnectAndRunReporter(compiler, reporter, configuration, state);
    //   tapAfterCompileToAddDependencies(compiler, configuration, state);
    //   tapStopToDisconnectReporter(compiler, reporter, state);
    //   tapErrorToLogMessage(compiler, configuration);
    // } else {
    //   throw new Error(
    //     `ForkTsCheckerWebpackPlugin is configured to not use any issue reporter. It's probably a configuration issue.`
    //   );
    // }
  }
}

export { CssDtsCheckerWebpackPlugin };
