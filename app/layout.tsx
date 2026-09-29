import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "Clearstock — Understand before you invest", description: "A calmer starting point for understanding US companies." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><header className="header"><Link className="brand" href="/"><span className="brand-icon">c</span> clearstock<span className="beta">LEARN</span></Link><nav aria-label="Main navigation"><Link href="/">Explore</Link><Link href="/notebook">My learning</Link><Link href="/profile">Profile</Link><Link className="nav-login" href="/login">Sign in ↗</Link></nav></header><main>{children}</main><footer><span>Clearstock · Understand before you invest.</span><span>Educational introductions. No live prices or investment recommendations.</span></footer></body></html>;
}
