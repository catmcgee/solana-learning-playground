import styled from "styled-components";

import Bottom from "./Bottom";
import Main from "./Main";
import Side from "./Side";
import Wallet from "../../components/Wallet";

const IdePanels = () => (
  <>
    <TopWrapper>
      <Side />
      <Main />
    </TopWrapper>
    <Bottom />
    <Wallet />
  </>
);

const TopWrapper = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  overflow: hidden;
  width: 100%;
  flex: 1;
`;

export default IdePanels;
