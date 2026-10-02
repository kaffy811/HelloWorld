import { GoogleLogin } from "@/components/google-login";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="narrow panel"><span className="eyebrow">YOUR LEARNING SPACE</span><h1>A little clarity.<br/>A better starting point.</h1><p>Sign in to complete your profile and open your private learning space.</p>{error && <p className="notice" role="alert">Sign-in could not be completed. Please start again.</p>}<GoogleLogin/><p className="small">Company introductions are available without an account.</p></section>;
}
