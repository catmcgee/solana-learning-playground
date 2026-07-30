import {
  PgCommon,
  PgConnection,
  PgExplorer,
  PgProgramInfo,
  PgSettings,
  PgWallet,
} from "../utils";
import { SURFPOOL_RPC_URL } from "../constants";
import type { LearningSession, TutorToolCall } from "./types";

const SESSION_KEY = "solpg-learning-session";

const requestUrl = (path: string) =>
  PgCommon.joinPaths(PgSettings.server.endpoint, path);

export const getOrCreateLearningSession =
  async (): Promise<LearningSession> => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      return { token: saved, aiDailyLimit: 100, surfpoolLimit: 2 };
    }

    const response = await fetch(requestUrl("/learning/session"), {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await response.text());
    const session = (await response.json()) as LearningSession;
    localStorage.setItem(SESSION_KEY, session.token);
    return session;
  };

const learningHeaders = async () => {
  const { token } = await getOrCreateLearningSession();
  return {
    "Content-Type": "application/json",
    "x-solpg-session": token,
  };
};

const learningFetch = async (
  path: string,
  init: RequestInit,
  canRetry = true
): Promise<Response> => {
  const response = await fetch(requestUrl(path), {
    ...init,
    headers: {
      ...(await learningHeaders()),
      ...init.headers,
    },
  });
  if (response.status !== 401 || !canRetry) return response;

  localStorage.removeItem(SESSION_KEY);
  return learningFetch(path, init, false);
};

type StreamTutorParams = {
  message: string;
  previousResponseId?: string;
  lessonId: string;
  toolOutputs?: Array<{ callId: string; output: unknown }>;
  onText: (delta: string) => void;
  onToolCall: (tool: TutorToolCall) => void;
  onResponseId: (id: string) => void;
};

export const streamTutor = async ({
  message,
  previousResponseId,
  lessonId,
  toolOutputs,
  onText,
  onToolCall,
  onResponseId,
}: StreamTutorParams) => {
  const workspace = PgExplorer.getAllFiles().flatMap(([path, content]) => {
    const relativePath = PgExplorer.getRelativePath(path);
    const isLearnerFile =
      relativePath.startsWith("src/") || relativePath.startsWith("tests/");
    return typeof content === "string" && isLearnerFile
      ? [{ path: relativePath, content }]
      : [];
  });
  const response = await learningFetch("/ai/responses", {
    method: "POST",
    body: JSON.stringify({
      message,
      previousResponseId,
      lessonId,
      currentFile: PgExplorer.currentFilePath
        ? PgExplorer.getRelativePath(PgExplorer.currentFilePath)
        : null,
      selection: null,
      workspace,
      runtime: {
        network:
          PgConnection.current.rpcEndpoint.includes("/surfpool/sessions/") ||
          PgCommon.appendSlash(PgConnection.current.rpcEndpoint) ===
            PgCommon.appendSlash(SURFPOOL_RPC_URL)
            ? "isolated Surfpool"
            : "not connected to managed Surfpool",
        walletAddress: PgWallet.current?.publicKey.toBase58() ?? null,
        walletBalanceSol: PgWallet.balance,
        programId: PgProgramInfo.pk?.toBase58() ?? null,
        lastBuildFailed: PgProgramInfo.lastBuildFailed,
        instructions:
          PgProgramInfo.idl?.instructions.map(
            (instruction) => instruction.name
          ) ?? [],
      },
      toolOutputs,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  if (!response.body) throw new Error("Tutor stream was empty");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let eventData = "";
  let createdResponseId: string | undefined;

  const handleEvent = () => {
    if (!eventData || eventData === "[DONE]") return;
    const event = JSON.parse(eventData);
    switch (event.type) {
      case "response.created":
        if (event.response?.id) {
          createdResponseId = event.response.id;
          onResponseId(event.response.id);
        }
        break;
      case "response.output_text.delta":
        onText(event.delta ?? "");
        break;
      case "response.output_item.done": {
        const item = event.item;
        if (item?.type !== "function_call") break;
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(item.arguments ?? "{}");
        } catch {
          args = {};
        }
        onToolCall({
          callId: item.call_id,
          name: item.name,
          arguments: args,
        });
        break;
      }
      case "error":
        throw new Error(getTutorErrorMessage(event.error));
      case "response.failed":
        throw new Error(getTutorErrorMessage(event.response?.error));
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data:")) {
        eventData += line.slice(5).trim();
      } else if (!line.trim()) {
        handleEvent();
        eventData = "";
      }
    }
    if (done) break;
  }
  handleEvent();
  return createdResponseId;
};

const getTutorErrorMessage = (
  error?: { code?: string; message?: string } | null
) => {
  if (error?.code === "insufficient_quota") {
    return "Program Pal is out of OpenAI credits. Add billing to the configured OpenAI project or replace the server API key, then try again.";
  }
  return error?.message || "Program Pal could not finish that response.";
};
