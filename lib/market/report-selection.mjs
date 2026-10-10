// Safe for old caches too: never fill a missing metric from another filing.
export function selectFinancialReport(periods,frequency='annual',end){
 const eligible=periods.filter(p=>p.frequency===frequency).map(p=>{
  const source=p.accession?{accession:p.accession,form:p.form,filed:p.filed}:Object.values(p.metrics||{}).find(m=>frequency==='annual'?m.form?.startsWith('10-K'):m.form?.startsWith('10-Q'));
  return source?{...p,accession:source.accession,form:source.form,filed:source.filed}:null;
 }).filter(Boolean).sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 const byEnd=new Map();for(const p of eligible)if(!byEnd.has(p.end))byEnd.set(p.end,p);
 const available=[...byEnd.values()];
 const selected=available.find(p=>p.end===end)||available[0];
 if(!selected)return {available,period:null,balance:null};
 const sameReport=p=>({...p,metrics:Object.fromEntries(Object.entries(p.metrics||{}).filter(([,m])=>m.accession===selected.accession))});
 const balance=periods.find(p=>p.frequency==='instant'&&p.end===selected.end&&p.accession===selected.accession)||periods.find(p=>p.frequency==='instant'&&p.end===selected.end&&!p.accession);
 return {available,period:sameReport(selected),balance:balance?sameReport(balance):null};
}
