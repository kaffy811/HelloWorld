import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import {getLanguage} from "@/lib/i18n/server";
import {LanguageProvider} from "@/components/language-provider";
import {LiveMarketProvider} from "@/components/live-market";
import {AssistantLauncher} from '@/components/assistant-launcher';
import { AccountNav } from "@/components/account-nav";
export const metadata: Metadata = {
  title: "Clearstock — Understand US stocks",
  description:
    "Understand US company news and stock-market concepts with source-grounded AI explanations.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
 const {t:ui}=await getTranslator();
  const language=await getLanguage();
  return (
    <html lang={language}>
      <body><LanguageProvider language={language}><LiveMarketProvider>
        <header className="header">
          <Link className="brand" href="/">
            <span className="brand-icon"><T text="c"/></span><T text=" clearstock"/><span className="beta"><T text="US STOCKS"/></span>
          </Link>
          <nav aria-label={ui("Main navigation")}>
            <Link href="/"><T text="Today"/></Link>
            <Link href="/news"><T text="News"/></Link>
            <Link href="/watchlist"><T text="Watchlist"/></Link>
            <Link href="/learn"><T text="Learn"/></Link>
            <Link href="/notebook"><T text="Notebook"/></Link>
            <AccountNav />
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <span><T text="Clearstock · Understand US stocks, one idea at a time."/></span>
          <span><T text="Have an idea to improve Clearstock?"/> <Link className="footer-feedback" href="/feedback"><T text="Feedback"/> ↗</Link></span>
        </footer>
      <AssistantLauncher/></LiveMarketProvider></LanguageProvider></body>
    </html>
  );
}
