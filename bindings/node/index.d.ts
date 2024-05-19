export interface Parser {
  parse(input: string | Input, oldTree?: Tree, options?: Options): Tree;
  getIncludedRanges(): Range[];
  getTimeoutMicros(): number;
  setTimeoutMicros(timeout: number): void;
  reset(): void;
  getLanguage(): any;
  setLanguage(language?: any): void;
  getLogger(): Logger;
  setLogger(logFunc?: Logger | false | null): void;
  printDotGraphs(enabled?: boolean, fd?: number): void;
}

export type Options = {
  bufferSize?: number, includedRanges?: Range[];
};

export type Point = {
  row: number;
  column: number;
};

export type Range = {
  startIndex: number,
  endIndex: number,
  startPosition: Point,
  endPosition: Point
};

export type Edit = {
  startIndex: number;
  oldEndIndex: number;
  newEndIndex: number;
  startPosition: Point;
  oldEndPosition: Point;
  newEndPosition: Point;
};

export type Logger = (
  message: string,
  params: { [param: string]: string },
  type: "parse" | "lex"
) => void;

export interface Input {
  (index: number, position?: Point): string | null;
}

interface SyntaxNodeBase {
  tree: Tree;
  id: number;
  typeId: number;
  grammarId: number;
  type: string;
  grammarType: string;
  isNamed: boolean;
  isMissing: boolean;
  isExtra: boolean;
  hasChanges: boolean;
  hasError: boolean;
  isError: boolean;
  text: string;
  parseState: number;
  nextParseState: number;
  startPosition: Point;
  endPosition: Point;
  startIndex: number;
  endIndex: number;
  parent: SyntaxNode | null;
  children: Array<SyntaxNode>;
  namedChildren: Array<SyntaxNode>;
  childCount: number;
  namedChildCount: number;
  firstChild: SyntaxNode | null;
  firstNamedChild: SyntaxNode | null;
  lastChild: SyntaxNode | null;
  lastNamedChild: SyntaxNode | null;
  nextSibling: SyntaxNode | null;
  nextNamedSibling: SyntaxNode | null;
  previousSibling: SyntaxNode | null;
  previousNamedSibling: SyntaxNode | null;
  descendantCount: number;

  toString(): string;
  child(index: number): SyntaxNode | null;
  namedChild(index: number): SyntaxNode | null;
  childForFieldName(fieldName: string): SyntaxNode | null;
  childForFieldId(fieldId: number): SyntaxNode | null;
  fieldNameForChild(childIndex: number): string | null;
  childrenForFieldName(fieldName: string): Array<SyntaxNode>;
  childrenForFieldId(fieldId: number): Array<SyntaxNode>;
  firstChildForIndex(index: number): SyntaxNode | null;
  firstNamedChildForIndex(index: number): SyntaxNode | null;

  descendantForIndex(index: number): SyntaxNode;
  descendantForIndex(startIndex: number, endIndex: number): SyntaxNode;
  namedDescendantForIndex(index: number): SyntaxNode;
  namedDescendantForIndex(startIndex: number, endIndex: number): SyntaxNode;
  descendantForPosition(position: Point): SyntaxNode;
  descendantForPosition(startPosition: Point, endPosition: Point): SyntaxNode;
  namedDescendantForPosition(position: Point): SyntaxNode;
  namedDescendantForPosition(startPosition: Point, endPosition: Point): SyntaxNode;
  descendantsOfType<T extends TypeString>(types: T | readonly T[], startPosition?: Point, endPosition?: Point): NodeOfType<T>[];

  closest<T extends SyntaxType>(types: T | readonly T[]): NamedNode<T> | null;
  walk(): TreeCursor;
}

export interface TreeCursor {
  nodeType: string;
  nodeTypeId: number;
  nodeStateId: number;
  nodeText: string;
  nodeIsNamed: boolean;
  nodeIsMissing: boolean;
  startPosition: Point;
  endPosition: Point;
  startIndex: number;
  endIndex: number;
  readonly currentNode: SyntaxNode;
  readonly currentFieldName: string;
  readonly currentFieldId: number;
  readonly currentDepth: number;
  readonly currentDescendantIndex: number;

  reset(node: SyntaxNode): void;
  resetTo(cursor: TreeCursor): void;
  gotoParent(): boolean;
  gotoFirstChild(): boolean;
  gotoLastChild(): boolean;
  gotoFirstChildForIndex(goalIndex: number): boolean;
  gotoFirstChildForPosition(goalPosition: Point): boolean;
  gotoNextSibling(): boolean;
  gotoPreviousSibling(): boolean;
  gotoDescendant(goalDescendantIndex: number): void;
}

export interface Tree {
  readonly rootNode: SyntaxNode;

  rootNodeWithOffset(offsetBytes: number, offsetExtent: Point): SyntaxNode;
  edit(edit: Edit): Tree;
  walk(): TreeCursor;
  getChangedRanges(other: Tree): Range[];
  getIncludedRanges(): Range[];
  getEditedRange(other: Tree): Range;
  printDotGraph(fd?: number): void;
}

export interface QueryCapture {
  name: string;
  text?: string;
  node: SyntaxNode;
  setProperties?: { [prop: string]: string | null };
  assertedProperties?: { [prop: string]: string | null };
  refutedProperties?: { [prop: string]: string | null };
}

export interface QueryMatch {
  pattern: number;
  captures: QueryCapture[];
}

export type QueryOptions = {
  startPosition?: Point;
  endPosition?: Point;
  startIndex?: number;
  endIndex?: number;
  matchLimit?: number;
  maxStartDepth?: number;
};

export interface PredicateResult {
  operator: string;
  operands: { name: string; type: string }[];
}

export interface Query {
  readonly predicates: { [name: string]: Function }[];
  readonly setProperties: any[];
  readonly assertedProperties: any[];
  readonly refutedProperties: any[];
  readonly matchLimit: number;

  constructor(language: any, source: string | Buffer);

  captures(node: SyntaxNode, options?: QueryOptions): QueryCapture[];
  matches(node: SyntaxNode, options?: QueryOptions): QueryMatch[];
  disableCapture(captureName: string): void;
  disablePattern(patternIndex: number): void;
  isPatternGuaranteedAtStep(byteOffset: number): boolean;
  isPatternRooted(patternIndex: number): boolean;
  isPatternNonLocal(patternIndex: number): boolean;
  startIndexForPattern(patternIndex: number): number;
  didExceedMatchLimit(): boolean;
}

export interface LookaheadIterable {
  readonly currentTypeId: number;
  readonly currentType: string;

  reset(language: any, stateId: number): boolean;
  resetState(stateId: number): boolean;
  [Symbol.iterator](): Iterator<string>;
}

interface NamedNodeBase extends SyntaxNodeBase {
    isNamed: true;
}

/** An unnamed node with the given type string. */
export interface UnnamedNode<T extends string = string> extends SyntaxNodeBase {
  type: T;
  isNamed: false;
}

type PickNamedType<Node, T extends string> = Node extends { type: T; isNamed: true } ? Node : never;

type PickType<Node, T extends string> = Node extends { type: T } ? Node : never;

/** A named node with the given `type` string. */
export type NamedNode<T extends SyntaxType = SyntaxType> = PickNamedType<SyntaxNode, T>;

/**
 * A node with the given `type` string.
 *
 * Note that this matches both named and unnamed nodes. Use `NamedNode<T>` to pick only named nodes.
 */
export type NodeOfType<T extends string> = PickType<SyntaxNode, T>;

interface TreeCursorOfType<S extends string, T extends SyntaxNodeBase> {
  nodeType: S;
  currentNode: T;
}

type TreeCursorRecord = { [K in TypeString]: TreeCursorOfType<K, NodeOfType<K>> };

/**
 * A tree cursor whose `nodeType` correlates with `currentNode`.
 *
 * The typing becomes invalid once the underlying cursor is mutated.
 *
 * The intention is to cast a `TreeCursor` to `TypedTreeCursor` before
 * switching on `nodeType`.
 *
 * For example:
 * ```ts
 * let cursor = root.walk();
 * while (cursor.gotoNextSibling()) {
 *   const c = cursor as TypedTreeCursor;
 *   switch (c.nodeType) {
 *     case SyntaxType.Foo: {
 *       let node = c.currentNode; // Typed as FooNode.
 *       break;
 *     }
 *   }
 * }
 * ```
 */
export type TypedTreeCursor = TreeCursorRecord[keyof TreeCursorRecord];

export interface ErrorNode extends NamedNodeBase {
    type: SyntaxType.ERROR;
    hasError(): true;
}

export const enum SyntaxType {
  ERROR = "ERROR",
  Abs = "abs",
  Add = "add",
  And = "and",
  ArrowBody = "arrowBody",
  Assignment = "assignment",
  Band = "band",
  Binding = "binding",
  Bnot = "bnot",
  Boolean = "boolean",
  Bor = "bor",
  Break = "break",
  Brot = "brot",
  Bshl = "bshl",
  Bshr = "bshr",
  Bxor = "bxor",
  Callment = "callment",
  Case = "case",
  Clause = "clause",
  CondDo = "cond_do",
  Df = "df",
  Div = "div",
  DoCond = "do_cond",
  Eq = "eq",
  Expect = "expect",
  Fdiv = "fdiv",
  Field = "field",
  FirstClause = "first_clause",
  ForEach = "for_each",
  Func = "func",
  FuncDef = "func_def",
  Ge = "ge",
  Gt = "gt",
  Guard = "guard",
  If = "if",
  ImplDef = "impl_def",
  Le = "le",
  Lt = "lt",
  Match = "match",
  Mod = "mod",
  Mul = "mul",
  MultilineStringFragment = "multiline_string_fragment",
  Nand = "nand",
  Neg = "neg",
  Nor = "nor",
  Not = "not",
  Number = "number",
  Or = "or",
  Pow = "pow",
  Read = "read",
  ReadProp = "read_prop",
  Return = "return",
  Scope = "scope",
  Skip = "skip",
  SourceFile = "source_file",
  String = "string",
  Sub = "sub",
  Subscript = "subscript",
  Tuple = "tuple",
  UntilCond = "until_cond",
  VarDef = "var_def",
  WhileCond = "while_cond",
  Xnor = "xnor",
  Xor = "xor",
  Comment = "comment",
  EscapeSequence = "escape_sequence",
  Identifier = "identifier",
  Null = "null",
  StringFragment = "string_fragment",
  Undefined = "undefined",
}

export type UnnamedType =
  | "!"
  | "!!"
  | "!="
  | "\""
  | "\"\"\""
  | "%"
  | "&&"
  | "("
  | ")"
  | "*"
  | "+"
  | ","
  | "-"
  | "->"
  | "."
  | "..."
  | "/"
  | ":"
  | ";"
  | "<"
  | "<<"
  | "<="
  | "="
  | "=="
  | "=>"
  | ">"
  | ">="
  | ">>"
  | "?"
  | "@"
  | "["
  | "]"
  | "^"
  | "^^"
  | SyntaxType.And // both named and unnamed
  | "as"
  | SyntaxType.Break // both named and unnamed
  | SyntaxType.Case // both named and unnamed
  | "do"
  | "else"
  | "elseif"
  | "false"
  | "for"
  | SyntaxType.Func // both named and unnamed
  | SyntaxType.If // both named and unnamed
  | "impl"
  | "in"
  | "let"
  | SyntaxType.Match // both named and unnamed
  | SyntaxType.Nand // both named and unnamed
  | SyntaxType.Nor // both named and unnamed
  | SyntaxType.Not // both named and unnamed
  | SyntaxType.Or // both named and unnamed
  | "package"
  | "repeat"
  | SyntaxType.Return // both named and unnamed
  | SyntaxType.Skip // both named and unnamed
  | "then"
  | "true"
  | "until"
  | "while"
  | SyntaxType.Xnor // both named and unnamed
  | SyntaxType.Xor // both named and unnamed
  | "{"
  | "|"
  | "||"
  | "}"
  | "~~"
  ;

export type TypeString = SyntaxType | UnnamedType;

export type SyntaxNode = 
  | ExprNode
  | StatNode
  | AbsNode
  | AddNode
  | AndNode
  | ArrowBodyNode
  | AssignmentNode
  | BandNode
  | BindingNode
  | BnotNode
  | BooleanNode
  | BorNode
  | BreakNode
  | BrotNode
  | BshlNode
  | BshrNode
  | BxorNode
  | CallmentNode
  | CaseNode
  | ClauseNode
  | CondDoNode
  | DfNode
  | DivNode
  | DoCondNode
  | EqNode
  | ExpectNode
  | FdivNode
  | FieldNode
  | FirstClauseNode
  | ForEachNode
  | FuncNode
  | FuncDefNode
  | GeNode
  | GtNode
  | GuardNode
  | IfNode
  | ImplDefNode
  | LeNode
  | LtNode
  | MatchNode
  | ModNode
  | MulNode
  | MultilineStringFragmentNode
  | NandNode
  | NegNode
  | NorNode
  | NotNode
  | NumberNode
  | OrNode
  | PowNode
  | ReadNode
  | ReadPropNode
  | ReturnNode
  | ScopeNode
  | SkipNode
  | SourceFileNode
  | StringNode
  | SubNode
  | SubscriptNode
  | TupleNode
  | UntilCondNode
  | VarDefNode
  | WhileCondNode
  | XnorNode
  | XorNode
  | UnnamedNode<"!">
  | UnnamedNode<"!!">
  | UnnamedNode<"!=">
  | UnnamedNode<"\"">
  | UnnamedNode<"\"\"\"">
  | UnnamedNode<"%">
  | UnnamedNode<"&&">
  | UnnamedNode<"(">
  | UnnamedNode<")">
  | UnnamedNode<"*">
  | UnnamedNode<"+">
  | UnnamedNode<",">
  | UnnamedNode<"-">
  | UnnamedNode<"->">
  | UnnamedNode<".">
  | UnnamedNode<"...">
  | UnnamedNode<"/">
  | UnnamedNode<":">
  | UnnamedNode<";">
  | UnnamedNode<"<">
  | UnnamedNode<"<<">
  | UnnamedNode<"<=">
  | UnnamedNode<"=">
  | UnnamedNode<"==">
  | UnnamedNode<"=>">
  | UnnamedNode<">">
  | UnnamedNode<">=">
  | UnnamedNode<">>">
  | UnnamedNode<"?">
  | UnnamedNode<"@">
  | UnnamedNode<"[">
  | UnnamedNode<"]">
  | UnnamedNode<"^">
  | UnnamedNode<"^^">
  | UnnamedNode<SyntaxType.And>
  | UnnamedNode<"as">
  | UnnamedNode<SyntaxType.Break>
  | UnnamedNode<SyntaxType.Case>
  | CommentNode
  | UnnamedNode<"do">
  | UnnamedNode<"else">
  | UnnamedNode<"elseif">
  | EscapeSequenceNode
  | UnnamedNode<"false">
  | UnnamedNode<"for">
  | UnnamedNode<SyntaxType.Func>
  | IdentifierNode
  | UnnamedNode<SyntaxType.If>
  | UnnamedNode<"impl">
  | UnnamedNode<"in">
  | UnnamedNode<"let">
  | UnnamedNode<SyntaxType.Match>
  | UnnamedNode<SyntaxType.Nand>
  | UnnamedNode<SyntaxType.Nor>
  | UnnamedNode<SyntaxType.Not>
  | NullNode
  | UnnamedNode<SyntaxType.Or>
  | UnnamedNode<"package">
  | UnnamedNode<"repeat">
  | UnnamedNode<SyntaxType.Return>
  | UnnamedNode<SyntaxType.Skip>
  | StringFragmentNode
  | UnnamedNode<"then">
  | UnnamedNode<"true">
  | UndefinedNode
  | UnnamedNode<"until">
  | UnnamedNode<"while">
  | UnnamedNode<SyntaxType.Xnor>
  | UnnamedNode<SyntaxType.Xor>
  | UnnamedNode<"{">
  | UnnamedNode<"|">
  | UnnamedNode<"||">
  | UnnamedNode<"}">
  | UnnamedNode<"~~">
  | ErrorNode
  ;

export type ExprNode = 
  | AbsNode
  | AddNode
  | AndNode
  | BandNode
  | BnotNode
  | BooleanNode
  | BorNode
  | BrotNode
  | BshlNode
  | BshrNode
  | BxorNode
  | CallmentNode
  | DfNode
  | DivNode
  | EqNode
  | ExpectNode
  | FdivNode
  | FuncNode
  | FuncDefNode
  | GeNode
  | GtNode
  | GuardNode
  | IfNode
  | LeNode
  | LtNode
  | MatchNode
  | ModNode
  | MulNode
  | NandNode
  | NegNode
  | NorNode
  | NotNode
  | NullNode
  | NumberNode
  | OrNode
  | PowNode
  | ReadNode
  | ReadPropNode
  | ScopeNode
  | StringNode
  | SubNode
  | SubscriptNode
  | TupleNode
  | UndefinedNode
  | VarDefNode
  | XnorNode
  | XorNode
  ;

export type StatNode = 
  | AssignmentNode
  | CallmentNode
  | CondDoNode
  | DoCondNode
  | ForEachNode
  | FuncDefNode
  | IfNode
  | ImplDefNode
  | MatchNode
  | VarDefNode
  ;

export interface AbsNode extends NamedNodeBase {
  type: SyntaxType.Abs;
  baseNode: ExprNode;
}

export interface AddNode extends NamedNodeBase {
  type: SyntaxType.Add;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface AndNode extends NamedNodeBase {
  type: SyntaxType.And;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface ArrowBodyNode extends NamedNodeBase {
  type: SyntaxType.ArrowBody;
  returnNode: ExprNode;
}

export interface AssignmentNode extends NamedNodeBase {
  type: SyntaxType.Assignment;
  baseNode: ReadNode | ReadPropNode | SubscriptNode;
  destructuresNodes: BindingNode[];
  valueNode: ExprNode;
}

export interface BandNode extends NamedNodeBase {
  type: SyntaxType.Band;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface BindingNode extends NamedNodeBase {
  type: SyntaxType.Binding;
  decoratorsNodes: (UnnamedNode<"@"> | CallmentNode | ReadNode | ReadPropNode)[];
  defaultNode?: ExprNode;
  destructuresNodes: BindingNode[];
  isOptionalNode?: UnnamedNode<"?">;
  isVariadicNode?: UnnamedNode<"...">;
  nameNode: IdentifierNode;
  renameNode?: IdentifierNode;
  typeNode?: ExprNode;
}

export interface BnotNode extends NamedNodeBase {
  type: SyntaxType.Bnot;
  baseNode: ExprNode;
}

export interface BooleanNode extends NamedNodeBase {
  type: SyntaxType.Boolean;
}

export interface BorNode extends NamedNodeBase {
  type: SyntaxType.Bor;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface BreakNode extends NamedNodeBase {
  type: SyntaxType.Break;
}

export interface BrotNode extends NamedNodeBase {
  type: SyntaxType.Brot;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface BshlNode extends NamedNodeBase {
  type: SyntaxType.Bshl;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface BshrNode extends NamedNodeBase {
  type: SyntaxType.Bshr;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface BxorNode extends NamedNodeBase {
  type: SyntaxType.Bxor;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface CallmentNode extends NamedNodeBase {
  type: SyntaxType.Callment;
  baseNode: ExprNode;
  paramNode: FuncNode | ScopeNode | StringNode | TupleNode;
}

export interface CaseNode extends NamedNodeBase {
  type: SyntaxType.Case;
  exprNode: ExprNode;
  thenNode: StatNode | ArrowBodyNode | ScopeNode;
}

export interface ClauseNode extends NamedNodeBase {
  type: SyntaxType.Clause;
  clauseNode: ExprNode;
  thenNode: StatNode | ArrowBodyNode | ScopeNode;
}

export interface CondDoNode extends NamedNodeBase {
  type: SyntaxType.CondDo;
}

export interface DfNode extends NamedNodeBase {
  type: SyntaxType.Df;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface DivNode extends NamedNodeBase {
  type: SyntaxType.Div;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface DoCondNode extends NamedNodeBase {
  type: SyntaxType.DoCond;
  bodyNode: StatNode | ArrowBodyNode | ScopeNode;
  condNode?: UntilCondNode | WhileCondNode;
  elseNode?: StatNode | ArrowBodyNode | ScopeNode;
}

export interface EqNode extends NamedNodeBase {
  type: SyntaxType.Eq;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface ExpectNode extends NamedNodeBase {
  type: SyntaxType.Expect;
  baseNode: ExprNode;
}

export interface FdivNode extends NamedNodeBase {
  type: SyntaxType.Fdiv;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface FieldNode extends NamedNodeBase {
  type: SyntaxType.Field;
  nameNode: IdentifierNode;
  valueNode: ExprNode;
}

export interface FirstClauseNode extends NamedNodeBase {
  type: SyntaxType.FirstClause;
  clauseNode: ExprNode;
  thenNode: StatNode | ArrowBodyNode | ScopeNode;
}

export interface ForEachNode extends NamedNodeBase {
  type: SyntaxType.ForEach;
  bindingsNodes: BindingNode[];
  bodyNode: StatNode | ArrowBodyNode | ScopeNode;
  targetNode: ExprNode;
}

export interface FuncNode extends NamedNodeBase {
  type: SyntaxType.Func;
  bodyNode: StatNode | ArrowBodyNode | ScopeNode;
  paramsNodes: BindingNode[];
}

export interface FuncDefNode extends NamedNodeBase {
  type: SyntaxType.FuncDef;
  bodyNode: StatNode | ArrowBodyNode | ScopeNode;
  decoratorsNodes: (UnnamedNode<"@"> | CallmentNode | ReadNode | ReadPropNode)[];
  nameNode: IdentifierNode;
  paramsNodes: BindingNode[];
  return_typeNode?: ReadNode | ReadPropNode;
  selfNode?: TupleNode;
  type_paramsNodes: BindingNode[];
}

export interface GeNode extends NamedNodeBase {
  type: SyntaxType.Ge;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface GtNode extends NamedNodeBase {
  type: SyntaxType.Gt;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface GuardNode extends NamedNodeBase {
  type: SyntaxType.Guard;
  baseNode: ExprNode;
}

export interface IfNode extends NamedNodeBase {
  type: SyntaxType.If;
  clauseNode: FirstClauseNode;
  clausesNodes: ClauseNode[];
  elseNode?: StatNode | ArrowBodyNode | ScopeNode;
}

export interface ImplDefNode extends NamedNodeBase {
  type: SyntaxType.ImplDef;
  baseNode?: ReadNode | ReadPropNode;
  targetNode: ReadNode | ReadPropNode;
}

export interface LeNode extends NamedNodeBase {
  type: SyntaxType.Le;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface LtNode extends NamedNodeBase {
  type: SyntaxType.Lt;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface MatchNode extends NamedNodeBase {
  type: SyntaxType.Match;
  casesNodes: CaseNode[];
  elseNode?: StatNode | ArrowBodyNode | ScopeNode;
  exprNode: ExprNode;
}

export interface ModNode extends NamedNodeBase {
  type: SyntaxType.Mod;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface MulNode extends NamedNodeBase {
  type: SyntaxType.Mul;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface MultilineStringFragmentNode extends NamedNodeBase {
  type: SyntaxType.MultilineStringFragment;
}

export interface NandNode extends NamedNodeBase {
  type: SyntaxType.Nand;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface NegNode extends NamedNodeBase {
  type: SyntaxType.Neg;
  baseNode: ExprNode;
}

export interface NorNode extends NamedNodeBase {
  type: SyntaxType.Nor;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface NotNode extends NamedNodeBase {
  type: SyntaxType.Not;
  baseNode: ExprNode;
}

export interface NumberNode extends NamedNodeBase {
  type: SyntaxType.Number;
  typeNode?: IdentifierNode;
}

export interface OrNode extends NamedNodeBase {
  type: SyntaxType.Or;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface PowNode extends NamedNodeBase {
  type: SyntaxType.Pow;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface ReadNode extends NamedNodeBase {
  type: SyntaxType.Read;
  nameNode: IdentifierNode;
}

export interface ReadPropNode extends NamedNodeBase {
  type: SyntaxType.ReadProp;
  baseNode: ReadNode | ReadPropNode;
  nameNode: IdentifierNode;
}

export interface ReturnNode extends NamedNodeBase {
  type: SyntaxType.Return;
  exprNode: ExprNode;
}

export interface ScopeNode extends NamedNodeBase {
  type: SyntaxType.Scope;
  last_statNode?: BreakNode | ReturnNode | SkipNode;
  returnNode?: ExprNode;
  statsNodes: StatNode[];
}

export interface SkipNode extends NamedNodeBase {
  type: SyntaxType.Skip;
}

export interface SourceFileNode extends NamedNodeBase {
  type: SyntaxType.SourceFile;
  packageNode?: ReadNode | ReadPropNode;
  statsNodes: StatNode[];
}

export interface StringNode extends NamedNodeBase {
  type: SyntaxType.String;
}

export interface SubNode extends NamedNodeBase {
  type: SyntaxType.Sub;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface SubscriptNode extends NamedNodeBase {
  type: SyntaxType.Subscript;
  baseNode: ExprNode;
  indexesNodes: ExprNode[];
}

export interface TupleNode extends NamedNodeBase {
  type: SyntaxType.Tuple;
  fieldsNodes: (ExprNode | FieldNode)[];
}

export interface UntilCondNode extends NamedNodeBase {
  type: SyntaxType.UntilCond;
  exprNode: ExprNode;
}

export interface VarDefNode extends NamedNodeBase {
  type: SyntaxType.VarDef;
  bindingsNodes: BindingNode[];
  decoratorsNodes: (UnnamedNode<"@"> | CallmentNode | ReadNode | ReadPropNode)[];
}

export interface WhileCondNode extends NamedNodeBase {
  type: SyntaxType.WhileCond;
  exprNode: ExprNode;
}

export interface XnorNode extends NamedNodeBase {
  type: SyntaxType.Xnor;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface XorNode extends NamedNodeBase {
  type: SyntaxType.Xor;
  leftNode: ExprNode;
  rightNode: ExprNode;
}

export interface CommentNode extends NamedNodeBase {
  type: SyntaxType.Comment;
}

export interface EscapeSequenceNode extends NamedNodeBase {
  type: SyntaxType.EscapeSequence;
}

export interface IdentifierNode extends NamedNodeBase {
  type: SyntaxType.Identifier;
}

export interface NullNode extends NamedNodeBase {
  type: SyntaxType.Null;
}

export interface StringFragmentNode extends NamedNodeBase {
  type: SyntaxType.StringFragment;
}

export interface UndefinedNode extends NamedNodeBase {
  type: SyntaxType.Undefined;
}

