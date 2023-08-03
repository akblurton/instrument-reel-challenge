/**
 * ☑️ You can edit MOST of this file to add your own styles.
 */

/**
 * ✅ You can add/edit these imports
 */
import { Instrument, InstrumentSymbol } from "../../common-leave-me";
import { InstrumentSocketClient } from "./InstrumentSocketClient";
import "./InstrumentReel.css";
import { useEffect, useState } from "react";

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
  const [instrumentData, setInstrumentData] = useState<Instrument[] | null>(
    null
  );
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

function InstrumentReel({ instrumentSymbols }: InstrumentReelProps) {
  /**
   * ❌ Please do not edit this
   */
  const instruments = useInstruments(instrumentSymbols);

  /**
   * ✅ You can edit from here down in this component.
   * Please feel free to add more components to this file or other files if you want to.
   */

  return <pre>{JSON.stringify(instruments, null, 2)}</pre>;

  return <div>Instrument Reel</div>;
}

export default InstrumentReel;
