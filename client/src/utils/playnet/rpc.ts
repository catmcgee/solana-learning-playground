import type { PgRpc, TransactionStatus } from "@solana-playground/playnet";

import { Endpoint } from "../../constants";
import { PgCommon } from "../common";
import { PgConnection } from "../connection";
import { PgSettings } from "../settings";
import { PgWeb3 } from "../web3";
import { getPlaynetResponse } from "./rpc-response";
import type { OverridableConnection, RpcRequest } from "./types";
import { PgPlaynetUtils } from "./utils";

export class PgPlaynetRpc {
  /** Get whether the given URL belongs to Playnet. */
  static isUrlPlaynet(url: string = PgSettings.connection.endpoint) {
    return url.startsWith(Endpoint.PLAYNET);
  }

  /**
   * Create a Playnet-compatible connection instance, or restore the default
   * fetch implementation when no RPC is provided.
   */
  static overrideConnection(rpc?: PgRpc) {
    const newFetch = this._overrideFetch(rpc);
    if (!rpc) return null;

    const connection: OverridableConnection = PgConnection.create({
      fetch: newFetch,
    });

    // @ts-ignore The override intentionally accepts both web3.js strategies.
    connection.confirmTransaction = async (
      ...params: Parameters<PgWeb3.Connection["confirmTransaction"]>
    ) => {
      const signature =
        typeof params[0] === "string"
          ? params[0]
          : (
              params[0] as PgWeb3.BlockheightBasedTransactionConfirmationStrategy
            ).signature;
      const status: TransactionStatus | undefined = rpc
        .getSignatureStatuses([signature])
        .statuses()[0];
      if (!status) throw new Error("Transaction not found.");

      return {
        value: { err: status.error() ?? null },
        context: { slot: PgCommon.bigintToInt(rpc.getSlot()) },
      };
    };

    // @ts-ignore Playnet implements account subscriptions through polling.
    connection.onAccountChange = (
      ...params: Parameters<PgWeb3.Connection["onAccountChange"]>
    ) => {
      const address = params[0].toBase58();
      const callback = params[1];
      let currentAccountInfo = PgPlaynetUtils.convertAccountInfo(
        rpc.getAccountInfo(address)
      );

      return PgCommon.setIntervalOnFocus(() => {
        const accountInfo = PgPlaynetUtils.convertAccountInfo(
          rpc.getAccountInfo(address)
        );
        if (PgCommon.isEqual(currentAccountInfo, accountInfo)) return;

        callback(accountInfo, { slot: PgCommon.bigintToInt(rpc.getSlot()) });
        currentAccountInfo = accountInfo;
      }, 3000);
    };

    connection.removeAccountChangeListener = async (
      ...params: Parameters<PgWeb3.Connection["removeAccountChangeListener"]>
    ) => clearInterval(params[0]);

    // `Connection` is not ready until this property is set.
    connection.overridden = true;
    return connection;
  }

  private static _overrideFetch(rpc?: PgRpc) {
    const newFetch = rpc ? this._getNewFetch(rpc) : defaultFetch;
    // The WASM client uses the global fetch implementation.
    window.fetch = newFetch;
    return newFetch;
  }

  /** Rebind requests to the Playnet endpoint to the in-browser RPC. */
  private static _getNewFetch(rpc: PgRpc) {
    return async (...args: Parameters<Window["fetch"]>) => {
      const request = await this._parsePlaynetRequest(args);
      return request ? getPlaynetResponse(rpc, request) : defaultFetch(...args);
    };
  }

  private static async _parsePlaynetRequest(
    args: Parameters<Window["fetch"]>
  ): Promise<RpcRequest | null> {
    const [input, init] = args;
    if (typeof input === "string") {
      if (!this.isUrlPlaynet(input) || !init?.body) return null;
      return JSON.parse(init.body.toString());
    }

    const request = input as Request;
    return this.isUrlPlaynet(request.url) ? request.json() : null;
  }
}

const defaultFetch = fetch;
