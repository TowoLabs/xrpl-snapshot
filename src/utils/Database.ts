import { Arguments, InferredOptionTypes, PositionalOptionsType } from "yargs";
import { Database } from "../data/Database";
import { logger } from "./Logging";

export declare type Collection = "dump" | "aggregate" | "snapshot" | "meta";
declare type DatabaseArgs = Arguments<InferredOptionTypes<typeof databaseArgs>>;

export const databaseArgs = {
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
  dbName: {
    description: "the database name to reference",
    alias: "d",
    type: "string" as PositionalOptionsType,
    default: "default",
  },
  force: {
    description: "proceed even if the data has already been processed, clearing old data",
    alias: "f",
    type: "boolean" as PositionalOptionsType,
    default: false,
  },
};

async function connectDatabaseInternal(dbHost: string, dbPort: number, dbName: string) {
  return Database.connect(dbHost, dbPort, dbName);
}

export async function prepareDatabase(dbHost: string, dbPort: number, dbName: string, force: boolean, kinds: Collection[], needed: Collection[]) {
  const db = await connectDatabaseInternal(dbHost, dbPort, dbName);

  try {
    for (const requiredCollection of needed) {
      const present = await db[requiredCollection].exists();
      if (!present) {
        throw new Error("A prior step must be completed before this task can be executed.");
      }
    }

    for (const kind of kinds) {
      const hasCollection = await db[kind].exists();

      if (hasCollection) {
        if (!force) {
          throw new Error(`This data set already exists in the database "${dbName}".\nSpecify -f to discard this data or use -d to specify an alternate database.`);
        } else {
          logger.info("Removing old data...");
        }
      }

      await db[kind].initialize(hasCollection);
    }

    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function prepareDatabaseFromArgs(args: DatabaseArgs, kinds: Collection[], needed: Collection[] = []) {
  return prepareDatabase(args.dbHost, args.dbPort, args.dbName, args.force, kinds, needed);
}
