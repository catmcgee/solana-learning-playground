import type { Dispatch, FormEvent, SetStateAction } from "react";

import { formatRpcLabel } from "./format";
import {
  Brand,
  BrandCopy,
  BrandMark,
  ConnectedStatus,
  Header,
  HeaderActions,
  Kicker,
  NetworkControl,
  PrimaryButton,
  RpcPopover,
  RpcSettingsButton,
  ThemeToggle,
} from "./LearningShell.styles";

type ThemeMode = "light" | "dark";

type LearningHeaderProps = {
  activeExplorerUrl: string | null;
  activeRpcUrl: string | null;
  ensureSurfpool: () => void;
  networkBusy: boolean;
  rpcDraft: string;
  rpcEndpoint: string;
  rpcError: string;
  rpcSettingsOpen: boolean;
  saveRpcEndpoint: (event: FormEvent) => void;
  setRpcDraft: Dispatch<SetStateAction<string>>;
  setRpcError: Dispatch<SetStateAction<string>>;
  setRpcSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setThemeMode: Dispatch<SetStateAction<ThemeMode>>;
  themeMode: ThemeMode;
  useDeployedSurfpool: () => void;
};

export const LearningHeader = ({
  activeExplorerUrl,
  activeRpcUrl,
  ensureSurfpool,
  networkBusy,
  rpcDraft,
  rpcEndpoint,
  rpcError,
  rpcSettingsOpen,
  saveRpcEndpoint,
  setRpcDraft,
  setRpcError,
  setRpcSettingsOpen,
  setThemeMode,
  themeMode,
  useDeployedSurfpool,
}: LearningHeaderProps) => (
  <Header>
    <Brand>
      <BrandMark>
        <span />
        <span />
        <span />
      </BrandMark>
      <BrandCopy>
        <strong>Solana Playground</strong>
      </BrandCopy>
    </Brand>

    <HeaderActions>
      <NetworkControl>
        {activeRpcUrl ? (
          <ConnectedStatus>
            <span>Connected to</span>
            <a
              href={activeExplorerUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              title="Open the connected RPC in Solana Explorer"
            >
              {formatRpcLabel(activeRpcUrl)} ↗
            </a>
          </ConnectedStatus>
        ) : (
          <PrimaryButton onClick={ensureSurfpool} disabled={networkBusy}>
            {networkBusy ? "Connecting…" : "Connect RPC"}
          </PrimaryButton>
        )}
        <RpcSettingsButton
          type="button"
          onClick={() => {
            setRpcDraft(rpcEndpoint);
            setRpcError("");
            setRpcSettingsOpen((current) => !current);
          }}
          aria-expanded={rpcSettingsOpen}
          title="Choose a Solana RPC endpoint"
        >
          RPC
        </RpcSettingsButton>
        {rpcSettingsOpen && (
          <RpcPopover onSubmit={saveRpcEndpoint}>
            <div>
              <Kicker>Network</Kicker>
              <button
                type="button"
                onClick={() => setRpcSettingsOpen(false)}
                aria-label="Close RPC settings"
              >
                ×
              </button>
            </div>
            <strong>Use your own RPC</strong>
            <p>
              Enter an HTTP or HTTPS Solana endpoint. It stays in this browser.
            </p>
            <label>
              <span>RPC URL</span>
              <input
                type="url"
                value={rpcDraft}
                onChange={(event) => setRpcDraft(event.target.value)}
                placeholder="https://your-rpc.example"
                spellCheck={false}
                required
              />
            </label>
            {rpcError && <small role="alert">{rpcError}</small>}
            <footer>
              <button type="button" onClick={useDeployedSurfpool}>
                Use Surfpool
              </button>
              <button type="submit" disabled={networkBusy}>
                {networkBusy ? "Connecting…" : "Save & connect"}
              </button>
            </footer>
          </RpcPopover>
        )}
      </NetworkControl>
      <ThemeToggle
        type="button"
        onClick={() =>
          setThemeMode((current) => (current === "dark" ? "light" : "dark"))
        }
        aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
      >
        <span aria-hidden="true">{themeMode === "dark" ? "☀" : "☾"}</span>
      </ThemeToggle>
    </HeaderActions>
  </Header>
);
