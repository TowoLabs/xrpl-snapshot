#!/usr/bin/env node

const WebSocket = require("ws");

function initialize() {
  return new Promise((resolve, reject) => {
    const count = 256 + 2;
    const ws = new WebSocket("ws://localhost:6006");

    ws.on("open", function open() {
      console.log("Initializing rippled server, please wait...");
      for (let i = 1; i <= count; i++) {
        ws.send(
          JSON.stringify({
            id: i,
            command: "ledger_accept",
          })
        );
      }
    });

    ws.on("message", function incoming(data) {
      const decoded = JSON.parse(data);
      if (decoded.id === count) {
        console.log("Initialized!");
        ws.close();
        resolve();
      }
    });

    ws.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function attemptInitialize() {
  for (let i = 0; i < 10; i++) {
    try {
      await initialize();
      break;
    } catch {
      if (i > 3) {
        console.warn("Initialization failed, retrying...");
      }

      await sleep(1000 * i);
    }
  }
}

// noinspection JSIgnoredPromiseFromCall
attemptInitialize();
