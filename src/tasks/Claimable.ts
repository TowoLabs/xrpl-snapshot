import { Database } from "../data/Database";
import { logger } from "../utils/Logging";
import { formatSpark } from "../utils/Balance";
import { calculateParameters, calculateQuota } from "./Formula";
import BigNumber from "bignumber.js";

export async function showClaimable(db: Database, account: string) {
  const { totalXRP, rippleXRP, npeXRP } = await calculateParameters(db);
  const quota = calculateQuota(totalXRP, rippleXRP, npeXRP);
  const eligibleAccount = await db.snapshot.getEligibleAccount(account);
  const missingKeyAccount = await db.snapshot.getMissingKeyAccount(account);

  if (eligibleAccount) {
    const balance = new BigNumber(eligibleAccount.Balance);
    const claimableSpark = balance.times(quota);
    logger.info(`Snapshot Balance: ${formatSpark(balance.toString())} XRP`);
    logger.info(`Claimable Spark: ${formatSpark(claimableSpark.toString())} FLR`);
  } else if (missingKeyAccount) {
    logger.info(`Set a valid message key to claim Spark (FLR).`);
  } else {
    logger.info(`Not eligible to receive any Spark.`);
  }
}

