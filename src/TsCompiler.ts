import { stylesOption } from "CssDtsCheckerWebpackPlugin";
import ts from "typescript";
import { iteratorToArray, visitNode } from "./utils";

let notFoundedCssClasses: { file: string; classes: string[] }[] = [];

export function compile(fileNames: string[], stylesOption: stylesOption) {
  const program = ts.createProgram(fileNames, {});

  const STYLES_EXTENSION_REGEX = new RegExp(`.${stylesOption.extension}`);

  fileNames.forEach((fileName) => {
    const sourceFile = program.getSourceFile(fileName);
    const checker = program.getTypeChecker();

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

                // filter founded classes
                const notFoundenFileClasses = allDtsStyles.filter(
                  (value) =>
                    !founded.find(
                      (rm) => rm.value === value && rm.name === importName
                    )
                );

                notFoundedCssClasses = [
                  ...notFoundedCssClasses,
                  { file: fileName, classes: notFoundenFileClasses },
                ];
              }
            }
          }
        }
      });
    }
  });

  return notFoundedCssClasses;
}
