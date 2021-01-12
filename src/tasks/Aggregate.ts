import {
  Account,
  AccountDetails,
  EscrowDetails
} from "../utils/Minify";
import { sortEscrows } from "../utils/Sorting";
import { sumBalances } from "../utils/Balance";
import { Database, Item } from "../data/Database";
import { logger } from "../utils/Logging";
import { BulkWriteOperation } from "mongodb";

export interface AggregatedData extends AccountDetails {
  Address: string;
}

export interface GroupedEscrows {
  Destination: string;
  Items: EscrowDetails[];
  Accounts: Account[];
}

declare type Operations = Array<BulkWriteOperation<AggregatedData>>;

export async function aggregate(db: Database) {
  const operations = [] as Operations;

  await prepareAggregation(db);
  await buildUpdateOperations(db, operations);
  await completeAggregation(db, operations);
}

async function prepareAggregation(db: Database) {
  const numAccounts = await db.dump.countAccounts();

  logger.info(`Preparing to aggregate ${numAccounts.toLocaleString()} accounts... (this could take a minute or two)`);

  await db.dump.prepareForAggregation();
}

async function buildUpdateOperations(db: Database, operations: Operations) {
  logger.info("Aggregating balances...");

  await db.dump.processGroupedEscrows(
    async (escrowGroup) => {
      // Combine the account balance with all outstanding escrow balances
      let balance = escrowGroup.Accounts[0].Balance;
      escrowGroup.Items.forEach(escrow => {
        balance = sumBalances(balance, escrow.Amount);
      });

      operations.push(
        buildSingleOperation(escrowGroup, balance)
      );
    }
  );
}

function buildSingleOperation(escrowGroup: Item<GroupedEscrows>, balance: string) {
  return {
    updateOne: {
      "filter": { Address: escrowGroup.Destination },
      "update": {
        "$set": {
          Balance: balance,
          IncomingEscrows: sortEscrows(escrowGroup.Items),
        },
      },
      "hint": "Address",
    },
  };
}

async function completeAggregation(db: Database, operations: Operations) {
  logger.debug(`Starting to write... (${operations.length} operations)`);

  if (operations.length > 0) {
    await db.aggregate.bulkWrite(operations);
  }

  logger.debug("Write complete!");
}
