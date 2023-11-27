import { ModelFactory, ModelRelatedNodesI, Neogma, NeogmaInstance } from "neogma";
// import { neogma } from "../neo4j";
import ts from "typescript";
import * as R from 'ramda';
import fs from 'fs';
import _ from 'lodash';
import { createLogger, format, transports } from "winston";
import { consoleFormat } from "winston-console-format";

//////////////////////////////////////

///TODO
///1) type of props Revalidator.ISchema<any> | Revalidator.JSONSchema<any>
// 2) unions (model.generateSpeicifProp)
// ts.factory.createUnionTypeNode([ // Union type (string | undefined)
//   ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
//   ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
// ])
// ts.factory.createArrayLiteralExpression([
//     ts.factory.createStringLiteral('string'),
//     ts.factory.createStringLiteral('null')
// ])
//3) function for converting model name to file name
//4) make more than two relations per label in (relation.extractRelationsFromDSL)
//5) make it more DRY
//6) add logging

// base
// config options (generateMethods, generateRelations, generateBase bool)
// unions & Revalidator.ISchema<any> | Revalidator.JSONSchema<any>
// constraints
// mofidy exisiting files

// relation validation: error unknown model
// sample
// common schema
// update readme

export namespace neogen {
  export enum FileType {
    RELATION,
    MODEL,
    METHODS,
    TOTAL,
    BASE,
  }

  export enum WriteMode {
    CREATE_IF_NOT_EXISTS,
    OVERRIDE
  }
  export type PropType = { name: string, type: Types }

  export type ctx = {
    outputFolder: string,
    generateBase?: boolean
  }

  type ModelToImport = string

  type BasicTypes = Revalidator.Types
  export type Types = undefined | BasicTypes | BasicTypes[] | Revalidator.ISchema<any> | Revalidator.JSONSchema<any>
  export type PropsTypes = { [prop: string]: Types }
  export type RelationsDSL = Object
  export type Schema = {
    label: string,
    schema: PropsTypes,
    primaryKeyField?: string // TODO: add validation, kind of keyof PropsTypes[string]
  }
  export type Relation = {
    from: string,
    to: string,
    direction: 'out' | 'in',
    label: string,
    alias: string
  }

  export namespace naming {
    export const instanceMethodsNameFor = (label: string) => lowerFirstChar(label) + 'InstanceMethods'
    export const staticMethodsNameFor = (label: string) => lowerFirstChar(label) + 'StaticMethods'
    export const instanceNameFor = (label: string) => label + 'Instance'

    export const baseInstanceMethods = () => "baseInstanceMethods"
    export const baseStaticMethods = () => "baseStaticMethods"

    export namespace file {
      export const forModel = (label: string) => _.snakeCase(label)
      export const forModelMethods = (label: string) => _.snakeCase(label) + '_'
      export const forBaseMethods = () => '__base'
    }
  }

  export namespace typing {
    const typeOfIt = (label: string) => ts.factory.createTypeQueryNode(ts.factory.createIdentifier(label))

    export const instanceMethodsNameFor = (label: string) => typeOfIt(naming.instanceMethodsNameFor(label))
    export const staticMethodsNameFor = (label: string) => typeOfIt(naming.staticMethodsNameFor(label))
  }

  export namespace imports {

    const importSpecifierFromName = (name: string) =>
      ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name))


    export function generateBaseImports() {
      return ts.factory.createImportDeclaration(
        undefined, // modifiers array
        ts.factory.createImportClause(
          false, // IsTypeOnly
          undefined, // No namespace import
          ts.factory.createNamedImports([
            naming.baseInstanceMethods(),
            naming.baseStaticMethods(),
          ].map(importSpecifierFromName))
        ),
        ts.factory.createStringLiteral('./' + naming.file.forBaseMethods()), // module specifier
        undefined  // assert clause
      );
    }

    export function generateMethodsImport(modelName: string) {
      return ts.factory.createImportDeclaration(
        undefined, // modifiers array
        ts.factory.createImportClause(
          false, // IsTypeOnly
          undefined, // No namespace import
          ts.factory.createNamedImports([
            naming.instanceMethodsNameFor(modelName),
            naming.staticMethodsNameFor(modelName),
          ].map(importSpecifierFromName))
        ),
        ts.factory.createStringLiteral('./' + naming.file.forModelMethods(modelName)), // module specifier
        undefined  // assert clause
      );
    }

    export function generateStaticImports() {
      return ts.factory.createImportDeclaration(
        undefined, // modifiers array
        ts.factory.createImportClause(
          false, // IsTypeOnly
          undefined, // No namespace import
          ts.factory.createNamedImports([
            'ModelFactory',
            'ModelRelatedNodesI',
            'NeogmaInstance',
          ].map(importSpecifierFromName))
        ),
        ts.factory.createStringLiteral("neogma"), // module specifier
        undefined  // assert clause
      );
    }

    export function generateNeogenImport() {
      return ts.factory.createImportDeclaration(
        undefined, // modifiers array
        ts.factory.createImportClause(
          false, // IsTypeOnly
          undefined, // No namespace import
          ts.factory.createNamedImports([
            importSpecifierFromName('neogen')
          ])
        ),
        ts.factory.createStringLiteral('neogen'), // module specifier
        undefined  // assert clause
      );
    }

    export function generateAllImportsOfModel(modelName: string): ts.Node {
      const toImport = [
        modelName,
        modelName + 'Instance',
        modelName + 'Props',
        modelName + 'RelatedNodesI',
      ].map(importSpecifierFromName)

      const importFrom = './' + naming.file.forModel(modelName)

      return ts.factory.createImportDeclaration(
        undefined, // modifiers array
        ts.factory.createImportClause(
          false, // IsTypeOnly
          undefined, // No namespace import
          ts.factory.createNamedImports(toImport)
        ),
        ts.factory.createStringLiteral(importFrom), // module specifier
        undefined  // assert clause
      );
    }
  }

  export namespace common {
    export function straightforwardConvertValue(value: any): ts.Expression {
      if (typeof value == 'string') {
        return ts.factory.createStringLiteral(value)
      }

      if (typeof value == 'number') {
        return ts.factory.createNumericLiteral(value)
      }

      if (typeof value == 'boolean') {
        return value ?
          ts.factory.createTrue() :
          ts.factory.createFalse()
      }

      if (value instanceof Array) {
        return ts.factory.createArrayLiteralExpression(
          value.map(straightforwardConvertValue))
      }

      if (value instanceof Object) {
        return straightforwardObjectConvert(value)
      }

      console.log(value)
      throw 'Non supported type'
    }

    export function straightforwardObjectConvert(object: Object): ts.Expression {
      return ts.factory.createObjectLiteralExpression(
        Object.entries(object).map(([key, value]) =>
          ts.factory.createPropertyAssignment(key, straightforwardConvertValue(value))
        ),
        true
      );
    }
  }

  export namespace model {

    export namespace props {
      export function extractTypeFromSchemeType(typeDefenition: Types): ts.TypeNode {
        if (typeof typeDefenition == 'string') {
          return ts.factory.createKeywordTypeNode(typeMapping[typeDefenition]) as ts.TypeNode
        }

        if (typeDefenition instanceof Array) {
          return ts.factory.createUnionTypeNode([
            ...typeDefenition.map(extractTypeFromSchemeType)
          ])
        }

        if (typeDefenition instanceof Object) {
          const adjusted = typeDefenition as Revalidator.ISchema<any> | Revalidator.JSONSchema<any>
          return extractTypeFromSchemeType(adjusted.type)
        }

        throw 'Unknown type format'
      }


      const isOptionalType = (types: Types) => types == 'null' || (types instanceof Array && types.includes('null'))

      export function generatePropsType(schema: Schema): ts.TypeAliasDeclaration {
        const propsTypes = Object.entries(schema.schema)
          .map(([name, typeName]) => {
            return createPropertySignature(
              name,
              extractTypeFromSchemeType(typeName),
              {
                optional: isOptionalType(typeName)
              }
            );
          })

        return ts.factory.createTypeAliasDeclaration(
          [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          schema.label + 'Props',
          undefined,
          ts.factory.createTypeLiteralNode(propsTypes)
        )
      }
    }

    export namespace instance {
      function createSimpleTypeDef(value: ts.Expression): ts.Expression {
        return ts.factory.createObjectLiteralExpression([
          ts.factory.createPropertyAssignment(
            'type', value)
        ])
      }

      export function generatePropTypeExpression(type: Types): ts.Expression {
        if (type === undefined) {
          throw new Error("Type is undefined");
        }

        if (typeof type === 'string') {
          return createSimpleTypeDef(ts.factory.createStringLiteral(type));
        } if (type instanceof Array) {
          const typeArray =
            ts.factory.createArrayLiteralExpression(
              type.map(t => ts.factory.createStringLiteral(t)))

          return createSimpleTypeDef(typeArray)
        } else if (type instanceof Object) {
          return common.straightforwardObjectConvert(type)
        } else {
          throw new Error("Invalid type");
        }
      }

      function generateSpeicifProp(prop: PropType) {
        return ts.factory.createPropertyAssignment(
          prop.name,
          generatePropTypeExpression(prop.type)
        )
      }

      export function generateModel(schema: Schema) {
        const neogmaInstance =
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('neogen'),
              ts.factory.createIdentifier('get')
            ),
            undefined,
            [])

        const schemaEntry = [
          ts.factory.createPropertyAssignment(
            'methods', ts.factory.createIdentifier(naming.instanceMethodsNameFor(schema.label))
          ),
          ts.factory.createPropertyAssignment(
            'statics', ts.factory.createIdentifier(naming.staticMethodsNameFor(schema.label))
          ),
          ts.factory.createPropertyAssignment(
            'label',
            ts.factory.createStringLiteral(schema.label)
          ),
          ts.factory.createPropertyAssignment(
            'schema',
            ts.factory.createObjectLiteralExpression(
              Object.entries(schema.schema).map(([name, type]) => generateSpeicifProp({ name, type }))
              , true)
          ),
        ]

        if (schema.primaryKeyField) {
          schemaEntry.push(ts.factory.createPropertyAssignment(
            'primaryKeyField',
            ts.factory.createStringLiteral(schema.primaryKeyField!)
          ),)
        }

        const modelFactoryCall = ts.factory.createCallExpression(
          ts.factory.createIdentifier('ModelFactory'), // Expression
          [
            ts.factory.createTypeReferenceNode(schema.label + 'Props', undefined),
            ts.factory.createTypeReferenceNode(schema.label + 'RelatedNodesI', undefined),
            typing.staticMethodsNameFor(schema.label),
            typing.instanceMethodsNameFor(schema.label),

          ],
          [
            ts.factory.createObjectLiteralExpression(schemaEntry, true),
            neogmaInstance
          ]
        );

        const modelConst = ts.factory.createVariableStatement(
          [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(
              schema.label,
              undefined,
              undefined,
              modelFactoryCall
            )],
            ts.NodeFlags.Const
          )
        );

        return modelConst
      }
    }

    function generateInstanceType(label: string): ts.TypeAliasDeclaration {

      const instanceMethodsName = naming.instanceMethodsNameFor(label)

      const neogmaInstanceType = ts.factory.createTypeReferenceNode('NeogmaInstance', [
        ts.factory.createTypeReferenceNode(label + 'Props', undefined),
        ts.factory.createTypeReferenceNode(label + 'RelatedNodesI', undefined),
        ts.factory.createTypeQueryNode(ts.factory.createIdentifier(instanceMethodsName))
      ]);

      return ts.factory.createTypeAliasDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        label + 'Instance',
        [], // Type parameters
        neogmaInstanceType,
      );
    }

    export function generateComposed(ctx: ctx, schema: Schema, relations: Relation[]): ts.Node[] {
      const [relationNodes, toImport] = relation.generateRelationsType(schema.label, relations)

      const importBody: ts.Node[] = [
        imports.generateStaticImports(),
        imports.generateMethodsImport(schema.label),
        imports.generateNeogenImport(),
        ...R.uniq(toImport).map(imports.generateAllImportsOfModel),
      ]

      const body = [
        generateInstanceType(schema.label),
        props.generatePropsType(schema),
        relationNodes,
        instance.generateModel(schema),
      ].flatMap(it => [it, ts.factory.createEmptyStatement()])

      return [
        ...importBody, ...body
      ]
    }


  }

  export namespace methods {
    function generateStaticMethods(ctx: ctx, label: string): ts.Node {
      const objectContent: ts.ObjectLiteralElementLike[] = []

      if (ctx.generateBase) {
        objectContent.push(
          ts.factory.createSpreadAssignment(ts.factory.createIdentifier(naming.baseStaticMethods()))
        )
      }

      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.staticMethodsNameFor(label)),
              undefined,
              undefined,
              ts.factory.createObjectLiteralExpression(objectContent, true)
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }

    function generateInstanceMethods(ctx: ctx, label: string): ts.Node {
      const objectContent: ts.ObjectLiteralElementLike[] = []

      if (ctx.generateBase) {
        objectContent.push(
          ts.factory.createSpreadAssignment(ts.factory.createIdentifier(naming.baseInstanceMethods()))
        )
      }

      const body = ts.factory.createBlock([
        ts.factory.createReturnStatement(
          ts.factory.createAsExpression(
            ts.factory.createAsExpression(
              ts.factory.createThis(),
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            ),
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(naming.instanceNameFor(label)), undefined)
          )
        )
      ], true)

      const selfMethod = ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier("self"),
        undefined,
        undefined,
        [],
        undefined,
        body
      )

      objectContent.push(selfMethod)

      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.instanceMethodsNameFor(label)),
              undefined,
              undefined,
              ts.factory.createObjectLiteralExpression(
                objectContent,
                true
              )
            )
          ],
          ts.NodeFlags.Const
        )
      );

    }

    export function generateMethodFilesOf(ctx: ctx, files: GenerateSourceFile[]): GenerateSourceFile[] {
      const importsBody: ts.Node[] = []

      if (ctx.generateBase) {
        importsBody.push(imports.generateBaseImports())
      }

      const mapToDeclaration =
        (file: GenerateSourceFile) => [
          imports.generateAllImportsOfModel(file.modelName!),
          ...importsBody,
          ts.factory.createEmptyStatement(),
          generateStaticMethods(ctx, file.modelName!),
          generateInstanceMethods(ctx, file.modelName!)
        ]
      return files.map(_ => new GenerateSourceFile(_.modelName, mapToDeclaration(_), FileType.METHODS))
    }
  }

  export namespace base {

    function generateStaticMethodsBase(): ts.Node {
      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.baseStaticMethods()),
              undefined,
              undefined,
              ts.factory.createObjectLiteralExpression([], false)
            )
          ],
          ts.NodeFlags.Const
        )
      );
    }

    function generateInstanceMethodsBase(): ts.Node {


      return ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createVariableDeclarationList(
          [
            ts.factory.createVariableDeclaration(
              ts.factory.createIdentifier(naming.baseInstanceMethods()),
              undefined,
              undefined,
              ts.factory.createObjectLiteralExpression([], false)
            )
          ],
          ts.NodeFlags.Const
        )
      );

    }


    export function generateBase(): ts.Node[] {
      return [
        generateStaticMethodsBase(),
        generateInstanceMethodsBase(),
      ]
    }
  }

  export namespace relation {

    export function extractRelationsFromDSL(dsl: Object): Relation[] {
      return R.chain(([label, entry]) => {
        const entries = R.toPairs(entry);
        if (entries.length > 2) {
          throw new Error('polymorphic relations not supported by neogma');
        }

        const makeRelation = (from: string, to: string, direction: 'in' | 'out', alias: string) =>
          ({ from, to, direction, label, alias } as Relation);

        const [[from, alias]] = entries as any;

        // When only one relation is provided and it's an array.
        if (entries.length === 1 && alias instanceof Array) {
          return alias.map((aname, i) => makeRelation(from, from, !i ? 'out' : 'in', aname))
        }

        const relations = [];

        const to: string = entries[1]?.[0] || from;
        const aliasB: string = entries[1]?.[1] || alias;

        relations.push(makeRelation(from, to, 'out', alias));
        if (to !== from || aliasB !== alias) {
          relations.push(makeRelation(to, from, 'in', aliasB));
        }

        return relations;
      }, R.toPairs(dsl));
    }

    export function generateRelationsType(modelLabel: string, relations: Relation[]): [ts.InterfaceDeclaration, ModelToImport[]] {
      const relationSchema = R.groupBy(rel => rel.from, relations)[modelLabel]! ?? []

      const needToImportModels: string[] = relationSchema.map(rel => rel.to)
        .filter(rel => rel != modelLabel)

      const modelRelations = relationSchema
        .map(rel =>
          createPropertySignature(
            rel.alias,
            ts.factory.createTypeReferenceNode('ModelRelatedNodesI', [
              ts.factory.createTypeQueryNode(ts.factory.createIdentifier(rel.to)),
              ts.factory.createTypeReferenceNode(rel.to + 'Instance', undefined),
            ])))

      const resultRelations = ts.factory.createInterfaceDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        modelLabel + 'RelatedNodesI',
        undefined,
        undefined,
        modelRelations,
      );
      return [resultRelations, needToImportModels]
    }

    export function generateRelationFile(rels: Relation[]): ts.Node[] {
      const models = R.uniq(rels.flatMap(rel => [rel.from, rel.to]))

      return [
        ...models.map(imports.generateAllImportsOfModel),
        ...rels.map(generateRelationInit)
      ]
    }

    export function generateRelationInit(relation: Relation): ts.Node {
      const traget = [
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier('model'),
          ts.factory.createIdentifier(relation.to)
        ),
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier('direction'),
          ts.factory.createStringLiteral(relation.direction)
        ),
        ts.factory.createPropertyAssignment(
          ts.factory.createIdentifier('name'),
          ts.factory.createStringLiteral(relation.label)
        )
      ];

      return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(relation.from),
          ts.factory.createIdentifier('addRelationships')
        ),
        undefined,
        [
          ts.factory.createObjectLiteralExpression(
            [
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier(relation.alias),
                ts.factory.createObjectLiteralExpression(
                  traget,
                  true // This flag is for multiline object literals
                )
              )
            ],
            true // This flag is for multiline object literals
          )
        ]
      )
    }
  }

  export namespace validations {
    export type RelationError = {
      unknownLabel: string,
      relation: Relation
    }

    export function validateRelations(relations: Relation[], schema: Schema[]): RelationError[] {
      const allModelLabels = schema.map(s => s.label)

      return relations.flatMap(rel =>
        R.reject((name: string) => allModelLabels.includes(name))
          ([rel.from, rel.to])
          .map(name => ({ unknownLabel: `${rel.label}:${name}`, relation: rel }))
      )
    }
  }

  const lowerFirstChar = (str: string) =>
    str.charAt(0).toLowerCase() + str.slice(1)

  export type TypePropOptions = { optional: boolean }

  const createPropertySignature = (name: string, type: ts.TypeNode, propOptions?: TypePropOptions) => {
    let token: ts.QuestionToken | undefined
    if (propOptions?.optional) {
      token = ts.factory.createToken(ts.SyntaxKind.QuestionToken)
    }
    return ts.factory.createPropertySignature(undefined, name, token, type)
  }

  const typeMapping: { [key: string]: ts.KeywordTypeSyntaxKind } = {
    'string': ts.SyntaxKind.StringKeyword,
    'boolean': ts.SyntaxKind.BooleanKeyword,
    'number': ts.SyntaxKind.NumberKeyword,
    'null': ts.SyntaxKind.UndefinedKeyword
  }

  const generatedFileClaim = '// GENERATED FILE, MAY CHANGE IN FUTURE, DO NOT EDIT IT MANUALLY\n'

  class GenerateSourceFile {
    constructor(
      readonly modelName: string | null | undefined,
      readonly nodes: ts.Node[],
      readonly type: FileType,
    ) { }

    save(ctx: ctx) {
      const resultFile = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

      let printedNodes = this.nodes.map(node => printer.printNode(ts.EmitHint.Unspecified, node, resultFile))
        .join('\n').split(';\n').join('\n')

      const resultCode = this.obtainWriteMode() == WriteMode.OVERRIDE ?
        generatedFileClaim + printedNodes :
        printedNodes


      fs.mkdirSync(ctx.outputFolder, { recursive: true });

      const pathToFile = `${ctx.outputFolder}/${this.obtainFileName()}`
      const fileExists = fs.existsSync(pathToFile)

      const minimalInfo = {
        path: pathToFile,
        model: this.modelName,
        type: this.type,
      }

      if (this.obtainWriteMode() == WriteMode.CREATE_IF_NOT_EXISTS) {
        if (!fileExists) {
          fs.writeFileSync(pathToFile, resultCode);
          logger.verbose('Created new file', minimalInfo)
        } else {
          logger.warn('File exists, skipped', minimalInfo)
        }
      } else if (this.obtainWriteMode() == WriteMode.OVERRIDE) {
        fs.writeFileSync(pathToFile, resultCode);
        if (fileExists) {
          logger.verbose('File overridden:', minimalInfo);
        } else {
          logger.verbose('New file created:', minimalInfo);
        }
      } else {
        logger.error('Nothing to do with this kind of file', minimalInfo)
      }
    }

    obtainFileName(): string {
      return R.cond([
        [R.equals(FileType.MODEL), R.always(naming.file.forModel(this.modelName!))],
        [R.equals(FileType.METHODS), R.always(naming.file.forModelMethods(this.modelName!))],
        [R.equals(FileType.RELATION), R.always('__relations')],
        [R.equals(FileType.BASE), R.always('__base')],
      ])(this.type) + '.ts'
    }

    obtainWriteMode(): WriteMode {
      return R.cond([
        [R.equals(FileType.MODEL), R.always(WriteMode.OVERRIDE)],
        [R.equals(FileType.RELATION), R.always(WriteMode.OVERRIDE)],
        [R.T, R.always(WriteMode.CREATE_IF_NOT_EXISTS)]
      ])(this.type)
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
              compact: Infinity,
            },
          })
        ),
      }),
    ],
  });


  export function generateAll(ctx: ctx, schemas: Schema[], relations: RelationsDSL) {
    try {
      logger.silly("Started neogen")
      const parsedRelations = relation.extractRelationsFromDSL(relations)
      logger.info("Parsed relations DSL")

      const relationErrors = validations.validateRelations(parsedRelations, schemas)
      if (relationErrors.length) {

        relationErrors.forEach(error =>
          logger.error(`Error while validating relation '${error.unknownLabel}':`, error.relation))
        throw 'end execution'
      }

      logger.info('Successfully validated relations')

      const sources = schemas.map((schema) =>
        new GenerateSourceFile(
          schema.label,
          model.generateComposed(ctx, schema, parsedRelations),
          FileType.MODEL));
      logger.info("Generated types and props defenitions")

      sources.push(...methods.generateMethodFilesOf(ctx, sources))
      logger.info("Generated methods files")

      sources.push(new GenerateSourceFile(null, relation.generateRelationFile(parsedRelations), FileType.RELATION))
      logger.info("Generated relations file")

      if (ctx.generateBase) {
        sources.push(new GenerateSourceFile(null, base.generateBase(), FileType.BASE))
        logger.info("Generated base file")
      }

      sources.map(it => it.save(ctx))

      logger.silly('Done')
    } catch (e) {
      logger.error(e)
    }
  }

  let instance: Neogma

  export function get(): Neogma {
    if (!instance) {
      throw new Error('Ensure you call neogen.setInstance(noegmaInstance) and all imported in right order')
    }
    return instance
  }

  export function setInstance(val: Neogma): void {
    instance = val
  }

}

//////////////////////////////////////

