// CTR — Calling Team Records
const SUPABASE_URL="https://icootmtssyergamuxlxb.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_qgEIXxXXBq2TaNxLMZPkwg_fcwKcdGW";
const $=id=>document.getElementById(id);
let db,user,group=[],personal=[],direct=[],team=[],channel;
let groupFilter="",dateFilter="",personalFilter="",directFilter="";
const seenKey=k=>"ctr_seen_"+k+"_"+(user?.id||"");const markSeen=k=>{if(user)localStorage.setItem(seenKey(k),new Date().toISOString());updateUnread()};const countUnread=(a,k)=>a.filter(x=>new Date(x.created_at)>new Date(localStorage.getItem(seenKey(k))||0)).length;function updateUnread(){if(!user)return;for(const [id,n] of [["groupUnread",countUnread(group.filter(x=>x.user_id!==user.id),"group")],["directUnread",countUnread(direct.filter(x=>x.recipient_id===user.id),"direct")]]){const e=$(id);if(e){e.textContent=n;e.classList.toggle("hidden",!n)}}}
const ADMIN_EMAIL="mahesh.s@hrhnext.com";
const isAdmin=()=>String(user?.email||"").toLowerCase()===ADMIN_EMAIL;
const teamNames={
 "hrhca39899_indiframe@hrhnow.in":"Amrutha Shiva Kumar",
 "hrhca39898_indiframe@hrhnow.in":"Nandkishor Kasoju",
 "hrhca39264_indiframe@hrhnow.in":"Mohd Javeed Ali",
 "mahesh.s@hrhnext.com":"Mahesh Sharma"
};
const displayName=email=>teamNames[String(email||"").toLowerCase()]||"CTR Member";
const palette=["#8E7CFF","#36A6D9","#20B58A","#E59A3B","#E16C91","#A1A94B","#D477D1","#6E91C9"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=s=>(s||"U").trim()[0].toUpperCase();
const time=s=>new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(s));
function status(t,auth=false){$(auth?"authStatus":"connectionBanner").textContent=t}
function formatNoteHtml(body){
 const lines=String(body||"").split(/\r?\n/);
 return lines.map((line,i)=>{
  const safe=esc(line);
  if(i===0&&line.includes("|"))return "<strong>"+safe+"</strong>";
  if(/^Assigned to\s*:/i.test(line))return "<strong>Assigned to</strong>"+safe.replace(/^Assigned to\s*:/i,":");
  return safe||"&nbsp;";
 }).join("<br>");
}
function dayLabel(v){const d=new Date(v),t=new Date(),y=new Date();y.setDate(t.getDate()-1);return d.toDateString()===t.toDateString()?"Today":d.toDateString()===y.toDateString()?"Yesterday":new Intl.DateTimeFormat(undefined,{dateStyle:"full"}).format(d)}
function renderGroup(forceBottom=false){
 const box=$("notes"),near=box.scrollHeight-box.scrollTop-box.clientHeight<110;
 let rows=group.filter(n=>(!groupFilter||[n.body,displayName(n.author_email),n.author_email].join(" ").toLowerCase().includes(groupFilter))&&(!dateFilter||new Date(n.created_at).toISOString().slice(0,10)===dateFilter));
 rows.sort((x,y)=>Number(!!y.is_pinned)-Number(!!x.is_pinned)||new Date(x.created_at)-new Date(y.created_at));$("noteCount").textContent=rows.length;let last="";
 $("notes").innerHTML=rows.length?rows.map(n=>{const day=new Date(n.created_at).toDateString(),sep=day!==last?(last=day,`<div class="date-separator">${esc(dayLabel(n.created_at))}</div>`):"";return sep+`<article class="note ${n.user_id===user.id?"mine":""}" data-note-id="${n.id}"><div class="note-top"><div class="note-avatar" style="background:${esc(n.chat_color)}">${esc(initials(displayName(n.author_email)))}</div><span class="note-author">${esc(displayName(n.author_email))}${n.user_id===user.id?" · You":""}</span><span class="note-time">${esc(time(n.created_at))}${n.edited_at?" · edited":""}</span>${n.is_pinned?'<span class="pin-label">Pinned</span>':""}${n.user_id===user.id||isAdmin()?`<button class="message-action" data-edit="${n.id}">Edit</button>`:""}${isAdmin()?`<button class="delete-note" data-gdelete="${n.id}">Admin · Delete</button>`:""}${isAdmin()?`<button class="message-action" data-pin="${n.id}">${n.is_pinned?"Unpin":"Pin"}</button>`:""}</div><div class="note-body">${formatNoteHtml(n.body)}</div><div class="reaction-row">${["👍","✅","👀"].map(e=>{const users=(n.reactions||{})[e]||[];return `<button class="reaction-btn ${users.includes(user.id)?"reacted":""}" data-react="${n.id}" data-emoji="${e}" type="button" aria-pressed="${users.includes(user.id)}">${e} ${users.length}</button>`}).join("")}</div></article>`}).join(""):'<div class="empty-state"><h3>No matching updates</h3><p>Try clearing the filters.</p></div>';
 enhanceGroupMessages(rows);if(forceBottom||near)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);updateUnread();
}

function enhanceGroupMessages(rows){
 const seen=new Date(localStorage.getItem(seenKey("group"))||0).getTime();let prior="",unreadDone=false;
 document.querySelectorAll("#notes .note[data-note-id]").forEach(card=>{
  const n=rows.find(x=>x.id===card.dataset.noteId);if(!n)return;
  const groupKey=n.user_id+"|"+new Date(n.created_at).toDateString();
  if(groupKey===prior){card.classList.add("message-group-continued");const av=card.querySelector(".note-avatar"),au=card.querySelector(".note-author");if(av)av.hidden=true;if(au)au.hidden=true}
  else card.classList.add("message-group-start");
  prior=groupKey;
  if(n.user_id!==user.id&&new Date(n.created_at).getTime()>seen&&!unreadDone){const sep=document.createElement("div");sep.className="unread-divider";sep.textContent="New messages";card.before(sep);unreadDone=true}
  const body=n.body||"",m=body.match(/(?:\\+?91[\\s-]?)?[6-9]\\d{9}/);
  const top=card.querySelector(".note-top");
  if(m&&top){const phone=m[0].replace(/\\D/g,"");const call=document.createElement("a");call.className="message-action call-action";call.href="tel:"+phone;call.textContent="Call";top.append(call);const cp=document.createElement("button");cp.className="message-action";cp.type="button";cp.dataset.copyPhone=phone;cp.textContent="Copy number";top.append(cp)}
  const tools=document.createElement("div");tools.className="note-tools";const copy=document.createElement("button");copy.type="button";copy.className="message-action";copy.dataset.copyNote=n.id;copy.textContent="Copy note";tools.append(copy);card.append(tools);
 });
}
let followups=[];
function renderFollowups(){
 const box=$("followupList");if(!box)return;const rows=followups.filter(x=>x.status!=="completed").sort((a,b)=>new Date(a.callback_at)-new Date(b.callback_at));
 $("followupCount").textContent=rows.length;
 box.innerHTML=rows.length?rows.map(f=>'<article class="followup-item"><div class="followup-info"><strong>'+esc(f.customer_name)+'</strong><span>'+esc(f.phone)+'</span><time>'+esc(time(f.callback_at))+'</time><p>'+esc(f.details||"")+'</p></div><div class="followup-actions"><a class="message-action" href="tel:'+f.phone.replace(/\\D/g,"")+'">Call</a><button class="message-action" data-copy-phone="'+f.phone.replace(/\\D/g,"")+'">Copy</button><button class="message-action" data-follow-done="'+f.id+'">Complete</button></div></article>').join(""):'<div class="empty-state">No pending follow-ups.</div>';
}
async function loadFollowups(){const r=await db.from("ctr_followups").select("*").order("callback_at").limit(500);if(r.error){$("followupList").textContent="Run the follow-up SQL update in Supabase to enable reminders.";return}followups=r.data||[];renderFollowups()}

function renderDirect(){
 const admin=isAdmin(),selected=$("directRecipient").value;
 $("directAdminHint").classList.toggle("hidden",!admin);
 $("directCount").textContent=direct.length;
 const rows=direct.filter(m=>(!directFilter||[m.body,team.find(x=>x.user_id===m.sender_id)?.display_name,team.find(x=>x.user_id===m.recipient_id)?.display_name].join(" ").toLowerCase().includes(directFilter))&&(admin&&!selected?true:
  (m.sender_id===user.id&&m.recipient_id===selected)||(m.sender_id===selected&&m.recipient_id===user.id)
  ));
 $("directNotes").innerHTML=rows.length?rows.map(m=>{
  const sender=team.find(x=>x.user_id===m.sender_id),recipient=team.find(x=>x.user_id===m.recipient_id);
  const from=sender?.display_name||"CTR Member",to=recipient?.display_name||"CTR Member";
  return `<article class="note direct-note"><div class="note-top"><span class="note-author">${esc(from)} <span class="direct-route">→ ${esc(to)}</span></span><span class="note-time">${esc(time(m.created_at))}</span>${admin?`<button class="delete-note" data-ddelete="${m.id}">Admin · Delete</button>`:""}</div><div class="note-body">${esc(m.body)}</div></article>`;
 }).join(""):'<div class="empty-state"><h3>No direct messages yet</h3><p>Choose a team member above to start a private conversation.</p></div>';
}
async function loadDirect(){
 const {data:people,error:peopleError}=await db.from("ctr_team_directory").select("user_id,email,display_name").order("display_name");
 if(peopleError){status("Team directory unavailable. Run the direct-message SQL update in Supabase.");return}
 team=people||[];
 if(isAdmin()){const {data:logs}=await db.from("ctr_moderation_log").select("*").order("deleted_at",{ascending:false}).limit(100);$("moderationPanel")?.classList.remove("hidden");$("moderationLog").innerHTML=(logs||[]).map(x=>`<article class="note"><div class="note-top"><span class="note-author">${esc(x.deleted_by_email||"Admin")} · ${esc(x.table_name)}</span><span class="note-time">${esc(time(x.deleted_at))}</span></div><div class="note-body">${esc(x.original_body||"")}</div></article>`).join("")||'<div class="empty-state">No deletions recorded.</div>'}else $("moderationPanel")?.classList.add("hidden");
 const sel=$("directRecipient"),old=sel.value;
 sel.innerHTML='<option value="">'+(isAdmin()?'All conversations (admin view)':'Choose a team member…')+'</option>'+
  team.filter(p=>p.user_id!==user.id).map(p=>`<option value="${p.user_id}">${esc(p.display_name)}</option>`).join("");
 if(old&&team.some(p=>p.user_id===old))sel.value=old;
 const {data,error}=await db.from("ctr_direct_messages").select("*").order("created_at",{ascending:true}).limit(1000);
 if(error){status("Could not load direct messages: "+error.message);return}
 direct=data||[];renderDirect();renderPersonal();updateUnread();
}
async function refreshMessages(){
 const btn=$("refreshData");btn.disabled=true;btn.textContent="↻ Refreshing…";
 try{
  const [g,p,c,profiles]=await Promise.all([
   db.from("ctr_group_notes").select("*").order("created_at").limit(500),
   db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).limit(500),
   db.from("ctr_profiles").select("chat_color").eq("user_id",user.id).maybeSingle(),
   db.from("ctr_profiles").select("user_id,chat_color")
  ]);
  if(g.error||p.error||c.error||profiles.error)throw(g.error||p.error||c.error||profiles.error);
  const colors=Object.fromEntries((profiles.data||[]).map(x=>[x.user_id,x.chat_color]));
  group=(g.data||[]).map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));personal=p.data||[];
  renderGroup(true);renderPersonal();await loadFollowups();
  await loadDirect();
  status("Messages refreshed.");
 }catch(e){status("Refresh failed: "+e.message)}
 finally{btn.disabled=false;btn.textContent="↻ Refresh"}
}
function renderPersonal(){
 const rows=personal.filter(n=>!personalFilter||[n.body,team.find(t=>t.user_id===n.user_id)?.display_name||displayName(user.email)].join(" ").toLowerCase().includes(personalFilter));
 $("personalCount").textContent=rows.length;
 $("personalNotes").innerHTML=rows.length?rows.map(n=>{const owner=team.find(t=>t.user_id===n.user_id)?.display_name||(n.user_id===user.id?displayName(user.email):"CTR Member");return `<article class="note personal-note"><div class="note-top"><span class="note-author">${isAdmin()?esc(owner)+" · PERSONAL NOTE":"PRIVATE NOTE"}</span><span class="note-time">${esc(time(n.created_at))}${n.edited_at?" · edited":""}</span><button class="message-action" data-pedit="${n.id}">Edit</button>${isAdmin()? `<button class="delete-note" data-pdelete="${n.id}">Admin · Delete</button>`:""}</div><div class="note-body">${esc(n.body)}</div></article>`}).join(""):'<div class="empty-state"><h3>No matching personal notes</h3><p>Try clearing your search.</p></div>';
}
function showView(v){
 $("groupView").classList.toggle("hidden",v!=="group");
 $("personalView").classList.toggle("hidden",v!=="personal");
 $("directView").classList.toggle("hidden",v!=="direct");
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
 if(v==="direct"){loadDirect();markSeen("direct")}if(v==="group")markSeen("group");
}
let generatedDrafts={group:"",crm:""};
function smartDrafts(raw){
 const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const heading=lines.find(x=>x.includes("|"))||"Customer Name | Contact Number";
 const assignedLine=lines.find(x=>/^assigned\s*to\s*[:|-]/i.test(x));
 const assigned=assignedLine?assignedLine.replace(/^assigned\s*to\s*[:|-]\s*/i,"").trim():"Not specified";
 const narrative=lines.filter(x=>x!==heading&&x!==assignedLine&&!/^customer\s*name\s*[:|-]/i.test(x)).join(" ");
 const text=narrative||"Connected with the customer. Further discussion and requirement details are yet to be updated.";
 const groupNote=heading+"\n\n"+text+"\n\nAssigned to: "+assigned;
 const crmNote=text+"\n\nAssigned to: "+assigned;
 return {group:groupNote,crm:crmNote};
}
async function generateNotes(){
 const raw=$("aiInput").value.trim();
 if(!raw){$("aiStatus").textContent="Paste customer details first.";return}
 $("generateAI").disabled=true;$("aiStatus").textContent="Preparing both note formats…";
 try{
  generatedDrafts=smartDrafts(raw);
  $("aiGroup").innerHTML=formatNoteHtml(generatedDrafts.group);
  $("aiCrm").innerHTML=formatNoteHtml(generatedDrafts.crm);
  $("aiResults").classList.remove("hidden");
  $("aiStatus").textContent="Both formats are ready. Review before sharing.";
 }catch(e){$("aiStatus").textContent="Could not prepare notes: "+e.message}
 finally{$("generateAI").disabled=false}
}
async function loadAll(){
 const [g,p,c,profiles]=await Promise.all([db.from("ctr_group_notes").select("*").order("created_at").limit(500),db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).limit(500),db.from("ctr_profiles").select("chat_color").eq("user_id",user.id).maybeSingle(),db.from("ctr_profiles").select("user_id,chat_color")]);
 if(g.error||p.error||c.error||profiles.error)throw(g.error||p.error||c.error||profiles.error);
 const colors=Object.fromEntries((profiles.data||[]).map(x=>[x.user_id,x.chat_color]));
 group=(g.data||[]).map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));personal=p.data||[];
 renderGroup(true);renderPersonal();renderColors(c.data?.chat_color||null);await loadFollowups();
}
function renderColors(chosen){
 $("colorChoices").innerHTML=palette.map(col=>`<button type="button" class="color-choice ${chosen===col?"selected":""}" data-color="${col}" style="--swatch:${col}" ${chosen?"disabled":""} aria-label="Choose ${col}"></button>`).join("");
 $("colorLock").textContent=chosen?"Your chat colour is locked and cannot be changed.":"Choose one available colour. Each colour can belong to only one user and cannot be changed.";
}
async function chooseColor(color){
 const {error}=await db.from("ctr_profiles").insert({user_id:user.id,chat_color:color});
 if(error){status(error.code==="23505"?"That colour is already taken. Choose another.":"Could not save colour: "+error.message);return}
 renderColors(color);status("Your chat colour is saved and locked.");
}
function realtime(){
 if(channel)db.removeChannel(channel);
 channel=db.channel("ctr-live-"+user.id)
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_group_notes"},async()=>{const [{data,error},{data:profiles}]=await Promise.all([db.from("ctr_group_notes").select("*").order("created_at").limit(500),db.from("ctr_profiles").select("user_id,chat_color")]);if(!error){const colors=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.chat_color]));group=(data||[]).map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));renderGroup()}})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_profiles"},async()=>{const [{data:mine},{data:profiles}]=await Promise.all([db.from("ctr_profiles").select("chat_color").eq("user_id",user.id).maybeSingle(),db.from("ctr_profiles").select("user_id,chat_color")]);renderColors(mine?.chat_color||null);const colors=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.chat_color]));group=group.map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));renderGroup()})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_personal_notes",},async()=>{const {data}=await db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).limit(500);personal=data||[];renderPersonal()})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_direct_messages"},async()=>{if(!$("directView").classList.contains("hidden"))await loadDirect()})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_followups"},loadFollowups)
 .subscribe(s=>{if(s==="SUBSCRIBED")status("Live sync connected · group updates appear automatically.");if(s==="CHANNEL_ERROR"||s==="TIMED_OUT")status("Live sync interrupted. Refresh to reconnect.")});
}
async function enter(u){
 user=u;$("authView").classList.add("hidden");$("appView").classList.remove("hidden");
 const name=displayName(u.email);$("userEmail").textContent=name;
 try{await loadAll();realtime();await loadDirect()}catch(e){status("Database error: "+(e.message||"Unable to load records."))}
}
async function boot(){
 if(!window.supabase){status("Supabase library failed to load.",true);return}
 db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const {data,error}=await db.auth.getSession();if(error){status("Session error: "+error.message,true);return}
 if(data.session)await enter(data.session.user);
 db.auth.onAuthStateChange(async(_e,s)=>{if(s?.user){if(!user||user.id!==s.user.id)await enter(s.user)}else{user=null;$("appView").classList.add("hidden");$("authView").classList.remove("hidden")}});
}
$("authForm").onsubmit=async e=>{
 e.preventDefault();if(!db)return;
 const email=$("email").value.trim().toLowerCase(),password=$("password").value;
 $("authSubmit").disabled=true;status("Signing in…",true);
 try{const r=await db.auth.signInWithPassword({email,password});if(r.error)status("Sign-in failed: "+r.error.message,true);else if(r.data.user)await enter(r.data.user)}
 catch(err){status("Sign-in error: "+(err.message||"Please try again."),true)}
 finally{$("authSubmit").disabled=false}
};
$("forgotPassword").onclick=async()=>{if(!db)return;const email=$("email").value.trim().toLowerCase();if(!email){status("Enter your registered email address first.",true);$("email").focus();return}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:"https://nottybuddy.github.io/CTR/"});status(error?error.message:"If this email belongs to a CTR account, a password reset link will be sent.",true)};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("colorChoices").onclick=e=>{const b=e.target.closest("[data-color]");if(b&&!b.disabled)chooseColor(b.dataset.color)};
$("generateAI").onclick=generateNotes;
$("refreshData").onclick=refreshMessages;
$("directRecipient").onchange=renderDirect;
$("groupSearch").oninput=e=>{groupFilter=e.target.value.toLowerCase().trim();renderGroup()};$("groupDate").onchange=e=>{dateFilter=e.target.value;renderGroup()};$("personalSearch").oninput=e=>{personalFilter=e.target.value.toLowerCase().trim();renderPersonal()};$("directSearch").oninput=e=>{directFilter=e.target.value.toLowerCase().trim();renderDirect()};$("clearFilters").onclick=()=>{$("groupSearch").value="";$("groupDate").value="";groupFilter=dateFilter="";renderGroup()};
$("directForm").onsubmit=async e=>{
 e.preventDefault();
 const recipient=$("directRecipient").value,body=$("directInput").value.trim();
 if(!recipient){status("Choose a team member before sending.");return}
 if(!body)return;
 const {error}=await db.from("ctr_direct_messages").insert({sender_id:user.id,recipient_id:recipient,sender_email:user.email,body});
 if(error){status("Could not send direct message: "+error.message);return}
 $("directInput").value="";await loadDirect();status("Direct message sent.");
};
document.addEventListener("click",async e=>{
 const cp=e.target.closest("[data-copy-phone]");if(cp){try{await navigator.clipboard.writeText(cp.dataset.copyPhone);status("Phone copied.")}catch{status("Clipboard unavailable.")}return}
 const cn=e.target.closest("[data-copy-note]");if(cn){const n=group.find(x=>x.id===cn.dataset.copyNote);if(n){try{await navigator.clipboard.writeText(n.body);status("CRM note copied.")}catch{status("Clipboard unavailable.")}}return}
 const done=e.target.closest("[data-follow-done]");if(done){const r=await db.from("ctr_followups").update({status:"completed",completed_at:new Date().toISOString()}).eq("id",done.dataset.followDone);if(r.error)status(r.error.message);else{await loadFollowups();status("Follow-up completed.")}return}
 const use=e.target.closest("[data-ai-use]");
 if(use){
  if(use.dataset.aiUse==="group"){
   if(!generatedDrafts.group||!user)return;
   const {error}=await db.from("ctr_group_notes").insert({user_id:user.id,author_email:user.email,body:generatedDrafts.group});
   $("aiStatus").textContent=error?"Could not share: "+error.message:"Group note shared successfully.";
  }else if(use.dataset.aiUse==="crm"){
   try{await navigator.clipboard.writeText(generatedDrafts.crm);$("aiStatus").textContent="CRM note copied. Paste it into your CRM."}
   catch{$("aiStatus").textContent="Clipboard access unavailable. Select and copy the CRM text."}
  }
 }
 const copy=e.target.closest("[data-copy]");
 if(copy){
  const text=generatedDrafts[copy.dataset.copy];
  try{await navigator.clipboard.writeText(text);$("aiStatus").textContent="Copied "+(copy.dataset.copy==="group"?"group":"CRM")+" note."}
  catch{$("aiStatus").textContent="Clipboard access unavailable. Select the note and copy it."}
 }
});
$("followupForm").onsubmit=async e=>{e.preventDefault();const payload={user_id:user.id,customer_name:$("followupCustomer").value.trim(),phone:$("followupPhone").value.trim(),callback_at:new Date($("followupAt").value).toISOString(),details:$("followupDetails").value.trim(),status:"pending"};const r=await db.from("ctr_followups").insert(payload);if(r.error){status("Could not schedule: "+r.error.message);return}$("followupForm").reset();await loadFollowups();status("Callback scheduled.");};
$("noteForm").onsubmit=async e=>{e.preventDefault();const body=$("noteInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_group_notes").insert({user_id:user.id,author_email:user.email,body});if(error)status("Could not send: "+error.message);else {$("noteInput").value="";renderGroup(true)}};
$("personalForm").onsubmit=async e=>{e.preventDefault();const body=$("personalInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_personal_notes").insert({user_id:user.id,body});if(error)status("Could not save: "+error.message);else $("personalInput").value=""};
document.addEventListener("click",async e=>{const target=e.target.closest("button");if(!target)return;const g=target.dataset.gdelete,p=target.dataset.pdelete,d=target.dataset.ddelete;const edit=target.dataset.edit,pedit=target.dataset.pedit,pin=target.dataset.pin,rid=target.dataset.react,emoji=target.dataset.emoji;
if(edit){const n=group.find(x=>x.id===edit);if(n){const body=prompt("Edit message",n.body);if(body!==null&&body.trim()){const {error}=await db.from("ctr_group_notes").update({body:body.trim(),edited_at:new Date().toISOString()}).eq("id",edit);if(error)status(error.message)}}}
if(pedit){const n=personal.find(x=>x.id===pedit);if(n){const body=prompt("Edit personal note",n.body);if(body!==null&&body.trim()){const {error}=await db.from("ctr_personal_notes").update({body:body.trim(),edited_at:new Date().toISOString()}).eq("id",pedit);if(error)status(error.message)}}}
if(pin&&isAdmin()){const n=group.find(x=>x.id===pin);if(n){const {error}=await db.from("ctr_group_notes").update({is_pinned:!n.is_pinned}).eq("id",pin);if(error)status(error.message)}}
if(rid&&emoji){target.disabled=true;const {error}=await db.rpc("ctr_toggle_group_reaction",{p_note_id:rid,p_emoji:emoji});target.disabled=false;if(error){status("Reaction failed: "+error.message)}else{const {data,error:readError}=await db.from("ctr_group_notes").select("*").order("created_at",{ascending:true}).limit(500);if(readError){status("Reaction saved, refresh failed: "+readError.message)}else{group=data||[];const {data:profiles}=await db.from("ctr_profiles").select("user_id,chat_color");const colors=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.chat_color]));group=group.map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));renderGroup();status("Reaction updated.")}}}
if(g&&isAdmin()){if(!confirm("Admin: permanently delete this group message?"))return;const {error}=await db.from("ctr_group_notes").delete().eq("id",g);if(error)status("Delete failed: "+error.message);else{group=group.filter(n=>n.id!==g);renderGroup();status("Group message deleted by admin.")}}if(p&&isAdmin()){if(!confirm("Admin: permanently delete this personal note?"))return;const {error}=await db.from("ctr_personal_notes").delete().eq("id",p);if(error)status("Delete failed: "+error.message);else{personal=personal.filter(n=>n.id!==p);renderPersonal();status("Personal note deleted by admin.")}}if(d&&isAdmin()){if(!confirm("Admin: permanently delete this direct message?"))return;const {error}=await db.from("ctr_direct_messages").delete().eq("id",d);if(error)status("Delete failed: "+error.message);else{direct=direct.filter(m=>m.id!==d);renderDirect();status("Direct message deleted by admin.")}}});
$("signOut").onclick=async()=>{if(channel)await db.removeChannel(channel);await db.auth.signOut()};
boot();

document.addEventListener("visibilitychange",()=>{if(!document.hidden&&user){if(!$("groupView").classList.contains("hidden"))markSeen("group");if(!$("directView").classList.contains("hidden"))markSeen("direct")}});
let holdTimer;document.addEventListener("touchstart",e=>{const card=e.target.closest(".note[data-note-id]");if(!card)return;holdTimer=setTimeout(()=>{const n=group.find(x=>x.id===card.dataset.noteId);if(n&&confirm("Quote this message in Group Chat?")){$("noteInput").value="↪ "+displayName(n.author_email)+": "+n.body+"\n\n";$("noteInput").focus()}},650)},{passive:true});document.addEventListener("touchend",()=>clearTimeout(holdTimer),{passive:true});document.addEventListener("touchmove",()=>clearTimeout(holdTimer),{passive:true});
document.addEventListener("touchstart",e=>{const c=e.target.closest(".note[data-note-id]");if(c)c.dataset.startX=e.touches[0].clientX},{passive:true});document.addEventListener("touchend",async e=>{const c=e.target.closest(".note[data-note-id]");if(!c||!c.dataset.startX)return;const dx=e.changedTouches[0].clientX-Number(c.dataset.startX);delete c.dataset.startX;const n=group.find(x=>x.id===c.dataset.noteId);if(!n)return;if(dx>85){$("noteInput").value="↪ "+displayName(n.author_email)+": "+n.body+"\n\n";$("noteInput").focus()}else if(dx< -85){try{await navigator.clipboard.writeText(n.body);status("CRM note copied by swipe.")}catch{status("Clipboard unavailable.")}}},{passive:true});
