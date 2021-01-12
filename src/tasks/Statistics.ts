import { Database } from "../data/Database";
import { logger } from "../utils/Logging";
import { DataClass } from "./Classify";
import { formatBalance, sumBalances } from "../utils/Balance";

export enum Statistics {
  TOTAL_PARTICIPATING_BALANCE = "total-participating-balance",
  TOTAL_PARTICIPATING_COUNT = "total-participating-count",
}

export const EveryStatisticOption = [
  Statistics.TOTAL_PARTICIPATING_BALANCE,
  Statistics.TOTAL_PARTICIPATING_COUNT,
];

export async function showStatistics(db: Database, included: Statistics[]) {
  if (included.includes(Statistics.TOTAL_PARTICIPATING_COUNT)) {
    const count = await db.snapshot.countIncluded();
    logger.info(`Number of participating accounts: ${count.toLocaleString()}`);
  }

  if (included.includes(Statistics.TOTAL_PARTICIPATING_BALANCE)) {
    let balance = "0";

    await db.snapshot.process(DataClass.INCLUDED, async data => {
      balance = sumBalances(balance, data.Balance);
    });

    await db.snapshot.process(DataClass.INCLUDED_MANUAL, async data => {
      balance = sumBalances(balance, data.Balance);
    });

    logger.info(`Total XRP balance: ${formatBalance(balance)}`);
  }
}
