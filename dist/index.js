"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  neogen: () => neogen
});
module.exports = __toCommonJS(src_exports);
var import_typescript = __toESM(require("typescript"));
var R = __toESM(require("ramda"));
var import_fs = __toESM(require("fs"));
var import_lodash = __toESM(require("lodash"));
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
      file2.forModel = (label) => import_lodash.default.snakeCase(label);
      file2.forModelMethods = (label) => "_" + import_lodash.default.snakeCase(label);
    })(file = naming2.file || (naming2.file = {}));
  })(naming = neogen2.naming || (neogen2.naming = {}));
  let typing;
  ((typing2) => {
    const typeOfIt = (label) => import_typescript.default.factory.createTypeQueryNode(import_typescript.default.factory.createIdentifier(label));
    typing2.instanceMethodsNameFor = (label) => typeOfIt(naming.instanceMethodsNameFor(label));
    typing2.staticMethodsNameFor = (label) => typeOfIt(naming.staticMethodsNameFor(label));
  })(typing = neogen2.typing || (neogen2.typing = {}));
  let imports;
  ((imports2) => {
    const importSpecifierFromName = (name) => import_typescript.default.factory.createImportSpecifier(false, void 0, import_typescript.default.factory.createIdentifier(name));
    function generateMethodsImport(modelName) {
      return import_typescript.default.factory.createImportDeclaration(
        void 0,
        // modifiers array
        import_typescript.default.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          import_typescript.default.factory.createNamedImports([
            naming.instanceMethodsNameFor(modelName),
            naming.staticMethodsNameFor(modelName)
          ].map(importSpecifierFromName))
        ),
        import_typescript.default.factory.createStringLiteral("./" + naming.file.forModelMethods(modelName)),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateMethodsImport = generateMethodsImport;
    function generateStaticImports() {
      return import_typescript.default.factory.createImportDeclaration(
        void 0,
        // modifiers array
        import_typescript.default.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          import_typescript.default.factory.createNamedImports([
            "ModelFactory",
            "ModelRelatedNodesI",
            "NeogmaInstance"
          ].map(importSpecifierFromName))
        ),
        import_typescript.default.factory.createStringLiteral("neogma"),
        // module specifier
        void 0
        // assert clause
      );
    }
    imports2.generateStaticImports = generateStaticImports;
    function generateNeogenImport() {
      return import_typescript.default.factory.createImportDeclaration(
        void 0,
        // modifiers array
        import_typescript.default.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          import_typescript.default.factory.createNamedImports([
            importSpecifierFromName("neogen")
          ])
        ),
        import_typescript.default.factory.createStringLiteral("neogen"),
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
      return import_typescript.default.factory.createImportDeclaration(
        void 0,
        // modifiers array
        import_typescript.default.factory.createImportClause(
          false,
          // IsTypeOnly
          void 0,
          // No namespace import
          import_typescript.default.factory.createNamedImports(toImport)
        ),
        import_typescript.default.factory.createStringLiteral(importFrom),
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
        import_typescript.default.factory.createKeywordTypeNode(typeMapping[typeName])
      ));
      return import_typescript.default.factory.createTypeAliasDeclaration(
        [import_typescript.default.factory.createModifier(import_typescript.default.SyntaxKind.ExportKeyword)],
        schema.label + "Props",
        void 0,
        import_typescript.default.factory.createTypeLiteralNode(propsTypes)
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
      ].flatMap((it) => [it, import_typescript.default.factory.createEmptyStatement()]);
      return [
        ...importBody,
        ...body
      ];
    }
    model2.generateComposed = generateComposed;
    function generateSpeicifProp(prop) {
      return import_typescript.default.factory.createPropertyAssignment(
        prop.name,
        import_typescript.default.factory.createObjectLiteralExpression([
          import_typescript.default.factory.createPropertyAssignment(
            "type",
            import_typescript.default.factory.createStringLiteral(prop.type)
          )
        ], false)
      );
    }
    function generateModel(schema) {
      const neogmaInstance = import_typescript.default.factory.createCallExpression(
        import_typescript.default.factory.createPropertyAccessExpression(
          import_typescript.default.factory.createIdentifier("neogen"),
          import_typescript.default.factory.createIdentifier("get")
        ),
        void 0,
        []
      );
      const modelFactoryCall = import_typescript.default.factory.createCallExpression(
        import_typescript.default.factory.createIdentifier("ModelFactory"),
        // Expression
        [
          import_typescript.default.factory.createTypeReferenceNode(schema.label + "Props", void 0),
          import_typescript.default.factory.createTypeReferenceNode(schema.label + "RelatedNodesI", void 0),
          typing.staticMethodsNameFor(schema.label),
          typing.instanceMethodsNameFor(schema.label)
        ],
        [
          import_typescript.default.factory.createObjectLiteralExpression([
            import_typescript.default.factory.createPropertyAssignment(
              "methods",
              import_typescript.default.factory.createIdentifier(naming.instanceMethodsNameFor(schema.label))
            ),
            import_typescript.default.factory.createPropertyAssignment(
              "statics",
              import_typescript.default.factory.createIdentifier(naming.staticMethodsNameFor(schema.label))
            ),
            import_typescript.default.factory.createPropertyAssignment(
              "label",
              import_typescript.default.factory.createStringLiteral(schema.label)
            ),
            import_typescript.default.factory.createPropertyAssignment(
              "schema",
              import_typescript.default.factory.createObjectLiteralExpression(
                Object.entries(schema.schema).map(([name, type]) => generateSpeicifProp({ name, type })),
                true
              )
            ),
            import_typescript.default.factory.createPropertyAssignment(
              "primaryKeyField",
              import_typescript.default.factory.createStringLiteral("uuid")
            )
          ], true),
          neogmaInstance
        ]
      );
      const modelConst = import_typescript.default.factory.createVariableStatement(
        [import_typescript.default.factory.createModifier(import_typescript.default.SyntaxKind.ExportKeyword)],
        import_typescript.default.factory.createVariableDeclarationList(
          [import_typescript.default.factory.createVariableDeclaration(
            schema.label,
            void 0,
            void 0,
            modelFactoryCall
          )],
          import_typescript.default.NodeFlags.Const
        )
      );
      return modelConst;
    }
  })(model = neogen2.model || (neogen2.model = {}));
  let methods;
  ((methods2) => {
    function generateStaticMethods(label) {
      return import_typescript.default.factory.createVariableStatement(
        [import_typescript.default.factory.createModifier(import_typescript.default.SyntaxKind.ExportKeyword)],
        import_typescript.default.factory.createVariableDeclarationList(
          [
            import_typescript.default.factory.createVariableDeclaration(
              import_typescript.default.factory.createIdentifier(naming.staticMethodsNameFor(label)),
              void 0,
              void 0,
              import_typescript.default.factory.createObjectLiteralExpression([], false)
            )
          ],
          import_typescript.default.NodeFlags.Const
        )
      );
    }
    function generateInstanceMethods(label) {
      const body = import_typescript.default.factory.createBlock([
        import_typescript.default.factory.createReturnStatement(
          import_typescript.default.factory.createAsExpression(
            import_typescript.default.factory.createAsExpression(
              import_typescript.default.factory.createThis(),
              import_typescript.default.factory.createKeywordTypeNode(import_typescript.default.SyntaxKind.AnyKeyword)
            ),
            import_typescript.default.factory.createTypeReferenceNode(import_typescript.default.factory.createIdentifier(naming.instanceNameFor(label)), void 0)
          )
        )
      ], true);
      return import_typescript.default.factory.createVariableStatement(
        [import_typescript.default.factory.createModifier(import_typescript.default.SyntaxKind.ExportKeyword)],
        import_typescript.default.factory.createVariableDeclarationList(
          [
            import_typescript.default.factory.createVariableDeclaration(
              import_typescript.default.factory.createIdentifier(naming.instanceMethodsNameFor(label)),
              void 0,
              void 0,
              import_typescript.default.factory.createObjectLiteralExpression(
                [
                  import_typescript.default.factory.createMethodDeclaration(
                    void 0,
                    void 0,
                    import_typescript.default.factory.createIdentifier("self"),
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
          import_typescript.default.NodeFlags.Const
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
        import_typescript.default.factory.createTypeReferenceNode("ModelRelatedNodesI", [
          import_typescript.default.factory.createTypeQueryNode(import_typescript.default.factory.createIdentifier(rel.to)),
          import_typescript.default.factory.createTypeReferenceNode(rel.to + "Instance", void 0)
        ])
      ));
      const resultRelations = import_typescript.default.factory.createInterfaceDeclaration(
        [import_typescript.default.factory.createModifier(import_typescript.default.SyntaxKind.ExportKeyword)],
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
        import_typescript.default.factory.createPropertyAssignment(
          import_typescript.default.factory.createIdentifier("model"),
          import_typescript.default.factory.createIdentifier(relation3.to)
        ),
        import_typescript.default.factory.createPropertyAssignment(
          import_typescript.default.factory.createIdentifier("direction"),
          import_typescript.default.factory.createStringLiteral(relation3.direction)
        ),
        import_typescript.default.factory.createPropertyAssignment(
          import_typescript.default.factory.createIdentifier("name"),
          import_typescript.default.factory.createStringLiteral(relation3.label)
        )
      ];
      return import_typescript.default.factory.createCallExpression(
        import_typescript.default.factory.createPropertyAccessExpression(
          import_typescript.default.factory.createIdentifier(relation3.from),
          import_typescript.default.factory.createIdentifier("addRelationships")
        ),
        void 0,
        [
          import_typescript.default.factory.createObjectLiteralExpression(
            [
              import_typescript.default.factory.createPropertyAssignment(
                import_typescript.default.factory.createIdentifier(relation3.alias),
                import_typescript.default.factory.createObjectLiteralExpression(
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
  const createPropertySignature = (name, type) => import_typescript.default.factory.createPropertySignature(void 0, name, void 0, type);
  const typeMapping = {
    "string": import_typescript.default.SyntaxKind.StringKeyword,
    "boolean": import_typescript.default.SyntaxKind.BooleanKeyword,
    "number": import_typescript.default.SyntaxKind.NumberKeyword
  };
  function generateInstanceType(label) {
    const instanceMethodsName = naming.instanceMethodsNameFor(label);
    const neogmaInstanceType = import_typescript.default.factory.createTypeReferenceNode("NeogmaInstance", [
      import_typescript.default.factory.createTypeReferenceNode(label + "Props", void 0),
      import_typescript.default.factory.createTypeReferenceNode(label + "RelatedNodesI", void 0),
      import_typescript.default.factory.createTypeQueryNode(import_typescript.default.factory.createIdentifier(instanceMethodsName))
    ]);
    return import_typescript.default.factory.createTypeAliasDeclaration(
      [import_typescript.default.factory.createModifier(import_typescript.default.SyntaxKind.ExportKeyword)],
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
      const resultFile = import_typescript.default.createSourceFile("", "", import_typescript.default.ScriptTarget.Latest, false, import_typescript.default.ScriptKind.TSX);
      const printer = import_typescript.default.createPrinter({ newLine: import_typescript.default.NewLineKind.LineFeed });
      let printedNodes = this.nodes.map((node) => printer.printNode(import_typescript.default.EmitHint.Unspecified, node, resultFile)).join("\n");
      const resultCode = this.obtainWriteMode() == 1 /* OVERRIDE */ ? generatedFileClaim + printedNodes : printedNodes;
      import_fs.default.mkdirSync(ctx.outputFolder, { recursive: true });
      const pathToFile = `${ctx.outputFolder}/${this.obtainFileName()}`;
      if (this.obtainWriteMode() == 0 /* CREATE_IF_NOT_EXISTS */ && !import_fs.default.existsSync(pathToFile)) {
        import_fs.default.writeFileSync(pathToFile, resultCode);
      } else if (this.obtainWriteMode() == 1 /* OVERRIDE */) {
        import_fs.default.writeFileSync(pathToFile, resultCode);
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
    const printer = import_typescript.default.createPrinter({ newLine: import_typescript.default.NewLineKind.LineFeed });
    const resultFile = import_typescript.default.createSourceFile(
      "",
      "",
      import_typescript.default.ScriptTarget.Latest,
      false,
      import_typescript.default.ScriptKind.TSX
    );
    const result = printer.printList(import_typescript.default.ListFormat.MultiLine, nodes, resultFile);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  neogen
});
//# sourceMappingURL=index.js.map