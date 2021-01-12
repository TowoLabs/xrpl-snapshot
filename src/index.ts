import { dump } from "./tasks/Dump";
import yargs, { PositionalOptionsType } from "yargs";
import { aggregate } from "./tasks/Aggregate";
import { ClassificationConfig, classify } from "./tasks/Classify";
import { readJSON } from "./utils/File";
import { logger } from "./utils/Logging";
import { EveryStatisticOption, showStatistics, Statistics } from "./tasks/Statistics";
import { isEqual } from "lodash";
import { calculateFormula } from "./tasks/Formula";
import { showClaimable } from "./tasks/Claimable";
import { databaseArgs, prepareDatabaseFromArgs, prepareDatabase } from "./utils/Database";

yargs
  .command(
    "dump", "Dumps the current state of the ledger",
    {
      node: {
        description: "the node to dump data from",
        alias: "n",
        type: "string",
        demandOption: true,
      },
      index: {
        description: "the ledger index to dump",
        alias: "i",
        type: "number",
        default: 60155580,
      },
      ...databaseArgs,
    },
    args => {
      prepareDatabaseFromArgs(args, ["dump", "meta"])
        .then(async db => {
          try {
            await dump(db, args.node, args.index);
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "aggregate", "Aggregates a data dump into an aggregated account list",
    databaseArgs,
    args => {
      prepareDatabaseFromArgs(args, ["aggregate"], ["dump"])
        .then(async db => {
          try {
            await aggregate(db);
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "classify", "Classifies aggregated data into a snapshot",
    {
      config: {
        description: "the classification configuration",
        alias: "c",
        type: "string",
        default: "config.json",
      },
      ...databaseArgs,
    },
    args => {
      Promise.all([
        prepareDatabaseFromArgs(args, ["snapshot"], ["aggregate"]),
        readJSON<ClassificationConfig>(args.config),
      ])
        .then(async ([db, config]) => {
          try {
            await classify(db, config);
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "statistics", "Shows statistics about the created snapshot",
    {
      types: {
        description: "the different statistical data to show",
        alias: "t",
        type: "array",
        default: [
          Statistics.TOTAL_PARTICIPATING_COUNT,
          Statistics.TOTAL_PARTICIPATING_BALANCE,
        ],
        choices: EveryStatisticOption,
      },
      ...databaseArgs,
    },
    args => {
      prepareDatabaseFromArgs(args, [], ["snapshot"])
        .then(async db => {
          try {
            await showStatistics(db, args.types);
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "compare", "Compares two snapshots",
    {
      dbHost: {
        description: "the MongoDB database host",
        type: "string" as PositionalOptionsType,
        default: "127.0.0.1",
      },
      dbPort: {
        description: "the MongoDB database port",
        alias: "p",
        type: "number" as PositionalOptionsType,
        default: 27017,
      },
      dbNames: {
        description: "the databases containing the snapshots to compare",
        alias: "d",
        type: "array",
        demandOption: true,
      },
    },
    args => {
      Promise.all(
        args.dbNames.map(async dbName => {
          logger.debug(`Comparing ${dbName}...`);
          const db = await prepareDatabase(args.dbHost, args.dbPort, dbName as string, false, [], ["snapshot"]);

          try {
            return await db.snapshot.getHash();
          } finally {
            await db.close();
          }
        })
      )
        .then(hashes => {
          const firstEntry = hashes[0];
          const allEqual = hashes.every(entry => isEqual(entry, firstEntry));

          logger.info("Hashes:");
          hashes.forEach((hash, index) => {
            const dbName = args.dbNames[index];
            logger.info(`  ${dbName}: ${hash}`);
          });

          if (allEqual) {
            logger.info("Success: All snapshots have the same content!");
          } else {
            throw new Error("Failure: Snapshots do not match!");
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "snapshot", "Creates a snapshot directly by running dump, aggregate and classify in sequence",
    {
      node: {
        description: "the node to dump data from",
        alias: "n",
        type: "string",
        demandOption: true,
      },
      index: {
        description: "the ledger index to dump",
        alias: "i",
        type: "number",
        default: 60155580,
      },
      config: {
        description: "the classification configuration",
        alias: "c",
        type: "string",
        default: "config.json",
      },
      ...databaseArgs,
    },
    args => {
      Promise.all([
        prepareDatabaseFromArgs(args, ["dump", "meta", "aggregate", "snapshot"]),
        readJSON<ClassificationConfig>(args.config),
      ])
        .then(async ([db, config]) => {
          try {
            return await dump(db, args.node, args.index)
              .then(() => aggregate(db))
              .then(() => classify(db, config))
              .then(() => logger.info(`Created snapshot for ${args.node}!`));
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "formula", "Calculates the claim formula from the classified snapshot",
    {
      ...databaseArgs,
    },
    args => {
      prepareDatabaseFromArgs(args, [], ["snapshot", "meta"])
        .then(async db => {
          try {
            await calculateFormula(db);
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .command(
    "claimable", "Shows claimable Spark (FLR) for a certain account",
    {
      account: {
        description: "the account to check",
        alias: "a",
        type: "string",
        demandOption: true,
      },
      ...databaseArgs,
    },
    args => {
      prepareDatabaseFromArgs(args, [], ["snapshot"])
        .then(async db => {
          try {
            await showClaimable(db, args.account);
          } finally {
            await db.close();
          }
        })
        .catch(logger.error);
    }
  )
  .demandCommand(1, "No command specified")
  .scriptName("yarn start")
  .help()
  .alias("help", "h")
  .argv;
