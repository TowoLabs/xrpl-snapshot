import {
  AccountData,
  advanceLedger,
  collectData,
  collectParameterizedData,
  fundAccount,
  GENESIS,
  sendTransaction
} from "./Utils";
import { dump } from "../src/tasks/Dump";
import { logger } from "../src/utils/Logging";
import child_process from "child_process";
import path from "path";
import util from "util";
import { iso8601ToRippleTime } from "ripple-lib/dist/npm/common";
import { aggregate, AggregatedData } from "../src/tasks/Aggregate";
import { ClassificationConfig, classify, DataClass } from "../src/tasks/Classify";
import { Database } from "../src/data/Database";
import { sortList } from "../src/utils/Sorting";
import { calculateParameters, calculateQuota } from "../src/tasks/Formula";

const EXAMPLE_ETH_ADDRESS_1 = "0x415f8315c9948Ad91e2Cce5b8583A36dA431fb61";
const EXAMPLE_ETH_ADDRESS_2 = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

const TRANSACTION_FEE = "1000000";

const exec = util.promisify(child_process.exec);
const rippledDir = path.join(__dirname, "..", "rippled");

function prepareMessageKey(ethAddress: string) {
  if (ethAddress.startsWith("0x")) {
    ethAddress = ethAddress.substr(2);
  }

  ethAddress = ethAddress.toUpperCase();
  ethAddress = "02000000000000000000000000" + ethAddress;

  return ethAddress;
}

async function runScript(path: string) {
  return new Promise((resolve, reject) => {
    const ls = child_process.spawn(path, { cwd: rippledDir });

    ls.stdout.on("data", (data) => {
      logger.debug(`${data}`);
    });

    ls.stderr.on("data", (data) => {
      logger.debug(`${data}`);
    });

    ls.on("exit", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Unexpected exit code: ${code}`));
      }
    });
  });
}

let db: Database;
let lastLedger: number;
const participatingAccounts: AccountData[] = [];
const allAccounts: AccountData[] = [];

describe("Sample Data", () => {
  beforeAll(async () => {
    logger.info("--- Setting up testing environment ---");
    logger.info("[1/6] Launching local rippled instance...");

    await runScript("./launch.sh");

    logger.info("[2/6] Local rippled server started!");
    logger.info("[3/6] Seeding rippled server with test data...");

    const account1 = await fundAccount(100)
      .then(async account => {
        await sendTransaction(
          account,
          {
            TransactionType: "AccountSet",
            MessageKey: prepareMessageKey(EXAMPLE_ETH_ADDRESS_1),
            Fee: TRANSACTION_FEE,
          }
        );

        return account;
      });

    const account2 = await fundAccount(100)
      .then(async account => {
        await sendTransaction(
          account,
          {
            TransactionType: "AccountSet",
            MessageKey: prepareMessageKey(EXAMPLE_ETH_ADDRESS_2),
            Fee: TRANSACTION_FEE,
          }
        );

        await sendTransaction(
          account,
          {
            TransactionType: "EscrowCreate",
            Amount: "1000000",
            Destination: account1.address,
            FinishAfter: iso8601ToRippleTime(new Date().toISOString()) + 3600,
            Fee: TRANSACTION_FEE,
          }
        );

        return account;
      });

    const account3 = await fundAccount(100)
      .then(async account => {
        await sendTransaction(
          account,
          {
            TransactionType: "EscrowCreate",
            Amount: "4000000",
            Destination: account2.address,
            FinishAfter: iso8601ToRippleTime(new Date().toISOString()) + 3600,
            Fee: TRANSACTION_FEE,
          }
        );

        await sendTransaction(
          account,
          {
            TransactionType: "EscrowCreate",
            Amount: "5000000",
            Destination: account2.address,
            FinishAfter: iso8601ToRippleTime(new Date().toISOString()) + 3600,
            Fee: TRANSACTION_FEE,
          }
        );

        return account;
      });

    const account4 = await fundAccount(100)
      .then(async account => {
        await sendTransaction(
          account,
          {
            TransactionType: "EscrowCreate",
            Amount: "12000000",
            Destination: account3.address,
            FinishAfter: iso8601ToRippleTime(new Date().toISOString()) + 3600,
            Fee: TRANSACTION_FEE,
          }
        );

        return account;
      });

    participatingAccounts.push(account1);
    participatingAccounts.push(account2);

    allAccounts.push(account1);
    allAccounts.push(account2);
    allAccounts.push(account3);
    allAccounts.push(account4);
    allAccounts.push(GENESIS);

    lastLedger = await advanceLedger();

    logger.info("[4/6] Local rippled server was seeded successfully!");
    logger.info("[5/6] Running test suite...");
  });

  afterAll(async () => {
    logger.info("[6/6] Stopping rippled server...");
    await exec("./stop-container.sh", { cwd: rippledDir });
  });

  beforeEach(async () => {
    db = await Database.connect("localhost", 27017, "test");
    await db.clear();
    await db.dump.initialize(false);
    await db.aggregate.initialize(false);
    await db.snapshot.initialize(false);
  });

  afterEach(async () => {
    await db.close();
  });

  it("should find all accounts during dump task", async () => {
    await dump(db, "ws://localhost:6006", lastLedger);

    const rawAccounts = await collectData(db.dump, db.dump.processAccounts);

    const foundAccounts = rawAccounts
      .map(account => account.Address)
      .sort();

    const addedAccounts = allAccounts
      .map(account => account.address)
      .sort();

    expect(foundAccounts).toEqual(addedAccounts);
  });

  it("should find all escrows", async () => {
    await dump(db, "ws://localhost:6006", lastLedger);
    const foundEscrows = await collectData(db.dump, db.dump.processAllEscrows);

    expect(foundEscrows.length).toEqual(4);
  });

  it("should aggregate the data correctly", async () => {
    await dump(db, "ws://localhost:6006", lastLedger);
    await aggregate(db);

    const aggregatedList = await collectData(db.aggregate, db.aggregate.process);
    expect(Object.keys(aggregatedList).length).toEqual(allAccounts.length);

    const aggregated = aggregatedList.reduce(
      (record, current) => {
        return {
          ...record,
          [current.Address]: current,
        };
      },
      {} as Record<string, AggregatedData>
    );

    const account1 = aggregated[allAccounts[0].address];
    const account2 = aggregated[allAccounts[1].address];
    const account3 = aggregated[allAccounts[2].address];
    const account4 = aggregated[allAccounts[3].address];
    const account5 = aggregated[allAccounts[4].address];

    expect(account1.Balance).toEqual("100000000");
    expect(account1.MessageKey).toEqual(prepareMessageKey(EXAMPLE_ETH_ADDRESS_1));
    expect(account1.IncomingEscrows.length).toEqual(1);
    expect(account1.IncomingEscrows[0].Amount).toEqual("1000000");

    expect(account2.Balance).toEqual("106000000");
    expect(account2.MessageKey).toEqual(prepareMessageKey(EXAMPLE_ETH_ADDRESS_2));
    expect(account2.IncomingEscrows.length).toEqual(2);
    expect(account2.IncomingEscrows[0].Amount).toEqual("4000000");
    expect(account2.IncomingEscrows[1].Amount).toEqual("5000000");

    expect(account3.Balance).toEqual("101000000");
    expect(account3.MessageKey).toEqual(undefined);
    expect(account3.IncomingEscrows.length).toEqual(1);
    expect(account3.IncomingEscrows[0].Amount).toEqual("12000000");

    expect(account4.Balance).toEqual("87000000");
    expect(account4.MessageKey).toEqual(undefined);
    expect(account4.IncomingEscrows.length).toEqual(0);

    expect(account5.Balance).toEqual("99999999599999960"); // This might change too often, consider skipping test
    expect(account5.MessageKey).toEqual(undefined);
    expect(account5.IncomingEscrows.length).toEqual(0);
  });

  it("should classify the data correctly", async () => {
    const includedNormal = "rE2s8brtp44Cmaxv94Lf1WNG8P3pa3R6JA";
    const includedExchange = "rMoBJijEBfyxH1rKQG63vtgbHspwbZVmrm";
    const excludedManualAddr = "rnJT5BWeSe1FSjUbxKV939AYnLv4afaSHF";
    const badMessageKeyNormal = "rweXjeWH84uVyF8kCLmQqjqGAtvJRRiPXV";
    const badMessageKeyExchange = "rUAb4VMPLovr2S72uBXZYRfqw6fmyG6oDM";
    const noMessageKeyNormal = "r9EzMsonNQMrNC8AHDj1otra33AvLh3LRH";
    const noMessageKeyExchange = "rHLTt9siKFjeUksNkXzCZNtnR4SsXgqmtp";
    const excludedBecauseRipple = "rBkz8mmf4Um3kDHms2fmYM2kLrdeVosbWE";
    const nonParticipatingExchange = "rG4xrczexEsM9YQaWrHF9dPagaEoMm2NXX";

    const aggregated: Record<string, AggregatedData> = {
      [includedNormal]: {
        Address: includedNormal,
        Balance: "123",
        MessageKey: "02000000000000000000000000415F8315C9948AD91E2CCE5B8583A36DA431FB61",
        IncomingEscrows: [],
      },
      [includedExchange]: {
        Address: includedExchange,
        Balance: "456",
        MessageKey: "0200000000000000000000000089205A3A3B2A69DE6DBF7F01ED13B2108B2C43E7",
        IncomingEscrows: [],
      },
      [excludedManualAddr]: {
        Address: excludedManualAddr,
        Balance: "102",
        MessageKey: "0200000000000000000000000089205A3A3B2A69DE6DBF7F01ED13B2108B2C43E7",
        IncomingEscrows: [],
      },
      [badMessageKeyNormal]: {
        Address: badMessageKeyNormal,
        Balance: "789",
        MessageKey: "03000000000000000000000000415F8315C9948AD91E2CCE5B8583A36DA431FB61",
        IncomingEscrows: [],
      },
      [badMessageKeyExchange]: {
        Address: badMessageKeyExchange,
        Balance: "101",
        MessageKey: "02300000000000000000000000415F8315C9948AD91E2CCE5B8583A36DA431FB61",
        IncomingEscrows: [],
      },
      [noMessageKeyNormal]: {
        Address: noMessageKeyNormal,
        Balance: "42",
        MessageKey: undefined,
        IncomingEscrows: [],
      },
      [noMessageKeyExchange]: {
        Address: noMessageKeyExchange,
        Balance: "13",
        MessageKey: undefined,
        IncomingEscrows: [],
      },
      [excludedBecauseRipple]: {
        Address: excludedBecauseRipple,
        Balance: "999",
        MessageKey: "02300000000000000000000000415F8315C9948AD91E2CCE5B8583A36DA431FB61",
        IncomingEscrows: [],
      },
      [nonParticipatingExchange]: {
        Address: nonParticipatingExchange,
        Balance: "333",
        MessageKey: "02300000000000000000000000415F8315C9948AD91E2CCE5B8583A36DA431FB61",
        IncomingEscrows: [],
      },
    };

    await Promise.all(
      Object.values(aggregated).map(data => db.aggregate.insert(data))
    );

    const config: ClassificationConfig = {
      Accounts: {
        IncludedExchangeManual: [
          noMessageKeyExchange,
        ],
        Excluded: [
          excludedManualAddr,
        ],
        ExcludedRipple: [
          excludedBecauseRipple,
        ],
        ExcludedExchange: [
          nonParticipatingExchange,
        ],
      },
      MessageKey: {
        Prefixes: [
          "02000000000000000000000000",
        ],
      },
    };

    const expectedIncluded = [
      {
        Address: includedNormal,
        Class: DataClass.INCLUDED,
        Balance: aggregated[includedNormal].Balance,
        MessageKey: aggregated[includedNormal].MessageKey as string,
      },
      {
        Address: includedExchange,
        Class: DataClass.INCLUDED,
        Balance: aggregated[includedExchange].Balance,
        MessageKey: aggregated[includedExchange].MessageKey as string,
      },
    ];

    const expectedIncludedManual = [
      {
        Address: noMessageKeyExchange,
        Class: DataClass.INCLUDED_MANUAL,
        Balance: aggregated[noMessageKeyExchange].Balance,
      },
    ];

    const expectedExcludedManual = [
      {
        Address: excludedManualAddr,
        Class: DataClass.EXCLUDED_MANUAL,
        Balance: aggregated[excludedManualAddr].Balance,
        MessageKey: aggregated[excludedManualAddr].MessageKey as string,
      },
    ];

    const expectedExcludedNoKey = [
      {
        Address: noMessageKeyNormal,
        Class: DataClass.EXCLUDED_NO_KEY,
        Balance: aggregated[noMessageKeyNormal].Balance,
      },
    ];

    const expectedExcludedBadKey = [
      {
        Address: badMessageKeyExchange,
        Class: DataClass.EXCLUDED_BAD_KEY,
        Balance: aggregated[badMessageKeyExchange].Balance,
        MessageKey: aggregated[badMessageKeyExchange].MessageKey as string,
      },
      {
        Address: badMessageKeyNormal,
        Class: DataClass.EXCLUDED_BAD_KEY,
        Balance: aggregated[badMessageKeyNormal].Balance,
        MessageKey: aggregated[badMessageKeyNormal].MessageKey as string,
      },
    ];

    const expectedExcludedRipple = [
      {
        Address: excludedBecauseRipple,
        Class: DataClass.EXCLUDED_RIPPLE,
        Balance: aggregated[excludedBecauseRipple].Balance,
        MessageKey: aggregated[excludedBecauseRipple].MessageKey as string,
      },
    ];

    const expectedExcludedExchange = [
      {
        Address: nonParticipatingExchange,
        Class: DataClass.EXCLUDED_EXCHANGE,
        Balance: aggregated[nonParticipatingExchange].Balance,
        MessageKey: aggregated[nonParticipatingExchange].MessageKey as string,
      },
    ];

    await classify(db, config);

    const included = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.INCLUDED);
    const includedManual = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.INCLUDED_MANUAL);
    const excludedManual = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.EXCLUDED_MANUAL);
    const excludedNoKey = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.EXCLUDED_NO_KEY);
    const excludedBadKey = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.EXCLUDED_BAD_KEY);
    const excludedRipple = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.EXCLUDED_RIPPLE);
    const excludedExchange = await collectParameterizedData(db.snapshot, db.snapshot.process, DataClass.EXCLUDED_EXCHANGE);

    expect(sortList(included)).toEqual(expectedIncluded);
    expect(sortList(includedManual)).toEqual(expectedIncludedManual);
    expect(sortList(excludedManual)).toEqual(expectedExcludedManual);
    expect(sortList(excludedNoKey)).toEqual(expectedExcludedNoKey);
    expect(sortList(excludedBadKey)).toEqual(expectedExcludedBadKey);
    expect(sortList(excludedRipple)).toEqual(expectedExcludedRipple);
    expect(sortList(excludedExchange)).toEqual(expectedExcludedExchange);

    // Verify that the claim formula parameters and quota are properly calculated
    const fictionalTotal = 45 * (10 ** 9) * (10 ** 6);
    const rippleSum = 999;
    const npeSum = 333;

    // Seed metadata
    await db.meta.write({
      LedgerIndex: 11111,
      TotalCoins: fictionalTotal.toString(10),
    });

    const { totalXRP, rippleXRP, npeXRP } = await calculateParameters(db);

    expect(totalXRP.isEqualTo(fictionalTotal)).toBeTruthy();
    expect(rippleXRP.isEqualTo(rippleSum)).toBeTruthy();
    expect(npeXRP.isEqualTo(npeSum)).toBeTruthy();

    const quota = calculateQuota(totalXRP, rippleXRP, npeXRP);
    expect(quota.isEqualTo("2.2222")).toBeTruthy();
  });
});
