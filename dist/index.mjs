// src/index.ts
import ts from "typescript";
import * as R from "ramda";
import fs from "fs";
import _ from "lodash";
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
    let file;
    ((file2) => {
      file2.forModel = (label) => _.snakeCase(label);
      file2.forModelMethods = (label) => "_" + _.snakeCase(label);
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
  let model;
  ((model2) => {
    function generatePropsType(schema) {
      const propsTypes = Object.entries(schema.schema).map(([name, typeName]) => createPropertySignature(
        name,
        ts.factory.createKeywordTypeNode(typeMapping[typeName])
      ));
      return ts.factory.createTypeAliasDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        schema.label + "Props",
        void 0,
        ts.factory.createTypeLiteralNode(propsTypes)
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
        generatePropsType(schema),
        relationNodes,
        generateModel(schema)
      ].flatMap((it) => [it, ts.factory.createEmptyStatement()]);
      return [
        ...importBody,
        ...body
      ];
    }
    model2.generateComposed = generateComposed;
    function generateSpeicifProp(prop) {
      return ts.factory.createPropertyAssignment(
        prop.name,
        ts.factory.createObjectLiteralExpression([
          ts.factory.createPropertyAssignment(
            "type",
            ts.factory.createStringLiteral(prop.type)
          )
        ], false)
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
  })(model = neogen2.model || (neogen2.model = {}));
  let methods;
  ((methods2) => {
    function generateStaticMethods(label) {
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.staticMethodsNameFor(label)),
              void 0,
              void 0,
              ts.factory.createObjectLiteralExpression([], false)
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }
    function generateInstanceMethods(label) {
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
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.instanceMethodsNameFor(label)),
              void 0,
              void 0,
              ts.factory.createObjectLiteralExpression(
                [
                  ts.factory.createMethodDeclaration(
                    void 0,
                    void 0,
                    ts.factory.createIdentifier("self"),
                    void 0,
                    void 0,
                    [],
                    void 0,
                    body
                  )
                ],
                false
              )
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }
    function generateMethodFilesOf(files) {
      const mapToDeclaration = (file) => [
        imports.generateAllImportsOfModel(file.modelName),
        generateStaticMethods(file.modelName),
        generateInstanceMethods(file.modelName)
      ];
      return files.map((_2) => new GenerateSourceFile(_2.modelName, mapToDeclaration(_2), 2 /* METHODS */));
    }
    methods2.generateMethodFilesOf = generateMethodFilesOf;
  })(methods = neogen2.methods || (neogen2.methods = {}));
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
      if (this.obtainWriteMode() == 0 /* CREATE_IF_NOT_EXISTS */ && !fs.existsSync(pathToFile)) {
        fs.writeFileSync(pathToFile, resultCode);
      } else if (this.obtainWriteMode() == 1 /* OVERRIDE */) {
        fs.writeFileSync(pathToFile, resultCode);
      }
    }
    obtainFileName() {
      return R.cond([
        [R.equals(1 /* MODEL */), R.always(naming.file.forModel(this.modelName))],
        [R.equals(2 /* METHODS */), R.always(naming.file.forModelMethods(this.modelName))],
        [R.equals(0 /* RELATION */), R.always("__relations")]
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
  function generateAll(ctx, schemas, relations) {
    const parsedRelations = relation.extractRelationsFromDSL(relations);
    const sources = schemas.map((schema) => new GenerateSourceFile(
      schema.label,
      model.generateComposed(ctx, schema, parsedRelations),
      1 /* MODEL */
    ));
    sources.push(...methods.generateMethodFilesOf(sources));
    sources.push(new GenerateSourceFile(null, relation.generateRelationFile(parsedRelations), 0 /* RELATION */));
    sources.map((it) => it.save(ctx));
  }
  neogen2.generateAll = generateAll;
  function print(nodes) {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile(
      "",
      "",
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TSX
    );
    const result = printer.printList(ts.ListFormat.MultiLine, nodes, resultFile);
    console.log(
      result.split(";\n").join("\n")
    );
  }
  console.log("init");
  let instance;
  function get() {
    console.log("get");
    if (!instance) {
      throw new Error("Ensure you call neogen.setInstance(noegmaInstance) and all imported in right order");
    }
    return instance;
  }
  neogen2.get = get;
  function setInstance(val) {
    console.log("set");
    instance = val;
  }
  neogen2.setInstance = setInstance;
})(neogen || (neogen = {}));
export {
  neogen
};
//# sourceMappingURL=index.mjs.map