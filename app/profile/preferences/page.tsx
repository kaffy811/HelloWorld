
import {T} from "@/components/language-provider";
import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { onboardingDestination } from "@/lib/onboarding";
import { PreferencesForm } from "@/components/preferences-form";
export default async function Preferences() {
  const { user, profile } = await loadProfile();
  const destination = onboardingDestination(profile);
  if (destination !== "/") redirect(destination);
  return (
    <section className="narrow panel">
      <span className="eyebrow"><T text="LEARNING PREFERENCES"/></span>
      <h1><T text="A starting point that fits."/></h1>
      <p><T text="Update or clear your answers whenever you like."/></p>
      <PreferencesForm userId={user.id} initial={profile} />
    </section>
  );
}
