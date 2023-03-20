#! /usr/bin/env node
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const { buildClientSchema } = require("graphql");
const readYaml = require("read-yaml-file");

const graphqlConfig = readYaml.sync(".graphqlconfig.yml");

if (!graphqlConfig) throw new Error(".graphqlconfig.yml not found");

const [projectKey] = Object.keys(graphqlConfig.projects);

const projectConfig = graphqlConfig.projects[projectKey];
const schemaPath = projectConfig.schemaPath;
const apiFilePath = projectConfig.extensions.amplify.generatedFileName;
const docsFilePath = projectConfig.extensions.amplify.docsFilePath;
const apiRequestFilePath =
  projectConfig.extensions.apiRequest.generatedFileName;

if (!docsFilePath) throw new Error("docsFilePath is not defined");
if (!apiRequestFilePath) throw new Error("apiRequest extension is not defined");

const introspecSchema = JSON.parse(fs.readFileSync(path.join(".", schemaPath)));

const apiTsTemplate = fs.readFileSync(
  path.join(__dirname, "./template/request.ts")
);

const NEW_LINE = `
`;

const SCALARS = {
  ID: "string",
  String: "string",
  Boolean: "boolean",
  Int: "number",
  Float: "number",
  AWSDateTime: "string",
  AWSJSON: "string",
  AWSURL: "string",
};

const schema = buildClientSchema(introspecSchema.data);

const queryType = schema.getType("Query");
const mutationType = schema.getType("Mutation");
if (!queryType) throw new Error("Query type not found");
if (!mutationType) throw new Error("Mutation type not found");

const typeImportsMapping = {};
const modelMapping = {};
const appSyncQueryMapping = {};
const appSyncQueryReturnMapping = {};

/**
 * @type GraphQLInputFieldMap
 */
const queryFields = queryType.getFields();
const mutationFields = mutationType.getFields();
const fields = { ...queryFields, ...mutationFields };

function parseModelType(crudPrefix, fieldKey) {
  if (!fieldKey.startsWith(crudPrefix)) return;
  const modelKey = fieldKey.replace(crudPrefix, "");
  _.set(modelMapping, [modelKey, crudPrefix], true);
  return modelKey;
}

for (const fieldKey in fields) {
  parseModelType("get", fieldKey);

  const field = fields[fieldKey];

  const returnType = field.type.name || field.type.ofType;

  appSyncQueryReturnMapping[fieldKey] =
    field.type.name || field.type.toString();

  let argName;

  const opPrefix = _.upperFirst(fieldKey);

  if (mutationFields[fieldKey]) {
    // create, update, delete args name
    argName = `${opPrefix}MutationVariables`;
  } else if (queryFields[fieldKey]) {
    // get or list args name
    argName = `${opPrefix}QueryVariables`;
  }

  if (argName && field)
    appSyncQueryMapping[fieldKey] = {
      key: fieldKey,
      variables: argName,
    };

  typeImportsMapping[argName] = true;
  typeImportsMapping[returnType] = true;
}

function renderTypeImports() {
  return Object.keys(typeImportsMapping)
    .filter((k) => !SCALARS[k])
    .join(`,${NEW_LINE}`);
}

function renderModels() {
  return Object.keys(modelMapping)
    .filter((model) => !!typeImportsMapping[model])
    .join(` | ${NEW_LINE}`);
}

function renderAppSyncQueries() {
  return Object.entries(appSyncQueryMapping)
    .map((entry) => {
      const [key, value] = entry;
      return `| {
key: '${key}',
variables: ${value.variables}
}`;
    })
    .join(NEW_LINE);
}

function renderAppSyncQueryReturns() {
  return Object.entries(appSyncQueryReturnMapping)
    .map((entry) => {
      const [key, value] = entry;
      return `${key}: ${SCALARS[value] || value}`;
    })
    .join(`,${NEW_LINE}`);
}

const apiImportPath = _.trimEnd(_.trimStart(apiFilePath, "src/"), ".ts");
const docsImportPath = _.trimStart(docsFilePath, "src/");

const fileContent = `import {
${renderTypeImports()}
} from '${apiImportPath}';
import * as queries from '${docsImportPath}/queries';
import * as mutations from '${docsImportPath}/mutations';

export type TModelRecord = ${renderModels()}

export type TAppSyncQuery = 
${renderAppSyncQueries()}

export type TAppSyncReturn = {
${renderAppSyncQueryReturns()}
}

${apiTsTemplate}`;

fs.writeFileSync(path.join(".", apiRequestFilePath), fileContent, "utf-8");
