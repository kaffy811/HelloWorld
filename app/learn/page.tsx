import {redirect} from 'next/navigation';
export default async function Learn({searchParams}:{searchParams:Promise<{view?:string}>}){
 redirect((await searchParams).view==='saved'?'/notebook?kind=terms':'/#today');
}
