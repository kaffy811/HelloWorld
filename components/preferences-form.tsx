"use client";
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  languages,
  experienceOptions,
  depthOptions,
  goalOptions,
  confidenceLabels,
  emptyPreferences,
  validatePreferences,
  type LearningPreferences,
} from "@/lib/learning-preferences";
export function PreferencesForm({
  userId,
  initial,
  onboarding = false,
}: {
  userId: string;
  initial: LearningPreferences;
  onboarding?: boolean;
}) {
 const {t:ui}=useLanguage();
  const [values, setValues] = useState<LearningPreferences>({
    ...emptyPreferences,
    ...initial,
    learning_goals: initial.learning_goals ?? [],
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  function set<K extends keyof LearningPreferences>(
    key: K,
    value: LearningPreferences[K],
  ) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function save(skip = false) {
    setBusy(true);
    setMessage("");
    try {
      const payload = validatePreferences(
        skip ? { ...emptyPreferences } : values,
      );
      const { data, error } = await createClient()
        .from("profiles")
        .update({
          ...Object.fromEntries(Object.entries(payload).filter(([key])=>key!=="preferred_language_code")),
          ...(onboarding
            ? { onboarding_completed_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", userId)
        .select("id")
        .single();
      if (error || !data)
        throw new Error(
          "Your preferences could not be saved. Please try again.",
        );
      // Complete the cookie-writing auth Route Handler with a document navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (onboarding) window.location.assign("/auth/complete");
      else {
        setValues(payload);
        setMessage("Learning preferences saved.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function clear(key: keyof LearningPreferences) {
    setValues((old) => ({
      ...old,
      [key]: key === "learning_goals" ? [] : null,
    }));
  }
  const skipButton = (key: keyof LearningPreferences) => (
    <button
      type="button"
      className="text-button skip-question"
      onClick={() => clear(key)}
    ><T text="Skip / clear"/></button>
  );
  const options = (
    key: "investing_experience" | "explanation_depth",
    items: readonly (readonly [string, string])[],
  ) => (
    <div className="choice-grid">
      {items.map(([value, label]) => (
        <label className="choice" key={value}>
          <input
            type="radio"
            name={key}
            value={value}
            checked={values[key] === value}
            onChange={() => set(key, value)}
          />
          <span>{ui(label)}</span>
        </label>
      ))}
    </div>
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p className="small"><T text="All questions are optional. You can change or clear your answers later."/></p>
      <fieldset className="form-fields" disabled={busy}>
        <fieldset className="preference-question">
          <legend><T text="01 · First language"/></legend>
          <select
            aria-label={ui("First language")}
            value={values.native_language_code ?? ""}
            onChange={(e) =>
              set("native_language_code", e.target.value || null)
            }
          >
            <option value=""><T text="Choose a language (optional)"/></option>
            {languages.map(([code, label]) => (
              <option key={code} value={code}>
                {ui(label)}
              </option>
            ))}
          </select>
          {skipButton("native_language_code")}
        </fieldset>
        <fieldset className="preference-question">
          <legend><T text="03 · Stock investing experience"/></legend>
          {options("investing_experience", experienceOptions)}
          {skipButton("investing_experience")}
        </fieldset>
        <fieldset className="preference-question">
          <legend><T text="04 · Comfort with financial English"/></legend>
          <p className="small"><T text="Choose one level, from new to confident. No level is selected by default."/></p>
          <div className="confidence-scale">
            {confidenceLabels.map((label, i) => (
              <label
                className={`confidence-step ${values.english_confidence !== null && i < values.english_confidence ? "filled" : ""}`}
                key={label}
              >
                <input
                  type="radio"
                  name="english_confidence"
                  value={i + 1}
                  checked={values.english_confidence === i + 1}
                  onChange={() => set("english_confidence", i + 1)}
                />
                <span>
                  <b>{i + 1}</b>
                  {ui(label)}
                </span>
              </label>
            ))}
          </div>
          {skipButton("english_confidence")}
        </fieldset>
        <fieldset className="preference-question">
          <legend><T text="05 · Preferred explanation depth"/></legend>
          {options("explanation_depth", depthOptions)}
          {skipButton("explanation_depth")}
        </fieldset>
        <fieldset className="preference-question">
          <legend><T text="06 · Main learning goals"/></legend>
          <p className="small"><T text="Choose any that interest you."/></p>
          <div className="choice-grid">
            {goalOptions.map(([value, label]) => (
              <label className="choice" key={value}>
                <input
                  type="checkbox"
                  checked={values.learning_goals.includes(value)}
                  onChange={(e) =>
                    set(
                      "learning_goals",
                      e.target.checked
                        ? [...values.learning_goals, value]
                        : values.learning_goals.filter((v) => v !== value),
                    )
                  }
                />
                <span>{ui(label)}</span>
              </label>
            ))}
          </div>
          {skipButton("learning_goals")}
        </fieldset>
        <div className="notice preference-note"><T text="Choose your system language in Settings. It applies to the interface and new AI answers."/></div>
        <div className="onboarding-actions">
          <button className="button" type="submit">
            {busy
              ? <T text="Saving…"/>
              : onboarding
                ? <T text="Save and start →"/>
                : <T text="Save preferences"/>}
          </button>
          {onboarding && (
            <button
              className="text-button"
              type="button"
              onClick={() => void save(true)}
            ><T text="Skip all"/></button>
          )}
        </div>
        {onboarding && (
          <p className="small"><T text="Skip all discards the choices on this page and opens the homepage. Your name and photo are kept."/></p>
        )}
      </fieldset>
      <p role="status" aria-live="polite">
        {ui(message)}
      </p>
      <Link
        className="text-link"
        href={onboarding ? "/onboarding?edit=1" : "/profile"}
      ><T text="← Back to profile"/></Link>
    </form>
  );
}
