import { Transaction } from "./Transaction";
import { Item, Processor } from "../src/data/Database";

const WebSocket = require("ws");

export interface AccountData {
  address: string;
  secret: string;
}

export const GENESIS = {
  address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  secret: "snoPBrXtMeMyMHUVTgbuqAfg1SUTb",
};

export async function fundAccount(amount: number) {
  return new Promise<AccountData>((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:6006");

    let accountData: AccountData | undefined;

    ws.on("open", function open() {
      ws.send(
        JSON.stringify({
          id: 1,
          command: "wallet_propose",
          key_type: "secp256k1",
        })
      );
    });

    ws.on("message", function incoming(data: any) {
      const decoded = JSON.parse(data);
      if (decoded.id === 1) {
        accountData = {
          address: decoded.result.account_id,
          secret: decoded.result.master_seed,
        };

        ws.send(
          JSON.stringify({
            id: 2,
            command: "submit",
            tx_json: {
              TransactionType: "Payment",
              Account: GENESIS.address,
              Destination: accountData.address,
              Amount: (amount * 1000000).toString(),
            },
            secret: GENESIS.secret,
            offline: false,
            fee_mult_max: 1000,
          })
        );
      } else if (decoded.id === 2) {
        if (decoded.result.engine_result === "tesSUCCESS") {
          ws.send(
            JSON.stringify({
              id: 3,
              command: "ledger_accept",
            })
          );
        } else {
          reject(
            new Error(
              `Unable to fund account (${decoded.result.engine_result})`
            )
          );
        }
      } else if (decoded.id === 3) {
        ws.close();
        resolve(accountData);
      }
    });

    ws.on("error", reject);
  });
}

export async function sendTransaction(account: AccountData, tx: Transaction) {
  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:6006");

    let txHash: string;

    ws.on("open", function open() {
      ws.send(
        JSON.stringify({
          id: 1,
          command: "submit",
          tx_json: {
            Account: account.address,
            ...tx,
          },
          secret: account.secret,
          offline: false,
          fee_mult_max: 1000,
        })
      );
    });

    ws.on("message", function incoming(data: any) {
      const decoded = JSON.parse(data);
      if (decoded.id === 1) {
        if (decoded.result.engine_result === "tesSUCCESS") {
          txHash = decoded.result.tx_json.hash;
          ws.send(
            JSON.stringify({
              id: 2,
              command: "ledger_accept",
            })
          );
        } else {
          reject(
            new Error(
              `Unable to send transaction (${decoded.result.engine_result})`
            )
          );
        }
      } else if (decoded.id === 2) {
        ws.close();
        resolve(txHash);
      }
    });

    ws.on("error", reject);
  });
}

export async function advanceLedger(): Promise<number> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:6006");

    ws.on("open", function open() {
      ws.send(
        JSON.stringify({
          id: 1,
          command: "ledger_accept",
        })
      );
    });

    ws.on("message", function incoming(data: any) {
      const decoded = JSON.parse(data);
      const ledgerIndex = decoded.result.ledger_current_index;

      ws.close();
      resolve(ledgerIndex);
    });

    ws.on("error", reject);
  });
}

export async function collectData<T, D>(target: T, callback: (processor: Processor<D>) => Promise<any>) {
  const boundCallback = callback.bind(target);

  const collectedItems = [] as D[];
  const processor = async (item: D) => {
    collectedItems.push(item);
  };

  await boundCallback(processor);

  return collectedItems;
}

export async function collectParameterizedData<T, D, P>(target: T, callback: (param: P, processor: Processor<D>) => Promise<any>, param: P) {
  const boundCallback = callback.bind(target);

  const collectedItems = [] as D[];
  const processor = async (item: Item<D>) => {
    delete item._id;
    collectedItems.push(item);
  };

  await boundCallback(param, processor);

  return collectedItems;
}
