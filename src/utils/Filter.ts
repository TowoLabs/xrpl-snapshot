import { AccountRootLedgerEntry, EscrowLedgerEntry, LedgerEntry } from "ripple-lib/dist/npm/common/types/objects";

export interface FixedEscrowLedgerEntry extends EscrowLedgerEntry {
  index: string;
}

export declare type FilteredEntry = AccountRootLedgerEntry | EscrowLedgerEntry;

export function isAccountLedgerEntry(entry: LedgerEntry): entry is AccountRootLedgerEntry {
  return entry.LedgerEntryType === "AccountRoot";
}

export function isEscrowLedgerEntry(entry: LedgerEntry): entry is FixedEscrowLedgerEntry {
  return entry.LedgerEntryType === "Escrow";
}

export function filterDumpedItems(entry: LedgerEntry): entry is FilteredEntry {
  if (entry.LedgerEntryType === "Escrow") {
    return true;
  }

  if (entry.LedgerEntryType === "AccountRoot") {
    return true;
  }

  return false;
}
