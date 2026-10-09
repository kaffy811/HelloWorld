"use client";
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
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
 const {t:ui}=useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  const photoSrc = previewUrl || avatarUrl;
  function choosePhoto() {
    photoDialog.current?.close();
    photoInput.current?.click();
  }
  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG or WebP photo up to 2 MB.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedPhoto(file);
    setPhotoPending(true);
    setMessage("");
    setDownloadError("");
  }
  async function downloadPhoto() {
    setDownloading(true);
    setDownloadError("");
    try {
      let blob: Blob;
      if (selectedPhoto) blob = selectedPhoto;
      else {
        const response = await fetch(photoSrc);
        if (!response.ok) throw new Error();
        blob = await response.blob();
      }
      const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[blob.type] || "jpg";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `profile-photo.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("Could not download the photo. Please retry.");
    } finally {
      setDownloading(false);
    }
  }
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
      const file = photoPending ? selectedPhoto : null;
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
      setPhotoPending(false);
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
            <button type="button" className="avatar-trigger" aria-label={photoSrc ? "View profile photo" : "Upload profile photo"} onClick={() => photoSrc ? photoDialog.current?.showModal() : choosePhoto()}>
              {photoSrc ? (
                <Image unoptimized width={72} height={72} className="avatar" src={photoSrc} alt={ui("Your profile photo")} />
              ) : (
                <span className="avatar placeholder">{(displayName || firstName).charAt(0) || "U"}</span>
              )}
              <span className="avatar-camera" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h4l2-3h4l2 3h4v14H4z"/><circle cx="12" cy="13" r="4"/></svg>
              </span>
            </button>
            <div className="avatar-details">
              <strong><T text="Your account"/></strong>
              <p className="small">{email}</p>
              <button type="button" className="text-button avatar-change" onClick={choosePhoto}>{photoSrc ? <T text="Change photo"/> : <T text="Upload photo"/>}</button>
              <p className="small"><T text="Optional · JPG, PNG or WebP · Up to 2 MB"/></p>
              {photoPending && <p className="photo-pending" role="status"><T text="Photo not saved yet. "/>{onboarding ? <T text="Select Next to save."/> : <T text="Select Save profile to save."/>}</p>}
            </div>
          </div>
          <input ref={photoInput} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label={ui("Choose profile photo")} onChange={selectPhoto} />
          <label><T text="Display name"/><input
              name="display_name"
              defaultValue={displayName}
              autoComplete="nickname"
              required
              maxLength={40}
            />
            <span className="small"><T text="How we will address you. This does not need to be unique."/></span>
          </label>
          <div className="form-grid">
            <label><T text="First name"/><input
                name="first_name"
                defaultValue={firstName}
                autoComplete="given-name"
                required
                maxLength={80}
              />
            </label>
            <label><T text="Last name"/><input
                name="last_name"
                defaultValue={lastName}
                autoComplete="family-name"
                required
                maxLength={80}
              />
            </label>
          </div>
          <button className="button" type="submit">
            {busy
              ? <T text="Saving…"/>
              : onboarding
                ? <T text="Next: learning preferences →"/>
                : <T text="Save profile"/>}
          </button>
        </fieldset>
        <p role="status" aria-live="polite">
          {ui(message)}
        </p>
      </form>
      <dialog ref={photoDialog} className="photo-dialog" aria-labelledby="photo-dialog-title" onClick={(event) => { if (event.target === event.currentTarget) photoDialog.current?.close(); }}>
        <div className="photo-dialog-content">
          <div className="photo-dialog-heading">
            <h2 id="photo-dialog-title"><T text="Profile photo"/></h2>
            <button type="button" className="text-button photo-close" aria-label={ui("Close photo preview")} onClick={() => photoDialog.current?.close()}>×</button>
          </div>
          {photoSrc && <Image unoptimized width={480} height={480} className="photo-preview" src={photoSrc} alt={ui("Your profile photo, full preview")} />}
          <div className="photo-dialog-actions">
            <button type="button" className="button" onClick={choosePhoto} disabled={busy}><T text="Change photo"/></button>
            <button type="button" className="text-button" onClick={downloadPhoto} disabled={downloading || !photoSrc}>{downloading ? <T text="Downloading…"/> : <T text="Download image"/>}</button>
          </div>
          <p className="small" role="status">{downloadError || (photoPending ? <T text="Preview only. Save your profile to apply this photo."/> : "")}</p>
        </div>
      </dialog>
      <div className="profile-links">
        {!onboarding && (
          <Link href="/profile/preferences"><T text="Edit learning preferences →"/></Link>
        )}
        <button className="text-button" onClick={signOut} disabled={busy}><T text="Sign out"/></button>
      </div>
    </>
  );
}
