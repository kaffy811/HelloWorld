
import {T} from "@/components/language-provider";
import { safeReturnPath } from "@/lib/news/validation.mjs";
import { GoogleLogin } from "@/components/google-login";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <section className="narrow panel">
      <span className="eyebrow"><T text="YOUR LEARNING SPACE"/></span>
      <h1><T text="A little clarity."/><br /><T text="A better starting point."/></h1>
      <p><T text="Sign in to rate explanations, follow US companies and save your learning."/></p>
      {error && (
        <p className="notice" role="alert"><T text="Sign-in could not be completed. Please start again."/></p>
      )}
      <GoogleLogin next={safeReturnPath(next)} />
      <p className="small"><T text="Company introductions are available without an account."/></p>
    </section>
  );
}
