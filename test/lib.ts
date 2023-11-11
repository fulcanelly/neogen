import ts from "typescript";

export namespace testlib {
  export function serialize(...nodes: ts.Node[]) {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile(
      "",
      "",
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TSX
    );

    const result = printer.printList(ts.ListFormat.MultiLine, nodes as any, resultFile);

    return result.split(';\n').join('\n')
  }
}
