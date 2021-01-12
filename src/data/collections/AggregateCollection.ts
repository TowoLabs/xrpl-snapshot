import { Database, Processor } from "../Database";
import { BulkWriteOperation, Collection } from "mongodb";
import { AggregatedData } from "../../tasks/Aggregate";
import { ClassificationConfig, DataClass } from "../../tasks/Classify";
import { SNAPSHOT } from "./SnapshotCollection";

export const AGGREGATED = "aggregated";

export class AggregateCollection {
  private database: Database;
  private collection: Collection<AggregatedData>;

  constructor(database: Database) {
    this.database = database;
    this.collection = database.client.db().collection(AGGREGATED);
  }

  public async insert(data: AggregatedData) {
    return this.collection.insertOne(data);
  }

  public async bulkWrite(operations: Array<BulkWriteOperation<AggregatedData>>) {
    return this.collection.bulkWrite(operations);
  }

  public async process(processor: Processor<AggregatedData>) {
    const cursor = this.collection
      .find({});

    await Database.process(cursor, processor);
  }

  public async createSnapshot(config: ClassificationConfig) {
    const cursor = this.collection
      .aggregate([
        {
          "$project": {
            _id: "$Address",
            Address: 1,
            Balance: 1,
            MessageKey: 1,
            Class: {
              "$switch": {
                branches: [
                  {
                    "case": {
                      "$gte": [
                        { "$indexOfArray": [config.Accounts.IncludedExchangeManual, "$Address"] },
                        0,
                      ],
                    },
                    "then": DataClass.INCLUDED_MANUAL,
                  },
                  {
                    "case": {
                      "$gte": [
                        { "$indexOfArray": [config.Accounts.Excluded, "$Address"] },
                        0,
                      ],
                    },
                    "then": DataClass.EXCLUDED_MANUAL,
                  },
                  {
                    "case": {
                      "$gte": [
                        { "$indexOfArray": [config.Accounts.ExcludedRipple, "$Address"] },
                        0,
                      ],
                    },
                    "then": DataClass.EXCLUDED_RIPPLE,
                  },
                  {
                    "case": {
                      "$gte": [
                        { "$indexOfArray": [config.Accounts.ExcludedExchange, "$Address"] },
                        0,
                      ],
                    },
                    "then": DataClass.EXCLUDED_EXCHANGE,
                  },
                  {
                    "case": {
                      "$eq": [
                        // Convert undefined values to null so that we can compare them
                        { "$ifNull": ["$MessageKey", null] },
                        null,
                      ],
                    },
                    "then": DataClass.EXCLUDED_NO_KEY,
                  },
                  ...config.MessageKey.Prefixes.map(prefix => ({
                    "case": {
                      "$eq": [
                        { "$indexOfCP": ["$MessageKey", prefix] },
                        0,
                      ],
                    },
                    "then": DataClass.INCLUDED,
                  })),
                ],
                default: DataClass.EXCLUDED_BAD_KEY,
              },
            },
          },
        },
        { "$out": SNAPSHOT },
      ]);

    let next = null;
    do {
      next = await cursor.next();
    } while (next !== null);
  }

  public async exists() {
    return this.database.client.db().listCollections({ name: AGGREGATED }, { nameOnly: true }).hasNext();
  }

  public async initialize(drop: boolean) {
    const db = this.database.client.db();

    if (drop) {
      await db.dropCollection(AGGREGATED);
    }

    await db.collection(AGGREGATED).createIndex("Address", { name: "Address" });
    this.collection = db.collection(AGGREGATED);
  }
}
