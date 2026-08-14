import { useEffect } from "react";
import * as monaco from "monaco-editor";

import { PgExplorer, PgLanguage } from "../../../utils";

export const useMonacoWorkspace = (
  editor?: monaco.editor.IStandaloneCodeEditor
) => {
  // Set editor state
  useEffect(() => {
    if (!editor) return;
    let positionDataIntervalId: NodeJS.Timer;

    const switchFile = PgExplorer.onDidOpenFile((curFile) => {
      // Clear previous state
      if (positionDataIntervalId) clearInterval(positionDataIntervalId);

      if (!curFile) return;

      // FIXME: TS assumes the file is a script(with global scoping rules) if
      // there are no `import` or `export` statements. This results with problems
      // such as conflicting declarations and getting autocompletion for variables
      // that are not actually in scope.
      //
      // `moduleDetection` compiler option has been added in TypeScript 4.7
      // (https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#control-over-module-detection)
      // but it is not yet available in Monaco editor.
      //
      // In order to fix this issue, dispose all of the other JS/TS models if
      // the current file is a JS/TS file. Unfortunately, this causes flickering
      // when switching between JS/TS files because models are being disposed and
      // recreated each time instead of only the first time.
      // https://github.com/microsoft/monaco-editor/issues/1083
      if (PgLanguage.getIsPathJsLike(curFile.path)) {
        monaco.editor
          .getModels()
          .filter((model) => {
            return (
              // Only check client and tests dir otherwise `target/types` model
              // will also get disposed
              (model.uri.path.includes(PgExplorer.PATHS.CLIENT_DIRNAME) ||
                model.uri.path.includes(PgExplorer.PATHS.TESTS_DIRNAME)) &&
              PgLanguage.getIsPathJsLike(model.uri.path) &&
              model.uri.path !== curFile.path &&
              !model.getValue().includes("import")
            );
          })
          .forEach((model) => model.dispose());
      }

      // Check whether the model has already been created
      const model =
        monaco.editor
          .getModels()
          .find((model) => model.uri.path === curFile.path) ??
        monaco.editor.createModel(
          curFile.content!,
          undefined,
          monaco.Uri.parse(curFile.path)
        );
      editor.setModel(model);

      // Get position data
      const position = PgExplorer.getEditorPosition(curFile.path);

      // Scroll to the saved line
      editor.setScrollTop(
        position.topLineNumber
          ? editor.getTopForLineNumber(position.topLineNumber)
          : 0
      );

      // Set the cursor position
      const startPosition = model.getPositionAt(position.cursor.from);
      const endPosition = model.getPositionAt(position.cursor.to);
      editor.setSelection({
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column,
      });

      // Focus the editor
      editor.focus();

      // Save position data
      positionDataIntervalId = setInterval(() => {
        const selection = editor.getSelection();
        if (!selection) return;

        PgExplorer.saveEditorPosition(curFile.path, {
          cursor: {
            from: model.getOffsetAt(selection.getStartPosition()),
            to: model.getOffsetAt(selection.getEndPosition()),
          },
          topLineNumber: editor.getVisibleRanges()[0].startLineNumber,
        });
      }, 1000);
    });

    const disposeModelsFromPath = (path: string) => {
      // Dispose self and all child models
      monaco.editor
        .getModels()
        .filter((model) => model.uri.path.startsWith(path))
        .forEach((model) => model.dispose());
    };
    const renameItem = PgExplorer.onDidRenameItem(disposeModelsFromPath);
    const deleteItem = PgExplorer.onDidDeleteItem(disposeModelsFromPath);
    const changeFileContent = PgExplorer.onDidChangeFileContent(
      ({ path, content }) => {
        const model = monaco.editor
          .getModels()
          .find((candidate) => candidate.uri.path === path);
        if (model && model.getValue() !== content) {
          model.setValue(content);
        }
      }
    );

    return () => {
      clearInterval(positionDataIntervalId);
      switchFile.dispose();
      renameItem.dispose();
      deleteItem.dispose();
      changeFileContent.dispose();
      monaco.editor.getModels().forEach((model) => model.dispose());
    };
  }, [editor]);

  // Auto save
  useEffect(() => {
    if (!editor) return;

    let timeoutId: NodeJS.Timeout;

    const { dispose } = editor.onDidChangeModelContent(() => {
      timeoutId && clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!PgExplorer.currentFilePath) return;

        const args: [string, string] = [
          PgExplorer.currentFilePath,
          editor.getValue(),
        ];

        // Save to state
        PgExplorer.saveFileToState(...args);

        // Saving to state is enough if it's a temporary project
        if (PgExplorer.isTemporary) return;

        // Save to `indexedDB`
        try {
          await PgExplorer.fs.writeFile(...args);
        } catch (e: any) {
          console.log(
            `Error saving file ${PgExplorer.currentFilePath}. ${e.message}`
          );
        }
      }, 500);
    });

    return () => {
      clearTimeout(timeoutId);
      dispose();
    };
  }, [editor]);
};
