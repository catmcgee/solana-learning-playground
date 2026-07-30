import styled from "styled-components";

import { Editor } from "../Editor";
import { Tabs } from "../Tabs";

interface EditorWithTabsProps {
  onWalletClick?: () => void;
}

const EditorWithTabs = ({ onWalletClick }: EditorWithTabsProps) => (
  <Wrapper>
    <Tabs onWalletClick={onWalletClick} />
    <Editor />
  </Wrapper>
);

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

export default EditorWithTabs;
