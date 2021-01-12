import { EscrowDetails } from "./Minify";
import BigNumber from "bignumber.js";

interface Addressable {
  Address: string;
}

export function compareAccount(account1: Addressable, account2: Addressable) {
  return account1.Address.localeCompare(account2.Address);
}

function compareBalances(balance1: string, balance2: string) {
  const balanceNum1 = new BigNumber(balance1);
  const balanceNum2 = new BigNumber(balance2);

  return balanceNum1.comparedTo(balanceNum2);
}

export function compareEscrows(escrow1: EscrowDetails, escrow2: EscrowDetails) {
  return compareBalances(escrow1.Amount, escrow2.Amount);
}

export function sortList(accounts: Addressable[]) {
  return accounts.sort(compareAccount);
}

export function sortEscrows(escrows: EscrowDetails[]) {
  return escrows.sort(compareEscrows);
}
