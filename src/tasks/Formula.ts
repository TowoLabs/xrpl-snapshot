import { Database } from "../data/Database";
import { logger } from "../utils/Logging";
import BigNumber from "bignumber.js";
import { DataClass } from "./Classify";

const INITIAL_XRP_SUPPLY = new BigNumber(100 * 10**9).times(10**6);

/**
 * Calculates the parameters and quota for the claim formula
 * https://blog.flare.xyz/further-information-on-the-spark-token-distribution/
 * https://blog.flare.xyz/the-xrp-flr-ratio/
 */
export async function calculateFormula(db: Database) {
  const { totalXRP, rippleXRP, npeXRP } = await calculateParameters(db);
  const quota = calculateQuota(totalXRP, rippleXRP, npeXRP);

  logger.info(`XRP Total: ${totalXRP.dividedBy(10**6).toFormat()}`);
  logger.info(`XRP Ripple: ${rippleXRP.dividedBy(10**6).toFormat()}`);
  logger.info(`XRP NPE: ${npeXRP.dividedBy(10**6).toFormat()}`);
  logger.info(`Quota: ${quota.toFormat()}`);
}

export async function calculateParameters(db: Database) {
  const meta = await db.meta.read();
  if (!meta) {
    throw new Error("Unable to read metadata");
  }

  const totalXRP = new BigNumber(meta.TotalCoins);
  let rippleXRP = new BigNumber(0);
  let npeXRP = new BigNumber(0);

  await Promise.all([
    db.snapshot.process(DataClass.EXCLUDED_RIPPLE, async data => {
      rippleXRP = rippleXRP.plus(data.Balance);
    }),
    db.snapshot.process(DataClass.EXCLUDED_EXCHANGE, async data => {
      npeXRP = npeXRP.plus(data.Balance);
    }),
  ]);

  return {
    totalXRP,
    rippleXRP,
    npeXRP,
  };
}

export function calculateQuota(totalXRP: BigNumber, rippleXRP: BigNumber, npeXRP: BigNumber) {
  const numerator = INITIAL_XRP_SUPPLY.minus(rippleXRP);
  const denominator = totalXRP.minus(rippleXRP).minus(npeXRP);
  return numerator.dividedBy(denominator).decimalPlaces(4);
}
