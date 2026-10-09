'use client';
import {createContext,useContext,type ReactNode} from 'react';
import {translate} from '@/lib/i18n/translate.mjs';
export type Language='en'|'zh-Hans';
const LanguageContext=createContext<Language>('en');
export function LanguageProvider({language,children}:{language:Language;children:ReactNode}){return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;}
export function useLanguage(){const language=useContext(LanguageContext);return {language,t:(text:string,params?:Record<string,string|number>)=>translate(language,text,params)};}
// Render translation as React text. Never mutate hydrated DOM or translate user content.
export function T({text,children}:{text?:string;children?:string}){const {t}=useLanguage();return <>{t(text??children??'')}</>;}
