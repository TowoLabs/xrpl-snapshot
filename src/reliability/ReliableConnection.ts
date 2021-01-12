import { ConnectionProxy } from "./ConnectionProxy";
import { RippleAPI } from "ripple-lib";
import { Connection } from "ripple-lib/dist/npm/common";
import { logger } from "../utils/Logging";
import { sleep } from "./Sleep";
import { ConnectionError, RippleError } from "ripple-lib/dist/npm/common/errors";

export class ReliableConnection extends ConnectionProxy {
  constructor() {
    super();
  }

  public static create(api: RippleAPI): Connection {
    const handler = new ReliableConnection();

    return this.createFromHandler(api.connection, handler);
  }

  protected async handleRequest(
    target: Connection,
    request: any,
    timeout?: number
  ): Promise<any> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await target.request(request, timeout);
      } catch (error) {
        if (ReliableConnection.isRecoverableError(error)) {
          // Handle connection errors by reconnecting and retrying to ensure
          // that the application does not break because of a flaky connection

          logger.warn("Failed to fetch data from XRPL node. Retrying...");

          await sleep(3000);

          if (!target.isConnected()) {
            logger.warn("Reconnecting...");

            // eslint-disable-next-line no-constant-condition
            while (true) {
              try {
                await target.connect();
                break;
              } catch (error) {
                logger.warn(`Failed to reconnect, retrying...`);
                await sleep(3000);
              }
            }
          }
        } else {
          // Normal error, make sure it's re-thrown
          throw error;
        }
      }
    }
  }

  private static isRecoverableError(error: any) {
    if (error instanceof ConnectionError) {
      return true;
    }

    if (error instanceof RippleError) {
      if (error.data.error === "tooBusy") {
        return true;
      }
    }

    if (error.message?.startsWith("WebSocket is not open")) {
      return true;
    }

    return false;
  }
}
