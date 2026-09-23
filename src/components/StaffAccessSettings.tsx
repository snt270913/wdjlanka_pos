import React, { useEffect, useState } from 'react';
import { accessApi, PERMISSIONS } from '../data/accessApi';
interface Staff { user_id:string; username:string; name:string; active:boolean; permissions:string[] }
export function StaffAccessSettings() {
  const [staff,setStaff]=useState<Staff[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const [name,setName]=useState(''); const [username,setUsername]=useState(''); const [password,setPassword]=useState('');
  const [permissions,setPermissions]=useState<string[]>(['inventory','sell']);
  const [resetId,setResetId]=useState(''); const [resetPassword,setResetPassword]=useState('');
  const load=async()=>setStaff(await accessApi('staff-list'));
  useEffect(()=>{void load().catch(e=>setMessage(e.message));},[]);
  const perform=async(task:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await task();await load();setMessage('Staff access saved.');}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');}finally{setBusy(false);}};
  const checks=(values:string[],change:(next:string[])=>void)=><div className="access-permissions">{PERMISSIONS.map(([id,label])=><label key={id}><input type="checkbox" checked={values.includes(id)} onChange={e=>change(e.target.checked?[...values,id]:values.filter(p=>p!==id))}/><span>{label}</span></label>)}</div>;
  return <section className="access-panel"><h3>Staff & access</h3><p className="access-help">Create individual username/password accounts and choose their access. All staff can browse stock. Item changes, deletion, restore and business settings remain administrator-only. Reports access includes cost and profit.</p>
    {message&&<p role="status" className="access-message">{message}</p>}
    <form className="access-form" onSubmit={e=>{e.preventDefault();void perform(async()=>{if (username === (import.meta.env.VITE_ADMIN_USERNAME || 'wdjlanka').toLowerCase()) throw new Error('Choose a different username from the administrator.');await accessApi('staff-create',{name,username,password,permissions});setName('');setUsername('');setPassword('');});}}>
      <div className="access-columns"><label>Staff name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label>Username<input required pattern="[a-z0-9_]{3,32}" minLength={3} maxLength={32} autoComplete="off" placeholder="e.g. cashier_1" value={username} onChange={e=>setUsername(e.target.value.toLowerCase())}/></label></div>
      <label>Initial password<input required type="password" minLength={6} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><small>At least 6 characters. Share it privately with this staff member.</small></label>
      {checks(permissions,setPermissions)}<button disabled={busy} className="sale-restore">{busy?'Saving…':'Create staff account'}</button>
    </form>
    <div className="mt-6 space-y-4">{staff.map(person=><article key={person.user_id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{person.name}</strong><p className="text-sm text-slate-500">@{person.username} · {person.active?'Active':'Disabled'}</p></div><button disabled={busy} className="sale-secondary" onClick={()=>void perform(async()=>{await accessApi('staff-update',{userId:person.user_id,active:!person.active,permissions:person.permissions});})}>{person.active?'Disable access':'Enable access'}</button></div>
      {checks(person.permissions,next=>setStaff(prev=>prev.map(s=>s.user_id===person.user_id?{...s,permissions:next}:s)))}
      <div className="flex flex-wrap gap-2 mt-3"><button disabled={busy} className="sale-restore" onClick={()=>void perform(async()=>{await accessApi('staff-update',{userId:person.user_id,active:person.active,permissions:person.permissions});})}>Save permissions</button><button className="sale-secondary" onClick={()=>{setResetId(person.user_id);setResetPassword('');}}>Reset password</button><button disabled={busy} className="sale-secondary text-red-700" onClick={()=>{if(window.confirm(`Permanently delete ${person.name} (@${person.username})? Their login and device PINs will be removed. Previous sales records will remain.`)) void perform(async()=>{await accessApi('staff-delete',{userId:person.user_id});if(resetId===person.user_id){setResetId('');setResetPassword('');}});}}>Delete staff</button></div>
      {resetId===person.user_id&&<form className="access-form mt-3" onSubmit={e=>{e.preventDefault();void perform(async()=>{await accessApi('staff-password',{userId:person.user_id,password:resetPassword});setResetId('');setResetPassword('');});}}><label>New password<input type="password" required minLength={6} autoComplete="new-password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label><button disabled={busy} className="sale-restore">Update password & remove device PINs</button></form>}
    </article>)}{staff.length===0&&<p className="access-help">No staff accounts yet.</p>}</div>
  </section>;
}
