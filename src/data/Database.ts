import { AggregationCursor, Cursor, MongoClient } from "mongodb";
import { DumpCollection } from "./collections/DumpCollection";
import { AggregateCollection } from "./collections/AggregateCollection";
import { SnapshotCollection } from "./collections/SnapshotCollection";
import { MetaCollection } from "./collections/MetaCollection";

export type Item<T> = { _id: string } & T;
export type Processor<T> = (item: Item<T>) => Promise<void>;

export class Database {
  public readonly client: MongoClient;
  public readonly dump: DumpCollection;
  public readonly aggregate: AggregateCollection;
  public readonly snapshot: SnapshotCollection;
  public readonly meta: MetaCollection;

  public constructor(client: MongoClient) {
    this.client = client;
    this.dump = new DumpCollection(this);
    this.aggregate = new AggregateCollection(this);
    this.snapshot = new SnapshotCollection(this);
    this.meta = new MetaCollection(this);
  }

  public static async connect(host: string, port: number, dbName: string): Promise<Database> {
    const client = await MongoClient.connect(`mongodb://${host}:${port}/${dbName}`, {
      ignoreUndefined: true,
      useUnifiedTopology: true,
    });
    return new Database(client);
  }

  public async clear() {
    const db = this.client.db();
    await db.dropDatabase();
  }

  public async close() {
    return this.client.close();
  }

  public static async process<T>(cursor: Cursor<any> | AggregationCursor<any>, processor: Processor<T>) {
    while (await cursor.hasNext()) {
      await processor(await cursor.next());
    }
  }
}
