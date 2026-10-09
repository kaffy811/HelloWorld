
import {T} from "@/components/language-provider";
import { redirect } from "next/navigation";
import { loadProfile, avatarFor } from "@/lib/profile";
import { onboardingDestination } from "@/lib/onboarding";
import {LanguageSettings} from '@/components/language-settings';
import { ProfileForm } from "@/components/profile-form";
export default async function Profile() {
  const { supabase, user, profile } = await loadProfile();
  const destination = onboardingDestination(profile);
  if (destination !== "/") redirect(destination);
  return (
    <section className="narrow panel">
      <span className="eyebrow"><T text="YOUR PROFILE"/></span>
      <h1><T text="Your space, your name."/></h1>
      <p><T text="Update your profile or edit your learning preferences below."/></p>
      <ProfileForm
        email={user.email ?? ""}
        displayName={profile.display_name ?? ""}
        firstName={profile.first_name ?? ""}
        lastName={profile.last_name ?? ""}
        avatarUrl={await avatarFor(supabase, profile.avatar_path)}
      />
      <section className="profile-language" id="language"><h2><T text="Language"/></h2><LanguageSettings/></section>
    </section>
  );
}
