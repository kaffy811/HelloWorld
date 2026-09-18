export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Background glow */}
      <div className="blob blob-one" />
      <div className="blob blob-two" />
      <div className="blob blob-three" />

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Main card */}
      <section className="glass-card relative z-10 max-w-4xl px-10 py-16 text-center sm:px-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur-md">
          <span className="animate-pulse">✦</span>
          My first Next.js deployment
        </div>

        <h1 className="gradient-text text-6xl font-black tracking-tight sm:text-8xl md:text-9xl">
          Hello World
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
          Built with Next.js, deployed with Vercel, and made with a little
          imagination.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            Explore Next.js
            <span>↗</span>
          </a>

          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button"
          >
            Deployed on Vercel
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] text-white/30">
          <span className="h-px w-10 bg-white/20" />
          2026
          <span className="h-px w-10 bg-white/20" />
        </div>
      </section>

      <p className="absolute bottom-8 text-sm text-white/30">
        Made by Hoi Yan Lo
      </p>
    </main>
  );
}