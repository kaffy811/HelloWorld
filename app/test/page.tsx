import { supabase } from "@/lib/supabase";

export default async function TestPage() {
    const { data, error } = await supabase
        .from("tech_stack")
        .select("*")
        .order("id");

    if (error) {
        return (
            <main style={{ padding: "40px" }}>
                <h1>Supabase Error</h1>
                <pre>{error.message}</pre>
            </main>
        );
    }

    return (
        <main style={{ padding: "40px" }}>
            <h1>Supabase Connection Test</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </main>
    );
}