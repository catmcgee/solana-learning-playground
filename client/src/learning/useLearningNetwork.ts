import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { SURFPOOL_RPC_URL } from "../constants";
import { PgCommon, PgSettings, PgWallet, PgWeb3 } from "../utils";
import { formatRpcLabel, normalizeRpcUrl } from "./format";
import type { LearningEvent } from "./types";
import type { ProgramStage } from "./workspace-state";

const CUSTOM_RPC_KEY = "solpg-learning-rpc-endpoint-v1";
const SURFPOOL_WALLET_KEY = "solpg-learning-surfpool-keypair";
const SURFPOOL_WALLET_NAME = "Surfpool wallet";

type AddEvent = (
  kind: LearningEvent["kind"],
  title: string,
  detail: string,
  status: LearningEvent["status"],
  diagnostic?: string,
  explorerUrl?: string,
  workspaceName?: string
) => void;

type UseLearningNetworkOptions = {
  addEvent: AddEvent;
  ready: boolean;
  setProgramStage: Dispatch<SetStateAction<ProgramStage>>;
};

export const useLearningNetwork = ({
  addEvent,
  ready,
  setProgramStage,
}: UseLearningNetworkOptions) => {
  const [networkBusy, setNetworkBusy] = useState(false);
  const [surfpoolConnected, setSurfpoolConnected] = useState(false);
  const [rpcEndpoint, setRpcEndpoint] = useState(
    () => localStorage.getItem(CUSTOM_RPC_KEY)?.trim() || SURFPOOL_RPC_URL
  );
  const [rpcDraft, setRpcDraft] = useState(rpcEndpoint);
  const [rpcSettingsOpen, setRpcSettingsOpen] = useState(false);
  const [rpcError, setRpcError] = useState("");
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const connectedRpcRef = useRef<string | null>(null);

  const connectRpc = useCallback(
    async (endpoint: string) => {
      if (surfpoolConnected && connectedRpcRef.current === endpoint) return;
      if (connectPromiseRef.current) return connectPromiseRef.current;

      const connect = (async () => {
        setNetworkBusy(true);
        const isDeployedSurfpool = endpoint === SURFPOOL_RPC_URL;
        addEvent(
          "network",
          isDeployedSurfpool ? "Connecting to Surfpool" : "Connecting to RPC",
          `Opening ${formatRpcLabel(endpoint)}.`,
          "working"
        );
        try {
          await assertHealthyRpc(endpoint);
          PgSettings.connection.endpoint = endpoint;
          const surfpoolWallet = ensureSurfpoolWallet();
          connectedRpcRef.current = endpoint;
          setSurfpoolConnected(true);
          addEvent(
            "network",
            isDeployedSurfpool
              ? "Connected to deployed Surfpool"
              : "Connected to custom RPC",
            `Using ${formatRpcLabel(endpoint)} with play wallet ${shortAddress(
              surfpoolWallet.publicKey.toBase58()
            )}.`,
            "success"
          );
        } catch (error) {
          connectedRpcRef.current = null;
          setSurfpoolConnected(false);
          addEvent(
            "network",
            "RPC needs attention",
            errorMessage(error),
            "error"
          );
          throw error;
        } finally {
          setNetworkBusy(false);
        }
      })();

      connectPromiseRef.current = connect;
      try {
        await connect;
      } finally {
        connectPromiseRef.current = null;
      }
    },
    [addEvent, surfpoolConnected]
  );

  const ensureSurfpool = useCallback(
    () => connectRpc(rpcEndpoint),
    [connectRpc, rpcEndpoint]
  );

  const saveRpcEndpoint = async (event: FormEvent) => {
    event.preventDefault();
    setRpcError("");
    try {
      const next = normalizeRpcUrl(rpcDraft);
      if (next === SURFPOOL_RPC_URL) localStorage.removeItem(CUSTOM_RPC_KEY);
      else localStorage.setItem(CUSTOM_RPC_KEY, next);
      connectedRpcRef.current = null;
      setSurfpoolConnected(false);
      setRpcEndpoint(next);
      setRpcDraft(next);
      await connectRpc(next);
      setRpcSettingsOpen(false);
    } catch (error) {
      setRpcError(errorMessage(error, "Could not connect to this RPC."));
    }
  };

  const useDeployedSurfpool = () => {
    setRpcDraft(SURFPOOL_RPC_URL);
    setRpcError("");
  };

  useEffect(() => {
    if (!ready || surfpoolConnected) return;
    ensureSurfpool().catch(() => {
      // The inline connection note already exposes the actionable error.
    });
  }, [ensureSurfpool, ready, surfpoolConnected]);

  const canResetNetwork =
    surfpoolConnected &&
    PgCommon.appendSlash(rpcEndpoint) !==
      PgCommon.appendSlash(SURFPOOL_RPC_URL);

  const resetNetwork = async () => {
    if (!canResetNetwork) return;
    setNetworkBusy(true);
    try {
      const response = await fetch(rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "surfnet_resetNetwork",
          params: [],
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(
          result.error?.message ?? "The deployed Surfpool could not be reset."
        );
      }
      setProgramStage((stage) => (stage === "deployed" ? "built" : stage));
      addEvent(
        "network",
        "Surfpool reset",
        "All accounts returned to the network's initial state. Your source files were not changed.",
        "success"
      );
    } catch (error) {
      addEvent("network", "Reset failed", errorMessage(error), "error");
    } finally {
      setNetworkBusy(false);
    }
  };

  return {
    canResetNetwork,
    ensureSurfpool,
    networkBusy,
    resetNetwork,
    rpcDraft,
    rpcEndpoint,
    rpcError,
    rpcSettingsOpen,
    saveRpcEndpoint,
    setRpcDraft,
    setRpcError,
    setRpcSettingsOpen,
    surfpoolConnected,
    useDeployedSurfpool,
  };
};

const assertHealthyRpc = async (endpoint: string) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
  });
  const health = await response.json();
  if (!response.ok || health.result !== "ok") {
    throw new Error("This RPC did not return a healthy Solana response.");
  }
};

export const shortAddress = (address: string) =>
  address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "pending";

const ensureSurfpoolWallet = () => {
  let keypair: InstanceType<typeof PgWeb3.Keypair>;
  const saved = localStorage.getItem(SURFPOOL_WALLET_KEY);
  if (saved) {
    keypair = PgWeb3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
  } else {
    keypair = PgWeb3.Keypair.generate();
    localStorage.setItem(
      SURFPOOL_WALLET_KEY,
      JSON.stringify(Array.from(keypair.secretKey))
    );
  }

  const index = PgWallet.accounts.findIndex((account) =>
    PgWallet.create(account).publicKey.equals(keypair.publicKey)
  );
  if (index === -1) {
    PgWallet.add({ name: SURFPOOL_WALLET_NAME, keypair });
  } else {
    PgWallet.switch(index);
    if (PgWallet.accounts[index].name !== SURFPOOL_WALLET_NAME) {
      PgWallet.rename(SURFPOOL_WALLET_NAME, index);
    }
  }
  PgWallet.state = "pg";
  return keypair;
};

const errorMessage = (error: unknown, fallback = "Unexpected network error") =>
  error instanceof Error ? error.message : fallback;
