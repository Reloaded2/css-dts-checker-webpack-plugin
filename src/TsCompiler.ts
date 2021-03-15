import { stylesOption } from "CssDtsCheckerWebpackPlugin";
import ts from "typescript";
import { iteratorToArray, visitNode } from "./utils";

export function compile(fileNames: string[], stylesOption: stylesOption) {
  const program = ts.createProgram(fileNames, {});

  const STYLES_EXTENSION_REGEX = new RegExp(`.${stylesOption.extension}`);
  let notFoundedCssClasses: { file: string; classes: string[] }[] = [];

  fileNames.forEach((fileName) => {
    const sourceFile = program.getSourceFile(fileName);
    const checker = program.getTypeChecker();

    if (sourceFile === undefined) {
      throw new Error(`Sourcefile: ${fileName} not found`);
    }

    if (sourceFile !== undefined) {
      ts.forEachChild(sourceFile, (node) => {
        // if import declaration
        if (ts.isImportDeclaration(node)) {
          const clauses = node.importClause;

          if (clauses !== undefined) {
            const namedImport = clauses.getChildAt(0);
            const symbol = checker.getSymbolAtLocation(namedImport);

            const modulePath = node.moduleSpecifier.getText();

            // get only extension
            if (
              symbol !== undefined &&
              STYLES_EXTENSION_REGEX.test(modulePath) &&
              stylesOption.jsxAttributeSearchName !== null
            ) {
              // styles variable importanme
              const importName = symbol.escapedName as string;

              const allTypes = checker.getTypeAtLocation(namedImport);

              const getAllStylesClassesFromDtsFile = allTypes
                .getSymbol()
                ?.members?.keys();

              if (getAllStylesClassesFromDtsFile !== undefined) {
                const allDtsStyles = iteratorToArray(
                  getAllStylesClassesFromDtsFile
                );

                const founded = visitNode(
                  sourceFile,
                  [],
                  [],
                  stylesOption.jsxAttributeSearchName
                );

                // console.log("founded", founded);

                // filter founded classes
                const notFoundenFileClasses = allDtsStyles.filter(
                  (value) =>
                    !founded.find(
                      (rm) => rm.value === value && rm.name === importName
                    )
                );

                // console.log("notFoundenFileClasses", notFoundenFileClasses);

                if (notFoundenFileClasses.length > 0) {
                  notFoundedCssClasses = [
                    ...notFoundedCssClasses,
                    { file: fileName, classes: notFoundenFileClasses },
                  ];
                }
              }
            }
          }
        }
      });
    }
  });

  return notFoundedCssClasses;
}
