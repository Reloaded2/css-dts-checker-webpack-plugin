import ts from "typescript";
import { templateLiteralToCss } from "./utils/template-literal-to-css";

const STYLES_EXTENSION_REGEX = /\.scss/;
const CSS_PROP = "class";

const getJsxNodeAttributes = (
  node: ts.JsxElement | ts.JsxSelfClosingElement
): ts.JsxAttributes => {
  if ("attributes" in node) {
    return node.attributes;
  }
  return node.openingElement.attributes;
};

const getJsxNodeAttributesValue = (
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  propertyName: string
) => {
  const attribute = getJsxNodeAttributes(node).properties.find(
    (prop) => ts.isJsxAttribute(prop) && prop.name.escapedText === propertyName
  ) as ts.JsxAttribute | undefined;

  return attribute?.initializer ? attribute.initializer : undefined;
};

function visitNode(
  node: ts.Node,
  data: { name: string; value: string }[],
  variableUsage: { name: string; referenceName: string; value: string }[]
) {
  let referenceName = "";
  let value = "";

  if (ts.isVariableStatement(node)) {
    const [declaration] = node.declarationList.declarations;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const variableName = declaration.name.getText();

      if (ts.isPropertyAccessExpression(declaration.initializer)) {
        referenceName = declaration.initializer.expression.getText();
        value = declaration.initializer.name.text;
      }

      if (ts.isElementAccessExpression(declaration.initializer)) {
        referenceName = declaration.initializer.expression.getText();
        value = declaration.initializer.argumentExpression.getText();
      }

      if (referenceName !== "" && value !== "") {
        variableUsage.push({
          name: variableName,
          referenceName: referenceName,
          value: value,
        });
      }
    }
  }

  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression)
  ) {
    const variableName = node.expression.left.getText();

    if (ts.isPropertyAccessExpression(node.expression.right)) {
      value = node.expression.right.name.getText();
      referenceName = node.expression.right.expression.getText();
      variableUsage.push({
        name: variableName,
        referenceName: referenceName,
        value: value,
      });
    }
  }

  if (ts.isJsxElement(node)) {
    const cssJsxAttribute = getJsxNodeAttributesValue(node, CSS_PROP);

    if (cssJsxAttribute !== undefined) {
      if (ts.isStringLiteral(cssJsxAttribute)) {
        // do nothing
      } else if (!cssJsxAttribute.expression) {
        // expression was empty e.g. css={}
        // do nothing
      } else if (
        ts.isTemplateExpression(cssJsxAttribute.expression) ||
        ts.isNoSubstitutionTemplateLiteral(cssJsxAttribute.expression)
      ) {
        const literalsFound = templateLiteralToCss(
          cssJsxAttribute.expression,
          variableUsage
        );
        data.push(...literalsFound);
      } else {
        if (ts.isJsxExpression(cssJsxAttribute)) {
          // example: styles.hide
          const importname = cssJsxAttribute.expression.getChildAt(0).getText(); // example: styles
          const value = cssJsxAttribute.expression.getChildAt(2).getText();
          data.push({ name: importname, value: value });
        }
      }
    }
  }

  node.forEachChild((child) => {
    visitNode(child, data, variableUsage);
  });

  return data;
}

function iteratorToArray(iterator: any): string[] {
  return Array.from(iterator);
}

function compile(fileNames: string[], options: ts.CompilerOptions) {
  const program = ts.createProgram(fileNames, options);

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
              STYLES_EXTENSION_REGEX.test(modulePath)
            ) {
              // styles variable importanme
              const importName = symbol.escapedName as string;

              const allTypes = checker.getTypeAtLocation(namedImport);

              const getAllStylesClassesFromDtsFile = allTypes
                .getSymbol()
                ?.members?.keys();

              if (getAllStylesClassesFromDtsFile !== undefined) {
                let allDtsStyles = iteratorToArray(
                  getAllStylesClassesFromDtsFile
                );

                const founded = visitNode(sourceFile, [], []);

                // filter founded classes
                allDtsStyles = allDtsStyles.filter(
                  (value) =>
                    !founded.find(
                      (rm) => rm.value === value && rm.name === importName
                    )
                );

                // const foo = ts.forEachChild(sourceFile, visitNode);

                console.log("this css class not used :::", allDtsStyles);
              }
            }
          }
        }
      });
    }
  });
}

compile(["./src/example/index.tsx"], {});
