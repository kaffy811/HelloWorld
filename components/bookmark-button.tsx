"use client";
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function BookmarkButton({
  selection,
  initial = false,
  signedIn,
  returnPath = "/notebook",
}: {
  selection: {
    concept?: string;
    glossary?: string;
    topic?: string;
    text?: string;
    analysis_id?: string;
    section?: string;
    index?: number;
  };
  initial?: boolean;
  signedIn: boolean;
  returnPath?: string;
}) {
 const {t:ui}=useLanguage();
  const [saved, setSaved] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!signedIn)
    return (
      <Link
        className="save-knowledge"
        href={`/login?next=${encodeURIComponent(returnPath)}`}
      ><T text="Save to Notebook"/></Link>
    );
  return (
    <span className="save-knowledge-control">
      <button
        type="button"
        className="save-knowledge"
        disabled={saved || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/bookmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(selection),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <T text="Saving…"/> : saved ? <T text="In Notebook"/> : <T text="Save to Notebook"/>}
      </button>
      {saved && (
        <Link className="small" href="/notebook?kind=terms"><T text="Open notebook ↗"/></Link>
      )}
      {error && (
        <span className="small" role="alert">
          {ui(error)}
        </span>
      )}
    </span>
  );
}
export function RemoveBookmark({ id }: { id: string }) {
 const {t:ui}=useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/bookmarks", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            if (!r.ok) throw new Error("Could not remove. Please try again.");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <T text="Removing…"/> : <T text="Remove"/>}
      </button>
      {error && (
        <p className="small" role="alert">
          {ui(error)}
        </p>
      )}
    </>
  );
}
