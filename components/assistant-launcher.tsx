'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useLanguage} from './language-provider';
export function AssistantLauncher(){const {t}=useLanguage(),path=usePathname();if(path==='/assistant')return null;return <Link className="assistant-launcher" href="/assistant" aria-label={t('Open Chat')} title={t('Open Chat')}><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v3M10 3h4M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v9H5V9ZM2 10v5m20-5v5M9 13h.01M15 13h.01M9 16h6" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{t("Chat")}</span></Link>;}
