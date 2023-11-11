import { ModelFactory, ModelRelatedNodesI, Neogma, NeogmaInstance } from "neogma";
// import { neogma } from "../neo4j";
import ts from "typescript";
import * as R from 'ramda';
import fs from 'fs';
import _ from 'lodash';

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
// unions & shit
// constraints

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
    export type PropType = { name: string, type: string }

    export type ctx = {
        outputFolder: string,
        generateBase?: boolean
    }

    type ModelToImport = string
    export type Types = 'string' | 'boolean' | 'number'
    export type PropsTypes = { [prop: string]: Types }
    export type RelationsDSL = Object
    export type Schema = {
        label: string,
        schema: PropsTypes
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
            export const forModelMethods = (label: string) => '_' + _.snakeCase(label)
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

    export namespace model {
        function generatePropsType(schema: Schema): ts.TypeAliasDeclaration {
            const propsTypes = Object.entries(schema.schema)
                .map(([name, typeName]) => createPropertySignature(
                    name,
                    ts.factory.createKeywordTypeNode(typeMapping[typeName])
                ))

            return ts.factory.createTypeAliasDeclaration(
                [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                schema.label + 'Props',
                undefined,
                ts.factory.createTypeLiteralNode(propsTypes)
            )
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
                generatePropsType(schema),
                relationNodes,
                generateModel(schema),
            ].flatMap(it => [it, ts.factory.createEmptyStatement()])

            return [
                ...importBody, ...body
            ]
        }

        function generateSpeicifProp(prop: PropType) {
            return ts.factory.createPropertyAssignment(
                prop.name,
                ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment(
                        'type',
                        ts.factory.createStringLiteral(prop.type),
                    )
                ], false)
            )
        }

        function generateModel(schema: Schema) {
            const neogmaInstance =
                ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier('neogen'),
                        ts.factory.createIdentifier('get')
                    ),
                    undefined,
                    [])

            const modelFactoryCall = ts.factory.createCallExpression(
                ts.factory.createIdentifier('ModelFactory'), // Expression
                [
                    ts.factory.createTypeReferenceNode(schema.label + 'Props', undefined),
                    ts.factory.createTypeReferenceNode(schema.label + 'RelatedNodesI', undefined),
                    typing.staticMethodsNameFor(schema.label),
                    typing.instanceMethodsNameFor(schema.label),

                ],
                [
                    ts.factory.createObjectLiteralExpression([
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
                                Object.entries(schema.schema).map(([name, type]) => generateSpeicifProp({ name, type })) as any// schema.schema
                                , true)
                        ),
                        ts.factory.createPropertyAssignment(
                            'primaryKeyField',
                            ts.factory.createStringLiteral('uuid')
                        ),
                    ], true),
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
                            ts.factory.createObjectLiteralExpression(objectContent, false)
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
                                false
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
            return Object.entries(dsl)
                .flatMap(([label, entry]) => {
                    const [[from, alias], [fromB, aliasB]] = Object.entries(entry) as string[][]

                    const inRel: Relation = {
                        from,
                        to: fromB,
                        direction: 'out',
                        label,
                        alias
                    }

                    const outRel: Relation = {
                        from: fromB,
                        to: from,
                        direction: 'in',
                        label: label,
                        alias: aliasB
                    }

                    return [inRel, outRel]
                })
        }


        export function generateRelationsType(modelLabel: string, relations: Relation[]): [ts.InterfaceDeclaration, ModelToImport[]] {
            const relationSchema = R.groupBy(rel => rel.from, relations)[modelLabel]!

            const needToImportModels: string[] = relationSchema.map(rel => rel.to)

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

    const lowerFirstChar = (str: string) =>
        str.charAt(0).toLowerCase() + str.slice(1)

    const createPropertySignature = (name: string, type: ts.TypeNode) =>
        ts.factory.createPropertySignature(undefined, name, undefined, type)


    const typeMapping: { [key: string]: ts.KeywordTypeSyntaxKind } = {
        'string': ts.SyntaxKind.StringKeyword,
        'boolean': ts.SyntaxKind.BooleanKeyword,
        'number': ts.SyntaxKind.NumberKeyword,
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

            let printedNodes = this.nodes.map(node => printer.printNode(ts.EmitHint.Unspecified, node, resultFile)).join('\n');

            const resultCode = this.obtainWriteMode() == WriteMode.OVERRIDE ?
                generatedFileClaim + printedNodes :
                printedNodes


            fs.mkdirSync(ctx.outputFolder, { recursive: true });

            const pathToFile = `${ctx.outputFolder}/${this.obtainFileName()}`

            if (this.obtainWriteMode() == WriteMode.CREATE_IF_NOT_EXISTS && !fs.existsSync(pathToFile)) {
                fs.writeFileSync(pathToFile, resultCode);
            } else if (this.obtainWriteMode() == WriteMode.OVERRIDE) {
                fs.writeFileSync(pathToFile, resultCode);
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



    export function generateAll(ctx: ctx, schemas: Schema[], relations: RelationsDSL) {
        const parsedRelations = relation.extractRelationsFromDSL(relations)

        const sources = schemas.map((schema) =>
            new GenerateSourceFile(
                schema.label,
                model.generateComposed(ctx, schema, parsedRelations),
                FileType.MODEL));

        sources.push(...methods.generateMethodFilesOf(ctx, sources))
        sources.push(new GenerateSourceFile(null, relation.generateRelationFile(parsedRelations), FileType.RELATION))

        if (ctx.generateBase) {
            sources.push(new GenerateSourceFile(null, base.generateBase(), FileType.BASE))
        }

        sources.map(it => it.save(ctx))
    }

    function print(nodes: any) {
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
            result.split(';\n').join('\n'))

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

