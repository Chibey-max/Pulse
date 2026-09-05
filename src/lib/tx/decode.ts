import { BaseError, UserRejectedRequestError } from "viem";
import {
  ContractRevertError,
  IndexerError,
  InvalidInputError,
  NotConfiguredError,
  RpcError,
  SignerRequiredError,
  SomniaMarketsError,
} from "@somnia-chain/markets-sdk";

// === Constants

const REJECTED = "You cancelled the transaction.";
const FALLBACK = "Something went wrong. Nothing was submitted.";
const MAX_TAIL = 120;

// === Helpers

function truncate(message: string): string {
  const trimmed = message.trim();
  return trimmed.length > MAX_TAIL ? `${trimmed.slice(0, MAX_TAIL - 1)}…` : trimmed;
}

/*
  A user rejection can arrive as a viem error, a raw provider error with code 4001, or a
  nested `cause`. Walk the chain and match on either signal.
*/
function isUserRejection(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof UserRejectedRequestError) return true;
    if (typeof current === "object") {
      const record = current as { code?: unknown; message?: unknown; cause?: unknown };
      if (record.code === 4001) return true;
      if (
        typeof record.message === "string" &&
        /rejected|denied|cancell?ed/i.test(record.message)
      ) {
        return true;
      }
      current = record.cause;
      continue;
    }
    break;
  }
  return false;
}

function mentionsInsufficientFunds(message: string): boolean {
  return /insufficient funds|insufficient balance|exceeds balance/i.test(message);
}

function humanizeContractErrorName(errorName: string): string | null {
  switch (errorName) {
    case "NotOwner":
      return "Switch MetaMask to the wallet that owns this session.";
    case "MarketNotAllowed":
      return "This rolled window is not allowed by the session yet. Try again to extend it.";
    case "MarketNotTrading":
      return "This market is no longer trading. Pick the newest live window.";
    case "StakeTooHigh":
      return "This stake is above the session cap.";
    case "SessionExpired":
      return "This session expired. Start a new one for the demo.";
    case "WindowLimitReached":
      return "This one-window session has already been used. Start a new session or switch to Direct.";
    case "TransferFailed":
      return "The token transfer failed. Check the session balance and approval.";
    case "UnknownMarket":
      return "DreamDEX does not recognize this market yet. Pick another live window.";
    case "PlaceRejected":
      return "The book moved before the order could fill. Try the other side or wait for the next window.";
    case "InvalidPrice":
      return "The market price is outside the pool limits. Pick another live window.";
    case "InvalidSide":
      return "That side is not supported for this market.";
    case "InvalidQuantity":
    case "QuantityBelowMinimum":
      return "The pool rejected this size. Try a larger stake or use Direct mode.";
    default:
      return null;
  }
}

function humanizeRevert(err: ContractRevertError): string {
  if (err.errorName) {
    if (/insufficientbalance|insufficientfunds/i.test(err.errorName)) {
      return "Not enough tUSDC to cover this call.";
    }
    const message = humanizeContractErrorName(err.errorName);
    if (message) return message;
    return `The contract rejected this call (${err.errorName}).`;
  }
  if (err.reason && !/^execution reverted\.?$/i.test(err.reason)) {
    return err.reason;
  }
  return FALLBACK;
}

// === decodeTxError

/*
  Turn any thrown value from the write path into one sentence a trader can act on. Never
  surfaces a bare "execution reverted" and never implies a transaction was sent when it
  was not.
*/
export function decodeTxError(err: unknown): string {
  if (isUserRejection(err)) return REJECTED;

  if (err instanceof ContractRevertError) return humanizeRevert(err);
  if (err instanceof IndexerError) {
    return "The indexer did not respond. Nothing was submitted.";
  }
  if (err instanceof RpcError) {
    return "The network node did not respond. Nothing was submitted.";
  }
  if (err instanceof SignerRequiredError) {
    return "Connect a wallet to sign this transaction.";
  }
  if (err instanceof NotConfiguredError) {
    return "Live trading is not configured. Nothing was submitted.";
  }
  if (err instanceof InvalidInputError) return truncate(err.message);
  if (err instanceof SomniaMarketsError) return truncate(err.message) || FALLBACK;

  if (err instanceof BaseError) {
    if (mentionsInsufficientFunds(err.message)) {
      return "Not enough balance to cover this transaction and gas.";
    }
    for (const [, name] of err.message.matchAll(/\(([^()]+)\)/g)) {
      const message = humanizeContractErrorName(name);
      if (message) return message;
    }
    const short = err.shortMessage?.trim();
    if (short && !/^execution reverted\.?$/i.test(short)) return short;
    return FALLBACK;
  }

  if (err instanceof Error) {
    if (mentionsInsufficientFunds(err.message)) {
      return "Not enough balance to cover this transaction and gas.";
    }
    const message = err.message?.trim();
    if (message && !/^execution reverted\.?$/i.test(message)) {
      return `${FALLBACK} ${truncate(message)}`;
    }
  }

  return FALLBACK;
}
