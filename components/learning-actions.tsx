"use client";
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
const reasonOptions = [
  ["jargon", "Too much jargon"],
  ["too_long", "Too long"],
  ["connection", "Company connection is unclear"],
  ["unanswered", "My question was not answered"],
  ["factual_error", "Possible factual error"],
];
export function RatingControls({
  id,
  initial,
  helpful,
  unhelpful,
  signedIn,
  countsAvailable = true,
  returnPath,
}: {
  id: string;
  initial: number | null;
  helpful: number;
  unhelpful: number;
  signedIn: boolean;
  countsAvailable?: boolean;
  returnPath?: string;
}) {
 const {t:ui}=useLanguage();
  const [value, setValue] = useState(initial);
  const [reason, setReason] = useState("");
  const [negative, setNegative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ helpful, unhelpful });
  async function vote(v: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: id,
          value: v,
          reason: v === -1 ? reason || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setValue(v);
      setCounts((c) => ({
        ...c,
        [v === 1 ? "helpful" : "unhelpful"]:
          c[v === 1 ? "helpful" : "unhelpful"] + 1,
      }));
      setNegative(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your rating could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel feedback">
      <span className="eyebrow"><T text="HELP US EXPLAIN BETTER"/></span>
      <h2><T text="Did this help you understand?"/></h2>
      <p><T text="Your rating reflects how useful this explanation was to you."/></p>
      {!signedIn ? (
        <Link
          className="button"
          href={`/login?next=${encodeURIComponent(returnPath || "/news/" + id)}`}
        ><T text="Sign in to rate"/></Link>
      ) : (
        <div className="rating-row">
          <button
            className={`rating-button ${value === 1 ? "selected" : ""}`}
            aria-pressed={value === 1}
            disabled={busy || value !== null}
            onClick={() => vote(1)}
          ><T text="💡 Helpful"/></button>
          <button
            className={`rating-button ${value === -1 ? "selected" : ""}`}
            aria-pressed={value === -1}
            disabled={busy || value !== null}
            onClick={() => setNegative(!negative)}
          ><T text="😕 Not helpful"/></button>
        </div>
      )}
      {negative && value === null && (
        <div className="reason-picker">
          <label htmlFor="rating-reason"><T text="What could be clearer? "/><span className="small"><T text="Optional"/></span>
          </label>
          <select
            id="rating-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value=""><T text="No reason selected"/></option>
            {reasonOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {ui(label)}
              </option>
            ))}
          </select>
          <button className="button" disabled={busy} onClick={() => vote(-1)}><T text="Save rating"/></button>
        </div>
      )}
      <p className="small" aria-live="polite">
        {value !== null ? <T text="Your rating is saved for this version. "/> : ""}
        {countsAvailable
          ? `${counts.helpful} helpful · ${counts.unhelpful} not helpful`
          : <T text="Rating totals are temporarily unavailable."/>}
      </p>
      {error && <p role="alert">{ui(error)}</p>}
    </section>
  );
}
export function FollowButton({
  ticker,
  initial = false,
  signedIn = false,
  variant = "button",
  available = true,
  returnPath,
}: {
  ticker: string;
  initial?: boolean;
  signedIn?: boolean;
  variant?: "button" | "star";
  available?: boolean;
  returnPath?: string;
}) {
 const {t:ui}=useLanguage();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const star = variant === "star";
  const label = !available
    ? `${ticker} watchlist status is unavailable`
    : following ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`;
  if (!signedIn)
    return (
      <Link
        className={star ? "watchlist-star" : "button secondary"}
        aria-label={star ? ui(`Sign in to add ${ticker} to watchlist`) : undefined}
        title={star ? "Sign in to save to your watchlist" : undefined}
        href={`/login?next=${encodeURIComponent(returnPath || "/stocks/" + ticker)}`}
      >
        {star ? <span aria-hidden="true">☆</span> : <T text="Sign in to save"/>}
      </Link>
    );
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, follow: !following }),
      });
      if (!res.ok) throw new Error("Your watchlist could not be saved.");
      setFollowing(!following);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={star ? "watchlist-star-control" : undefined}>
      <button
        className={star ? `watchlist-star ${following ? "is-saved" : ""}` : "button secondary"}
        onClick={toggle}
        disabled={busy || !available}
        aria-pressed={available ? following : undefined}
        aria-label={star ? ui(label) : undefined}
        title={star ? ui(label) : undefined}
        aria-busy={busy}
      >
        {star ? <span aria-hidden="true">{following ? "★" : "☆"}</span> : following ? <T text="★ Saved to watchlist"/> : <T text="☆ Add to watchlist"/>}
      </button>
      {error && (
        <p role="alert" className="small">
          {ui(error)}
        </p>
      )}
    </div>
  );
}
