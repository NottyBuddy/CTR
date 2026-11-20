// CTR — Calling Team Records
const SUPABASE_URL="https://icootmtssyergamuxlxb.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_qgEIXxXXBq2TaNxLMZPkwg_fcwKcdGW";
const $=id=>document.getElementById(id);
let db,user,group=[],personal=[],direct=[],team=[],channel;\nconst ADMIN_EMAIL="mahesh.s@hrhnext.com";\nconst isAdmin=()=>String(user?.email||"").toLowerCase()===ADMIN_EMAIL;
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
function renderGroup(forceBottom=false){
 const box=$("notes"),wasNearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<110;
 $("noteCount").textContent=group.length;
 $("notes").innerHTML=group.length?group.map(n=>`<article class="note ${n.user_id===user.id?"mine":""}" style="--user-chat:${esc(n.chat_color)}"><div class="note-top"><div class="note-avatar" style="background:${esc(n.chat_color)}">${esc(initials(displayName(n.author_email)))}</div><span class="note-author">${esc(displayName(n.author_email))}${n.user_id===user.id?" · You":""}</span><span class="note-time">${esc(time(n.created_at))}</span>${n.user_id===user.id?`<button class="delete-note" data-gdelete="${n.id}">Delete</button>`:""}</div><div class="note-body">${formatNoteHtml(n.body)}</div></article>`).join(""):'<div class="empty-state"><h3>No group updates yet</h3><p>Paste the first CRM update to start the shared record.</p></div>';
 if(forceBottom||wasNearBottom)requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight});
}
function renderDirect(){
 const admin=isAdmin(),selected=$("directRecipient").value;
 $("directAdminHint").classList.toggle("hidden",!admin);
 $("directCount").textContent=direct.length;
 const rows=direct.filter(m=>admin&&!selected?true:(
  (m.sender_id===user.id&&m.recipient_id===selected)||(m.sender_id===selected&&m.recipient_id===user.id)
 ));
 $("directNotes").innerHTML=rows.length?rows.map(m=>{
  const sender=team.find(x=>x.user_id===m.sender_id),recipient=team.find(x=>x.user_id===m.recipient_id);
  const from=sender?.display_name||"CTR Member",to=recipient?.display_name||"CTR Member";
  return `<article class="note direct-note"><div class="note-top"><span class="note-author">${esc(from)} <span class="direct-route">→ ${esc(to)}</span></span><span class="note-time">${esc(time(m.created_at))}</span></div><div class="note-body">${esc(m.body)}</div></article>`;
 }).join(""):'<div class="empty-state"><h3>No direct messages yet</h3><p>Choose a team member above to start a private conversation.</p></div>';
}
async function loadDirect(){
 const {data:people,error:peopleError}=await db.from("ctr_team_directory").select("user_id,email,display_name").order("display_name");
 if(peopleError){status("Team directory unavailable. Run the direct-message SQL update in Supabase.");return}
 team=people||[];
 const sel=$("directRecipient"),old=sel.value;
 sel.innerHTML='<option value="">'+(isAdmin()?'All conversations (admin view)':'Choose a team member…')+'</option>'+
  team.filter(p=>p.user_id!==user.id).map(p=>`<option value="${p.user_id}">${esc(p.display_name)}</option>`).join("");
 if(old&&team.some(p=>p.user_id===old))sel.value=old;
 const {data,error}=await db.from("ctr_direct_messages").select("*").order("created_at",{ascending:true}).limit(1000);
 if(error){status("Could not load direct messages: "+error.message);return}
 direct=data||[];renderDirect();
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
  renderGroup(true);renderPersonal();
  await loadDirect();
  status("Messages refreshed.");
 }catch(e){status("Refresh failed: "+e.message)}
 finally{btn.disabled=false;btn.textContent="↻ Refresh"}
}
function renderPersonal(){
 $("personalCount").textContent=personal.length;
 $("personalNotes").innerHTML=personal.length?personal.map(n=>`<article class="note personal-note"><div class="note-top"><span class="note-author">PRIVATE NOTE</span><span class="note-time">${esc(time(n.created_at))}</span><button class="delete-note" data-pdelete="${n.id}">Delete</button></div><div class="note-body">${esc(n.body)}</div></article>`).join(""):'<div class="empty-state"><h3>Your private notes</h3><p>Keep open-call, callback and follow-up reminders here. Only you can see them.</p></div>';
}
function showView(v){
 $("groupView").classList.toggle("hidden",v!=="group");
 $("personalView").classList.toggle("hidden",v!=="personal");
 $("directView").classList.toggle("hidden",v!=="direct");
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
 if(v==="direct")loadDirect();
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
 renderGroup(true);renderPersonal();renderColors(c.data?.chat_color||null);
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
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_personal_notes",filter:"user_id=eq."+user.id},async()=>{const {data}=await db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).limit(500);personal=data||[];renderPersonal()})\n .on("postgres_changes",{event:"*",schema:"public",table:"ctr_direct_messages"},async()=>{if(!$("directView").classList.contains("hidden"))await loadDirect()})
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
$("noteForm").onsubmit=async e=>{e.preventDefault();const body=$("noteInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_group_notes").insert({user_id:user.id,author_email:user.email,body});if(error)status("Could not send: "+error.message);else {$("noteInput").value="";renderGroup(true)}};
$("personalForm").onsubmit=async e=>{e.preventDefault();const body=$("personalInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_personal_notes").insert({user_id:user.id,body});if(error)status("Could not save: "+error.message);else $("personalInput").value=""};
document.addEventListener("click",async e=>{const g=e.target.dataset.gdelete,p=e.target.dataset.pdelete;if(g){const {error}=await db.from("ctr_group_notes").delete().eq("id",g);if(error)status(error.message)}if(p){const {error}=await db.from("ctr_personal_notes").delete().eq("id",p);if(error)status(error.message)}});
$("signOut").onclick=async()=>{if(channel)await db.removeChannel(channel);await db.auth.signOut()};
boot();
