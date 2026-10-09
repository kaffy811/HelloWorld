import {loadEnvFile} from 'node:process';
import {syncData} from '../lib/market/sync.mjs';
try{loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
export {syncData};
if(process.argv[1]?.endsWith('sync-market-data.mjs'))syncData({pricesOnly:process.argv.includes('--prices-only'),feedsOnly:process.argv.includes('--feeds-only'),newsOnly:process.argv.includes('--news-only')}).catch(e=>{console.error(e.message);process.exitCode=1;});
