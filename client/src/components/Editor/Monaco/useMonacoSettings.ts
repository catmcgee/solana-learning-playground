import { useEffect } from "react";
import * as monaco from "monaco-editor";

import { useAsyncEffect, useRenderOnChange } from "../../../hooks";
import { PgSettings } from "../../../utils";

export const useMonacoSettings = (
  editor?: monaco.editor.IStandaloneCodeEditor
) => {
  // Set tab size
  useEffect(() => {
    if (!editor) return;

    const { dispose } = editor.onDidChangeModel((ev) => {
      if (!ev.newModelUrl) return;

      const model = monaco.editor.getModel(ev.newModelUrl);
      if (!model) return;

      switch (model.getLanguageId()) {
        case "javascript":
        case "typescript":
        case "json":
          model.updateOptions({ tabSize: 2 });
      }
    });

    return dispose;
  }, [editor]);

  // Set keybinding
  const keybinding = useRenderOnChange(PgSettings.onDidChangeEditorKeybinding);
  useAsyncEffect(async () => {
    if (!editor) return;

    switch (keybinding) {
      case "default":
        return;
      case "vim": {
        const { initVimMode } = await import("monaco-vim");

        // NOTE: It is required to store the result as a variable to avoid the
        // `Cannot read properties of undefined (reading 'dispatch')` error on
        // disposal.
        //
        // TODO: Show status bar
        const vimMode = initVimMode(editor);

        // Also required to create a callback; cannot `return vimMode.dispose`
        return () => vimMode.dispose();
      }
      default:
        throw new Error(`Unhandled keybinding: ${keybinding}`);
    }
  }, [editor, keybinding]);

  // Set other settings
  useEffect(() => {
    if (!editor) return;

    const disposables = [
      PgSettings.onDidChangeEditorWordWrap((ww) => {
        editor.updateOptions({ wordWrap: ww ? "on" : "off" });
      }),
    ];
    return () => disposables.forEach(({ dispose }) => dispose());
  }, [editor]);
};
