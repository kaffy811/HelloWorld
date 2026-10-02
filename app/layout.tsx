import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AccountNav } from "@/components/account-nav";
export const metadata: Metadata = { title: "Laugh Lab — Find your funny", description: "Your photos, AI punchlines, and an audience with opinions." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><header className="header"><Link className="brand" href="/"><span className="brand-icon">↗</span> laugh lab<span className="beta">BETA</span></Link><nav aria-label="Main navigation"><Link href="/">Explore</Link><Link href="/#studio">Create</Link><Link href="/profile">Profile</Link><AccountNav /></nav></header><main>{children}</main><footer><span>Laugh Lab · A little absurdity goes a long way.</span><span>AI writes the captions. You decide what’s funny.</span></footer></body></html>;
}
