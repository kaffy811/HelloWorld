export const languages = [
  ["zh-Hans", "简体中文"],
  ["zh-Hant-HK", "繁體中文（香港／澳門）"],
  ["zh-Hant-TW", "繁體中文（中國台灣）"],
  ["en", "English"],
  ["hi", "हिन्दी（印地语）"],
  ["es", "Español（西班牙语）"],
  ["ko", "한국어（韩语）"],
  ["ja", "日本語（日语）"],
  ["fr", "Français（法语）"],
  ["ru", "Русский（俄语）"],
] as const;
export const experienceOptions = [
  ["never", "Not yet"],
  ["under_1", "Less than 1 year"],
  ["1_3", "1–3 years"],
  ["3_5", "3–5 years"],
  ["5_plus", "5+ years"],
] as const;
export const depthOptions = [
  ["brief", "Quick overview"],
  ["guided", "Step by step"],
  ["detailed", "In depth"],
] as const;
export const goalOptions = [
  ["business", "Company business"],
  ["metrics", "Financial metrics"],
  ["statements", "Financial statements"],
  ["news", "Company news"],
  ["risks", "Risks & uncertainty"],
] as const;
export const confidenceLabels = [
  "Completely new",
  "A few terms",
  "Mostly comfortable",
  "Confident reader",
] as const;
export type LearningPreferences = {
  native_language_code: string | null;
  preferred_language_code: string | null;
  investing_experience: string | null;
  english_confidence: number | null;
  explanation_depth: string | null;
  learning_goals: string[];
};
export const emptyPreferences: LearningPreferences = {
  native_language_code: null,
  preferred_language_code: null,
  investing_experience: null,
  english_confidence: null,
  explanation_depth: null,
  learning_goals: [],
};
export function validatePreferences(
  p: LearningPreferences,
): LearningPreferences {
  const member = (
    v: string | null,
    options: readonly (readonly [string, string])[],
  ) => v === null || options.some(([key]) => key === v);
  if (
    !member(p.native_language_code, languages) ||
    !member(p.preferred_language_code, languages) ||
    !member(p.investing_experience, experienceOptions) ||
    !member(p.explanation_depth, depthOptions)
  )
    throw new Error("Choose one of the available options.");
  if (
    p.english_confidence !== null &&
    (!Number.isInteger(p.english_confidence) ||
      p.english_confidence < 1 ||
      p.english_confidence > 4)
  )
    throw new Error("Choose a confidence level from 1 to 4.");
  if (
    !Array.isArray(p.learning_goals) ||
    p.learning_goals.some((v) => !goalOptions.some(([key]) => key === v))
  )
    throw new Error("Choose one of the available learning goals.");
  return {
    native_language_code: p.native_language_code,
    preferred_language_code: p.preferred_language_code,
    investing_experience: p.investing_experience,
    english_confidence: p.english_confidence,
    explanation_depth: p.explanation_depth,
    learning_goals: [...new Set(p.learning_goals)],
  };
}
