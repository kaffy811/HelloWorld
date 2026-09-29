import { onboardingDestination } from "@/lib/onboarding";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function Notebook() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,first_name,last_name,onboarding_completed_at")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profile unavailable");
  const destination = onboardingDestination(profile);
  if (destination !== "/") redirect(destination);
  return (
    <section className="narrow panel">
      <span className="eyebrow">MEMBERS ONLY · MY LEARNING</span>
      <h1>Welcome, {profile.display_name}.</h1>
      <p>
        You are signed in. This learning space is protected on the server and is
        only available after you complete your profile.
      </p>
      <div className="question">
        <h3>Your first research checklist</h3>
        <ul>
          <li>Explain how a company makes money.</li>
          <li>Identify one question you cannot answer yet.</li>
          <li>Find a source you can use to investigate it.</li>
        </ul>
      </div>
      <p>Saved research notes will arrive in a later release.</p>
      <Link className="button" href="/">
        Explore companies →
      </Link>
    </section>
  );
}
