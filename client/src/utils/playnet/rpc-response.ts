import type { PgRpc, TransactionStatus } from "@solana-playground/playnet";

import { Endpoint } from "../../constants";
import { PgCodec } from "../codec";
import { PgCommon } from "../common";
import { PgWeb3 } from "../web3";
import { PgSerde } from "./serde";
import type { RpcRequest, RpcResponse, RpcResponseWithContext } from "./types";

type RpcContext = { apiVersion: string; slot: number };

export const getPlaynetResponse = (rpc: PgRpc, request: RpcRequest) => {
  const slot = PgCommon.bigintToInt(rpc.getSlot());
  const context = { apiVersion: "1.15.0", slot };

  switch (request.method) {
    case "getAccountInfo":
      return getAccountInfoResponse(rpc, request, context);
    case "getBalance": {
      const [address] = request.params;
      const account = rpc.getAccountInfo(address);
      return createRpcResponse<"getBalance">(request, context, {
        value: PgCommon.bigintToInt(account.lamports),
      });
    }
    case "getBlockHeight":
      return createRpcResponse<"getBlockHeight">(request, context, {
        result: PgCommon.bigintToInt(rpc.getBlockHeight()),
      });
    case "getFeeForMessage": {
      const [message] = request.params;
      const fee = PgCommon.bigintToInt(
        rpc.getFeeForMessage(PgSerde.serializeMsg(message))
      );
      return createRpcResponse<"getFeeForMessage">(request, context, {
        result:
          fee === undefined ? undefined : { context: { slot }, value: fee },
      });
    }
    case "getGenesisHash":
      return createRpcResponse<"getGenesisHash">(request, context, {
        result: rpc.getGenesisHash(),
      });
    case "getLatestBlockhash": {
      const blockhash = rpc.getLatestBlockhash();
      return createRpcResponse<"getLatestBlockhash">(request, context, {
        value: {
          blockhash: blockhash.blockhash(),
          lastValidBlockHeight: PgCommon.bigintToInt(
            blockhash.lastValidBlockHeight()
          ),
        },
      });
    }
    case "getMinimumBalanceForRentExemption": {
      const [dataLength] = request.params;
      return createRpcResponse<"getMinimumBalanceForRentExemption">(
        request,
        context,
        {
          result: PgCommon.bigintToInt(
            rpc.getMinimumBalanceForRentExemption(dataLength)
          ),
        }
      );
    }
    case "getRecentBlockhash":
      return createRpcResponse<"getRecentBlockhash">(request, context, {
        value: {
          blockhash: rpc.getLatestBlockhash().blockhash(),
          feeCalculator: { lamportsPerSignature: 5000 },
        },
      });
    // TODO: Support priority fees instead of returning a dummy value.
    case "getRecentPrioritizationFees":
      return createRpcResponse<"getRecentPrioritizationFees">(
        request,
        context,
        { result: [{ prioritizationFee: 0, slot }] }
      );
    case "getSignatureStatuses":
      return getSignatureStatusesResponse(rpc, request, context);
    case "getSlot":
      return createRpcResponse<"getSlot">(request, context, { result: slot });
    case "getTransaction":
      return getTransactionResponse(rpc, request, context);
    case "requestAirdrop": {
      const [address, lamports] = request.params;
      const result = rpc.requestAirdrop(address, BigInt(lamports));
      handleError(result);
      return createRpcResponse<"requestAirdrop">(request, context, {
        result: result.txHash(),
      });
    }
    case "sendTransaction": {
      const [transaction] = request.params;
      const result = rpc.sendTransaction(PgSerde.serializeTx(transaction));
      handleError(result);
      return createRpcResponse<"sendTransaction">(request, context, {
        result: result.txHash(),
      });
    }
    case "simulateTransaction":
      return getSimulationResponse(rpc, request, context);
    default:
      throw new Error(`Method: '${request.method}' is not yet implemented.`);
  }
};

const getAccountInfoResponse = (
  rpc: PgRpc,
  request: RpcRequest,
  context: RpcContext
) => {
  const [address] = request.params;
  const account = rpc.getAccountInfo(address);
  const lamports = PgCommon.bigintToInt(account.lamports);
  const encoding = "base64";

  return createRpcResponse<"getAccountInfo">(request, context, {
    // @ts-ignore The WASM account shape is compatible after serialization.
    value:
      lamports === 0
        ? null
        : {
            data: [PgCodec.encodeBinary(account.data, encoding), encoding],
            executable: account.executable,
            lamports,
            owner: new PgWeb3.PublicKey(account.owner.toBytes()),
            rentEpoch: PgCommon.bigintToInt(account.rentEpoch),
          },
  });
};

const getSignatureStatusesResponse = (
  rpc: PgRpc,
  request: RpcRequest,
  context: RpcContext
) => {
  const [signatures] = request.params;
  const statuses: (TransactionStatus | undefined)[] = rpc
    .getSignatureStatuses(signatures)
    .statuses();

  return createRpcResponse<"getSignatureStatuses">(request, context, {
    result: {
      context,
      value: statuses.map((status) =>
        status
          ? {
              confirmationStatus: getConfirmationStatus(status),
              confirmations: status.confirmations!,
              err: status.error() ?? null,
              slot: PgCommon.bigintToInt(status.slot),
            }
          : null
      ),
    },
  });
};

const getConfirmationStatus = (
  status: TransactionStatus
): PgWeb3.TransactionConfirmationStatus => {
  switch (status.confirmationStatus) {
    case 0:
      return "processed";
    case 1:
      return "confirmed";
    default:
      return "finalized";
  }
};

const getTransactionResponse = (
  rpc: PgRpc,
  request: RpcRequest,
  context: RpcContext
) => {
  const [signature, options] = request.params;
  const result = rpc.getTransaction(signature);
  const meta = result.meta();
  const transaction = convertTransaction(result.transaction(), options);

  return createRpcResponse<"getTransaction">(request, context, {
    // @ts-ignore The WASM response matches the RPC response after conversion.
    result: result.exists()
      ? {
          slot: context.slot,
          transaction,
          meta: {
            fee: PgCommon.bigintToInt(meta.fee()),
            innerInstructions: meta.innerInstructions(),
            preBalances: convertBalances(meta.preBalances()),
            postBalances: convertBalances(meta.postBalances()),
            logMessages: meta.logs(),
            preTokenBalances: meta.preTokenBalances(),
            postTokenBalances: meta.postTokenBalances(),
            err: meta.err() ?? null,
            loadedAddresses: meta.loadedAddresses(),
            computeUnitsConsumed: PgCommon.bigintToInt(
              meta.computeUnitsConsumed()
            ),
            rewards: [],
            status: meta.err() ? { Err: meta.err() } : { Ok: null },
          },
          blockTime: PgCommon.bigintToInt(result.blockTime()),
          version: result.version() ?? "legacy",
        }
      : null,
  });
};

const convertTransaction = (transaction: string, options: any) => {
  if (options?.encoding) return [transaction, "base64"] as [string, string];

  const versioned = PgWeb3.VersionedTransaction.deserialize(
    PgCodec.decodeBinary(transaction, "base64")
  );
  return {
    message: versioned.message,
    signatures: versioned.signatures.map((signature) =>
      PgCodec.encodeBinary(signature, "base58")
    ),
  };
};

const convertBalances = (balances: BigUint64Array) =>
  Array.from(balances, PgCommon.bigintToInt);

const getSimulationResponse = (
  rpc: PgRpc,
  request: RpcRequest,
  context: RpcContext
) => {
  const [transaction] = request.params;
  const result = rpc.simulateTransaction(PgSerde.serializeTx(transaction));
  const returnData = result.returnData();
  const encoding = "base64";

  return createRpcResponse<"simulateTransaction">(request, context, {
    result: {
      context,
      value: {
        err: result.error() ?? null,
        logs: result.logs(),
        unitsConsumed: PgCommon.bigintToInt(result.unitsConsumed()),
        returnData: returnData
          ? {
              programId: returnData.programId.toString(),
              data: [PgCodec.encodeBinary(returnData.data, encoding), encoding],
            }
          : null,
        accounts: null,
      },
    },
  });
};

const createRpcResponse = <K extends keyof PgWeb3.Connection>(
  request: RpcRequest,
  context: RpcResponseWithContext<K>["result"]["context"],
  data: {
    result?: RpcResponse<K>["result"];
    value?: RpcResponseWithContext<K>["result"]["value"];
  }
) => {
  const responseBody: RpcResponse<K> | RpcResponseWithContext<K> = {
    id: request.id,
    jsonrpc: request.jsonrpc,
    result:
      data.result !== undefined
        ? data.result!
        : { context, value: data.value! },
  };

  // WASM URL parsing fails if the Response URL is empty.
  return Object.defineProperty(
    new Response(JSON.stringify(responseBody)),
    "url",
    { value: Endpoint.PLAYNET }
  );
};

const handleError = <R extends { error: () => string | undefined }>(
  result: R
) => {
  const error = result.error();
  if (error) throw new Error(error);
};
