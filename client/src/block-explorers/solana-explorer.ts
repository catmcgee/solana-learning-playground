import { PgBlockExplorer, PgConnection } from "../utils";

export const solanaExplorer = PgBlockExplorer.create({
  name: "Solana Explorer",
  url: "https://explorer.solana.com",
  getClusterParam: () => {
    switch (PgConnection.cluster) {
      case "testnet":
        return "?cluster=testnet";
      case "devnet":
        return "?cluster=devnet";
      case "localnet":
        return (
          "?cluster=custom&customUrl=" +
          encodeURIComponent(PgConnection.current.rpcEndpoint)
        );
      default:
        return "";
    }
  },
});
