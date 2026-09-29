export const preferenceOptions = {
  investing_experience: [
    ["never", "I have not invested yet"],
    ["under_1", "Less than 1 year"],
    ["1_3", "1–3 years"],
    ["3_5", "3–5 years"],
    ["5_plus", "More than 5 years"],
  ],
  financial_english: [
    ["beginner", "Most financial terms are new to me"],
    ["basic", "I understand some financial terms"],
    ["comfortable", "I can read financial material comfortably"],
  ],
  explanation_depth: [
    ["brief", "Brief overview"],
    ["guided", "Step-by-step explanation"],
    ["detailed", "Detailed explanation with evidence"],
  ],
  learning_goal: [
    ["business", "Understand how companies make money"],
    ["statements", "Learn to read financial statements"],
    ["news", "Understand company news"],
    ["risks", "Understand risks and uncertainty"],
  ],
  reading_minutes: [
    ["5", "About 5 minutes"],
    ["10", "About 10 minutes"],
    ["20", "About 20 minutes"],
  ],
} as const;

export type LearningPreferences = {
  first_language: string | null;
  reading_language: string | null;
  investing_experience: string | null;
  financial_english: string | null;
  explanation_depth: string | null;
  learning_goal: string | null;
  reading_minutes: number | null;
};

export function parsePreferences(form: FormData): LearningPreferences {
  function language(name: string) {
    const value = String(form.get(name) ?? "").trim();
    if (value.length > 80)
      throw new Error("Language names must be 80 characters or fewer.");
    return value || null;
  }
  function choice(name: keyof typeof preferenceOptions) {
    const value = String(form.get(name) ?? "");
    if (!value) return null;
    if (!preferenceOptions[name].some(([key]) => key === value))
      throw new Error("Please choose a listed learning preference.");
    return value;
  }
  const minutes = choice("reading_minutes");
  return {
    first_language: language("first_language"),
    reading_language: language("reading_language"),
    investing_experience: choice("investing_experience"),
    financial_english: choice("financial_english"),
    explanation_depth: choice("explanation_depth"),
    learning_goal: choice("learning_goal"),
    reading_minutes: minutes ? Number(minutes) : null,
  };
}
