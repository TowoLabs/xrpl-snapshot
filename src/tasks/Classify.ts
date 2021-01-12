import { Database } from "../data/Database";
import { logger } from "../utils/Logging";

export interface ClassificationConfig {
  Accounts: {
    IncludedExchangeManual: string[];
    Excluded: string[];
    ExcludedRipple: string[];
    ExcludedExchange: string[];
  };
  MessageKey: {
    Prefixes: string[];
  };
}

export enum DataClass {
  INCLUDED = "INCLUDED",
  INCLUDED_MANUAL = "INCLUDED_MANUAL",
  EXCLUDED_MANUAL = "EXCLUDED_MANUAL",
  EXCLUDED_RIPPLE = "EXCLUDED_RIPPLE",
  EXCLUDED_EXCHANGE = "EXCLUDED_EXCHANGE",
  EXCLUDED_NO_KEY = "EXCLUDED_NO_KEY",
  EXCLUDED_BAD_KEY = "EXCLUDED_BAD_KEY",
}

export interface ClassifiedAccount {
  Address: string;
  Class: DataClass;
  Balance: string;
  MessageKey?: string;
}

export async function classify(db: Database, config: ClassificationConfig) {
  logger.info("Classifying data, this might take a while...");
  await db.aggregate.createSnapshot(config);
}