import {
  LearningWalletAddress,
  LearningWalletBalance,
  LearningWalletHeader,
  LearningWalletNote,
  LearningWalletPanel,
} from "./LearningShell.styles";

type LearningWalletProps = {
  activeRpcUrl: string | null;
  address: string;
  close: () => void;
  copyAddress: () => void;
  copied: boolean;
  rpcEndpoint: string;
  walletBalance: number | null | undefined;
};

export const LearningWallet = ({
  activeRpcUrl,
  address,
  close,
  copyAddress,
  copied,
  rpcEndpoint,
  walletBalance,
}: LearningWalletProps) => (
  <LearningWalletPanel aria-label="Wallet">
    <LearningWalletHeader>
      <h3>Wallet</h3>
      <button
        type="button"
        onClick={close}
        aria-label="Close wallet"
        title="Close wallet"
      >
        ×
      </button>
    </LearningWalletHeader>

    <LearningWalletBalance>
      <span>Available balance</span>
      <strong>
        {walletBalance === null || walletBalance === undefined
          ? "—"
          : walletBalance === 0
          ? "0"
          : walletBalance.toFixed(3)}{" "}
        SOL
      </strong>
      <small>Balance on the connected RPC network</small>
    </LearningWalletBalance>

    <LearningWalletAddress>
      <span>Public address</span>
      <code>{address}</code>
      <div>
        <button type="button" onClick={copyAddress}>
          {copied ? "Copied" : "Copy address"}
        </button>
        <a
          href={`https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${encodeURIComponent(
            activeRpcUrl ?? rpcEndpoint
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in Explorer ↗
        </a>
      </div>
    </LearningWalletAddress>

    <LearningWalletNote>
      This disposable play wallet is stored only in this browser and signs
      transactions for the connected RPC. It is not your real Solana wallet.
    </LearningWalletNote>
  </LearningWalletPanel>
);
