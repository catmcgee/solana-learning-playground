import { lazy, Suspense } from "react";
import styled from "styled-components";

import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import { PgRouter, PgView } from "../../utils";
import { useRenderOnChange } from "../../hooks";

const IdePanels = lazy(
  () => import(/* webpackChunkName: "ide-panels" */ "./IdePanels")
);
const LearningShell = lazy(
  () =>
    import(
      /* webpackChunkName: "learning-shell" */ "../../learning/LearningShell"
    )
);
const TutorialShell = lazy(
  () =>
    import(
      /* webpackChunkName: "tutorial-shell" */ "../../learning/TutorialShell"
    )
);

const Panels = () => {
  const path =
    useRenderOnChange(PgRouter.onDidChangePath) ?? PgRouter.location.pathname;
  const learning = path === "/";
  const tutorials = path === "/tutorials" || path.startsWith("/tutorials/");

  return (
    <Wrapper>
      <Suspense
        fallback={<PanelLoading role="status">Loading workspace…</PanelLoading>}
      >
        {learning ? (
          <LearningShell />
        ) : tutorials ? (
          <TutorialShell />
        ) : (
          <IdePanels />
        )}
      </Suspense>

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

const PanelLoading = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.default.textSecondary};
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
