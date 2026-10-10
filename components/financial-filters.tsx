"use client";
import {T} from "@/components/language-provider";

import { useState } from "react";
import type { Period } from "@/lib/market/types";
export function FinancialFilters({
  ticker,
  periods,
  frequency,
  end,
}: {
  ticker: string;
  periods: Period[];
  frequency: string;
  end: string;
}) {
  const [selected, setSelected] = useState(frequency),
    [selectedEnd, setEnd] = useState(end);
  const available = periods.filter((p) => p.frequency === selected).filter((p,i,all)=>all.findIndex(v=>v.end===p.end)===i);
  return (
    <form className="financial-filter" action={`/stocks/${ticker}/financials`}>
      <label><T text="Reporting period"/><select
          name="period"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setEnd(
              periods.find((p) => p.frequency === e.target.value)?.end || "",
            );
          }}
        >
          <option value="annual"><T text="Annual"/></option>
          <option value="quarter"><T text="Quarterly"/></option>
          <option value="year-to-date"><T text="Year to date"/></option>
        </select>
      </label>
      <label><T text="Period end"/><select
          name="end"
          value={selectedEnd}
          onChange={(e) => setEnd(e.target.value)}
          disabled={!available.length}
        >
          {available.map((p) => (
            <option key={p.end} value={p.end}>
              {p.end}
            </option>
          ))}
        </select>
      </label>
      <button className="button secondary"><T text="View"/></button>
    </form>
  );
}
