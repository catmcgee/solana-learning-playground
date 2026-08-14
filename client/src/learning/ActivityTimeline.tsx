import type {
  Dispatch,
  KeyboardEvent,
  PointerEvent,
  SetStateAction,
} from "react";

import type { LearningEvent } from "./types";
import {
  EventCopy,
  EventExplorerLink,
  EventGlyph,
  EventList,
  EventRow,
  NoteActions,
  Timeline,
  TimelineHeader,
  TimelineResizeHandle,
  TimelineTab,
  TimelineTabs,
  VerboseLog,
  WorkingSpinner,
} from "./LearningShell.styles";

export type TimelineView = "notes" | "verbose";

type ActivityTimelineProps = {
  canResetNetwork: boolean;
  chatting: boolean;
  copiedEventId?: string;
  copyDiagnostic: (event: LearningEvent) => void;
  events: LearningEvent[];
  explainEvent: (event: LearningEvent) => void;
  maxHeight: number;
  minHeight: number;
  networkBusy: boolean;
  resetNetwork: () => void;
  resizeTimelineWithKeyboard: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setTimelineView: Dispatch<SetStateAction<TimelineView>>;
  startTimelineResize: (event: PointerEvent<HTMLButtonElement>) => void;
  terminalLines: string[];
  timelineHeight: number;
  timelineView: TimelineView;
};

export const ActivityTimeline = ({
  canResetNetwork,
  chatting,
  copiedEventId,
  copyDiagnostic,
  events,
  explainEvent,
  maxHeight,
  minHeight,
  networkBusy,
  resetNetwork,
  resizeTimelineWithKeyboard,
  setTimelineView,
  startTimelineResize,
  terminalLines,
  timelineHeight,
  timelineView,
}: ActivityTimelineProps) => (
  <Timeline>
    <TimelineResizeHandle
      type="button"
      role="separator"
      aria-label="Resize Notes and Verbose output"
      aria-controls="activity-output"
      aria-orientation="horizontal"
      aria-valuemin={minHeight}
      aria-valuemax={maxHeight}
      aria-valuenow={Math.round(timelineHeight)}
      title="Drag to resize Notes and Verbose"
      onPointerDown={startTimelineResize}
      onKeyDown={resizeTimelineWithKeyboard}
    />
    <TimelineHeader>
      <TimelineTabs role="tablist" aria-label="Activity output">
        <TimelineTab
          type="button"
          role="tab"
          aria-selected={timelineView === "notes"}
          active={timelineView === "notes"}
          onClick={() => setTimelineView("notes")}
        >
          Notes
        </TimelineTab>
        <TimelineTab
          type="button"
          role="tab"
          aria-selected={timelineView === "verbose"}
          active={timelineView === "verbose"}
          onClick={() => setTimelineView("verbose")}
        >
          Verbose
        </TimelineTab>
      </TimelineTabs>
      <button
        onClick={resetNetwork}
        disabled={!canResetNetwork || networkBusy}
        title={
          canResetNetwork
            ? "Reset the configured network"
            : "The shared default Surfpool cannot be reset from the app"
        }
      >
        Reset network
      </button>
    </TimelineHeader>
    {timelineView === "notes" ? (
      <EventList id="activity-output">
        {events.slice(0, 4).map((event) => (
          <EventRow key={event.id}>
            {event.status === "working" ? (
              <WorkingSpinner aria-label="In progress" />
            ) : (
              <EventGlyph
                status={event.status}
                aria-label={`${event.status} note`}
              >
                {eventGlyph(event.kind)}
              </EventGlyph>
            )}
            <EventCopy>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
              <NoteActions>
                {event.status === "error" &&
                  event.kind === "build" &&
                  event.diagnostic && (
                    <button type="button" onClick={() => copyDiagnostic(event)}>
                      {copiedEventId === event.id ? "Copied" : "Copy error"}
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => explainEvent(event)}
                  disabled={chatting}
                  title={
                    chatting
                      ? "Program Pal is finishing another explanation"
                      : `Ask Program Pal to explain “${event.title}”`
                  }
                >
                  Explain
                </button>
              </NoteActions>
              {event.explorerUrl && (
                <EventExplorerLink
                  href={event.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View in Explorer ↗
                </EventExplorerLink>
              )}
            </EventCopy>
            <time>
              {new Date(event.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </EventRow>
        ))}
      </EventList>
    ) : (
      <VerboseLog id="activity-output" aria-live="polite">
        {terminalLines.length
          ? terminalLines.join("\n")
          : "Terminal output will appear here when you build, deploy, or interact."}
      </VerboseLog>
    )}
  </Timeline>
);

const eventGlyph = (kind: LearningEvent["kind"]) =>
  ({
    network: "≋",
    build: "⌘",
    deploy: "↗",
    instruction: "◎",
    idea: "✦",
  }[kind]);
