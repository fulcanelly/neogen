// src/index.ts
import ts from "typescript";
import * as R from "ramda";
import fs from "fs";
import _ from "lodash";
import { createLogger, format, transports } from "winston";
import { consoleFormat } from "winston-console-format";
var neogen;
((neogen2) => {
  let FileType;
  ((FileType2) => {
    FileType2[FileType2["RELATION"] = 0] = "RELATION";
    FileType2[FileType2["MODEL"] = 1] = "MODEL";
    FileType2[FileType2["METHODS"] = 2] = "METHODS";
    FileType2[FileType2["TOTAL"] = 3] = "TOTAL";
    FileType2[FileType2["BASE"] = 4] = "BASE";
  })(FileType = neogen2.FileType || (neogen2.FileType = {}));
  let WriteMode;
  ((WriteMode2) => {
    WriteMode2[WriteMode2["CREATE_IF_NOT_EXISTS"] = 0] = "CREATE_IF_NOT_EXISTS";
    WriteMode2[WriteMode2["OVERRIDE"] = 1] = "OVERRIDE";
  })(WriteMode = neogen2.WriteMode || (neogen2.WriteMode = {}));
  let naming;
  ((naming2) => {
    naming2.instanceMethodsNameFor = (label) => lowerFirstChar(label) + "InstanceMethods";
    naming2.staticMethodsNameFor = (label) => lowerFirstChar(label) + "StaticMethods";
    naming2.instanceNameFor = (label) => label + "Instance";
    naming2.baseInstanceMethods = () => "baseInstanceMethods";
    naming2.baseStaticMethods = () => "baseStaticMethods";
    let file;
    ((file2) => {
      file2.forModel = (label) => _.snakeCase(label);
      file2.forModelMethods = (label) => "_" + _.snakeCase(label);
      file2.forBaseMethods = () => "__base";
    })(file = naming2.file || (naming2.file = {}));
  })(naming = neogen2.naming || (neogen2.naming = {}));
  let typing;
  ((typing2) => {
    const typeOfIt = (label) => ts.factory.createTypeQueryNode(ts.factory.createIdentifier(label));
    typing2.instanceMethodsNameFor = (label) => typeOfIt(naming.instanceMethodsNameFor(label));
    typing2.staticMethodsNameFor = (label) => typeOfIt(naming.staticMethodsNameFor(label));
  })(typing = neogen2.typing || (neogen2.typing = {}));
  let imports;
  ((imports2) => {
    const importSpecifierFromName = (name) => ts.factory.createImportSpecifier(false, void 0, ts.factory.createIdentifier(name));
    function generateBaseImports() {
      return ts.factory.createImportDeclaration(
        void 0,
        // modifiers array
        ts.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          ts.factory.createNamedImports([
            naming.baseInstanceMethods(),
            naming.baseStaticMethods()
          ].map(importSpecifierFromName))
        ),
        ts.factory.createStringLiteral("./" + naming.file.forBaseMethods()),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateBaseImports = generateBaseImports;
    function generateMethodsImport(modelName) {
      return ts.factory.createImportDeclaration(
        void 0,
        // modifiers array
        ts.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          ts.factory.createNamedImports([
            naming.instanceMethodsNameFor(modelName),
            naming.staticMethodsNameFor(modelName)
          ].map(importSpecifierFromName))
        ),
        ts.factory.createStringLiteral("./" + naming.file.forModelMethods(modelName)),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateMethodsImport = generateMethodsImport;
    function generateStaticImports() {
      return ts.factory.createImportDeclaration(
        void 0,
        // modifiers array
        ts.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          ts.factory.createNamedImports([
            "ModelFactory",
            "ModelRelatedNodesI",
            "NeogmaInstance"
          ].map(importSpecifierFromName))
        ),
        ts.factory.createStringLiteral("neogma"),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateStaticImports = generateStaticImports;
    function generateNeogenImport() {
      return ts.factory.createImportDeclaration(
        void 0,
        // modifiers array
        ts.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          ts.factory.createNamedImports([
            importSpecifierFromName("neogen")
          ])
        ),
        ts.factory.createStringLiteral("neogen"),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateNeogenImport = generateNeogenImport;
    function generateAllImportsOfModel(modelName) {
      const toImport = [
        modelName,
        modelName + "Instance",
        modelName + "Props",
        modelName + "RelatedNodesI"
      ].map(importSpecifierFromName);
      const importFrom = "./" + naming.file.forModel(modelName);
      return ts.factory.createImportDeclaration(
        void 0,
        // modifiers array
        ts.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          ts.factory.createNamedImports(toImport)
        ),
        ts.factory.createStringLiteral(importFrom),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateAllImportsOfModel = generateAllImportsOfModel;
  })(imports = neogen2.imports || (neogen2.imports = {}));
  let common;
  ((common2) => {
    function straightforwardConvertValue(value) {
      if (typeof value == "string") {
        return ts.factory.createStringLiteral(value);
      }
      if (typeof value == "number") {
        return ts.factory.createNumericLiteral(value);
      }
      if (typeof value == "boolean") {
        return value ? ts.factory.createTrue() : ts.factory.createFalse();
      }
      if (value instanceof Array) {
        return ts.factory.createArrayLiteralExpression(
          value.map(straightforwardConvertValue)
        );
      }
      if (value instanceof Object) {
        return straightforwardObjectConvert(value);
      }
      console.log(value);
      throw "Non supported type";
    }
    common2.straightforwardConvertValue = straightforwardConvertValue;
    function straightforwardObjectConvert(object) {
      return ts.factory.createObjectLiteralExpression(
        Object.entries(object).map(
          ([key, value]) => ts.factory.createPropertyAssignment(key, straightforwardConvertValue(value))
        ),
        true
      );
    }
    common2.straightforwardObjectConvert = straightforwardObjectConvert;
  })(common = neogen2.common || (neogen2.common = {}));
  let model;
  ((model2) => {
    let props;
    ((props2) => {
      function extractTypeFromSchemeType(typeDefenition) {
        if (typeof typeDefenition == "string") {
          return ts.factory.createKeywordTypeNode(typeMapping[typeDefenition]);
        }
        if (typeDefenition instanceof Array) {
          return ts.factory.createUnionTypeNode([
            ...typeDefenition.map(extractTypeFromSchemeType)
          ]);
        }
        if (typeDefenition instanceof Object) {
          const adjusted = typeDefenition;
          return extractTypeFromSchemeType(adjusted.type);
        }
        throw "Unknown type format";
      }
      props2.extractTypeFromSchemeType = extractTypeFromSchemeType;
      function generatePropsType(schema) {
        const propsTypes = Object.entries(schema.schema).map(([name, typeName]) => createPropertySignature(
          name,
          extractTypeFromSchemeType(typeName)
        ));
        return ts.factory.createTypeAliasDeclaration(
          [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          schema.label + "Props",
          void 0,
          ts.factory.createTypeLiteralNode(propsTypes)
        );
      }
      props2.generatePropsType = generatePropsType;
    })(props = model2.props || (model2.props = {}));
    let instance2;
    ((instance3) => {
      function createSimpleTypeDef(value) {
        return ts.factory.createObjectLiteralExpression([
          ts.factory.createPropertyAssignment(
            "type",
            value
          )
        ]);
      }
      function generatePropTypeExpression(type) {
        if (type === void 0) {
          throw new Error("Type is undefined");
        }
        if (typeof type === "string") {
          return createSimpleTypeDef(ts.factory.createStringLiteral(type));
        }
        if (type instanceof Array) {
          const typeArray = ts.factory.createArrayLiteralExpression(
            type.map((t) => ts.factory.createStringLiteral(t))
          );
          return createSimpleTypeDef(typeArray);
        } else if (type instanceof Object) {
          return common.straightforwardObjectConvert(type);
        } else {
          throw new Error("Invalid type");
        }
      }
      instance3.generatePropTypeExpression = generatePropTypeExpression;
      function generateSpeicifProp(prop) {
        return ts.factory.createPropertyAssignment(
          prop.name,
          generatePropTypeExpression(prop.type)
        );
      }
      function generateModel(schema) {
        const neogmaInstance = ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier("neogen"),
            ts.factory.createIdentifier("get")
          ),
          void 0,
          []
        );
        const modelFactoryCall = ts.factory.createCallExpression(
          ts.factory.createIdentifier("ModelFactory"),
          // Expression
          [
            ts.factory.createTypeReferenceNode(schema.label + "Props", void 0),
            ts.factory.createTypeReferenceNode(schema.label + "RelatedNodesI", void 0),
            typing.staticMethodsNameFor(schema.label),
            typing.instanceMethodsNameFor(schema.label)
          ],
          [
            ts.factory.createObjectLiteralExpression([
              ts.factory.createPropertyAssignment(
                "methods",
                ts.factory.createIdentifier(naming.instanceMethodsNameFor(schema.label))
              ),
              ts.factory.createPropertyAssignment(
                "statics",
                ts.factory.createIdentifier(naming.staticMethodsNameFor(schema.label))
              ),
              ts.factory.createPropertyAssignment(
                "label",
                ts.factory.createStringLiteral(schema.label)
              ),
              ts.factory.createPropertyAssignment(
                "schema",
                ts.factory.createObjectLiteralExpression(
                  Object.entries(schema.schema).map(([name, type]) => generateSpeicifProp({ name, type })),
                  true
                )
              ),
              ts.factory.createPropertyAssignment(
                "primaryKeyField",
                ts.factory.createStringLiteral("uuid")
              )
            ], true),
            neogmaInstance
          ]
        );
        const modelConst = ts.factory.createVariableStatement(
          [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(
              schema.label,
              void 0,
              void 0,
              modelFactoryCall
            )],
            ts.NodeFlags.Const
          )
        );
        return modelConst;
      }
      instance3.generateModel = generateModel;
    })(instance2 = model2.instance || (model2.instance = {}));
    function generateInstanceType(label) {
      const instanceMethodsName = naming.instanceMethodsNameFor(label);
      const neogmaInstanceType = ts.factory.createTypeReferenceNode("NeogmaInstance", [
        ts.factory.createTypeReferenceNode(label + "Props", void 0),
        ts.factory.createTypeReferenceNode(label + "RelatedNodesI", void 0),
        ts.factory.createTypeQueryNode(ts.factory.createIdentifier(instanceMethodsName))
      ]);
      return ts.factory.createTypeAliasDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        label + "Instance",
        [],
        // Type parameters
        neogmaInstanceType
      );
    }
    function generateComposed(ctx, schema, relations) {
      const [relationNodes, toImport] = relation.generateRelationsType(schema.label, relations);
      const importBody = [
        imports.generateStaticImports(),
        imports.generateMethodsImport(schema.label),
        imports.generateNeogenImport(),
        ...R.uniq(toImport).map(imports.generateAllImportsOfModel)
      ];
      const body = [
        generateInstanceType(schema.label),
        props.generatePropsType(schema),
        relationNodes,
        instance2.generateModel(schema)
      ].flatMap((it) => [it, ts.factory.createEmptyStatement()]);
      return [
        ...importBody,
        ...body
      ];
    }
    model2.generateComposed = generateComposed;
  })(model = neogen2.model || (neogen2.model = {}));
  let methods;
  ((methods2) => {
    function generateStaticMethods(ctx, label) {
      const objectContent = [];
      if (ctx.generateBase) {
        objectContent.push(
          ts.factory.createSpreadAssignment(ts.factory.createIdentifier(naming.baseStaticMethods()))
        );
      }
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.staticMethodsNameFor(label)),
              void 0,
              void 0,
              ts.factory.createObjectLiteralExpression(objectContent, false)
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }
    function generateInstanceMethods(ctx, label) {
      const objectContent = [];
      if (ctx.generateBase) {
        objectContent.push(
          ts.factory.createSpreadAssignment(ts.factory.createIdentifier(naming.baseInstanceMethods()))
        );
      }
      const body = ts.factory.createBlock([
        ts.factory.createReturnStatement(
          ts.factory.createAsExpression(
            ts.factory.createAsExpression(
              ts.factory.createThis(),
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            ),
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(naming.instanceNameFor(label)), void 0)
          )
        )
      ], true);
      const selfMethod = ts.factory.createMethodDeclaration(
        void 0,
        void 0,
        ts.factory.createIdentifier("self"),
        void 0,
        void 0,
        [],
        void 0,
        body
      );
      objectContent.push(selfMethod);
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.instanceMethodsNameFor(label)),
              void 0,
              void 0,
              ts.factory.createObjectLiteralExpression(
                objectContent,
                false
              )
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }
    function generateMethodFilesOf(ctx, files) {
      const importsBody = [];
      if (ctx.generateBase) {
        importsBody.push(imports.generateBaseImports());
      }
      const mapToDeclaration = (file) => [
        imports.generateAllImportsOfModel(file.modelName),
        ...importsBody,
        generateStaticMethods(ctx, file.modelName),
        generateInstanceMethods(ctx, file.modelName)
      ];
      return files.map((_2) => new GenerateSourceFile(_2.modelName, mapToDeclaration(_2), 2 /* METHODS */));
    }
    methods2.generateMethodFilesOf = generateMethodFilesOf;
  })(methods = neogen2.methods || (neogen2.methods = {}));
  let base;
  ((base2) => {
    function generateStaticMethodsBase() {
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.baseStaticMethods()),
              void 0,
              void 0,
              ts.factory.createObjectLiteralExpression([], false)
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }
    function generateInstanceMethodsBase() {
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.baseInstanceMethods()),
              void 0,
              void 0,
              ts.factory.createObjectLiteralExpression([], false)
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }
    function generateBase() {
      return [
        generateStaticMethodsBase(),
        generateInstanceMethodsBase()
      ];
    }
    base2.generateBase = generateBase;
  })(base = neogen2.base || (neogen2.base = {}));
  let relation;
  ((relation2) => {
    function extractRelationsFromDSL(dsl) {
      return Object.entries(dsl).flatMap(([label, entry]) => {
        const [[from, alias], [fromB, aliasB]] = Object.entries(entry);
        const inRel = {
          from,
          to: fromB,
          direction: "out",
          label,
          alias
        };
        const outRel = {
          from: fromB,
          to: from,
          direction: "in",
          label,
          alias: aliasB
        };
        return [inRel, outRel];
      });
    }
    relation2.extractRelationsFromDSL = extractRelationsFromDSL;
    function generateRelationsType(modelLabel, relations) {
      const relationSchema = R.groupBy((rel) => rel.from, relations)[modelLabel];
      const needToImportModels = relationSchema.map((rel) => rel.to);
      const modelRelations = relationSchema.map((rel) => createPropertySignature(
        rel.alias,
        ts.factory.createTypeReferenceNode("ModelRelatedNodesI", [
          ts.factory.createTypeQueryNode(ts.factory.createIdentifier(rel.to)),
          ts.factory.createTypeReferenceNode(rel.to + "Instance", void 0)
        ])
      ));
      const resultRelations = ts.factory.createInterfaceDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        modelLabel + "RelatedNodesI",
        void 0,
        void 0,
        modelRelations
      );
      return [resultRelations, needToImportModels];
    }
    relation2.generateRelationsType = generateRelationsType;
    function generateRelationFile(rels) {
      const models = R.uniq(rels.flatMap((rel) => [rel.from, rel.to]));
      return [
        ...models.map(imports.generateAllImportsOfModel),
        ...rels.map(generateRelationInit)
      ];
    }
    relation2.generateRelationFile = generateRelationFile;
    function generateRelationInit(relation3) {
      const traget = [
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("model"),
          ts.factory.createIdentifier(relation3.to)
        ),
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("direction"),
          ts.factory.createStringLiteral(relation3.direction)
        ),
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier("name"),
          ts.factory.createStringLiteral(relation3.label)
        )
      ];
      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(relation3.from),
          ts.factory.createIdentifier("addRelationships")
        ),
        void 0,
        [
          ts.factory.createObjectLiteralExpression(
            [
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier(relation3.alias),
                ts.factory.createObjectLiteralExpression(
                  traget,
                  true
                  // This flag is for multiline object literals
                )
              )
            ],
            true
            // This flag is for multiline object literals
          )
        ]
      );
    }
    relation2.generateRelationInit = generateRelationInit;
  })(relation = neogen2.relation || (neogen2.relation = {}));
  const lowerFirstChar = (str) => str.charAt(0).toLowerCase() + str.slice(1);
  const createPropertySignature = (name, type) => ts.factory.createPropertySignature(void 0, name, void 0, type);
  const typeMapping = {
    "string": ts.SyntaxKind.StringKeyword,
    "boolean": ts.SyntaxKind.BooleanKeyword,
    "number": ts.SyntaxKind.NumberKeyword
  };
  const generatedFileClaim = "// GENERATED FILE, MAY CHANGE IN FUTURE, DO NOT EDIT IT MANUALLY\n";
  class GenerateSourceFile {
    constructor(modelName, nodes, type) {
      this.modelName = modelName;
      this.nodes = nodes;
      this.type = type;
    }
    save(ctx) {
      const resultFile = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
      let printedNodes = this.nodes.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, resultFile)).join("\n");
      const resultCode = this.obtainWriteMode() == 1 /* OVERRIDE */ ? generatedFileClaim + printedNodes : printedNodes;
      fs.mkdirSync(ctx.outputFolder, { recursive: true });
      const pathToFile = `${ctx.outputFolder}/${this.obtainFileName()}`;
      const fileExists = fs.existsSync(pathToFile);
      const minimalInfo = {
        path: pathToFile,
        model: this.modelName,
        type: this.type
      };
      if (this.obtainWriteMode() == 0 /* CREATE_IF_NOT_EXISTS */) {
        if (!fileExists) {
          fs.writeFileSync(pathToFile, resultCode);
          logger.verbose("Created new file", minimalInfo);
        } else {
          logger.warn("File exists, skipped", minimalInfo);
        }
      } else if (this.obtainWriteMode() == 1 /* OVERRIDE */) {
        fs.writeFileSync(pathToFile, resultCode);
        if (fileExists) {
          logger.verbose("File overridden:", minimalInfo);
        } else {
          logger.verbose("New file created:", minimalInfo);
        }
      } else {
        logger.error("Nothing to do with this kind of file", minimalInfo);
      }
    }
    obtainFileName() {
      return R.cond([
        [R.equals(1 /* MODEL */), R.always(naming.file.forModel(this.modelName))],
        [R.equals(2 /* METHODS */), R.always(naming.file.forModelMethods(this.modelName))],
        [R.equals(0 /* RELATION */), R.always("__relations")],
        [R.equals(4 /* BASE */), R.always("__base")]
      ])(this.type) + ".ts";
    }
    obtainWriteMode() {
      return R.cond([
        [R.equals(1 /* MODEL */), R.always(1 /* OVERRIDE */)],
        [R.equals(0 /* RELATION */), R.always(1 /* OVERRIDE */)],
        [R.T, R.always(0 /* CREATE_IF_NOT_EXISTS */)]
      ])(this.type);
    }
  }
  const logger = createLogger({
    level: "silly",
    format: format.combine(
      format.timestamp(),
      format.ms(),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    defaultMeta: { service: "Test" },
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize({ all: true }),
          format.padLevels(),
          consoleFormat({
            showMeta: true,
            metaStrip: ["timestamp", "service"],
            inspectOptions: {
              depth: Infinity,
              colors: true,
              maxArrayLength: Infinity,
              breakLength: 120,
              compact: Infinity
            }
          })
        )
      })
    ]
  });
  function generateAll(ctx, schemas, relations) {
    try {
      logger.silly("Started neogen");
      const parsedRelations = relation.extractRelationsFromDSL(relations);
      logger.info("Parsed relations DSL");
      const sources = schemas.map((schema) => new GenerateSourceFile(
        schema.label,
        model.generateComposed(ctx, schema, parsedRelations),
        1 /* MODEL */
      ));
      logger.info("Generated types and props defenitions");
      sources.push(...methods.generateMethodFilesOf(ctx, sources));
      logger.info("Generated methods files");
      sources.push(new GenerateSourceFile(null, relation.generateRelationFile(parsedRelations), 0 /* RELATION */));
      logger.info("Generated relations file");
      if (ctx.generateBase) {
        sources.push(new GenerateSourceFile(null, base.generateBase(), 4 /* BASE */));
        logger.info("Generated base file");
      }
      sources.map((it) => it.save(ctx));
      logger.silly("Done");
    } catch (e) {
      logger.error(e);
    }
  }
  neogen2.generateAll = generateAll;
  let instance;
  function get() {
    if (!instance) {
      throw new Error("Ensure you call neogen.setInstance(noegmaInstance) and all imported in right order");
    }
    return instance;
  }
  neogen2.get = get;
  function setInstance(val) {
    instance = val;
  }
  neogen2.setInstance = setInstance;
})(neogen || (neogen = {}));
export {
  neogen
};
//# sourceMappingURL=index.mjs.map