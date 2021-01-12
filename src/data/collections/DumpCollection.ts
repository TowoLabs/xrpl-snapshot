import { Collection } from "mongodb";
import { Account, MinifiedEntry } from "../../utils/Minify";
import { GroupedEscrows } from "../../tasks/Aggregate";
import { Database, Processor } from "../Database";
import { AGGREGATED } from "./AggregateCollection";

export const DUMP = "dump";

export class DumpCollection {
  private database: Database;
  private collection: Collection<MinifiedEntry>;

  constructor(database: Database) {
    this.database = database;
    this.collection = database.client.db().collection(DUMP);
  }

  public async insert(entries: MinifiedEntry[]) {
    return this.collection.insertMany(entries);
  }

  public async processAccounts(processor: Processor<Account>) {
    const cursor = this.collection
      .find({ Type: "Account" })
      .batchSize(1000);

    await Database.process(cursor, processor);
  }

  public async processAllEscrows(processor: Processor<GroupedEscrows>) {
    const cursor = this.collection.find({ Type: "Escrow" });

    await Database.process(cursor, processor);
  }

  public async processGroupedEscrows(processor: Processor<GroupedEscrows>) {
    const cursor = this.collection
      .aggregate([
        { "$match": { Type: "Escrow" } },
        {
          "$group": {
            _id: "$Destination",
            Destination: { "$first": "$Destination" },
            Items: { "$push": "$$ROOT" },
          },
        },
        {
          "$lookup": {
            from: DUMP,
            localField: "Destination",
            foreignField: "Address",
            as: "Accounts",
          },
        },
      ]);

    await Database.process(cursor, processor);
  }

  public async prepareForAggregation() {
    const collection = this.collection;

    const cursor = collection.aggregate( [
      { "$match": { Type: "Account" } },
      { "$project": { "Type": 0 } },
      { "$out": AGGREGATED },
    ]);

    let next = null;
    do {
      next = await cursor.next();
    } while (next !== null);
  }

  public async countAccounts() {
    return this.collection.find({ Type: "Account" }).count();
  }

  public async exists() {
    return this.database.client.db().listCollections({ name: DUMP }, { nameOnly: true }).hasNext();
  }

  public async initialize(drop: boolean) {
    const db = this.database.client.db();

    if (drop) {
      await db.dropCollection(DUMP);
    }

    await db.collection(DUMP).createIndex("Type");
    await db.collection(DUMP).createIndex("Address");
    await db.collection(DUMP).createIndex("Destination");

    this.collection = db.collection(DUMP);
  }
}
