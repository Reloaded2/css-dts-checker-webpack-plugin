import ts from "typescript";
import type { foundedCssClassesType, variableUsageType } from "utils";

type jsxExpressionCheck = {
  tsNode: string;
  value: string;
  type?: string;
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
            element.tsNode === "ExpressionStatement" && element.value === value
        ) === undefined
      ) {
        jsxExpressionCheck.push({
          tsNode: "ExpressionStatement",
          value: value,
        });
      }
    }

    if (ts.isElementAccessExpression(span.expression)) {
      const identifier = span.expression.expression.getText();

      if (identifier === scopeName) {
        if (ts.isPropertyAccessExpression(span.expression.argumentExpression)) {
          jsxExpressionCheck.push({
            tsNode: "TypeAliasDeclaration",
            value: span.expression.argumentExpression.name.getText(),
            type: span.expression.argumentExpression.expression.getText(),
          });

          // console.log(
          //   ":::::: TODO: ",
          //   span.expression.argumentExpression.expression.getText(),
          //   span.expression.argumentExpression.name.getText()
          // );
        }
      }
    }

    if (ts.isConditionalExpression(span.expression)) {
      data = isPropertyAccessExpression(
        span.expression.whenTrue,
        data,
        scopeName
      );
      data = isPropertyAccessExpression(
        span.expression.whenFalse,
        data,
        scopeName
      );
    }
    data = isPropertyAccessExpression(span.expression, data, scopeName);

    if (ts.isBinaryExpression(span.expression)) {
      if (ts.isCallExpression(span.expression.right)) {
        const value = span.expression.right.expression.getText();

        // dont push same callExpresion
        if (
          jsxExpressionCheck.find(
            (element) =>
              element.tsNode === "callExpresion" && element.value === value
          ) === undefined
        ) {
          jsxExpressionCheck.push({
            tsNode: "callExpresion",
            value: value,
          });
        }
      }

      data = isPropertyAccessExpression(span.expression.right, data, scopeName);
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
          tsNode: "callExpresion",
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

const isVariableStatement = (
  node: ts.Node,
  data: foundedCssClassesType,
  scopeName: string
) => {
  if (ts.isVariableStatement(node)) {
    const [declaration] = node.declarationList.declarations;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      data = isTemplateExpression(declaration.initializer, data);
      data = isPropertyAccessExpression(
        declaration.initializer,
        data,
        scopeName
      );
      data = isElementAccessExpression(declaration.initializer, data);
    }
  }
  return data;
};

const isPropertyAccessExpression = (
  node: ts.Expression | ts.Node,
  data: foundedCssClassesType,
  scopeName: string
) => {
  if (ts.isPropertyAccessExpression(node)) {
    const value = node.name.getText();
    const name = node.expression.getText();

    if (scopeName !== undefined && name === scopeName) {
      data.push({
        name,
        value,
      });
    }
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

function visitChildren(
  node: ts.Node,
  data: foundedCssClassesType,
  scopeName: string
) {
  data = isPropertyAccessExpression(node, data, scopeName);

  if (
    ts.isExpressionStatement(node) &&
    ts.isBinaryExpression(node.expression)
  ) {
    data = isTemplateExpression(node.expression.right, data);
    data = isPropertyAccessExpression(node.expression.right, data, scopeName);
  }
  data = isVariableStatement(node, data, scopeName);

  node.forEachChild((child) => {
    visitChildren(child, data, scopeName);
  });
  return data;
}

export function visitNode(
  node: ts.Node,
  data: foundedCssClassesType,
  jsxExpressionCheck: jsxExpressionCheck,
  scopeName: string
) {
  jsxExpressionCheck.forEach((jsxExpression) => {
    // isFunctionDeclaration

    if (
      ts.isFunctionDeclaration(node) &&
      jsxExpression.tsNode === "callExpresion" &&
      node.name?.getText() === jsxExpression.value
    ) {
      if (node.body !== undefined) {
        if (ts.isBlock(node.body)) {
          data = visitChildren(node.body, data, scopeName);
        }
      }
    }

    // ExpressionStatement
    if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      jsxExpression.tsNode === "ExpressionStatement" &&
      node.expression.left.getText() === jsxExpression.value
    ) {
      data = isTemplateExpression(node.expression.right, data);
      data = isPropertyAccessExpression(node.expression.right, data, scopeName);
    }

    if (jsxExpression.tsNode === "ExpressionStatement") {
      data = isVariableStatement(node, data, scopeName);
    }

    if (jsxExpression.tsNode === "TypeAliasDeclaration") {
      if (ts.isTypeAliasDeclaration(node)) {
        const identifier = node.name.getText();

        if (identifier === jsxExpression.type) {
          if (ts.isTypeLiteralNode(node.type)) {
            node.type.members.forEach((member) => {
              if (ts.isPropertySignature(member)) {
                const name = member.name.getText();

                if (name === jsxExpression.value && member.type !== undefined) {
                  member.type.forEachChild((child) => {
                    if (ts.isLiteralTypeNode(child)) {
                      const value = child.literal
                        .getText()
                        .replace(/[^a-zA-Z0-9]+/g, "");

                      data.push({
                        name: scopeName,
                        value,
                      });
                    }
                  });
                }
              }
            });
          }
        }

        // const [declaration] = node.declarationList.declarations;
        // if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        //   data = isTemplateExpression(declaration.initializer, data);
        //   data = isPropertyAccessExpression(declaration.initializer, data);
        //   data = isElementAccessExpression(declaration.initializer, data);
        // }
      }
    }
  });

  data = isPropertyAccessExpression(node, data, scopeName);

  // //huhu
  // if (ts.isPropertyAccessExpression(node)) {
  //   if (node.expression.getText() === scopeName) {
  //     console.log("xx", node.name.getText());
  //     // console.log("dsfsdf", node.expression.getText());
  //   }
  //   // const value = node.name.getText();
  //   // const name = node.expression.getText();
  // }

  node.forEachChild((child) => {
    visitNode(child, data, jsxExpressionCheck, scopeName);
  });

  return data;
}
