// CTR — Calling Team Records
const SUPABASE_URL="https://icootmtssyergamuxlxb.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_qgEIXxXXBq2TaNxLMZPkwg_fcwKcdGW";
const $=id=>document.getElementById(id);
let db,user,group=[],personal=[],channel;
const palette=["#8E7CFF","#36A6D9","#20B58A","#E59A3B","#E16C91","#A1A94B","#D477D1","#6E91C9"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=s=>(s||"U").trim()[0].toUpperCase();
const time=s=>new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(s));
function status(t,auth=false){$(auth?"authStatus":"connectionBanner").textContent=t}
function renderGroup(){
 $("noteCount").textContent=group.length;
 $("notes").innerHTML=group.length?group.map(n=>`<article class="note ${n.user_id===user.id?"mine":""}" style="--user-chat:${esc(n.chat_color)}"><div class="note-top"><div class="note-avatar" style="background:${esc(n.chat_color)}">${esc(initials(n.author_email))}</div><span class="note-author">${esc(n.author_email)}${n.user_id===user.id?" · You":""}</span><span class="note-time">${esc(time(n.created_at))}</span>${n.user_id===user.id?`<button class="delete-note" data-gdelete="${n.id}">Delete</button>`:""}</div><div class="note-body">${esc(n.body)}</div></article>`).join(""):'<div class="empty-state"><h3>No group updates yet</h3><p>Paste the first CRM update to start the shared record.</p></div>';
 $("notes").scrollTop=$("notes").scrollHeight;
}
function renderPersonal(){
 $("personalCount").textContent=personal.length;
 $("personalNotes").innerHTML=personal.length?personal.map(n=>`<article class="note personal-note"><div class="note-top"><span class="note-author">PRIVATE NOTE</span><span class="note-time">${esc(time(n.created_at))}</span><button class="delete-note" data-pdelete="${n.id}">Delete</button></div><div class="note-body">${esc(n.body)}</div></article>`).join(""):'<div class="empty-state"><h3>Your private notes</h3><p>Keep open-call, callback and follow-up reminders here. Only you can see them.</p></div>';
}
function showView(v){$("groupView").classList.toggle("hidden",v!=="group");$("personalView").classList.toggle("hidden",v!=="personal");document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v))}
async function loadAll(){
 const [g,p,c,profiles]=await Promise.all([db.from("ctr_group_notes").select("*").order("created_at").limit(500),db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).limit(500),db.from("ctr_profiles").select("chat_color").eq("user_id",user.id).maybeSingle(),db.from("ctr_profiles").select("user_id,chat_color")]);
 if(g.error||p.error||c.error||profiles.error)throw(g.error||p.error||c.error||profiles.error);
 const colors=Object.fromEntries((profiles.data||[]).map(x=>[x.user_id,x.chat_color]));group=(g.data||[]).map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));personal=p.data||[];renderGroup();renderPersonal();renderColors(c.data?.chat_color||null);
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
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_personal_notes",filter:"user_id=eq."+user.id},async()=>{const {data}=await db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).limit(500);personal=data||[];renderPersonal()})
 .subscribe(s=>{if(s==="SUBSCRIBED")status("Live sync connected · group updates appear automatically.");if(s==="CHANNEL_ERROR"||s==="TIMED_OUT")status("Live sync interrupted. Refresh to reconnect.")});
}
async function enter(u){
 user=u;$("authView").classList.add("hidden");$("appView").classList.remove("hidden");
 $("userEmail").textContent=u.email;$("sideEmail").textContent=u.email;$("avatar").textContent=initials(u.email);
 try{await loadAll();realtime()}catch(e){status("Database setup required: "+e.message)}
}
async function boot(){
 if(!window.supabase){status("Supabase library failed to load.",true);return}
 if(SUPABASE_URL.startsWith("YOUR_")||SUPABASE_ANON_KEY.startsWith("YOUR_")){$("authSubmit").disabled=true;status("Connect Supabase first: add your project URL and publishable/anon key in app.js.",true);return}
 db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const {data}=await db.auth.getSession();if(data.session)await enter(data.session.user);
 db.auth.onAuthStateChange(async(_e,s)=>{if(s?.user)await enter(s.user);else{user=null;$("appView").classList.add("hidden");$("authView").classList.remove("hidden")}});
}
$("toggleAuth").onclick=()=>{const signup=$("authSubmit").dataset.signup!=="1";$("authSubmit").dataset.signup=signup?"1":"0";$("authSubmit").innerHTML=signup?"Create account <span>↗</span>":"Sign in <span>↗</span>";$("toggleAuth").textContent=signup?"Already have an account? Sign in":"New to CTR? Create an account"};
$("authForm").onsubmit=async e=>{e.preventDefault();if(!db)return;const email=$("email").value.trim(),password=$("password").value,signup=$("authSubmit").dataset.signup==="1";$("authSubmit").disabled=true;const r=signup?await db.auth.signUp({email,password,options:{emailRedirectTo:"https://nottybuddy.github.io/CTR/"}}):await db.auth.signInWithPassword({email,password});$("authSubmit").disabled=false;if(r.error)status(r.error.message,true);else if(signup&&!r.data.session)status("Account created. Confirm your email, then sign in.",true);else if(r.data.user)await enter(r.data.user)};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("colorChoices").onclick=e=>{const b=e.target.closest("[data-color]");if(b&&!b.disabled)chooseColor(b.dataset.color)};
$("noteForm").onsubmit=async e=>{e.preventDefault();const body=$("noteInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_group_notes").insert({user_id:user.id,author_email:user.email,body});if(error)status("Could not send: "+error.message);else $("noteInput").value=""};
$("personalForm").onsubmit=async e=>{e.preventDefault();const body=$("personalInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_personal_notes").insert({user_id:user.id,body});if(error)status("Could not save: "+error.message);else $("personalInput").value=""};
document.addEventListener("click",async e=>{const g=e.target.dataset.gdelete,p=e.target.dataset.pdelete;if(g){const {error}=await db.from("ctr_group_notes").delete().eq("id",g);if(error)status(error.message)}if(p){const {error}=await db.from("ctr_personal_notes").delete().eq("id",p);if(error)status(error.message)}});
$("signOut").onclick=async()=>{if(channel)await db.removeChannel(channel);await db.auth.signOut()};
boot();