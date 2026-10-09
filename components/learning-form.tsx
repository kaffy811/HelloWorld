"use client";
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
export function LearningForm({
  parentId,
  ticker,
  available,
}: {
  companies: { ticker: string; name: string }[];
  parentId: string;
  ticker: string;
  available: boolean;
}) {
 const {t:ui}=useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState("");
  return (
    <form
      className="learning-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(e.currentTarget);
        form.set("parent_id", parentId);
        form.set("ticker", ticker);
        try {
          const r = await fetch("/api/learning", {
            method: "POST",
            body: form,
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          router.push(`/learning/${data.id}?saved=1`);
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {!available && (
        <p className="notice preference-note"><T text="New AI answers are temporarily unavailable."/></p>
      )}
      <fieldset className="form-fields" disabled={busy || !available}>
        <label htmlFor={"question-" + parentId}><T text="What would you like to understand?"/></label>
        <textarea
          id={"question-" + parentId}
          name="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          minLength={10}
          maxLength={12000}
          required
          placeholder={ui("Why could this affect the company’s profit margin?")}
        />
        <div className="question-chips">
          {[
            "Explain the company connection in simpler language.",
            "Explain the key term using an everyday example.",
            "What information is still missing?",
          ].map((q) => (
            <button
              key={q}
              type="button"
              className="text-button"
              onClick={() => setDraft(q)}
            >
              {ui(q)}
            </button>
          ))}
        </div>
        <label className="check-row">
          <input type="checkbox" name="public_material" value="true" required />
          <span><T text="My question contains no private information. I understand that the free AI service may use submitted content to improve its products."/></span>
        </label>
        <button className="button">
          {busy ? <T text="Preparing your answer…"/> : <T text="Ask AI"/>}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="notice preference-note">
          {ui(error)}
        </p>
      )}
      <p className="small"><T text="Your answer and generation prompt are saved privately. Up to three new answers per day, subject to shared availability."/></p>
    </form>
  );
}
