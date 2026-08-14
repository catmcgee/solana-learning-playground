import { useEffect } from "react";
import * as monaco from "monaco-editor";

import { PgCommand, PgCommon, PgExplorer, PgProgramInfo } from "../../../utils";

export const useMonacoExtensions = (
  editor?: monaco.editor.IStandaloneCodeEditor
) => {
  // Initialize language extensions
  useEffect(() => {
    const disposables = monaco.languages.getLanguages().map((language) => {
      return monaco.languages.onLanguage(language.id, async () => {
        try {
          const { init } = await import(`./languages/${language.id}/init`);
          await init();
        } catch (e: any) {
          if (!e.message?.includes("Cannot find module")) {
            throw new Error(`Failed to initialize '${language.id}': ${e}`);
          }
        }
      });
    });

    return () => disposables.forEach(({ dispose }) => dispose());
  }, []);

  // Update program id
  useEffect(() => {
    if (!editor) return;

    const getProgramIdStartAndEndIndex = (
      content: string,
      isPython: boolean
    ) => {
      const findText = isPython ? "declare_id" : "declare_id!";
      const findTextIndex = content.indexOf(findText);
      if (!content || findTextIndex === -1) return;
      const quoteStartIndex = findTextIndex + findText.length + 1;
      const quoteChar = content[quoteStartIndex];
      const quoteEndIndex = content.indexOf(quoteChar, quoteStartIndex + 1);

      return [quoteStartIndex, quoteEndIndex];
    };

    const updateId = async () => {
      const programPkStr = PgProgramInfo.getPkStr();
      if (!programPkStr) return;

      // Update in editor
      const currentLang = PgExplorer.getCurrentFileLanguage();
      const isRust = currentLang?.name === "Rust";
      const isPython = currentLang?.name === "Python";
      if (!isRust && !isPython) return;

      const editorContent = editor.getValue();
      const indices = getProgramIdStartAndEndIndex(editorContent, isPython);
      if (!indices) return;
      const [quoteStartIndex, quoteEndIndex] = indices;

      const model = editor.getModel();
      if (!model) return;

      const startPos = model.getPositionAt(quoteStartIndex + 1);
      const endPos = model.getPositionAt(quoteEndIndex);
      const range = monaco.Range.fromPositions(startPos, endPos);

      try {
        editor.executeEdits(null, [{ range, text: programPkStr }]);
      } catch (e: any) {
        console.log("Program ID update error:", e.message);
      }
    };

    const { dispose } = PgCommon.batchChanges(updateId, [
      PgCommand.build.onDidStart,
      PgProgramInfo.onDidChangePk,
    ]);

    return dispose;
  }, [editor]);
};
