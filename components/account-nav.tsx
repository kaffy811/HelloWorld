import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avatarFor } from "@/lib/profile";

export async function AccountNav() {
 const {t:ui}=await getTranslator();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Link className="nav-login" href="/login"><T text="Sign in ↗"/></Link>;

  const { data: profile } = await supabase.from("profiles")
    .select("display_name, first_name, avatar_path")
    .eq("id", user.id).maybeSingle();
  const name = profile?.display_name || profile?.first_name || "Your account";
  const avatar = await avatarFor(supabase, profile?.avatar_path ?? null);
  return (
    <Link className="nav-avatar" href="/profile" aria-label={`${name} — view profile`} title={ui("Your profile")}>
      {avatar ? <Image unoptimized src={avatar} width={36} height={36} alt={ui("Your profile photo")} />
        : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
    </Link>
  );
}
