/**
 * ☑️ You can edit MOST of this file to add your own styles.
 */

/**
 * ✅ You can add/edit these imports
 */
import { InstrumentSymbol } from "../../common-leave-me";
import {
  InstrumentSocketClient,
  InstrumentWithChange,
} from "./InstrumentSocketClient";
import "./InstrumentReel.css";
import { useEffect, useId, useState } from "react";
import InstrumentReelItems from "./InstrumentReelItems";

/**
 * ❌ Please do not edit this
 */
const client = new InstrumentSocketClient();

/**
 * ❌ Please do not edit this hook name & args
 */
function useInstruments(instrumentSymbols: InstrumentSymbol[]) {
  /**
   * ✅ You can edit inside the body of this hook
   */
  // NOTE: You may notice that ws:// sub/unsub events are triggered twice
  // this is due to React.StrictMode used in leave-me/main.tsx
  // https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development
  const [instrumentData, setInstrumentData] = useState<
    InstrumentWithChange[] | null
  >(null);
  const cacheKey = instrumentSymbols.join(",");
  useEffect(() => {
    const stream = client.subscribe(instrumentSymbols);
    stream.listen((instruments) => {
      setInstrumentData(instruments);
    });
    return () => stream.unsubscribe();
  }, [cacheKey]);

  return instrumentData;
}

export interface InstrumentReelProps {
  instrumentSymbols: InstrumentSymbol[];
}

const MIN_ITEMS = 10;
function InstrumentReel({ instrumentSymbols }: InstrumentReelProps) {
  /**
   * ❌ Please do not edit this
   */
  const instruments = useInstruments(instrumentSymbols);
  /**
   * ✅ You can edit from here down in this component.
   * Please feel free to add more components to this file or other files if you want to.
   */

  // Without a unique idenifier to give to `key` at the root of this node,
  // react's DOM manipulation messes up with flex-box in a bad way if it
  // tries to delete a carousel off the start<->middle of the stack.
  const id = useId();

  // We need at least 10 items to be able to fill the carousel in a infinite way
  // and at least two copies of the carousel to animate cleanly
  const loops = Math.max(
    2,
    (instruments?.length ?? 0) > MIN_ITEMS
      ? 1
      : Math.ceil(MIN_ITEMS / (instruments?.length || 1))
  );

  const totalItems = instruments?.length || 0;

  // I wish this were simpler, but ES3/4 array compatibility is weird
  const iter = Array.from(Array(loops).keys());
  return (
    <div className="InstrumentReel" key={id}>
      {instruments === null ? (
        <p className="InstrumentReel__loader">Loading Instruments...</p>
      ) : (
        iter.map((_, index) => (
          <InstrumentReelItems
            total={totalItems}
            instruments={instruments}
            key={index}
          />
        ))
      )}
    </div>
  );
}

export default InstrumentReel;
