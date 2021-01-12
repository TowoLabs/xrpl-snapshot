import { Collection } from "mongodb";
import { Database } from "../Database";

export const META = "meta";

export interface MetaData {
  LedgerIndex: number;
  TotalCoins: string;
}

export interface StoredMetaData extends MetaData {
  Index: 0;
}

export class MetaCollection {
  private database: Database;
  private collection: Collection<StoredMetaData>;

  constructor(database: Database) {
    this.database = database;
    this.collection = database.client.db().collection(META);
  }

  public async write(data: MetaData) {
    await this.collection.insertOne({
      ...data,
      Index: 0,
    });
  }

  public async read() {
    return this.collection.findOne({ Index: 0 });
  }

  public async exists() {
    return this.database.client.db().listCollections({ name: META }, { nameOnly: true }).hasNext();
  }

  public async initialize(drop: boolean) {
    const db = this.database.client.db();

    if (drop) {
      await db.dropCollection(META);
    }

    this.collection = db.collection(META);
  }
}
