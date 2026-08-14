import type { LearningExample } from "./examples";
import {
  DoItButton,
  Experiment,
  ExperimentDismissButton,
  ExperimentIcon,
  Kicker,
} from "./LearningShell.styles";

interface LearningExperimentProps {
  askTutor: (prompt: string) => Promise<unknown>;
  customProgram: string | null;
  experiment: LearningExample["experiment"];
  onDismiss: () => void;
}

export const LearningExperiment = ({
  askTutor,
  customProgram,
  experiment,
  onDismiss,
}: LearningExperimentProps) => (
  <Experiment>
    <ExperimentIcon>✦</ExperimentIcon>
    <div>
      <Kicker>Next hands-on experiment</Kicker>
      <strong>
        {customProgram
          ? "Turn your idea into the first instruction"
          : experiment.title}
      </strong>
      <p>
        {customProgram
          ? "Describe the smallest useful action. The tutor will propose the code and explain the accounts it needs."
          : experiment.description}
      </p>
    </div>
    <DoItButton
      className="experiment-action"
      onClick={() => {
        onDismiss();
        void askTutor(
          customProgram
            ? "Help me choose and implement the smallest useful first instruction for my new program."
            : experiment.prompt
        );
      }}
    >
      Do it <span>→</span>
    </DoItButton>
    <ExperimentDismissButton
      className="experiment-dismiss"
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss this experiment"
      title="Dismiss this experiment"
    >
      ×
    </ExperimentDismissButton>
  </Experiment>
);
