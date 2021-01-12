import { RippleAPI } from "ripple-lib";
import { logger } from "../utils/Logging";
import { LedgerEntry } from "ripple-lib/dist/npm/common/types/objects";
import { filterDumpedItems } from "../utils/Filter";
import { minifyDumpedItem } from "../utils/Minify";
import binaryCodec from "ripple-binary-codec";
import { ReliableConnection } from "../reliability/ReliableConnection";
import { Database } from "../data/Database";

interface BinaryEntry {
  data: string;
  index: string;
}

declare type MarkerCallback = (marker: string | undefined) => Promise<string | undefined>;

export async function fetchResource(callback: MarkerCallback) {
  let marker = undefined;

  do {
    marker = await callback(marker);
  } while (marker !== undefined);
}

async function fetchObjects(api: RippleAPI, db: Database, server: string, ledger: number) {
  let numTotal = 0;
  let numFound = 0;

  return fetchResource(async (marker) => {
    const response = await api.request("ledger_data", {
      ledger_index: ledger,
      marker: marker,
      binary: true,
    });

    if (response.state === null) {
      return [[], response.marker];
    }

    const jsonEntries = response.state.map((entry: BinaryEntry) => {
      return {
        index: entry.index,
        ...binaryCodec.decode(entry.data),
      };
    });

    const allEntries = jsonEntries as LedgerEntry[];
    const processedEntries = allEntries
      .filter(filterDumpedItems)
      .map(minifyDumpedItem);

    if (processedEntries.length > 0) {
      await db.dump.insert(processedEntries);
    }

    numTotal += response.state.length;
    numFound += processedEntries.length;

    logger.verbose(`${(server + " ").replace(" ", ":")} Filtered ${numFound.toLocaleString()} of ${numTotal.toLocaleString()} total objects received`);

    return response.marker;
  });
}

async function fetchMeta(api: RippleAPI, db: Database, ledger: number) {
  return api.request("ledger", { ledger_index: ledger })
    .then(data => {
      return db.meta.write({
        LedgerIndex: ledger,
        TotalCoins: data.ledger.total_coins,
      });
    });
}

function getServerURL(server: string) {
  if (server.includes("//")) {
    return server.trim();
  } else {
    return `wss://${server.trim()}`;
  }
}

export async function dump(db: Database, server: string, ledger: number): Promise<void> {
  const api = new RippleAPI({ server: getServerURL(server) });
  api.connection = ReliableConnection.create(api);
  api.on("error", e => {
    // These errors are more properly handled in ReliableConnection, so they
    // can be safely ignored here
    logger.verbose(`API error: ${e}`);
  });

  return api.connect()
    .then(() => fetchMeta(api, db, ledger))
    .then(() => fetchObjects(api, db, server, ledger))
    .finally(() => {
      api.disconnect()
        .catch(logger.error);
    });
}
