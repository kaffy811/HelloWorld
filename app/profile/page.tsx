import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
export default async function Profile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("first_name,last_name,avatar_path").eq("id", user.id).single();
  if (error) return <section className="narrow panel"><h1>Profile unavailable</h1><p role="alert">Your profile could not be loaded. Please try again after the database setup has been completed.</p></section>;
  let avatarUrl = "";
  if (profile.avatar_path) { const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600); avatarUrl = data?.signedUrl ?? ""; }
  return <section className="narrow panel"><span className="eyebrow">YOUR PROFILE</span><h1>Make yourself at home.</h1><p>{!profile.first_name?.trim() || !profile.last_name?.trim() ? "Add your first and last name to open your learning space." : "Keep your name and photo up to date."}</p><ProfileForm userId={user.id} email={user.email ?? ""} firstName={profile.first_name ?? ""} lastName={profile.last_name ?? ""} avatarUrl={avatarUrl}/></section>;
}
