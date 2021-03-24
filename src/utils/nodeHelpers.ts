import ts from "typescript";
import type { foundedCssClassesType, variableUsageType } from "utils";

const getJsxNodeAttributes = (
  node: ts.JsxElement | ts.JsxSelfClosingElement
): ts.JsxAttributes => {
  if ("attributes" in node) {
    return node.attributes;
  }
  return node.openingElement.attributes;
};

const getIdentifierText = (
  node: ts.PropertyName | ts.BindingName | ts.Expression
): string => {
  return (
    ((node as ts.Identifier).escapedText as string) ||
    (node as ts.Identifier).text
  );
};

const templateLiteralToClassName = (
  node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral,
  variableUsage: variableUsageType
) => {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return [];
  }

  const cssVariables: { name: string; value: string }[] = [];

  node.templateSpans.forEach((span) => {
    const key = getIdentifierText(span.expression);

    if (key !== undefined && variableUsage.length) {
      variableUsage.forEach((usagedItem) => {
        if (usagedItem.variableName === key) {
          cssVariables.push({
            name: usagedItem.referenceName,
            value: usagedItem.value,
          });
        }
      });
    }
    if (ts.isConditionalExpression(span.expression)) {
      if (ts.isPropertyAccessExpression(span.expression.whenTrue)) {
        const variablePrefix = span.expression.whenTrue.expression.getText();
        const variableName = span.expression.whenTrue.name.getText();
        cssVariables.push({ name: variablePrefix, value: variableName });
      }
      if (ts.isPropertyAccessExpression(span.expression.whenFalse)) {
        const variablePrefix = span.expression.whenFalse.expression.getText();
        const variableName = span.expression.whenFalse.name.getText();
        cssVariables.push({ name: variablePrefix, value: variableName });
      }
    }

    if (ts.isPropertyAccessExpression(span.expression)) {
      const variablePrefix = span.expression.expression.getText();
      const variableName = span.expression.name.getText();
      cssVariables.push({ name: variablePrefix, value: variableName });
    }

    if (ts.isBinaryExpression(span.expression)) {
      if (ts.isPropertyAccessExpression(span.expression.right)) {
        const variableName = span.expression.right.name.getText();
        const variablePrefix = span.expression.right.expression.getText();
        cssVariables.push({ name: variablePrefix, value: variableName });
      }
    }
  });

  return cssVariables;
};

export const getJsxNodeAttributesValue = (
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  propertyName: string
) => {
  const attribute = getJsxNodeAttributes(node).properties.find(
    (prop) => ts.isJsxAttribute(prop) && prop.name.escapedText === propertyName
  ) as ts.JsxAttribute | undefined;

  return attribute?.initializer ? attribute.initializer : undefined;
};

export const checkJsxAttributeType = (
  cssJsxAttribute: ts.StringLiteral | ts.JsxExpression,
  data: foundedCssClassesType,
  variableUsage: variableUsageType,
  scopeName: string
) => {
  if (ts.isStringLiteral(cssJsxAttribute)) {
    // do nothing
  } else if (!cssJsxAttribute.expression) {
    // expression was empty e.g. css={}
    // do nothing
  } else if (
    ts.isTemplateExpression(cssJsxAttribute.expression) ||
    ts.isNoSubstitutionTemplateLiteral(cssJsxAttribute.expression)
  ) {
    console.log(cssJsxAttribute.expression.getText());

    const literalsFound = templateLiteralToClassName(
      cssJsxAttribute.expression,
      variableUsage
    );
    data.push(
      ...literalsFound,
      ...variableUsage.map((item) => ({
        name: item.referenceName,
        value: item.value,
      }))
    );
  } else {
    if (ts.isJsxExpression(cssJsxAttribute)) {
      if (ts.isPropertyAccessExpression(cssJsxAttribute.expression)) {
        const value = cssJsxAttribute.expression.name.getText();
        const importName = cssJsxAttribute.expression.expression.getText();

        if (importName === scopeName) {
          data.push({ name: importName, value: value });
        }
      }
      if (ts.isCallExpression(cssJsxAttribute.expression)) {
        console.log("TODO HERE....");

        // TODO
      }
    }
  }

  return data;
};
