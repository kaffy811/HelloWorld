"use client";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  parsePreferences,
  preferenceOptions,
  type LearningPreferences,
} from "@/lib/learning-preferences";
export function ProfileForm({
  userId,
  email,
  firstName,
  lastName,
  avatarUrl,
  preferences,
}: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  preferences: LearningPreferences;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const first = String(form.get("first_name") ?? "").trim();
    const last = String(form.get("last_name") ?? "").trim();
    const supabase = createClient();
    let uploadedPath: string | null = null;
    try {
      if (!first || !last || first.length > 80 || last.length > 80)
        throw new Error("Enter both names, using at most 80 characters each.");
      const learningPreferences = parsePreferences(form);
      const file = form.get("photo");
      if (file instanceof File && file.size) {
        const extensions: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };
        if (!extensions[file.type] || file.size > 2 * 1024 * 1024)
          throw new Error("Choose a JPG, PNG or WebP photo smaller than 2 MB.");
        const path = `${userId}/${crypto.randomUUID()}.${extensions[file.type]}`;
        const { error } = await supabase.storage
          .from("avatars")
          .upload(path, file, { contentType: file.type });
        if (error) throw new Error("Photo upload failed. Please try again.");
        uploadedPath = path;
      }
      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...learningPreferences,
          first_name: first,
          last_name: last,
          ...(uploadedPath ? { avatar_path: uploadedPath } : {}),
        })
        .eq("id", userId)
        .select("id")
        .single();
      if (error || !data)
        throw new Error("Your profile could not be saved. Please try again.");
      setMessage("Profile saved. Your learning space is ready.");
      router.refresh();
    } catch (error) {
      if (uploadedPath)
        await supabase.storage.from("avatars").remove([uploadedPath]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setMessage("Could not sign out. Please retry.");
      setBusy(false);
    } else {
      router.push("/login");
      router.refresh();
    }
  }
  return (
    <>
      <form onSubmit={save}>
        <div className="avatar-row">
          {avatarUrl ? (
            <Image
              unoptimized
              width={72}
              height={72}
              className="avatar"
              src={avatarUrl}
              alt="Your profile photo"
            />
          ) : (
            <div className="avatar placeholder">
              {firstName.charAt(0) || "U"}
            </div>
          )}
          <div>
            <strong>Your account</strong>
            <p className="small">{email}</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            First name
            <input
              name="first_name"
              defaultValue={firstName}
              autoComplete="given-name"
              required
              maxLength={80}
            />
          </label>
          <label>
            Last name
            <input
              name="last_name"
              defaultValue={lastName}
              autoComplete="family-name"
              required
              maxLength={80}
            />
          </label>
        </div>
        <label>
          Profile photo
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
          />
          <span className="small">
            JPG, PNG or WebP. Maximum 2 MB. Your photo stays private.
          </span>
        </label>
        <fieldset className="preferences">
          <legend>
            Your learning preferences <span className="small">Optional</span>
          </legend>
          <p className="small" id="preferences-help">
            Help us plan explanations around your language and experience. You
            can skip any answer or clear it later. These preferences are saved
            for future personalization; the current company cards remain in
            English.
          </p>
          <div className="form-grid">
            <label>
              First language
              <input
                name="first_language"
                defaultValue={preferences.first_language ?? ""}
                maxLength={80}
                placeholder="e.g. 中文, Español, العربية"
                aria-describedby="preferences-help"
              />
              <span className="small">You can list more than one.</span>
            </label>
            <label>
              Preferred reading language
              <input
                name="reading_language"
                defaultValue={preferences.reading_language ?? ""}
                maxLength={80}
                placeholder="e.g. English or 中文"
              />
              <span className="small">
                This can differ from your first language.
              </span>
            </label>
          </div>
          {(
            Object.keys(preferenceOptions) as (keyof typeof preferenceOptions)[]
          ).map((name) => (
            <label key={name}>
              {
                {
                  investing_experience: "How long have you invested in stocks?",
                  financial_english: "Comfort with financial English",
                  explanation_depth: "Preferred explanation depth",
                  learning_goal: "Main learning goal",
                  reading_minutes: "Time for one learning session",
                }[name]
              }
              <select name={name} defaultValue={preferences[name] ?? ""}>
                <option value="">Not specified / clear answer</option>
                {preferenceOptions[name].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <p className="small">
            We use these answers to guide educational content, not to recommend
            trades. Experience alone does not determine your understanding. Only
            you can access these preferences through the app.
          </p>
        </fieldset>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <p aria-live="polite" role="status">
          {message}
        </p>
      </form>
      <div className="profile-links">
        <a href="/notebook">Open my learning space →</a>
        <button className="text-button" onClick={signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    </>
  );
}
