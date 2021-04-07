import ts from "typescript";
import type { foundedCssClassesType, variableUsageType } from "utils";

type jsxExpressionCheck = {
  type: string;
  value: string;
}[];

export const visitOnlyJsxElements = (
  node: ts.Node,
  data: foundedCssClassesType,
  jsxExpressionCheck: jsxExpressionCheck,
  jsxAttributeSearchName: string,
  scopeName: string
) => {
  // find jsxElement
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const cssJsxAttribute = getJsxNodeAttributesValue(
      node,
      jsxAttributeSearchName
    );

    if (cssJsxAttribute !== undefined) {
      ({ data, jsxExpressionCheck } = checkJsxAttributeType(
        cssJsxAttribute,
        data,
        jsxExpressionCheck,
        scopeName
      ));

      // console.log("HAUA", jsxExpressionCheck);

      // data = value.data;
      // jsxExpressionCheck = value.jsxExpressionCheck;
    }
  }

  node.forEachChild((child) => {
    visitOnlyJsxElements(
      child,
      data,
      jsxExpressionCheck,
      jsxAttributeSearchName,
      scopeName
    );
  });

  return { data, jsxExpressionCheck };
};

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
  data: foundedCssClassesType,
  jsxExpressionCheck: jsxExpressionCheck,
  scopeName: string
) => {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return { data, jsxExpressionCheck };
  }

  node.templateSpans.forEach((span) => {
    if (ts.isIdentifier(span.expression)) {
      const value = span.expression.getText();

      // dont push same VariableDeclaration
      if (
        jsxExpressionCheck.find(
          (element) =>
            element.type === "ExpressionStatement" && element.value === value
        ) === undefined
      ) {
        jsxExpressionCheck.push({
          type: "ExpressionStatement",
          value: value,
        });
      }
    }

    if (ts.isElementAccessExpression(span.expression)) {
      const identifier = span.expression.expression.getText();

      if (identifier === scopeName) {
        if (ts.isPropertyAccessExpression(span.expression.argumentExpression)) {
          // jsxExpressionCheck.push({
          //   type: "TypeAliasDeclaration",
          //   value: "",
          // });

          console.log(
            "::::::",
            span.expression.argumentExpression.expression.getText(),
            span.expression.argumentExpression.name.getText()
          );
        }
      }
    }

    if (ts.isConditionalExpression(span.expression)) {
      data = isPropertyAccessExpression(span.expression.whenTrue, data);
      data = isPropertyAccessExpression(span.expression.whenFalse, data);
    }
    data = isPropertyAccessExpression(span.expression, data);

    if (ts.isBinaryExpression(span.expression)) {
      if (ts.isCallExpression(span.expression.right)) {
        const value = span.expression.right.expression.getText();

        // dont push same callExpresion
        if (
          jsxExpressionCheck.find(
            (element) =>
              element.type === "callExpresion" && element.value === value
          ) === undefined
        ) {
          jsxExpressionCheck.push({
            type: "callExpresion",
            value: value,
          });
        }
      }

      data = isPropertyAccessExpression(span.expression.right, data);
    }
  });

  return { data, jsxExpressionCheck };
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
  jsxExpressionCheck: jsxExpressionCheck,
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
    ({ data, jsxExpressionCheck } = templateLiteralToClassName(
      cssJsxAttribute.expression,
      data,
      jsxExpressionCheck,
      scopeName
    ));

    // ({ data, jsxExpressionCheck } = templateLiteralToClassName(
    //   cssJsxAttribute.expression,
    //   data,
    //   jsxExpressionCheck
    // ));

    // data.push(
    //   ...literalsFound
    //   // ,...variableUsage.map((item) => ({
    //   //   name: item.referenceName,
    //   //   value: item.value,
    //   // }))
    // );
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
        const value = cssJsxAttribute.expression.expression.getText();

        jsxExpressionCheck.push({
          type: "callExpresion",
          value: value,
        });
      }
    }
  }

  return { data, jsxExpressionCheck };
};

const isTemplateExpression = (
  node: ts.Expression,
  data: foundedCssClassesType
) => {
  if (ts.isTemplateExpression(node)) {
    node.templateSpans.forEach((span) => {
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
  return data;
};

const isVariableStatement = (node: ts.Node, data: foundedCssClassesType) => {
  if (ts.isVariableStatement(node)) {
    const [declaration] = node.declarationList.declarations;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      data = isTemplateExpression(declaration.initializer, data);
      data = isPropertyAccessExpression(declaration.initializer, data);
      data = isElementAccessExpression(declaration.initializer, data);
    }
  }
  return data;
};

const isPropertyAccessExpression = (
  node: ts.Expression | ts.Node,
  data: foundedCssClassesType
) => {
  if (ts.isPropertyAccessExpression(node)) {
    const value = node.name.getText();
    const name = node.expression.getText();
    data.push({
      name,
      value,
    });
  }
  return data;
};

const isElementAccessExpression = (
  node: ts.Expression,
  data: foundedCssClassesType
) => {
  if (ts.isElementAccessExpression(node)) {
    const name = node.expression.getText();
    const value = node.argumentExpression.getText();
    data.push({
      name,
      value,
    });
  }
  return data;
};

function visitChildren(node: ts.Node, data: foundedCssClassesType) {
  data = isPropertyAccessExpression(node, data);

  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression)
  ) {
    data = isTemplateExpression(node.expression.right, data);
    data = isPropertyAccessExpression(node.expression.right, data);
  }
  data = isVariableStatement(node, data);

  node.forEachChild((child) => {
    visitChildren(child, data);
  });
  return data;
}

export function visitNode(
  node: ts.Node,
  data: foundedCssClassesType,
  jsxExpressionCheck: jsxExpressionCheck
) {
  jsxExpressionCheck.forEach((jsxExpression) => {
    // isFunctionDeclaration

    if (
      ts.isFunctionDeclaration(node) &&
      jsxExpression.type === "callExpresion" &&
      node.name?.getText() === jsxExpression.value
    ) {
      if (node.body !== undefined) {
        if (ts.isBlock(node.body)) {
          data = visitChildren(node.body, data);
        }
      }
    }

    // ExpressionStatement
    if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      jsxExpression.type === "ExpressionStatement" &&
      node.expression.left.getText() === jsxExpression.value
    ) {
      data = isTemplateExpression(node.expression.right, data);
      data = isPropertyAccessExpression(node.expression.right, data);
    }

    if (jsxExpression.type === "ExpressionStatement") {
      data = isVariableStatement(node, data);
    }
  });

  node.forEachChild((child) => {
    visitNode(child, data, jsxExpressionCheck);
  });

  return data;
}
