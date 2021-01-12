import { Database, Processor } from "../Database";
import { Collection } from "mongodb";
import { AggregatedData } from "../../tasks/Aggregate";
import { ClassifiedAccount, DataClass } from "../../tasks/Classify";

export const SNAPSHOT = "snapshot";

export class SnapshotCollection {
  private database: Database;
  private collection: Collection<ClassifiedAccount>;

  constructor(database: Database) {
    this.database = database;
    this.collection = database.client.db().collection(SNAPSHOT);
  }

  public async process(dataClass: DataClass, processor: Processor<AggregatedData>) {
    const cursor = this.collection
      .find({ Class: dataClass })
      .sort({ Address: 1 });

    await Database.process(cursor, processor);
  }

  public async countIncluded() {
    return this.collection.find({ "$or":
      [
        { Class: DataClass.INCLUDED },
        { Class: DataClass.INCLUDED_MANUAL },
      ],
    }).count();
  }

  public async getEligibleAccount(address: string) {
    return this.collection.findOne({ Address: address,
      "$or": [
        { Class: DataClass.INCLUDED },
        { Class: DataClass.INCLUDED_MANUAL },
      ],
    });
  }

  public async getMissingKeyAccount(address: string) {
    return this.collection.findOne({ Address: address,
      "$or": [
        { Class: DataClass.EXCLUDED_NO_KEY },
        { Class: DataClass.EXCLUDED_BAD_KEY },
      ],
    });
  }

  public async getHash(): Promise<string> {
    const dbHash = await this.database.client.db().command({ dbHash: 1, collections: [SNAPSHOT] });

    return dbHash.collections[SNAPSHOT];
  }

  public async exists() {
    return this.database.client.db().listCollections({ name: SNAPSHOT }, { nameOnly: true }).hasNext();
  }

  public async initialize(drop: boolean) {
    const db = this.database.client.db();

    if (drop) {
      await db.dropCollection(SNAPSHOT);
    }

    await db.collection(SNAPSHOT).createIndex("Address", { name: "Address" });
    await db.collection(SNAPSHOT).createIndex("Class");
    this.collection = db.collection(SNAPSHOT);
  }
}
