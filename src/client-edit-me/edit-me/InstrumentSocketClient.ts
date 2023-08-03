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

type InstrumentMessageHandler = (msg: Instrument[]) => void;

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

  private _listen(handler: (msg: WebSocketServerMessageJson) => void) {
    const listener = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as WebSocketServerMessageJson;
        handler(parsed);
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

  subscribe(instrumentSymbols: InstrumentSymbol[]) {
    // Keep  a copy of our symbols (prevent accidental tamper)
    const symbols = [...instrumentSymbols];
    this._send({
      type: "subscribe",
      instrumentSymbols,
    });

    // Update subscription records
    for (const symbol of symbols) {
      if (!this._subscriptions.has(symbol)) {
        this._subscriptions.set(symbol, 0);
      }
      const current = this._subscriptions.get(symbol) ?? 0;
      this._subscriptions.set(symbol, current + 1);
    }

    // "syncronous" flag to disable any state updates upstream immediately
    // on unsubscribe
    let subscribed = true;
    let handler: InstrumentMessageHandler | undefined = void 0;

    const unlisten = this._listen((msg) => {
      if (!subscribed) {
        return;
      }

      // Only process known message types
      if (msg.type !== "update") {
        return;
      }

      // Filter out any data we've not requested for this subscription
      handler?.(msg.instruments.filter((inst) => symbols.includes(inst.code)));
    });

    return {
      listen: (fn: InstrumentMessageHandler) => {
        handler = fn;
      },
      unsubscribe: () => {
        subscribed = false;
        unlisten();

        const unsubSymbols: InstrumentSymbol[] = [];
        // Update subscription records
        for (const symbol of symbols) {
          // Shouldn't ever happen, but just in case
          if (!this._subscriptions.has(symbol)) {
            this._subscriptions.set(symbol, 0);
          }
          const next = Math.max((this._subscriptions.get(symbol) ?? 0) - 1, 0);
          this._subscriptions.set(symbol, next);
          if (next === 0) {
            unsubSymbols.push(symbol);
          }
        }

        this._send({
          type: "unsubscribe",
          instrumentSymbols: unsubSymbols,
        });
      },
    };
  }
}
