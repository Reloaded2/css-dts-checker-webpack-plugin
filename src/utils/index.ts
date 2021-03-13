import ts from "typescript";
import glob from "glob";

export const globPromise = function (
  pattern: string,
  options: glob.IOptions
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) =>
      err === null ? resolve(files) : reject(err)
    );
  });
};

const CSS_PROP = "class";

const getIdentifierText = (
  node: ts.PropertyName | ts.BindingName | ts.Expression
): string => {
  return (
    ((node as ts.Identifier).escapedText as string) ||
    (node as ts.Identifier).text
  );
};

export const templateLiteralToCss = (
  node:
    | ts.TemplateExpression
    | ts.NoSubstitutionTemplateLiteral
    | ts.StringLiteral,
  variableUsage: { name: string; referenceName: string; value: string }[]
) => {
  if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node)) {
    return [];
  }

  const cssVariables: { name: string; value: string }[] = [];

  node.templateSpans.forEach((span) => {
    const key = getIdentifierText(span.expression);

    if (key !== undefined && variableUsage.length) {
      variableUsage.forEach((usagedItem) => {
        if (usagedItem.name === key) {
          cssVariables.push({
            name: usagedItem.referenceName,
            value: usagedItem.value,
          });
        }
      });
    }

    if (span.expression.getChildCount()) {
      const variableName = span.expression.getChildAt(2).getText();
      const variablePrefix = span.expression.getChildAt(0).getText();

      cssVariables.push({ name: variablePrefix, value: variableName });
    }

    if (ts.isBinaryExpression(span.expression)) {
      const variableName = span.expression.right.getChildAt(2).getText();
      const variablePrefix = span.expression.right.getChildAt(0).getText();

      cssVariables.push({ name: variablePrefix, value: variableName });
    }
  });

  return cssVariables;
};

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

export function visitNode(
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

export function iteratorToArray(iterator: any): string[] {
  return Array.from(iterator);
}
