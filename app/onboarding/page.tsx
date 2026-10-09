import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import { redirect } from "next/navigation";
import { loadProfile, avatarFor } from "@/lib/profile";
import { onboardingDestination } from "@/lib/onboarding";
import { ProfileForm } from "@/components/profile-form";
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
 const {t:ui}=await getTranslator();
  const { supabase, user, profile } = await loadProfile();
  const destination = onboardingDestination(profile);
  if (
    destination === "/" ||
    (destination === "/onboarding/preferences" &&
      (await searchParams).edit !== "1")
  )
    redirect(destination);
  return (
    <section className="narrow panel">
      <div className="step-indicator" aria-label={ui("Step 1 of 2")}>
        <span className="active"><T text="1 · Your profile"/></span>
        <span><T text="2 · Learning preferences"/></span>
      </div>
      <span className="eyebrow"><T text="WELCOME TO CLEARSTOCK"/></span>
      <h1><T text="What should we call you?"/></h1>
      <p><T text="Add your name, and a photo if you like. Your learning preferences come next."/></p>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        displayName={profile.display_name ?? ""}
        firstName={profile.first_name ?? ""}
        lastName={profile.last_name ?? ""}
        avatarUrl={await avatarFor(supabase, profile.avatar_path)}
        onboarding
      />
    </section>
  );
}
