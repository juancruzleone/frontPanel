import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getCachedTenantPlanInfo, TenantPlanInfo } from '../../services/tenantPlanService';
import './UsageBanner.css';
type Bucket='internalUsers'|'clients';
interface Props{limits?:TenantPlanInfo['limits'];warnings?:string[];onUpgrade?:()=>void}
const tone=(pct:number,w:string[],b:Bucket)=>w.includes(`${b}_100`)||pct>=100?'red':w.includes(`${b}_80`)||pct>=80?'amber':'neutral';
export const UsageBanner:React.FC<Props>=({limits:pl,warnings:pw,onUpgrade})=>{
  const{t}=useTranslation();
  const[limits,setLimits]=useState(pl??null);
  const[warnings,setWarnings]=useState<string[]>(pw??[]);
  const[dismissed,setDismissed]=useState<Set<string>>(()=>{try{return new Set(JSON.parse(localStorage.getItem('usageBanner_dismissed')||'[]'))}catch{return new Set()}});
  useEffect(()=>{ if(pl&&pw){setLimits(pl);setWarnings(pw);return} let c=false; getCachedTenantPlanInfo().then(i=>{if(c)return;setLimits(i.limits);setWarnings(i.warnings||[])}).catch(()=>{}); return()=>{c=true}},[pl,pw]);
  const dismiss=useCallback((b:Bucket)=>{ const k=`dismissed_${b}_80`; setDismissed(s=>{const n=new Set(s);n.add(k);try{localStorage.setItem('usageBanner_dismissed',JSON.stringify([...n]))}catch{}return n})},[]);
  const upgrade=useCallback(()=>onUpgrade?onUpgrade():window.location.href='/plans',[onUpgrade]);
  if(!limits) return null;
  const out:React.ReactNode[]=[];
  for(const b of ['internalUsers','clients'] as Bucket[]){
    const s=(limits as any)[b] as {current:number;max:number;percentage?:number}|undefined; if(!s) continue;
    const pct=s.percentage??(s.max?Math.round(s.current/s.max*100):0); const tk=tone(pct,warnings,b); if(tk==='neutral'||(tk==='amber'&&dismissed.has(`dismissed_${b}_80`))) continue;
    const rem=Math.max(0,s.max-s.current); const label=t(`usageBanner.${b==='internalUsers'?'internalUsersLabel':'clientsLabel'}`,b==='internalUsers'?'usuarios internos':'clientes');
    const block=tk==='red';
    out.push(<div key={b} role="alert" className={`usage-banner usage-banner--${tk}`}><span>{block?'⛔':'⚠️'}</span><span className="usage-banner__text">{block?t(`usageBanner.${b}Blocked`,{current:s.current,max:s.max,defaultValue:`Límite de ${label} alcanzado: ${s.current}/${s.max} — actualiza tu plan`}):t(`usageBanner.${b}Warning`,{remaining:rem,max:s.max,current:s.current,percentage:pct,defaultValue:`Te quedan ${rem} de ${s.max} ${label} (${pct}%) — cerca del límite`})}</span>{block?<button className="usage-banner__cta" onClick={upgrade}>{t('usageBanner.upgradeCta','Actualizar plan')}</button>:<button className="usage-banner__dismiss" aria-label={t('common.close','Cerrar')} onClick={()=>dismiss(b)}>✕</button>}</div>);
  }
  return out.length? <div className="usage-banner__stack">{out}</div>:null;
};
export default UsageBanner;
