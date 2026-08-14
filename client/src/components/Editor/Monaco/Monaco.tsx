import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as monaco from "monaco-editor";

import { useMonacoTheme } from "./useMonacoTheme";
import { useMonacoFormatting } from "./useMonacoFormatting";
import { useMonacoSettings } from "./useMonacoSettings";
import { useMonacoWorkspace } from "./useMonacoWorkspace";
import { useMonacoExtensions } from "./useMonacoExtensions";
import { SpinnerWithBg } from "../../Loading";
import { PgEditor } from "../../../utils";

const Monaco = () => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const { isThemeSet, theme } = useMonacoTheme();

  const monacoRef = useRef<HTMLDivElement>(null);
  useMonacoFormatting(editor);
  useMonacoSettings(editor);
  useMonacoWorkspace(editor);
  useMonacoExtensions(editor);

  // Create editor
  useEffect(() => {
    if (editor || !isThemeSet || !monacoRef.current) return;

    setEditor(
      monaco.editor.create(monacoRef.current, {
        automaticLayout: true,
        fontLigatures: true,
        bracketPairColorization: { enabled: false },
        guides: {
          bracketPairs: false,
          bracketPairsHorizontal: false,
          highlightActiveBracketPair: false,
          highlightActiveIndentation: false,
          indentation: false,
        },
      })
    );
  }, [editor, isThemeSet]);

  // Dispose editor on unmount
  useEffect(() => {
    if (editor) return () => editor.dispose();
  }, [editor]);

  // Set font
  useEffect(() => {
    if (!editor) return;

    editor.updateOptions({
      fontFamily: theme.components.editor.default.fontFamily,
    });
  }, [editor, theme]);

  // Editor custom events
  useEffect(() => {
    if (!editor) return;

    const handleFocus = () => {
      if (!editor.hasTextFocus()) editor.focus();
    };

    document.addEventListener(PgEditor.events.FOCUS, handleFocus);
    return () => {
      document.removeEventListener(PgEditor.events.FOCUS, handleFocus);
    };
  }, [editor]);

  return (
    <SpinnerWithBg loading={!isThemeSet} size="2rem">
      <Wrapper ref={monacoRef} />
    </SpinnerWithBg>
  );
};

const Wrapper = styled.div`
  width: 100%;
  height: 100%;

  /** Inlay hints */
  & span[class^="dyn-rule"],
  span[class*=" dyn-rule"] {
    font-size: 12px;
  }
`;

export default Monaco;
