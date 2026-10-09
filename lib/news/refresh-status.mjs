export function refreshStatus(gate,now=Date.now()){
 const until=Math.max(Date.parse(gate?.lease_until)||0,(Date.parse(gate?.last_started)||0)+600000);
 return {retry_after:Math.max(0,Math.ceil((until-now)/1000)),last_checked:gate?.last_started||null};
}
export function refreshResult(report){
 const sources=[...new Set((report.errors||[]).map(e=>e.source))];
 const available=Number(report.articles)||0;
 return {available,source_counts:report.source_counts||{},partial:sources.length>0,failed_sources:sources,status:sources.length?(available?'partial':'failed'):'completed'};
}
