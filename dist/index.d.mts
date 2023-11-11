import { Neogma } from 'neogma';
import ts from 'typescript';

declare namespace neogen {
    export enum FileType {
        RELATION = 0,
        MODEL = 1,
        METHODS = 2,
        TOTAL = 3,
        BASE = 4
    }
    export enum WriteMode {
        CREATE_IF_NOT_EXISTS = 0,
        OVERRIDE = 1
    }
    export type PropType = {
        name: string;
        type: Types;
    };
    export type ctx = {
        outputFolder: string;
        generateBase?: boolean;
    };
    type ModelToImport = string;
    type BasicTypes = Revalidator.Types;
    export type Types = undefined | BasicTypes | BasicTypes[] | Revalidator.ISchema<any> | Revalidator.JSONSchema<any>;
    export type PropsTypes = {
        [prop: string]: Types;
    };
    export type RelationsDSL = Object;
    export type Schema = {
        label: string;
        schema: PropsTypes;
    };
    export type Relation = {
        from: string;
        to: string;
        direction: 'out' | 'in';
        label: string;
        alias: string;
    };
    export namespace naming {
        const instanceMethodsNameFor: (label: string) => string;
        const staticMethodsNameFor: (label: string) => string;
        const instanceNameFor: (label: string) => string;
        const baseInstanceMethods: () => string;
        const baseStaticMethods: () => string;
        namespace file {
            const forModel: (label: string) => string;
            const forModelMethods: (label: string) => string;
            const forBaseMethods: () => string;
        }
    }
    export namespace typing {
        const instanceMethodsNameFor: (label: string) => ts.TypeQueryNode;
        const staticMethodsNameFor: (label: string) => ts.TypeQueryNode;
    }
    export namespace imports {
        function generateBaseImports(): ts.ImportDeclaration;
        function generateMethodsImport(modelName: string): ts.ImportDeclaration;
        function generateStaticImports(): ts.ImportDeclaration;
        function generateNeogenImport(): ts.ImportDeclaration;
        function generateAllImportsOfModel(modelName: string): ts.Node;
    }
    export namespace common {
        function straightforwardConvert(object: Object): ts.Expression;
    }
    export namespace model {
        namespace props {
            function generatePropsType(schema: Schema): ts.TypeAliasDeclaration;
        }
        namespace instance {
            function generateModel(schema: Schema): ts.VariableStatement;
        }
        function generateComposed(ctx: ctx, schema: Schema, relations: Relation[]): ts.Node[];
    }
    export namespace methods {
        function generateMethodFilesOf(ctx: ctx, files: GenerateSourceFile[]): GenerateSourceFile[];
    }
    export namespace base {
        function generateBase(): ts.Node[];
    }
    export namespace relation {
        function extractRelationsFromDSL(dsl: Object): Relation[];
        function generateRelationsType(modelLabel: string, relations: Relation[]): [ts.InterfaceDeclaration, ModelToImport[]];
        function generateRelationFile(rels: Relation[]): ts.Node[];
        function generateRelationInit(relation: Relation): ts.Node;
    }
    class GenerateSourceFile {
        readonly modelName: string | null | undefined;
        readonly nodes: ts.Node[];
        readonly type: FileType;
        constructor(modelName: string | null | undefined, nodes: ts.Node[], type: FileType);
        save(ctx: ctx): void;
        obtainFileName(): string;
        obtainWriteMode(): WriteMode;
    }
    export function generateAll(ctx: ctx, schemas: Schema[], relations: RelationsDSL): void;
    export function get(): Neogma;
    export function setInstance(val: Neogma): void;
    export {};
}

export { neogen };
