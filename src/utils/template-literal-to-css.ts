import ts from "typescript";

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
    variableUsage: {name: string, referenceName: string, value: string}[],
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
          cssVariables.push({ name: usagedItem.referenceName, value: usagedItem.value });
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
