import { FilteredEntry, isAccountLedgerEntry, isEscrowLedgerEntry } from "./Filter";

export interface AccountDetails {
  Balance: string;
  MessageKey?: string;
  IncomingEscrows: EscrowDetails[];
}

export interface EscrowDetails {
  Index: string;
  Amount: string;
}

export interface Account extends AccountDetails {
  Type: "Account";
  Address: string;
}

export interface Escrow extends EscrowDetails {
  Type: "Escrow";
  Destination: string;
}

export declare type MinifiedEntry = Account | Escrow;

export function minifyDumpedItem(entry: FilteredEntry): MinifiedEntry {
  if (isAccountLedgerEntry(entry)) {
    return {
      Type: "Account",
      Address: entry.Account,
      Balance: entry.Balance,
      MessageKey: entry.MessageKey,
      IncomingEscrows: [],
    };
  }

  if (isEscrowLedgerEntry(entry)) {
    return {
      Type: "Escrow",
      Index: entry.index,
      Destination: entry.Destination,
      Amount: entry.Amount,
    };
  }

  throw new Error("Encountered unsupported entry");
}
