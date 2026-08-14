import type * as monaco from "monaco-editor";

import { useKeybind, useSendAndReceiveCustomEvent } from "../../../hooks";
import {
  PgCommon,
  PgEditor,
  PgExplorer,
  PgPackage,
  PgTerminal,
} from "../../../utils";

export const useMonacoFormatting = (
  editor?: monaco.editor.IStandaloneCodeEditor
) => {
  // Format event
  useSendAndReceiveCustomEvent(
    PgEditor.events.FORMAT,
    async (ev?: { lang: LanguageName; fromTerminal: boolean }) => {
      if (!editor) return;

      const lang = PgExplorer.getCurrentFileLanguage();
      if (!lang) return;

      const isCurrentFileRust = lang.name === "Rust";
      const isCurrentFileJsLike = PgExplorer.isCurrentFileJsLike();
      const isCurrentFileJson = lang.name === "JSON";

      // From keybind
      if (!ev) {
        if (isCurrentFileRust) await formatRust(editor, false);
        else if (isCurrentFileJsLike) await formatJsTs(editor, false);
        else if (isCurrentFileJson) formatJson(editor);
        return;
      }

      // From terminal
      switch (ev.lang) {
        case "Rust":
          if (!isCurrentFileRust) {
            printWrongFileType("Rust");
            return;
          }
          await formatRust(editor, ev.fromTerminal);
          break;
        case "TypeScript":
          if (!isCurrentFileJsLike) {
            printWrongFileType("JS/TS");
            return;
          }
          await formatJsTs(editor, ev.fromTerminal);
      }
    },
    [editor]
  );

  // Format on keybind
  useKeybind(
    "Ctrl+S",
    () => {
      if (editor?.hasTextFocus()) {
        PgTerminal.process(async () => {
          await PgCommon.sendAndReceiveCustomEvent(PgEditor.events.FORMAT);
        });
      }
    },
    [editor]
  );
};

const formatRust = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  reportSuccess: boolean
) => {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return;

  const { rustfmt } = await PgPackage.import("rustfmt");
  let result;
  try {
    result = rustfmt(editor.getValue());
  } catch (error: any) {
    result = { error: () => error.message };
  }
  if (result.error()) {
    PgTerminal.println(PgTerminal.error("Unable to format the file."));
    return;
  }

  const formattedCode = result.code!();
  replaceEditorContent(
    editor,
    formattedCode,
    findCursorOffset(model, position, formattedCode)
  );
  if (reportSuccess) printFormatSuccess();
};

const formatJsTs = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  reportSuccess: boolean
) => {
  const model = editor.getModel();
  if (!model) return;

  const { formatWithCursor } = await import("prettier/standalone");
  const { default: parserTypescript } = await import(
    "prettier/parser-typescript"
  );
  const position = editor.getPosition() ?? { lineNumber: 1, column: 0 };
  const result = formatWithCursor(editor.getValue(), {
    parser: "typescript",
    plugins: [parserTypescript],
    cursorOffset: model.getOffsetAt(position),
  });

  replaceEditorContent(editor, result.formatted, result.cursorOffset);
  if (reportSuccess) printFormatSuccess();
};

const formatJson = (editor: monaco.editor.IStandaloneCodeEditor) => {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position) return;

  const formattedCode = PgCommon.prettyJSON(JSON.parse(editor.getValue()));
  replaceEditorContent(
    editor,
    formattedCode,
    findCursorOffset(model, position, formattedCode)
  );
};

const findCursorOffset = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  formattedCode: string
) => {
  const lines = [
    position.lineNumber === 1
      ? ""
      : model.getLineContent(position.lineNumber - 1),
    model.getLineContent(position.lineNumber),
    position.lineNumber === model.getLineCount()
      ? ""
      : model.getLineContent(position.lineNumber + 1),
  ];
  const searchText = `${lines.join("\n")}\n`;
  const searchIndex = formattedCode.indexOf(searchText);
  if (
    searchIndex === -1 ||
    formattedCode.indexOf(searchText, searchIndex + searchText.length) !== -1
  ) {
    return model.getOffsetAt(position);
  }

  return (
    searchIndex +
    model.getOffsetAt(position) -
    model.getOffsetAt({
      lineNumber: Math.max(1, position.lineNumber - 1),
      column: 1,
    })
  );
};

const replaceEditorContent = (
  editor: monaco.editor.IStandaloneCodeEditor,
  content: string,
  cursorOffset: number
) => {
  const model = editor.getModel();
  if (!model) return;

  const endLineNumber = model.getLineCount();
  editor.executeEdits(null, [
    {
      text: content,
      range: {
        startLineNumber: 1,
        endLineNumber,
        startColumn: 0,
        endColumn: model.getLineContent(endLineNumber).length + 1,
      },
    },
  ]);
  editor.setPosition(model.getPositionAt(cursorOffset));
};

const printWrongFileType = (expected: string) =>
  PgTerminal.println(
    PgTerminal.warning(`Current file is not a ${expected} file.`)
  );

const printFormatSuccess = () =>
  PgTerminal.println(PgTerminal.success("Format successful."));
