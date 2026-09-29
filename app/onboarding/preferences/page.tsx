import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { onboardingDestination } from "@/lib/onboarding";
import { PreferencesForm } from "@/components/preferences-form";
export default async function Preferences() {
  const { user, profile } = await loadProfile();
  const destination = onboardingDestination(profile);
  if (destination !== "/onboarding/preferences") redirect(destination);
  return (
    <section className="narrow panel">
      <div className="step-indicator" aria-label="Step 2 of 2">
        <span>✓ Your profile</span>
        <span className="active">2 · Learning preferences</span>
      </div>
      <span className="eyebrow">YOUR PACE. YOUR STARTING POINT.</span>
      <h1>Make learning feel familiar.</h1>
      <p>
        Tell us what helps you understand. Answer as much or as little as you
        like.
      </p>
      <PreferencesForm userId={user.id} initial={profile} onboarding />
    </section>
  );
}
