"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="narrow panel">
      <h1>We could not load this page.</h1>
      <p>Your saved information has not been changed. Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
