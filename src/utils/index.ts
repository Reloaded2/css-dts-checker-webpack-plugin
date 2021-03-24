import ts from "typescript";
import {
  checkJsxAttributeType,
  getJsxNodeAttributesValue,
} from "./nodeHelpers";

export type foundedCssClassesType = {
  name: string;
  value: string;
}[];

export type variableUsageType = {
  variableName: string;
  referenceName: string;
  value: string;
}[];

export function visitNode(
  node: ts.Node,
  data: foundedCssClassesType,
  variableUsage: variableUsageType,
  jsxAttributeSearchName: string,
  scopeName: string
) {
  if (ts.isFunctionDeclaration(node)) {
    if (node.body !== undefined) {
      if (ts.isBlock(node.body)) {
        const [VariableStatement] = node.body.statements;
        if (ts.isVariableStatement(VariableStatement)) {
          const [declaration] = VariableStatement.declarationList.declarations;

          if (
            ts.isVariableDeclaration(declaration) &&
            declaration.initializer
          ) {
            if (ts.isPropertyAccessExpression(declaration.initializer)) {
              const name = declaration.initializer.expression.getText();
              const value = declaration.initializer.name.text;
              data.push({
                name,
                value,
              });
            }
            if (ts.isElementAccessExpression(declaration.initializer)) {
              const name = declaration.initializer.expression.getText();
              const value = declaration.initializer.argumentExpression.getText();
              data.push({
                name,
                value,
              });
            }
          }
        }
      }
    }
  }

  if (ts.isVariableStatement(node)) {
    const [declaration] = node.declarationList.declarations;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      if (ts.isPropertyAccessExpression(declaration.initializer)) {
        const name = declaration.initializer.expression.getText();
        const value = declaration.initializer.name.text;
        data.push({
          name,
          value,
        });
      }

      if (ts.isElementAccessExpression(declaration.initializer)) {
        const name = declaration.initializer.expression.getText();
        const value = declaration.initializer.argumentExpression.getText();
        data.push({
          name,
          value,
        });
      }
    }
  }

  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression)
  ) {
    const variableName = node.expression.left.getText();

    if (ts.isTemplateExpression(node.expression.right)) {
      node.expression.right.templateSpans.forEach((span) => {
        if (ts.isPropertyAccessExpression(span.expression)) {
          const value = span.expression.name.getText();
          const name = span.expression.expression.getText();
          data.push({
            name,
            value,
          });
        }
      });
    }

    if (ts.isPropertyAccessExpression(node.expression.right)) {
      const value = node.expression.right.name.getText();
      const name = node.expression.right.expression.getText();
      data.push({
        name,
        value,
      });
    }
  }

  // find jsxElement
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const cssJsxAttribute = getJsxNodeAttributesValue(
      node,
      jsxAttributeSearchName
    );

    if (cssJsxAttribute !== undefined) {
      data = checkJsxAttributeType(
        cssJsxAttribute,
        data,
        variableUsage,
        scopeName
      );
    }
  }

  node.forEachChild((child) => {
    visitNode(child, data, variableUsage, jsxAttributeSearchName, scopeName);
  });

  return data;
}
