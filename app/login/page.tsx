import { GoogleLogin } from "@/components/google-login";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="narrow panel"><span className="eyebrow">WELCOME TO THE LAUGH LAB</span><h1>Good photos.<br/>Questionable punchlines.</h1><p>Sign in to create captions, browse member photos and rate what makes you laugh.</p>{error && <p className="notice" role="alert">Sign-in could not be completed. Please start again.</p>}<GoogleLogin/><p className="small">Your vote is tied to your account. One rating per caption.</p></section>;
}
