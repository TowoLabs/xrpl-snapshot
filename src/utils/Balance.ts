import BigNumber from "bignumber.js";

export function sumBalances(oldBalance: string, value: string) {
  const oldBalanceNum = new BigNumber(oldBalance);
  const valueNum = new BigNumber(value);

  return oldBalanceNum.plus(valueNum).toString(10);
}

export function formatBalance(balance: string) {
  const bigNum = new BigNumber(balance);

  return bigNum.dividedBy(10**6).toFormat(0);
}

export function formatSpark(balance: string) {
  const bigNum = new BigNumber(balance);

  return bigNum.dividedBy(10**6).toFormat(6);
}
