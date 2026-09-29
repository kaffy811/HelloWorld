import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function loadProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !profile)
    throw new Error("Unable to load profile. Please try again.");
  return { supabase, user, profile };
}
export async function avatarFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return "";
  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}
