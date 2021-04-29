// incomplete declarations for the postcss-values-parser
declare module 'postcss-values-parser' {
    export type Node = Root | ChildNode;

    interface NodeBase {
        next(): ChildNode | void;
        prev(): ChildNode | void;
    }

    interface ContainerBase extends NodeBase {
        nodes: ChildNode[];
        first?: ChildNode;
        last?: ChildNode;
    }

    export interface Root extends ContainerBase {
        type: 'root';
    }

    export type ChildNode =
        | AtWord
        | Comment
        | Func
        | Interpolation
        | Numeric
        | Operator
        | Punctuation
        | Quoted
        | UnicodeRange
        | Word;

    export type Container = Root | Func | Interpolation;

    export interface AtWord extends ContainerBase {
        type: 'atrule';
        parent: Container;
        name: string;
        params: string;
    }

    export interface Comment extends ContainerBase {
        type: 'comment';
        parent: Container;
        inline: boolean;
        text: string;
    }

    export interface Func extends ContainerBase {
        type: 'func';
        parent: Container;
        isColor: boolean;
        isVar: boolean;
        name: string;
        params: string;
    }

    export interface Interpolation extends ContainerBase {
        type: 'interpolation';
        parent: Container;
        params: string;
        prefix: string;
    }

    export interface Numeric extends NodeBase {
        type: 'numeric';
        parent: Container;
        unit: string;
        value: string;
    }

    export interface Operator extends NodeBase {
        type: 'operator';
        parent: Container;
        value: string;
    }

    export interface Punctuation extends NodeBase {
        type: 'punctuation';
        parent: Container;
        value: string;
    }

    export interface Quoted extends NodeBase {
        type: 'quoted';
        parent: Container;
        quote: string;
        value: string;
        contents: string;
    }

    export interface UnicodeRange extends NodeBase {
        type: 'unicodeRange';
        parent: Container;
        name: string;
    }

    export interface Word extends NodeBase {
        type: 'word';
        parent: Container;
        isColor: boolean;
        isHex: boolean;
        isUrl: boolean;
        isVariable: boolean;
        value: string;
    }

    interface ParseOptions {
        ignoreUnknownWords?: boolean;
        interpolation?: boolean | InterpolationOptions;
        variables?: VariablesOptions;
    }

    interface InterpolationOptions {
        prefix: string;
    }

    interface VariablesOptions {
        prefixes: string[];
    }
    export function parse(css: string, options?: ParseOptions): Root;
}
