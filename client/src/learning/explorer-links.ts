import { SURFPOOL_RPC_URL } from "../constants";
import { PgSettings } from "../utils";

const explorerRpc = () => PgSettings.connection.endpoint || SURFPOOL_RPC_URL;

export const getExplorerTransactionUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(
    explorerRpc()
  )}`;

export const getExplorerAddressUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${encodeURIComponent(
    explorerRpc()
  )}`;
