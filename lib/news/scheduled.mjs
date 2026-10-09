import {timingSafeEqual} from 'node:crypto';
export function scheduledAuthorized(header,secret){
 if(typeof secret!=='string'||secret.length<32||typeof header!=='string')return false;
 const actual=Buffer.from(header),expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
