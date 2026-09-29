"use client";
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
  const answered = [
    values.native_language_code,
    values.preferred_language_code,
    values.investing_experience,
    values.english_confidence,
    values.explanation_depth,
    values.learning_goals.length || null,
  ].filter((v) => v !== null).length;
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
          ...payload,
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
      if (onboarding) router.push("/");
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
    >
      Skip / clear
    </button>
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
          <span>{label}</span>
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
      <p className="small">
        All six questions are optional. {answered} of 6 answered. You can change
        or clear your answers later.
      </p>
      <fieldset className="form-fields" disabled={busy}>
        <fieldset className="preference-question">
          <legend>01 · First language</legend>
          <select
            aria-label="First language"
            value={values.native_language_code ?? ""}
            onChange={(e) =>
              set("native_language_code", e.target.value || null)
            }
          >
            <option value="">Choose a language (optional)</option>
            {languages.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          {skipButton("native_language_code")}
        </fieldset>
        <fieldset className="preference-question">
          <legend>02 · Preferred reading language</legend>
          <p className="small">
            This can be different from your first language.
          </p>
          <select
            aria-label="Preferred reading language"
            value={values.preferred_language_code ?? ""}
            onChange={(e) =>
              set("preferred_language_code", e.target.value || null)
            }
          >
            <option value="">Choose a language (optional)</option>
            {languages.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          {skipButton("preferred_language_code")}
        </fieldset>
        <fieldset className="preference-question">
          <legend>03 · Stock investing experience</legend>
          {options("investing_experience", experienceOptions)}
          {skipButton("investing_experience")}
        </fieldset>
        <fieldset className="preference-question">
          <legend>04 · Comfort with financial English</legend>
          <p className="small">
            Choose one level, from new to confident. No level is selected by
            default.
          </p>
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
                  {label}
                </span>
              </label>
            ))}
          </div>
          {skipButton("english_confidence")}
        </fieldset>
        <fieldset className="preference-question">
          <legend>05 · Preferred explanation depth</legend>
          {options("explanation_depth", depthOptions)}
          {skipButton("explanation_depth")}
        </fieldset>
        <fieldset className="preference-question">
          <legend>06 · Main learning goals</legend>
          <p className="small">Choose any that interest you.</p>
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
                <span>{label}</span>
              </label>
            ))}
          </div>
          {skipButton("learning_goals")}
        </fieldset>
        <div className="notice preference-note">
          These answers prepare your learning preferences. Company introductions
          are currently in English; automatic translation and personalized
          explanations are coming later.
        </div>
        <div className="onboarding-actions">
          <button className="button" type="submit">
            {busy
              ? "Saving…"
              : onboarding
                ? "Save and start →"
                : "Save preferences"}
          </button>
          {onboarding && (
            <button
              className="text-button"
              type="button"
              onClick={() => void save(true)}
            >
              Skip all
            </button>
          )}
        </div>
        {onboarding && (
          <p className="small">
            Skip all discards the choices on this page and opens the homepage.
            Your name and photo are kept.
          </p>
        )}
      </fieldset>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <Link
        className="text-link"
        href={onboarding ? "/onboarding?edit=1" : "/profile"}
      >
        ← Back to profile
      </Link>
    </form>
  );
}
