import { supabase } from "@/lib/supabase";

type TechStack = {
    id: number;
    name: string;
    category: string;
    description: string;
};

export default async function Home() {
    const { data, error } = await supabase
        .from("tech_stack")
        .select("id, name, category, description")
        .order("id");

    const techStack: TechStack[] = data ?? [];

    return (
        <main className="relative min-h-screen overflow-hidden px-6 py-20">
            {/* Background glow */}
            <div className="blob blob-one" />
            <div className="blob blob-two" />
            <div className="blob blob-three" />
            <div className="absolute inset-0 bg-grid opacity-30" />

            <div className="relative z-10 mx-auto max-w-6xl">
                {/* Hero */}
                <section className="mb-16 text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur-md">
                        <span className="animate-pulse">✦</span>
                        Next.js × Supabase
                    </div>

                    <h1 className="gradient-text text-6xl font-black tracking-tight sm:text-8xl">
                        Hello World
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
                        A simple full-stack app powered by Next.js, Supabase, and Vercel.
                    </p>
                </section>

                {/* Error state */}
                {error && (
                    <div className="glass-card mx-auto mb-8 max-w-2xl p-6 text-center">
                        <p className="text-red-300">
                            Unable to load data: {error.message}
                        </p>
                    </div>
                )}

                {/* Database-driven cards */}
                {!error && (
                    <>
                        <div className="mb-8 text-center">
                            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                                My Development Stack
                            </p>

                            <h2 className="mt-3 text-3xl font-bold text-white">
                                Powered by real data.
                            </h2>
                        </div>

                        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {techStack.map((tech) => (
                                <article
                                    key={tech.id}
                                    className="tech-card group"
                                >
                                    <div className="mb-8 flex items-center justify-between">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/50">
                      {tech.category}
                    </span>

                                        <span className="text-sm text-white/20">
                      {String(tech.id).padStart(2, "0")}
                    </span>
                                    </div>

                                    <h3 className="text-3xl font-bold text-white transition-transform duration-300 group-hover:translate-x-1">
                                        {tech.name}
                                    </h3>

                                    <p className="mt-4 leading-relaxed text-white/50">
                                        {tech.description}
                                    </p>

                                    <div className="mt-8 h-px bg-gradient-to-r from-white/20 to-transparent" />
                                </article>
                            ))}
                        </section>

                        {techStack.length === 0 && (
                            <p className="text-center text-white/50">
                                No technologies found.
                            </p>
                        )}
                    </>
                )}

                <footer className="mt-16 text-center">
                    <p className="text-sm text-white/35">
                        Data fetched live from Supabase · Built by Hoi Yan Lo
                    </p>
                </footer>
            </div>
        </main>
    );
}