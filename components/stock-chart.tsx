'use client';
import {useLanguage} from "@/components/language-provider";


import {T as Text} from "@/components/language-provider";
import {useState,useEffect,useRef,useId} from 'react';
import type {Bar,Price} from '@/lib/market/types';
import {dailyRange,easternDay} from '@/lib/market/exploration.mjs';
type Range='live'|'5d'|'1m'|'3m'|'6m'|'1y';
type Intraday={bars:Bar[];as_of:string;refreshed_at:string;interval:string;stale:boolean;session_count:number;reference_close:number|null;quote:{price:number;as_of:string}|null};
const ranges:[Range,string][]=[['live','Real-Time'],['5d','5D'],['1m','1M'],['3m','3M'],['6m','6M'],['1y','1Y']];
export function StockChart({ticker,price}:{ticker:string;price?:Price}) {
 const {t:ui,language}=useLanguage();
 const date=(time:string,intraday=false)=>new Intl.DateTimeFormat(language==='zh-Hans'?'zh-CN':'en-US',{timeZone:'America/New_York',month:'short',day:'numeric',...(intraday?{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}:{year:'numeric'})}).format(new Date(time));
 const [range,setRange]=useState<Range>('1y'),[interval,setInterval]=useState('daily'),[mode,setMode]=useState('line'),[window,setWindow]=useState({start:0,end:1}),[hover,setHover]=useState<number|null>(null),[intraday,setIntraday]=useState<Intraday|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const svg=useRef<SVGSVGElement>(null),drag=useRef<{x:number;start:number;end:number}|null>(null),windowRef=useRef(window);const gradient=useId().replace(/:/g,'');
 const live=range==='live'||range==='5d';
 const bars:Bar[]=live?(intraday?.bars||[]):dailyRange(price?.bars||[],range,interval);
 useEffect(()=>{windowRef.current=window;},[window]);
 useEffect(()=>{
  if(range!=='live'&&range!=='5d') return;
  const abort=new AbortController();let pending=false;
  async function load(){if(pending||document.visibilityState==='hidden')return;pending=true;setBusy(true);try{
   const r=await fetch(`/api/stocks/${ticker}/chart?range=${range}`,{signal:abort.signal,cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error);setIntraday(data);setError('');
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not load this chart.');}finally{pending=false;if(!abort.signal.aborted)setBusy(false);}}
  load();const timer=range==='live'?globalThis.setInterval(load,60000):null;const visible=()=>load();document.addEventListener('visibilitychange',visible);
  return()=>{abort.abort();if(timer)clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[range,ticker]);
 // A non-passive handler keeps zooming inside the chart rather than scrolling the page.
 useEffect(()=>{const el=svg.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();const w=windowRef.current,rect=el.getBoundingClientRect(),anchor=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),span=w.end-w.start,min=Math.min(1,Math.max(8/bars.length,.02)),next=Math.max(min,Math.min(1,span*(e.deltaY>0?1.15:.85)));const pivot=w.start+anchor*span;const start=Math.max(0,Math.min(1-next,pivot-anchor*next));setWindow({start,end:start+next});setHover(null);};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[bars.length]);
 function choose(r:Range){if(r===range){setWindow({start:0,end:1});setHover(null);return;}setRange(r);setWindow({start:0,end:1});setHover(null);setIntraday(null);setError('');}
 const first=Math.floor(window.start*Math.max(0,bars.length-1)),last=Math.max(first+1,Math.ceil(window.end*bars.length)),visible=bars.slice(first,last);
 const W=1000,H=440,L=64,R=935,T=20,B=310,VB=406,VT=336;
 const lo=Math.min(...visible.map(b=>mode==='candles'?b.low:b.close)),hi=Math.max(...visible.map(b=>mode==='candles'?b.high:b.close)),padding=(hi-lo||hi*.01)*.08,min=lo-padding,max=hi+padding;
 const x=(i:number)=>L+(i/Math.max(1,visible.length-1))*(R-L),y=(p:number)=>B-((p-min)/(max-min||1))*(B-T);
 const vol=Math.max(1,...visible.map(b=>b.volume)),positive=visible.length>0&&visible.at(-1)!.close>=visible[0].close,color=positive?'#168466':'#b45149';
 const path=visible.map((b,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(b.close).toFixed(2)}`).join(' ');
 const selected=hover==null?null:visible[hover],base=range==='live'?intraday?.reference_close:visible[0]?.close;
 const delta=selected&&base?selected.close-base:null;
 function zoom(factor:number){const w=windowRef.current,span=Math.min(1,Math.max(Math.min(1,8/Math.max(1,bars.length)),(w.end-w.start)*factor)),start=Math.max(0,Math.min(1-span,(w.start+w.end-span)/2));setWindow({start,end:start+span});setHover(null);}
 return <section className="interactive-chart" aria-label={ui("{ticker} interactive price chart",{ticker})}>
  <div className="chart-toolbar"><div className="chart-ranges" role="group" aria-label={ui("Chart time range")}>{ranges.map(([key,label])=><button key={key} className={range===key?'active':''} aria-pressed={range===key} onClick={()=>choose(key)}>{ui(label)}</button>)}</div>
   <div className="chart-settings"><label><Text text="View"/><select aria-label={ui("Chart display")} value={mode} onChange={e=>setMode(e.target.value)}><option value="line"><Text text="Trend"/></option><option value="candles"><Text text="Candles"/></option></select></label><label><Text text="Interval"/><select aria-label={ui("Chart interval")} value={live?'intraday':interval} disabled={live} onChange={e=>{setInterval(e.target.value);setWindow({start:0,end:1});setHover(null);}}>{live?<option value="intraday">{range==='live'?<Text text="1 minute"/>:<Text text="15 minutes"/>}</option>:<><option value="daily"><Text text="Daily"/></option><option value="weekly"><Text text="Weekly"/></option><option value="monthly"><Text text="Monthly"/></option></>}</select></label></div>
  </div>
  {live&&<p className="small chart-live-status" aria-live="polite">{busy?ui('Refreshing IEX data…'):intraday?<>{ui('Last trade')} {intraday.quote?'$'+intraday.quote.price.toFixed(2)+' · '+date(intraday.quote.as_of,true):ui('unavailable')} · {range==='live'?ui('checks every 60 seconds while this tab is visible'):ui('Last {count} available sessions',{count:intraday.session_count})}</>:ui('Loading intraday data…')}</p>}
  {(error||intraday?.stale)&&<p className="small notice" role="status">{ui(error||'The price feed is temporarily unavailable. Showing the last saved chart.')}</p>}
  {!visible.length?<div className="chart-unavailable"><strong>{busy?<Text text="Loading real market data…"/>:<Text text="No chart data for this range"/>}</strong><p className="small"><Text text="Choose another range to view available trading history."/></p></div>:<>
  <div className="chart-canvas"><svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ticker}, ${ranges.find(([key])=>key===range)?.[1]}, ${mode==='line'?'price trend':'OHLC candles'}, ${visible.length} observations. Use plus and minus to zoom; arrow keys to pan; Home to reset.`} tabIndex={0}
    onKeyDown={e=>{if(['+','=','-','ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')setWindow({start:0,end:1});else if(e.key==='+'||e.key==='=')zoom(.8);else if(e.key==='-')zoom(1.25);else {const w=windowRef.current,shift=(e.key==='ArrowLeft'?-1:1)*(w.end-w.start)*.15,start=Math.max(0,Math.min(1-(w.end-w.start),w.start+shift));setWindow({start,end:start+(w.end-w.start)});}}}}
    onPointerDown={e=>{if(e.button!==0)return;svg.current?.setPointerCapture(e.pointerId);drag.current={x:e.clientX,...windowRef.current};}}
    onPointerUp={e=>{drag.current=null;if(svg.current?.hasPointerCapture(e.pointerId))svg.current.releasePointerCapture(e.pointerId);}}
    onPointerCancel={()=>{drag.current=null;}}
    onPointerLeave={()=>{if(!drag.current)setHover(null);}}
    onPointerMove={e=>{const rect=e.currentTarget.getBoundingClientRect();if(drag.current){const d=drag.current,span=d.end-d.start,shift=(d.x-e.clientX)/rect.width*span,start=Math.max(0,Math.min(1-span,d.start+shift));setWindow({start,end:start+span});setHover(null);}else{const px=(e.clientX-rect.left)/rect.width*W;setHover(Math.max(0,Math.min(visible.length-1,Math.round((px-L)/(R-L)*(visible.length-1)))));}}}>
    <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".16"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    {[0,1,2,3,4].map(i=>{const p=min+(max-min)*i/4;return <g key={i}><line x1={L} x2={R} y1={y(p)} y2={y(p)} stroke="#e8eeea"/><text x={L-10} y={y(p)+4} textAnchor="end" fill="#697a73" fontSize="12">{p.toFixed(2)}</text></g>;})}
    {mode==='line'?<><path d={path+` L${x(visible.length-1)},${B} L${L},${B} Z`} fill={`url(#${gradient})`}/><path d={path} fill="none" stroke={color} strokeWidth="1.7" vectorEffect="non-scaling-stroke"/></>:visible.map((b,i)=>{const c=b.close>=b.open?'#168466':'#b45149',bw=Math.max(1,Math.min(12,(R-L)/visible.length*.65));return <g key={b.time}><line x1={x(i)} x2={x(i)} y1={y(b.high)} y2={y(b.low)} stroke={c}/><rect x={x(i)-bw/2} y={Math.min(y(b.open),y(b.close))} width={bw} height={Math.max(1,Math.abs(y(b.open)-y(b.close)))} fill={c}/></g>;})}
    <text x={L} y={VT-8} fill="#697a73" fontSize="11"><Text text="IEX volume"/></text>
    {visible.map((b,i)=><rect key={b.time} x={x(i)-Math.max(1,Math.min(10,(R-L)/visible.length*.7))/2} y={VB-(b.volume/vol)*(VB-VT)} width={Math.max(1,Math.min(10,(R-L)/visible.length*.7))} height={b.volume/vol*(VB-VT)} fill={b.close>=b.open?'#81b9a4':'#cfaaa4'}/>)}
    {[0,Math.floor((visible.length-1)/2),visible.length-1].map((i,j)=><text key={j} x={x(i)} y={H-10} textAnchor={j===0?'start':j===2?'end':'middle'} fontSize="11" fill="#697a73">{date(visible[i].time,live)}</text>)}
    {selected&&hover!=null&&<g><line x1={x(hover)} x2={x(hover)} y1={T} y2={VB} stroke="#8fa29a" strokeDasharray="4 4"/><line x1={L} x2={R} y1={y(selected.close)} y2={y(selected.close)} stroke="#8fa29a" strokeDasharray="4 4"/><circle cx={x(hover)} cy={y(selected.close)} r="3" fill={color}/></g>}
   </svg>
   {selected&&<div className="chart-tooltip" style={{left:hover!=null&&hover>visible.length/2?'12%':'62%'}}><strong>{date(selected.time,live)}</strong><span><Text text="Close "/><b>${selected.close.toFixed(2)}</b></span><span><Text text="Open / High / Low "/><b>{selected.open.toFixed(2)} / {selected.high.toFixed(2)} / {selected.low.toFixed(2)}</b></span>{delta!=null&&<span>{range==='live'?<Text text="vs previous IEX close"/>:<Text text="vs range first close"/>} <b>{delta>=0?'+':''}{delta.toFixed(2)} ({(delta/base!*100).toFixed(2)}%)</b></span>}<span><Text text="IEX volume "/><b>{selected.volume.toLocaleString('en-US')}</b></span></div>}
  </div>
  <div className="chart-zoom"><button aria-label={ui("Zoom in")} onClick={()=>zoom(.8)}>＋</button><button aria-label={ui("Zoom out")} onClick={()=>zoom(1.25)}>−</button><button onClick={()=>{setWindow({start:0,end:1});setHover(null);}}><Text text="Reset view"/></button><span className="small"><Text text="Scroll to zoom · drag to pan"/></span></div>
  <p className="small">{date(visible[0].time,live)} — {date(visible.at(-1)!.time,live)} · {live?<Text text="Regular-session"/>:<Text text="Completed-session"/>}<Text text=" data · split/dividend adjusted · IEX only. Gaps have no IEX trades; volume is not consolidated US volume."/>{range==='live'&&intraday&&easternDay(intraday.as_of)!==easternDay(new Date().toISOString())?<Text text=" Showing the most recent available trading session."/>:''}</p>
  <details className="chart-data-table"><summary><Text text="View recent chart data"/></summary><div className="stock-table-scroll"><table className="financial-table"><thead><tr><th><Text text="Time (ET)"/></th><th><Text text="Open"/></th><th><Text text="High"/></th><th><Text text="Low"/></th><th><Text text="Close"/></th><th><Text text="IEX volume"/></th></tr></thead><tbody>{visible.slice(-10).map(b=><tr key={b.time}><td>{date(b.time,live)}</td>{[b.open,b.high,b.low,b.close].map((n,i)=><td key={i}>${n.toFixed(2)}</td>)}<td>{b.volume.toLocaleString('en-US')}</td></tr>)}</tbody></table></div></details>
  </>}
 </section>;
}
