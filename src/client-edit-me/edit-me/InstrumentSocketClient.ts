/**
 * ☑️ You can edit MOST of this file to add your own styles.
 */

/**
 * ✅ You can add/edit these imports
 */
import {
  Instrument,
  InstrumentSymbol,
  WebSocketClientMessageJson,
  WebSocketMessage,
  WebSocketReadyState,
  WebSocketServerMessageJson,
} from "../../common-leave-me";

export type InstrumentWithChange = Instrument & {
  change: number;
};

/**
 * Notes:
 *
 * To subscribe or unsubscribe to/from instrument(s), send a message to the server with the following format:
 *
 * export type WebSocketClientMessageJson =
  | {
      type: "subscribe";
      instrumentSymbols: InstrumentSymbol[];
    }
  | {
      type: "unsubscribe";
      instrumentSymbols: InstrumentSymbol[];
    };
  *
  * The server will start responding with a message with the following format:
  *
  * export type WebSocketServerMessageJson = {
      type: "update";
      instruments: Instrument[];
    };
 */

type InstrumentMessageHandler = (msg: InstrumentWithChange[]) => void;

/**
 * ❌ Please do not edit this class name
 */
export class InstrumentSocketClient {
  /**
   * ❌ Please do not edit this private property name
   */
  private _socket: WebSocket;

  /**
   * ✅ You can add more properties for the class here (if you want) 👇
   */
  // Events that fired before the websocket was connected
  private _buffer: WebSocketClientMessageJson[] = [];
  private _connected = false;

  // Keep track of active subscriptions for each symbol
  private _subscriptions = new Map<InstrumentSymbol, number>();
  // Hold current subscription
  private _activeSubscription: {
    symbols: string;
    unsubscribe: () => void;
  } | null = null;

  // Keep hold of last known values for diff calculation
  private _lastValue = new Map<InstrumentSymbol, number>();
  private _handlers: InstrumentMessageHandler[] = [];

  constructor() {
    /**
     * ❌ Please do not edit this private property assignment
     */
    this._socket = new WebSocket("ws://localhost:3000/ws");

    /**
     * ✅ You can edit from here down 👇
     */
    this._socket.addEventListener("open", () => {
      this._connected = true;
      this._processBuffer();
    });

    this._socket.addEventListener("close", () => {
      this._connected = false;
    });

    // Setup listener
    this._listen();
  }

  private _processBuffer() {
    let msg: WebSocketClientMessageJson | undefined;
    while (this._buffer[0]) {
      if (!this._connected) {
        break;
      }
      this._send(this._buffer[0]);
      this._buffer.shift();
    }
  }

  private _send(message: WebSocketClientMessageJson) {
    if (!this._connected) {
      this._buffer.push(message);
      return;
    }
    this._socket.send(JSON.stringify(message));
  }

  private _listen() {
    const listener = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as WebSocketServerMessageJson;
        // Only process known message types
        if (parsed.type !== "update") {
          return;
        }

        const result = parsed.instruments.map((instrument) => {
          let change = 0;
          if (this._lastValue.has(instrument.code)) {
            change =
              this._lastValue.get(instrument.code)! - instrument.lastQuote;
          }

          // A 0 change could be from multiple subscriptions,
          // or data that hasn't changed, ignore it
          if (change || !this._lastValue.has(instrument.code)) {
            this._lastValue.set(instrument.code, instrument.lastQuote);
          }

          return {
            ...instrument,
            change,
          } as InstrumentWithChange;
        });

        for (const handler of this._handlers) {
          handler(result);
        }
      } catch (e) {
        // Ignore any invalid data parsing
        // We're also not doing any runtime type checking so we're assuming
        // the WS server is adhering to our contracts
      }
    };

    this._socket.addEventListener("message", listener);
    return () => {
      this._socket.removeEventListener("message", listener);
    };
  }

  // Handle subscribing to our socket, re-using the connection for any
  // new or removed symbols
  private _sync() {
    const activeSymbols = this._activeSubscription?.symbols ?? "";
    // Look at every active symbol subscription we have and compress into a set
    const nextSymbols = Array.from(this._subscriptions.entries()).reduce(
      (arr, [symbol, count]: [InstrumentSymbol, number]) => {
        if (count === 0) {
          return arr;
        }

        return [...arr, symbol];
      },
      [] as InstrumentSymbol[]
    );

    if (nextSymbols.join(",") === activeSymbols) {
      // No change to our total subscription count ignore
      return;
    }
    this._activeSubscription?.unsubscribe();

    if (!nextSymbols.length) {
      this._activeSubscription = null;
      return;
    }

    this._activeSubscription = {
      symbols: nextSymbols.join(","),
      unsubscribe: () => {
        this._send({
          type: "unsubscribe",
          instrumentSymbols: nextSymbols,
        });
      },
    };

    this._send({
      type: "subscribe",
      instrumentSymbols: nextSymbols,
    });

    const symbols: InstrumentSymbol[] = [];
  }

  subscribe(instrumentSymbols: InstrumentSymbol[]) {
    // Keep  a copy of our symbols (prevent accidental tamper)
    const symbols = [...instrumentSymbols];
    // Update subscription records
    for (const symbol of symbols) {
      if (!this._subscriptions.has(symbol)) {
        this._subscriptions.set(symbol, 0);
      }
      const current = this._subscriptions.get(symbol) ?? 0;
      this._subscriptions.set(symbol, current + 1);
    }
    this._sync();

    // "syncronous" flag to disable any state updates upstream immediately
    // on unsubscribe

    let handler: InstrumentMessageHandler | null = null;
    // Internal handler that checks subscribed flag to immediately cancel any
    // state behaviours
    let subscribed = true;
    const internalHandler: InstrumentMessageHandler = (data) => {
      if (subscribed) {
        // Filter down to only the symbols requested
        handler?.(data.filter(({ code }) => symbols.includes(code)));
      }
    };
    return {
      listen: (fn: InstrumentMessageHandler) => {
        handler = fn;
        this._handlers.push(internalHandler);
      },
      unsubscribe: () => {
        subscribed = false;
        this._handlers = this._handlers.filter((h) => h !== internalHandler);
        // Update subscription records
        for (const symbol of symbols) {
          // Shouldn't ever happen, but just in case
          if (!this._subscriptions.has(symbol)) {
            this._subscriptions.set(symbol, 0);
          }
          const next = Math.max((this._subscriptions.get(symbol) ?? 0) - 1, 0);
          this._subscriptions.set(symbol, next);
          if (next === 0) {
            // Don't store last known value of a completely unsubscribed
            // value in case we end up seeing extreme change
            this._lastValue.delete(symbol);
          }
        }
        this._sync();
      },
    };
  }
}
