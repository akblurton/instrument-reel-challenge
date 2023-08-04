import { InstrumentWithChange } from "./InstrumentSocketClient";

export interface InstrumentReelItemsProps {
  instruments: InstrumentWithChange[];
  total: number;
}

const DURATION_PER_ITEM = 2;
const InstrumentReelItems = ({
  instruments,
  total,
}: InstrumentReelItemsProps) => {
  return (
    <div
      className="InstrumentReel__carousel"
      style={{
        animationDuration: `${total * DURATION_PER_ITEM}s`,
      }}
    >
      {instruments.map((instrument) => (
        <div className="InstrumentReel__item" key={instrument.code}>
          <div className="InstrumentReel__item__icon">
            <img
              src={`/${instrument.category}/${instrument.code}.svg`}
              className=""
            />
          </div>
          <p className="Instrument__Reel__item__name">{instrument.name}</p>
          <span
            className={`Instrument__Reel__item__value ${
              instrument.change > 0
                ? "is-increase"
                : instrument.change < 0
                ? "is-decrease"
                : ""
            }`}
          >
            <span>{instrument.lastQuote}</span>
            <span>
              {instrument.change > 0 ? "+" : ""}
              {instrument.change.toFixed(3)}%
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default InstrumentReelItems;
