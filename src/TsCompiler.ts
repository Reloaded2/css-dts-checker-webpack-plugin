import type { stylesOption } from "CssDtsCheckerWebpackPlugin";
import ts from "typescript";
import { visitOnlyJsxElements } from "./utils/nodeHelpers";
import { visitNode } from "./utils/nodeHelpers";

export function compile(fileNames: string[], stylesOption: stylesOption) {
  const program = ts.createProgram(fileNames, {});
  const checker = program.getTypeChecker();

  const STYLES_EXTENSION_REGEX = new RegExp(`.${stylesOption.extension}`);
  let notFoundedCssClasses: {
    file: string;
    classes: string[];
    scope: string;
  }[] = [];

  fileNames.forEach((fileName) => {
    const sourceFile = program.getSourceFile(fileName);

    if (sourceFile === undefined) {
      throw new Error(`Sourcefile: ${fileName} not found`);
    }

    if (sourceFile !== undefined) {
      ts.forEachChild(sourceFile, (node) => {
        // if import declaration
        if (ts.isImportDeclaration(node)) {
          const clauses = node.importClause;

          if (clauses !== undefined && clauses.name !== undefined) {
            const importName = clauses.name.getText();
            const importPath = node.moduleSpecifier.getText();

            // get only extension
            if (
              STYLES_EXTENSION_REGEX.test(importPath) &&
              stylesOption.jsxAttributeSearchName !== null
            ) {
              let allDtsStyles: string[] = [];
              const allTypes = checker.getTypeAtLocation(clauses);

              allTypes.getProperties().forEach((x) => {
                allDtsStyles = [...allDtsStyles, x.getName()];
              });

              if (allDtsStyles.length > 0) {
                const { data, jsxExpressionCheck } = visitOnlyJsxElements(
                  sourceFile,
                  [],
                  [],
                  stylesOption.jsxAttributeSearchName,
                  importName
                );

                const founded = visitNode(
                  sourceFile,
                  data,
                  jsxExpressionCheck,
                  importName
                );

                // console.log("founded", founded);

                // filter founded classes
                const notFoundenFileClasses = allDtsStyles.filter(
                  (value) =>
                    !founded.find(
                      (rm) => rm.value === value && rm.name === importName
                    )
                );

                if (notFoundenFileClasses.length > 0) {
                  notFoundedCssClasses = [
                    ...notFoundedCssClasses,
                    {
                      file: fileName,
                      classes: notFoundenFileClasses,
                      scope: importName,
                    },
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
