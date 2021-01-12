import { Connection } from "ripple-lib/dist/npm/common";

export abstract class ConnectionProxy {
  protected static createFromHandler(proxiedConnection: Connection, handler: ConnectionProxy): Connection {
    return new Proxy(proxiedConnection, handler);
  }

  protected abstract handleRequest(target: Connection, request: any, timeout?: number): Promise<any>;

  // noinspection JSUnusedGlobalSymbols
  public get(target: Connection, p: string | number | symbol): any {
    if (p === "request") {
      return (request: any, timeout?: number) =>
        this.handleRequest(target, request, timeout);
    } else {
      const value = target[p as keyof Connection];
      if (typeof value === "function") {
        // Re-wrap all functions to ensure that their "this" pointer points
        // to the internal Connection instance and NOT the proxy again. This
        // is needed to ensure that internal functionality is not affected
        // by any special behavior implemented in the proxy.
        return (...args: any[]) => (value as any).apply(target, args);
      } else {
        return value;
      }
    }
  }
}
