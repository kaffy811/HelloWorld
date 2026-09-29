"use client";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function ProfileForm({
  userId,
  email,
  displayName,
  firstName,
  lastName,
  avatarUrl,
  onboarding = false,
}: {
  userId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  onboarding?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const display = String(form.get("display_name") ?? "").trim();
    const first = String(form.get("first_name") ?? "").trim();
    const last = String(form.get("last_name") ?? "").trim();
    const supabase = createClient();
    let uploadedPath: string | null = null;
    try {
      if (!display || display.length > 40)
        throw new Error("Enter a display name of 1–40 characters.");
      if (!first || !last || first.length > 80 || last.length > 80)
        throw new Error("Enter both names, up to 80 characters each.");
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
        if (error)
          throw new Error(
            "Photo upload failed. Please retry, or continue without a photo.",
          );
        uploadedPath = path;
      }
      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: display,
          first_name: first,
          last_name: last,
          ...(uploadedPath ? { avatar_path: uploadedPath } : {}),
        })
        .eq("id", userId)
        .select("id")
        .single();
      if (error || !data)
        throw new Error("Your profile could not be saved. Please retry.");
      if (onboarding) router.push("/onboarding/preferences");
      else setMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      if (uploadedPath)
        await supabase.storage.from("avatars").remove([uploadedPath]);
      setMessage(error instanceof Error ? error.message : "Please try again.");
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
        <fieldset disabled={busy} className="form-fields">
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
              <div className="avatar placeholder" aria-label="Default avatar">
                {(displayName || firstName).charAt(0) || "U"}
              </div>
            )}
            <div>
              <strong>Your account</strong>
              <p className="small">{email}</p>
            </div>
          </div>
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={displayName}
              autoComplete="nickname"
              required
              maxLength={40}
            />
            <span className="small">
              How we will address you. This does not need to be unique.
            </span>
          </label>
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
            Profile photo <span className="small">Optional</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
            />
            <span className="small">
              JPG, PNG or WebP, up to 2 MB. Leave empty to skip and use your
              default avatar.
            </span>
          </label>
          <button className="button" type="submit">
            {busy
              ? "Saving…"
              : onboarding
                ? "Next: learning preferences →"
                : "Save profile"}
          </button>
        </fieldset>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
      <div className="profile-links">
        {!onboarding && (
          <Link href="/profile/preferences">Edit learning preferences →</Link>
        )}
        <button className="text-button" onClick={signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    </>
  );
}
