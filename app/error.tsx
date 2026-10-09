"use client";
import {T} from "@/components/language-provider";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="narrow panel">
      <h1><T text="We could not load this page."/></h1>
      <p><T text="Your saved information has not been changed. Please try again."/></p>
      <button className="button" onClick={reset}><T text="Try again"/></button>
    </section>
  );
}
