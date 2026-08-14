import { useEffect, useState } from "react";
import { useTheme } from "styled-components";
import * as monaco from "monaco-editor";

import { useAsyncEffect } from "../../../hooks";
import { PgCommon, PgTheme } from "../../../utils";
import { initLanguages } from "./languages";

export const useMonacoTheme = () => {
  const [isThemeSet, setIsThemeSet] = useState(false);

  // Set default options
  useEffect(() => {
    // Compiler options
    const compilerOptions: monaco.languages.typescript.CompilerOptions = {
      lib: ["es2020"],
      target: monaco.languages.typescript.ScriptTarget.ES2017,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
    };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
      compilerOptions
    );
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
      compilerOptions
    );

    // Diagnostic options
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      diagnosticCodesToIgnore: [
        1375, // top level await
        2686, // UMD global because of module
      ],
    });
  }, []);

  const theme = useTheme();

  // Set theme
  useAsyncEffect(async () => {
    const editorStyles = theme.components.editor;

    if (theme.isDark) {
      /** Convert the colors to hex values when necessary */
      const toHexColors = (colors: Record<string, string>) => {
        for (const key in colors) {
          const color = colors[key];
          colors[key] =
            color === "transparent" || color === "inherit"
              ? "#00000000"
              : color;
        }

        return colors;
      };

      monaco.editor.defineTheme(theme.name, {
        base: "vs-dark",
        inherit: true,
        colors: toHexColors({
          /////////////////////////////// General //////////////////////////////
          foreground: editorStyles.default.color,
          errorForeground: theme.colors.state.error.color,
          descriptionForeground: theme.colors.default.textSecondary,
          focusBorder:
            theme.colors.default.primary + theme.default.transparency!.high,

          /////////////////////////////// Editor ///////////////////////////////
          "editor.foreground": editorStyles.default.color,
          "editor.background": editorStyles.default.bg,
          "editorCursor.foreground": editorStyles.default.cursorColor,
          "editor.lineHighlightBackground": editorStyles.default.activeLine.bg,
          "editor.lineHighlightBorder":
            editorStyles.default.activeLine.borderColor,
          "editor.selectionBackground": editorStyles.default.selection.bg,
          "editor.inactiveSelectionBackground":
            editorStyles.default.searchMatch.bg,
          "editorGutter.background": editorStyles.gutter.bg,
          "editorLineNumber.foreground": editorStyles.gutter.color,
          "editorError.foreground": theme.colors.state.error.color,
          "editorWarning.foreground": theme.colors.state.warning.color,

          ////////////////////////////// Dropdown //////////////////////////////
          "dropdown.background": editorStyles.tooltip.bg,
          "dropdown.foreground": editorStyles.tooltip.color,

          /////////////////////////////// Widget ///////////////////////////////
          "editorWidget.background": editorStyles.tooltip.bg,
          "editorHoverWidget.background": editorStyles.tooltip.bg,
          "editorHoverWidget.border": editorStyles.tooltip.borderColor,

          //////////////////////////////// List ////////////////////////////////
          "list.hoverBackground": theme.colors.state.hover.bg!,
          "list.activeSelectionBackground": editorStyles.tooltip.selectedBg,
          "list.activeSelectionForeground": editorStyles.tooltip.selectedColor,
          "list.inactiveSelectionBackground": editorStyles.tooltip.bg,
          "list.inactiveSelectionForeground": editorStyles.tooltip.color,
          "list.highlightForeground": theme.colors.state.info.color,

          //////////////////////////////// Input ///////////////////////////////
          "input.background": theme.components.input.bg!,
          "input.foreground": theme.components.input.color,
          "input.border": theme.components.input.borderColor,
          "inputOption.activeBorder":
            theme.colors.default.primary + theme.default.transparency.high,
          "input.placeholderForeground": theme.colors.default.textSecondary,
          "inputValidation.infoBackground": theme.colors.state.info.bg!,
          "inputValidation.infoBorder": theme.colors.state.info.color,
          "inputValidation.warningBackground": theme.colors.state.warning.bg!,
          "inputValidation.warningBorder": theme.colors.state.warning.color,
          "inputValidation.errorBackground": theme.colors.state.error.bg!,
          "inputValidation.errorBorder": theme.colors.state.error.color,

          /////////////////////////////// Minimap //////////////////////////////
          "minimap.background": editorStyles.minimap.bg,
          "minimap.selectionHighlight": editorStyles.minimap.selectionHighlight,

          ////////////////////////////// Peek view /////////////////////////////
          "peekView.border": editorStyles.peekView.borderColor,
          "peekViewTitle.background": editorStyles.peekView.title.bg,
          "peekViewTitleLabel.foreground":
            editorStyles.peekView.title.labelColor,
          "peekViewTitleDescription.foreground":
            editorStyles.peekView.title.descriptionColor,
          "peekViewEditor.background": editorStyles.peekView.editor.bg,
          "peekViewEditor.matchHighlightBackground":
            editorStyles.peekView.editor.matchHighlightBg,
          "peekViewEditorGutter.background":
            editorStyles.peekView.editor.gutterBg,
          "peekViewResult.background": editorStyles.peekView.result.bg,
          "peekViewResult.lineForeground":
            editorStyles.peekView.result.lineColor,
          "peekViewResult.fileForeground":
            editorStyles.peekView.result.fileColor,
          "peekViewResult.selectionBackground":
            editorStyles.peekView.result.selectionBg,
          "peekViewResult.selectionForeground":
            editorStyles.peekView.result.selectionColor,
          "peekViewResult.matchHighlightBackground":
            editorStyles.peekView.result.matchHighlightBg,

          ////////////////////////////// Inlay hint ////////////////////////////
          "editorInlayHint.background": editorStyles.inlayHint.bg,
          "editorInlayHint.foreground": editorStyles.inlayHint.color,
          "editorInlayHint.parameterBackground":
            editorStyles.inlayHint.parameterBg,
          "editorInlayHint.parameterForeground":
            editorStyles.inlayHint.parameterColor,
          "editorInlayHint.typeBackground": editorStyles.inlayHint.typeBg,
          "editorInlayHint.typeForeground": editorStyles.inlayHint.typeColor,
        }),
        rules: [],
      });
      monaco.editor.setTheme(theme.name);
    } else {
      monaco.editor.setTheme("vs");
    }

    // Initialize language grammars and configurations
    const { dispose } = await PgCommon.transition(() => {
      return initLanguages(PgTheme.convertToTextMateTheme(theme));
    });

    setIsThemeSet(true);

    return dispose;
  }, [theme]);

  return { isThemeSet, theme };
};
