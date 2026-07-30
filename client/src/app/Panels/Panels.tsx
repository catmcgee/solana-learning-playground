import styled from "styled-components";

import Bottom from "./Bottom";
import LearningShell from "../../learning/LearningShell";
import TutorialShell from "../../learning/TutorialShell";
import Main from "./Main";
import Side from "./Side";
import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { PgRouter, PgView } from "../../utils";
import { useRenderOnChange } from "../../hooks";

const Panels = () => {
  const path =
    useRenderOnChange(PgRouter.onDidChangePath) ?? PgRouter.location.pathname;
  const learning = path === "/";
  const tutorials = path === "/tutorials" || path.startsWith("/tutorials/");

  return (
    <Wrapper>
      {learning ? (
        <LearningShell />
      ) : tutorials ? (
        <TutorialShell />
      ) : (
        <>
          <TopWrapper>
            <Side />
            <Main />
          </TopWrapper>

          <Bottom />
        </>
      )}

      {!learning && !tutorials && <Wallet />}

      {/* A portal that is *above* the modal backdrop stacking context */}
      <PortalAbove id={PgView.ids.PORTAL_ABOVE} />

      <StyledModalBackdrop />

      {/* A portal that is *below* the modal backdrop stacking context */}
      <PortalBelow id={PgView.ids.PORTAL_BELOW}>
        <Toast />
      </PortalBelow>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const TopWrapper = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  overflow: hidden;
  width: 100%;
  flex: 1;
`;

const PortalAbove = styled.div`
  z-index: 4;
`;

const StyledModalBackdrop = styled(ModalBackdrop)`
  z-index: 3;
`;

const PortalBelow = styled.div`
  z-index: 2;
`;

export default Panels;
