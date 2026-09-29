export type OnboardingState = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed_at: string | null;
};
export function hasBasicProfile(p: OnboardingState) {
  return Boolean(
    p.display_name?.trim() && p.first_name?.trim() && p.last_name?.trim(),
  );
}
export function onboardingDestination(p: OnboardingState) {
  if (!hasBasicProfile(p)) return "/onboarding";
  return p.onboarding_completed_at ? "/" : "/onboarding/preferences";
}
