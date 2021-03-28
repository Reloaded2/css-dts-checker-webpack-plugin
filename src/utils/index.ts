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
