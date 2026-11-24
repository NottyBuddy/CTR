// CTR — Calling Team Records
const SUPABASE_URL="https://icootmtssyergamuxlxb.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_qgEIXxXXBq2TaNxLMZPkwg_fcwKcdGW";
const $=id=>document.getElementById(id);
async function fetchAllRows(queryFactory,pageSize=500){const rows=[];for(let from=0;;from+=pageSize){const {data,error}=await queryFactory().range(from,from+pageSize-1);if(error)throw error;const page=data||[];rows.push(...page);if(page.length<pageSize)break;}return rows;}
let db,user,group=[],personal=[],direct=[],team=[],channel;
let groupFilter="",dateFilter="",personalFilter="",directFilter="",followupSearchFilter="";
let selectedDirectKey="",selectedDirectRecipient="",directInboxFilter="all",mobileThreadOpen=false;
let adminAuditAgentId="",adminAuditPairKey="",adminAuditSearch="",adminAuditDate="";
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
  const body=n.body||"",m=body.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/);
  const top=card.querySelector(".note-top");
  if(m&&top){const phone=m[0].replace(/\D/g,"");const cp=document.createElement("button");cp.className="message-action";cp.type="button";cp.dataset.copyPhone=phone;cp.textContent="Copy number";top.append(cp)}
  const tools=document.createElement("div");tools.className="note-tools";const copy=document.createElement("button");copy.type="button";copy.className="message-action";copy.dataset.copyNote=n.id;copy.textContent="Copy note";tools.append(copy);card.append(tools);
 });
}
let followups=[];
function renderFollowups(){
 const box=$("followupList");if(!box)return;
 const pending=followups.filter(x=>x.status!=="completed");
 const q=followupSearchFilter.trim().toLowerCase();
 const rows=(q?followups.filter(f=>[f.customer_name,f.phone,f.details,team.find(t=>t.user_id===f.user_id)?.display_name||displayName(team.find(t=>t.user_id===f.user_id)?.email)].join(" ").toLowerCase().includes(q)):pending).sort((a,b)=>new Date(a.callback_at)-new Date(b.callback_at));
 $("followupCount").textContent=pending.length;const navCount=$("followupNavCount");if(navCount)navCount.textContent=pending.length;
 box.innerHTML=rows.length?rows.map(f=>'<article class="followup-item" data-followup-id="'+f.id+'"><div class="followup-info"><strong>'+esc(f.customer_name)+'</strong><span>'+esc(f.phone)+'</span><time>'+esc(time(f.callback_at))+'</time><p>'+esc(f.details||"")+'</p><small class="followup-status">'+(f.status==="completed"?"Completed":"Pending")+' · '+esc(team.find(t=>t.user_id===f.user_id)?.display_name||displayName(team.find(t=>t.user_id===f.user_id)?.email))+'</small></div><div class="followup-actions"><button class="message-action" data-copy-phone="'+f.phone.replace(/\D/g,"")+'">Copy phone</button>'+(f.status!=="completed"?'<button class="message-action" data-follow-done="'+f.id+'">Complete</button>':'')+'</div></article>').join(""):(q?'<div class="empty-state">No matching follow-ups.</div>':'<div class="empty-state">No pending follow-ups.</div>');
}
async function loadFollowups(){const box=$("followupList");try{followups=await fetchAllRows(()=>db.from("ctr_followups").select("*").order("callback_at",{ascending:true}).order("id",{ascending:true}));renderFollowups();renderAgentDashboard()}catch(e){followups=[];$("followupCount").textContent="!";box.innerHTML=`<div class="empty-state">Follow-ups are unavailable: ${esc(e.message)}.</div>`}}

async function renderAgentDashboard(){
 const box=$("agentDashboard");if(!box||!user)return;
 const agents=(isAdmin()?team.filter(t=>String(t.email||"").toLowerCase()!==ADMIN_EMAIL):team.filter(t=>t.user_id===user.id));
 if(!isAdmin()&&!agents.length)agents.push({user_id:user.id,email:user.email,display_name:displayName(user.email)});
 if(!agents.length){box.innerHTML='<div class="empty-state">No agent activity available yet.</div>';return}
 box.innerHTML='<div class="empty-state">Updating agent activity…</div>';
 const rows=await Promise.all(agents.map(async t=>{
  const [g,p,pending,completed]=await Promise.all([
   db.from("ctr_group_notes").select("id",{count:"exact",head:true}).eq("user_id",t.user_id),
   db.from("ctr_personal_notes").select("id",{count:"exact",head:true}).eq("user_id",t.user_id),
   db.from("ctr_followups").select("id",{count:"exact",head:true}).eq("user_id",t.user_id).neq("status","completed"),
   db.from("ctr_followups").select("id",{count:"exact",head:true}).eq("user_id",t.user_id).eq("status","completed")
  ]);
  const messages=direct.filter(m=>m.sender_id===t.user_id||m.recipient_id===t.user_id);
  const partners=new Set(messages.map(m=>m.sender_id===t.user_id?m.recipient_id:m.sender_id));
  return {id:t.user_id,name:t.display_name||displayName(t.email),notes:(g.count||0)+(p.count||0),pending:pending.count||0,completed:completed.count||0,messageCount:messages.length,partnerCount:partners.size,error:g.error||p.error||pending.error||completed.error};
 }));
 box.innerHTML=rows.map(r=>`<button type="button" class="agent-card agent-card-select ${adminAuditAgentId===r.id?"selected":""}" data-audit-agent="${esc(r.id)}"><div class="agent-card-head"><strong>${esc(r.name)}</strong><span class="agent-card-label">OPEN RECORDS ↗</span></div><div class="agent-metrics"><div><strong>${r.error?"—":r.notes}</strong><span>Total notes</span></div><div><strong>${r.error?"—":r.pending}</strong><span>Pending follow-ups</span></div><div><strong>${r.error?"—":r.completed}</strong><span>Completed callbacks</span></div></div><div class="agent-audit-card-foot"><span>${r.messageCount} direct messages</span><span>${r.partnerCount} conversations</span></div>${r.error?'<small class="agent-metric-error">Some counts could not be loaded.</small>':""}</button>`).join("");
 if(isAdmin())renderAdminChatExplorer();else $("agentChatAudit")?.classList.add("hidden");
}
function renderAdminChatExplorer(){
 const panel=$("agentChatAudit");if(!panel||!isAdmin())return;
 panel.classList.remove("hidden");
 const name=id=>team.find(t=>t.user_id===id)?.display_name||"CTR Member";
 const active=team.find(t=>t.user_id===adminAuditAgentId&&String(t.email||"").toLowerCase()!==ADMIN_EMAIL);
 if(!active){panel.innerHTML='<div class="agent-audit-empty">Select an agent card above to inspect their conversations and activity.</div>';return}
 const agentMessages=direct.filter(m=>m.sender_id===active.user_id||m.recipient_id===active.user_id);
 const pairs=new Map();
 agentMessages.forEach(m=>{const other=m.sender_id===active.user_id?m.recipient_id:m.sender_id;const key=directPairKey(active.user_id,other);if(!pairs.has(key))pairs.set(key,{key,other,messages:[]});pairs.get(key).messages.push(m)});
 const conversations=[...pairs.values()].map(c=>{c.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));c.last=c.messages[c.messages.length-1];return c}).sort((a,b)=>new Date(b.last.created_at)-new Date(a.last.created_at));
 const q=adminAuditSearch.trim().toLowerCase();
 const filtered=conversations.filter(c=>[name(c.other),...c.messages.map(m=>m.body)].join(" ").toLowerCase().includes(q));
 const chosen=conversations.find(c=>c.key===adminAuditPairKey);
 const activities=[
  ...group.filter(x=>x.user_id===active.user_id).map(x=>({kind:"Group Chat",body:x.body,created_at:x.created_at,status:x.is_pinned?"Pinned":""})),
  ...personal.filter(x=>x.user_id===active.user_id).map(x=>({kind:"Personal Note",body:x.body,created_at:x.created_at,status:"Private note"})),
  ...followups.filter(x=>x.user_id===active.user_id).map(x=>({kind:"Follow-up",body:[x.customer_name,x.phone,x.details].filter(Boolean).join(" · "),created_at:x.created_at||x.callback_at,status:x.status==="completed"?"Completed":"Pending"}))
 ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const activityRows=activities.filter(x=>!q||[x.kind,x.body,x.status].join(" ").toLowerCase().includes(q)).filter(x=>!adminAuditDate||new Date(x.created_at).toLocaleDateString("en-CA")===adminAuditDate);
 panel.innerHTML=`<div class="agent-audit-head"><div><div class="eyebrow">ADMIN ONLY · COMPLETE TEAM RECORDS</div><h3>${esc(active.display_name||name(active.user_id))} — Activity & conversations</h3><p>${agentMessages.length} direct messages · ${conversations.length} conversations · ${activities.length} activity records. Full history is loaded from the database.</p></div><button type="button" class="message-action" data-audit-back-agents>All agents</button></div>
 <div class="agent-audit-controls"><input id="agentChatAuditSearch" type="search" value="${esc(adminAuditSearch)}" placeholder="Search contacts, messages or activity…"><input id="agentChatAuditDate" type="date" value="${esc(adminAuditDate)}" aria-label="Filter messages and activity by date"></div>
 ${chosen?`<section class="agent-audit-thread"><div class="agent-audit-thread-head"><button type="button" class="message-action" data-audit-back-list>← Conversations</button><div><strong>${esc(active.display_name||name(active.user_id))} ↔ ${esc(name(chosen.other))}</strong><small>${chosen.messages.length} messages · complete conversation</small></div></div><div class="agent-audit-thread-messages">${chosen.messages.filter(m=>(!adminAuditDate||new Date(m.created_at).toLocaleDateString("en-CA")===adminAuditDate)&&(!q||[name(m.sender_id),m.body].join(" ").toLowerCase().includes(q))).map(m=>`<article class="agent-audit-message ${m.sender_id===active.user_id?"agent-sent":"agent-received"}"><div class="agent-audit-message-meta"><strong>${esc(name(m.sender_id))}</strong><time>${esc(time(m.created_at))}</time></div><p>${esc(m.body||"")}</p></article>`).join("")||'<div class="empty-state">No messages match these filters.</div>'}</div></section>`
 :`<section class="agent-audit-section"><div class="agent-audit-section-title"><h4>People this agent chatted with</h4><span>${filtered.length} contacts</span></div><div class="agent-audit-conversations">${filtered.map(c=>`<button type="button" class="agent-audit-conversation" data-audit-pair="${esc(c.key)}"><span class="dm-avatar">${directAvatar(name(c.other),c.other)}</span><span class="agent-audit-conversation-copy"><strong>${esc(name(c.other))}</strong><small>${esc(c.last.body||"")}</small></span><span class="agent-audit-conversation-meta"><time>${esc(time(c.last.created_at))}</time><b>${c.messages.length} messages</b></span></button>`).join("")||'<div class="empty-state">No conversations match your search.</div>'}</div></section>
 <section class="agent-audit-activity"><div class="agent-audit-section-title"><h4>Activity records</h4><span>${activityRows.length} records</span></div><div class="agent-audit-activity-list">${activityRows.map(x=>`<article class="agent-audit-activity-item"><div><strong>${esc(x.kind)}</strong>${x.status?`<small>${esc(x.status)}</small>`:""}</div><time>${esc(time(x.created_at))}</time><p>${esc(x.body||"")}</p></article>`).join("")||'<div class="empty-state">No activity records match these filters.</div>'}</div></section>`}`;
}
function globalSearch(query){
 const panel=$("globalSearchResults");if(!panel)return;
 const q=query.trim().toLowerCase();if(!q){panel.classList.add("hidden");panel.innerHTML="";return}
 const hits=[];
 const add=(kind,view,items,getText,getTitle,getDate)=>items.forEach(item=>{const text=String(getText(item)||"");if(text.toLowerCase().includes(q))hits.push({kind,view,title:getTitle(item),text,date:getDate(item)})});
 add("Group note","group",group,n=>[n.body,n.author_email,displayName(n.author_email)].join(" "),n=>displayName(n.author_email),n=>n.created_at);
 add("Personal note","personal",personal,n=>[n.body,team.find(t=>t.user_id===n.user_id)?.display_name].join(" "),n=>team.find(t=>t.user_id===n.user_id)?.display_name||"Personal note",n=>n.created_at);
 add("Direct message","direct",direct,n=>[n.body,team.find(t=>t.user_id===n.sender_id)?.display_name,team.find(t=>t.user_id===n.recipient_id)?.display_name].join(" "),n=>team.find(t=>t.user_id===n.sender_id)?.display_name||"Direct message",n=>n.created_at);
 add("Follow-up","followups",followups,n=>[n.customer_name,n.phone,n.details,team.find(t=>t.user_id===n.user_id)?.display_name||displayName(team.find(t=>t.user_id===n.user_id)?.email)].join(" "),n=>n.customer_name,n=>n.callback_at);
 const limited=hits;
 panel.innerHTML=limited.length?'<div class="global-search-head">'+hits.length+' matching record'+(hits.length===1?'':'s')+''+'</div>'+limited.map(r=>`<button type="button" class="global-search-hit" data-search-view="${r.view}"><span><b>${esc(r.title)}</b><small>${esc(r.kind)} · ${esc(time(r.date))}</small></span><span class="global-hit-snippet">${esc(r.text.slice(0,150))}</span></button>`).join(""):'<div class="global-search-empty">No matching records found.</div>';
 panel.classList.remove("hidden");
}
function directPairKey(a,b){return [a,b].sort().join("::")}
function directAvatar(name,userId=""){const chosen=userId?localStorage.getItem("ctr_avatar_"+userId):"";if(chosen)return esc(chosen);const parts=String(name||"CTR Member").trim().split(/\s+/);return esc((parts[0]?.[0]||"C")+(parts.length>1?parts[parts.length-1][0]:""))}
const CTR_AVATARS=["⚔️","🛡️","🐉","🐺","🦊","🐯","🦅","🐼","🦁","🐲","🌙","🔥","🎭","👑","🌸","☯️"];
function setupAccountSettings(){
 if(!$("accountSettingsBtn")){const b=document.createElement("button");b.id="accountSettingsBtn";b.type="button";b.className="account-settings-btn";b.innerHTML='<span class="account-current-avatar"></span><span>Account settings</span>';b.addEventListener("click",()=>{$("accountSettingsModal").classList.remove("hidden");renderAccountAvatars()});$("userEmail").after(b)}
 if(!$("accountSettingsModal")){const modal=document.createElement("div");modal.id="accountSettingsModal";modal.className="account-settings-modal hidden";modal.innerHTML='<section class="account-settings-card" role="dialog" aria-modal="true" aria-labelledby="accountSettingsTitle"><button type="button" class="account-settings-close" aria-label="Close">×</button><div class="eyebrow">YOUR PROFILE</div><h3 id="accountSettingsTitle">Account settings</h3><p>Choose an avatar for your CTR chats. This choice is saved on this device for your signed-in account.</p><div id="accountAvatarChoices" class="account-avatar-choices"></div><div class="account-settings-foot">Login details and chat records are not changed.</div></section>';document.body.append(modal);modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest(".account-settings-close"))modal.classList.add("hidden");const pick=e.target.closest("[data-avatar]");if(pick&&user){localStorage.setItem("ctr_avatar_"+user.id,pick.dataset.avatar);renderAccountAvatars();renderDirect()}})}
 renderAccountAvatars()
}
function renderAccountAvatars(){if(!user)return;const selected=localStorage.getItem("ctr_avatar_"+user.id)||"";const grid=$("accountAvatarChoices");if(grid)grid.innerHTML=CTR_AVATARS.map(a=>'<button type="button" class="account-avatar-choice '+(a===selected?"selected":"")+'" data-avatar="'+esc(a)+'" aria-label="Choose avatar">'+a+'</button>').join("");const current=document.querySelector(".account-current-avatar");if(current)current.textContent=selected||directAvatar(displayName(user.email),user.id)}
function openDirectConversation(id){
 if(!id||!user)return;
 const person=team.find(p=>String(p.user_id)===String(id));
 if(!person){status("This contact is not available in the team directory. Refresh and try again.");return}
 selectedDirectRecipient=String(person.user_id);
 selectedDirectKey=directPairKey(user.id,person.user_id);
 $("directRecipient").value=selectedDirectRecipient;
 $("directRecipient").value=person.user_id;
 directFilter="";
 directInboxFilter="all";
 $("directSearch").value="";
 document.querySelectorAll("[data-dm-filter]").forEach(x=>x.classList.toggle("active",x.dataset.dmFilter==="all"));
 mobileThreadOpen=window.matchMedia("(max-width:760px)").matches;
 $("directView").querySelector(".dm-inbox").classList.toggle("mobile-thread-open",mobileThreadOpen);
 renderDirect();
 markSeen("direct");
 $("directInput").disabled=false;
 $("directForm").querySelector('button[type="submit"]').disabled=false;
 $("dmComposeHint").textContent="Private conversation";
 $("directInput").focus();
 status("Chat opened: "+(person.display_name||"team member"));
}
function renderDirect(){
 const admin=isAdmin(),people=team.filter(p=>p.user_id!==user.id);
 $("directAdminHint")?.classList.add("hidden"); // The header is re-rendered; this optional element may no longer exist.
 $("directCount").textContent=direct.length;
 let allConversations=[];
 {  const pairs=new Map();
  direct.forEach(m=>{
   if(m.sender_id!==user.id&&m.recipient_id!==user.id)return;
   const key=directPairKey(m.sender_id,m.recipient_id);
   if(!pairs.has(key))pairs.set(key,[]);
   pairs.get(key).push(m);
  });
  const byPerson=new Map([...pairs.entries()].map(([key,messages])=>{
   messages.sort((x,y)=>new Date(x.created_at)-new Date(y.created_at));
   const last=messages[messages.length-1];
   const otherId=last.sender_id===user.id?last.recipient_id:last.sender_id;
   const other=team.find(p=>p.user_id===otherId);
   return [otherId,{key,messages,last,otherId,name:other?.display_name||"CTR Member",email:other?.email||"",
    unread:messages.filter(m=>m.recipient_id===user.id&&m.sender_id!==user.id&&new Date(m.created_at)>new Date(localStorage.getItem("ctr_seen_direct_"+user.id)||0)).length}];
  }));
  people.forEach(person=>{
   if(!byPerson.has(person.user_id))byPerson.set(person.user_id,{key:directPairKey(user.id,person.user_id),messages:[],last:null,otherId:person.user_id,name:person.display_name||"CTR Member",email:person.email||"",unread:0});
  });
  allConversations=[...byPerson.values()].sort((x,y)=>(new Date(y.last?.created_at||0)-new Date(x.last?.created_at||0))||x.name.localeCompare(y.name));
 }
 const selectedId=selectedDirectRecipient||$("directRecipient").value||((selectedDirectKey||"").split("::").find(id=>id&&id!==user.id))||"";
 const query=directFilter.trim().toLowerCase();
 const visible=allConversations.filter(c=>{
  if(directInboxFilter==="unread"&&!c.unread)return false;
  if(!query)return true;
  const searchable=[c.name,c.email,c.otherId,...c.messages.map(m=>m.body||"")].join(" ").toLowerCase();
  return searchable.includes(query);
 });
 $("directInboxList").innerHTML=visible.length?visible.map(c=>{
  const preview=c.last?(c.last.sender_id===user.id?"You: ":"")+(c.last.body||""):"Start a conversation";
  return `<button type="button" class="dm-conversation ${selectedId===c.otherId?"selected":""}" data-dm-key="${esc(c.key)}" data-dm-other="${esc(c.otherId)}"><span class="dm-avatar">${directAvatar(c.name,c.otherId)}</span><span class="dm-convo-copy"><strong>${esc(c.name)}</strong><span>${esc(preview)}</span></span><span class="dm-convo-meta"><time>${c.last?esc(time(c.last.created_at)):""}</time>${c.unread?`<b class="dm-unread-count">${c.unread}</b>`:""}</span></button>`;
 }).join(""):'<div class="empty-state"><h3>No matching contacts</h3><p>Try another name or message keyword.</p></div>';
 // Conversation selection is handled by one stable delegated listener below.
 let active=allConversations.find(c=>c.otherId===selectedId);
 if(active){
  selectedDirectKey=active.key;
  $("directRecipient").value=active.otherId;
  $("dmNewRecipient").value="";
  $("dmThreadHeader").innerHTML=`<span class="dm-avatar dm-avatar-large">${directAvatar(active.name,active.otherId)}</span><div><strong>${esc(active.name)}</strong><small>Private conversation · CTR team member</small></div><div class="dm-thread-actions">${admin?'<span class="dm-admin-tag">ADMIN VIEW</span>':""}</div>`;
  const box=$("directNotes"),near=box.scrollHeight-box.scrollTop-box.clientHeight<120;
  box.innerHTML=active.messages.map(m=>{
   const mine=m.sender_id===user.id,from=team.find(p=>p.user_id===m.sender_id)?.display_name||"CTR Member";
   return `<article class="dm-message ${mine?"mine":""}">${admin&&!mine?`<span class="dm-message-sender">${esc(from)}</span>`:""}<div>${esc(m.body||"")}</div><time>${esc(time(m.created_at))}${mine?" · ✓✓":""}</time>${admin?`<button class="delete-note" data-ddelete="${m.id}">Delete</button>`:""}</article>`;
  }).join("")||'<div class="dm-empty-thread"><div class="dm-empty-mark">✉</div><strong>Start a private conversation</strong><span>Write a message below to begin chatting.</span></div>';
  let lastDay="";
  [...box.querySelectorAll(".dm-message")].forEach((card,index)=>{
   const msg=active.messages[index],label=dayLabel(msg.created_at);
   if(label!==lastDay){const divider=document.createElement("div");divider.className="dm-date-separator";divider.textContent=label;card.before(divider);lastDay=label}
   const copy=document.createElement("button");copy.type="button";copy.className="dm-copy-btn";copy.dataset.copyDm=msg.id;copy.textContent="Copy";card.append(copy);
  });
  if(near)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);
  $("directInput").disabled=false;
  $("directForm").querySelector('button[type="submit"]').disabled=false;
  $("dmComposeHint").textContent="Private conversation";
 }else{
  selectedDirectKey="";
  $("directRecipient").value="";
  $("dmThreadHeader").innerHTML='<div class="dm-empty-avatar">✉</div><div><strong>CTR Messages</strong><small>Select a contact to view your conversation</small></div>';
  $("directNotes").innerHTML='<div class="dm-empty-thread"><div class="dm-empty-mark">✉</div><strong>Your conversations</strong><span>Select a team member from the contact list to open the chat.</span></div>';
  $("directInput").disabled=true;
  $("directForm").querySelector('button[type="submit"]').disabled=true;
  $("dmComposeHint").textContent="Choose a contact to start messaging.";
 }
 $("directView").querySelector(".dm-inbox")?.classList.toggle("mobile-thread-open",mobileThreadOpen&&!!active);
}
let directLoadSequence=0;
async function loadDirect(){
 const sequence=++directLoadSequence;
 const inbox=$("directInboxList");
 if(!team.length&&inbox)inbox.innerHTML='<div class="empty-state">Loading team contacts…</div>';
 try{
  const {data:people,error:peopleError}=await db.from("ctr_team_directory").select("user_id,email,display_name").order("display_name");
  if(sequence!==directLoadSequence)return;
  if(peopleError)throw new Error("Team contacts: "+peopleError.message);
  team=Array.isArray(people)?people.filter(p=>p&&p.user_id):[];
  if(isAdmin()){
   const logs=await fetchAllRows(()=>db.from("ctr_moderation_log").select("*").order("deleted_at",{ascending:false}).order("id",{ascending:false}));
   if(sequence!==directLoadSequence)return;
   $("moderationPanel")?.classList.remove("hidden");
   $("moderationLog").innerHTML=logs.map(x=>`<article class="note"><div class="note-top"><span class="note-author">${esc(x.deleted_by_email||"Admin")} · ${esc(x.table_name)}</span><span class="note-time">${esc(time(x.deleted_at))}</span></div><div class="note-body">${esc(x.original_body||"")}</div></article>`).join("")||'<div class="empty-state">No deletions recorded.</div>';
  }else $("moderationPanel")?.classList.add("hidden");
  const sel=$("directRecipient"),old=selectedDirectRecipient||sel.value,newSel=$("dmNewRecipient"),newOld=newSel.value;
  sel.innerHTML='<option value="">Choose a team member…</option>'+team.filter(p=>p.user_id!==user.id).map(p=>`<option value="${p.user_id}">${esc(p.display_name)}</option>`).join("");
  if(old&&team.some(p=>p.user_id===old)){sel.value=old;selectedDirectRecipient=old}else{selectedDirectRecipient="";sel.value=""}
  newSel.innerHTML='<option value="">＋ New message</option>'+team.filter(p=>p.user_id!==user.id).map(p=>`<option value="${p.user_id}">${esc(p.display_name)}</option>`).join("");
  if(newOld&&team.some(p=>p.user_id===newOld))newSel.value=newOld;
  let query=db.from("ctr_direct_messages").select("*").order("created_at",{ascending:true}).order("id",{ascending:true});
  if(!isAdmin())query=query.or("sender_id.eq."+user.id+",recipient_id.eq."+user.id);
  direct=(await fetchAllRows(()=>query)).filter(m=>m&&m.sender_id&&m.recipient_id);
  if(sequence!==directLoadSequence)return;
  renderDirect();renderPersonal();updateUnread();if(isAdmin())renderAgentDashboard();
  if(inbox)inbox.setAttribute("aria-busy","false");
 }catch(error){
  if(sequence!==directLoadSequence)return;
  console.error("CTR Direct Chat load failed",error);
  if(inbox){inbox.setAttribute("aria-busy","false");inbox.innerHTML='<div class="empty-state"><h3>Chats could not be loaded</h3><p>'+esc(error?.message||"Check your connection and refresh.")+'</p><button class="refresh-btn" type="button" data-direct-retry>Retry loading</button></div>';}
  status("Direct Chat error: "+(error?.message||"Please refresh and try again."));
 }
}

async function refreshMessages(){
 const btn=$("refreshData");btn.disabled=true;btn.classList.add("is-refreshing");btn.setAttribute("aria-label","Refreshing");
 try{await loadAll();await loadDirect();renderAgentDashboard();status("All records refreshed.")}
 catch(e){status("Refresh failed: "+e.message)}
 finally{btn.disabled=false;btn.classList.remove("is-refreshing");btn.setAttribute("aria-label","Refresh")}
}

function renderPersonal(){
 const rows=personal.filter(n=>!personalFilter||[n.body,team.find(t=>t.user_id===n.user_id)?.display_name||displayName(user.email)].join(" ").toLowerCase().includes(personalFilter));
 $("personalCount").textContent=rows.length;
 $("personalNotes").innerHTML=rows.length?rows.map(n=>{const owner=team.find(t=>t.user_id===n.user_id)?.display_name||(n.user_id===user.id?displayName(user.email):"CTR Member");return `<article class="note personal-note"><div class="note-top"><span class="note-author">${isAdmin()?esc(owner)+" · PERSONAL NOTE":"PRIVATE NOTE"}</span><span class="note-time">${esc(time(n.created_at))}${n.edited_at?" · edited":""}</span><button class="message-action" data-pedit="${n.id}">Edit</button>${isAdmin()? `<button class="delete-note" data-pdelete="${n.id}">Admin · Delete</button>`:""}</div><div class="note-body">${esc(n.body)}</div></article>`}).join(""):'<div class="empty-state"><h3>No matching personal notes</h3><p>Try clearing your search.</p></div>';
}
$("newFollowupBtn")?.addEventListener("click",()=>{const form=$("followupForm");form.classList.toggle("hidden");if(!form.classList.contains("hidden"))$("followupCustomer").focus();$("newFollowupBtn").textContent=form.classList.contains("hidden")?"＋ Create Follow-up":"− Close form";});
function showView(v){
 $("groupView").classList.toggle("hidden",v!=="group");
 $("personalView").classList.toggle("hidden",v!=="personal");
 $("directView").classList.toggle("hidden",v!=="direct");
 $("followupsView").classList.toggle("hidden",v!=="followups");
 if(v==="followups")loadFollowups();
 $("dashboardView").classList.toggle("hidden",v!=="dashboard");if(v==="dashboard")renderAgentDashboard();
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));
 if(v==="direct"){mobileThreadOpen=false;$("directView").querySelector(".dm-inbox").classList.remove("mobile-thread-open");loadDirect();markSeen("direct")}if(v==="group")markSeen("group");
}
let generatedDrafts={group:"",crm:""};
function smartDrafts(raw){
 const source=String(raw||"").replace(/[,;]+/g," ").replace(/\s+/g," ").trim();
 const notes=[],missing=[],alias={mum:"Mumbai",bom:"Mumbai",mh:"Maharashtra",ap:"Andhra Pradesh",hyd:"Hyderabad",blr:"Bengaluru",bangalore:"Bengaluru",chn:"Chennai",kol:"Kolkata",pune:"Pune",del:"Delhi",ts:"Telangana",ka:"Karnataka",tn:"Tamil Nadu",rj:"Rajasthan",up:"Uttar Pradesh",mp:"Madhya Pradesh",gj:"Gujarat"};
 const loc=/\bloc(?:ation)?\s+([a-z]+)(?:\s+([a-z]{2,3}))?/i.exec(source),pin=/\b(?:pin(?:\s*code)?\s*)?(\d{6})\b/i.exec(source),phone=/\b(?:\+91[-\s]?)?[6-9]\d{9}\b/.exec(source);
 const customer=/\b(?:customer|cx|cust)\s*[:=-]\s*([A-Za-z][A-Za-z .'-]{1,50}?)(?=\s+(?:phone|mob|mobile|contact|loc|location|req|requirement)\b|$)/i.exec(source);
 const name=customer?.[1]?.trim()||"";
 const windowContext=/\b(window|windows|sliding|casement|uPVC|upvc|aluminium|aluminum|glass|frame|sash)\b/i.test(source);
 const wifiContext=/\b(wi[\s-]?fi|wireless|router|internet|network|broadband|hotspot|signal)\b/i.test(source);
 const weekContext=/\b(week|weeks|weekly|callback|call\s*back|follow.?up|after|within|timeline|delivery|working days?)\b/i.test(source);
 const shorthandW=/\b(\d+)\s*w\b/gi;
 const wMatches=[...source.matchAll(shorthandW)];
 const ambiguousW=[];
 const durations=[...source.matchAll(/\b(\d+)\s*(weeks?|wks?|days?|d|months?|mos?|mo)\b/gi)];
 for(const m of wMatches){
  const count=m[1];
  if(windowContext){notes.push("Window quantity: "+count+" windows.");}
  else if(wifiContext){notes.push("Wi-Fi-related quantity/reference: "+count+" (exact meaning should be confirmed).");}
  else if(weekContext||/\b\d+\s*w\s*\d+\s*d\b/i.test(source)){durations.push(m); }
  else ambiguousW.push(count+"w");
 }
 if(durations.length)notes.push("Customer timeline: "+durations.map(m=>m[1]+" "+(m[2].toLowerCase().startsWith("w")?"weeks":m[2].toLowerCase().startsWith("d")?"days":"months")).join(" and ")+".");
 if(ambiguousW.length)missing.push("Ambiguous shorthand "+ambiguousW.join(", ")+": could mean weeks, windows, Wi-Fi, or another term. Confirm the intended meaning before finalizing.");
 const construction=/\b(new\s*)?(constru|construction)\b/i.test(source),restaurant=/\b(restaurant|restro|hotel|cafe|café|food outlet)\b/i.test(source),commercial=/\b(commercial|comm(?:ercial)? property)\b/i.test(source),residential=/\b(residential|res property)\b/i.test(source);
 if(construction)notes.push("Project stage: New construction.");
 if(restaurant)notes.push("Project type: Restaurant.");
 if(commercial)notes.push("Property category: Commercial property.");else if(residential)notes.push("Property category: Residential property.");
 if(loc){const city=alias[loc[1].toLowerCase()]||loc[1].replace(/^\w/,c=>c.toUpperCase()),state=loc[2]?(alias[loc[2].toLowerCase()]||loc[2].toUpperCase()):"";notes.push("Location: "+[city,state].filter(Boolean).join(", ")+(pin?", PIN Code "+pin[1]:"")+".");}else if(pin)notes.push("PIN Code: "+pin[1]+".");
 const callback=/\b(call\s*back|callback|call\s*bck|cb)\b/i.test(source),after=/\b(?:after|in)\s+(one|1|two|2|three|3|four|4|a)\s+(day|week|month)s?\b/i.exec(source),dateMatch=/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i.exec(source);
 let followDate="";
 if(dateMatch){const parsed=new Date(dateMatch[1]+" "+dateMatch[2]+" "+dateMatch[3]+" 12:00:00");if(!Number.isNaN(parsed.getTime()))followDate=parsed.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});}
 else if(after){const amount=({one:1,a:1,two:2,three:3,four:4})[after[1].toLowerCase()]||Number(after[1]),d=new Date();d.setHours(12,0,0,0);if(after[2].toLowerCase().startsWith("day"))d.setDate(d.getDate()+amount);else if(after[2].toLowerCase().startsWith("week"))d.setDate(d.getDate()+7*amount);else d.setMonth(d.getMonth()+amount);followDate=d.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});}
 if(callback){notes.push("Customer requested a callback"+(after?" "+after[0]:"")+".");notes.push(followDate?"Follow-up required: "+followDate+".":"Follow-up required: Schedule a callback; exact date was not specified.");}
 if(name)notes.unshift("Customer Name: "+name+".");if(phone)notes.push("Contact Number: "+phone[0]+".");
 if(/\bclr\b/i.test(source))missing.push('"CLR" is unclear; its meaning has not been assumed.');
 if(!name)missing.push("Customer name was not provided.");if(!phone)missing.push("Contact number was not provided.");
 if(!loc&&!pin)missing.push("Specific city/state or PIN Code was not provided.");
 if(!restaurant&&!commercial&&!residential&&!construction)missing.push("Project type/category needs confirmation.");
 if(!callback)missing.push("Call outcome and next action need confirmation.");
 if(!notes.length)notes.push("Call details received: "+source+".");
 const crm=["CUSTOMER CALL NOTE","Customer Name | Contact Number",(name||"Not provided")+" | "+(phone?.[0]||"Not provided"),"","Call Summary:",...notes,"","Clarifications / Missing Information:",...missing.map(x=>"• "+x),"","Next Action: "+(callback?(followDate?"Reconnect with the customer on "+followDate+" and confirm the complete requirement.":"Schedule a callback and confirm the complete requirement."):"Confirm the call outcome and agree on the next action.")].join("\n");
 const group=["CRM UPDATE | "+(restaurant?"Restaurant project":commercial?"Commercial property":construction?"New construction":"Customer call update"),...notes,"","Pending information: "+(missing.length?missing.join(" "):"No key details flagged."),"Assigned to: Not specified"].join("\n");
 return {group,crm,clarifications:missing};
}
async function generateNotes(){
 const raw=$("aiInput").value.trim();
 if(!raw){$("aiStatus").textContent="Paste customer call details first.";return}
 if(!window.CTRLocalAI){$("aiStatus").textContent="Private local AI module did not load. Refresh and retry.";return}
 $("generateAI").disabled=true;$("aiStatus").textContent="Loading private AI model… First use downloads model files to this browser; this may take a few minutes.";
 try{
  const result=await window.CTRLocalAI.generate(raw,(p)=>{
   if(p?.status==="progress"&&Number.isFinite(p.progress))$("aiStatus").textContent="Downloading private AI model… "+Math.round(p.progress)+"%";
   else if(p?.status==="done")$("aiStatus").textContent="Model file ready. Preparing your notes…";
   else if(p?.status==="initiate")$("aiStatus").textContent="Preparing model file: "+(p.file||"");
  });
  generatedDrafts={group:result.group,crm:result.crm};
  $("aiGroup").innerHTML=formatNoteHtml(result.group);
  $("aiCrm").innerHTML=formatNoteHtml(result.crm);
  const box=$("aiQuestions"),items=[...(result.questions||[]),...(result.uncertainties||[])];
  box.innerHTML=items.length?'<strong>AI clarification / review</strong><ul>'+items.map(q=>'<li>'+esc(q)+'</li>').join("")+'</ul>':'<strong>Private AI draft ready</strong><p>Review customer facts before sharing.</p>';
  box.classList.remove("hidden");$("aiResults").classList.remove("hidden");
  $("aiStatus").textContent="On-device AI · "+result.confidence+" confidence · Customer prompt processed in this browser only.";
 }catch(e){$("aiStatus").textContent="Private AI: "+(e?.message||"Could not prepare notes. Check browser memory and connection.");}
 finally{$("generateAI").disabled=false}
}
async function loadAll(){
 const [g,p,c,profiles]=await Promise.all([fetchAllRows(()=>db.from("ctr_group_notes").select("*").order("created_at",{ascending:true}).order("id",{ascending:true})),fetchAllRows(()=>db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).order("id",{ascending:false})),db.from("ctr_profiles").select("chat_color").eq("user_id",user.id).maybeSingle(),db.from("ctr_profiles").select("user_id,chat_color")]);
 if(c.error||profiles.error)throw(c.error||profiles.error);
 const colors=Object.fromEntries((profiles.data||[]).map(x=>[x.user_id,x.chat_color]));group=g.map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));personal=p;
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
function notificationPermission(){return ("Notification" in window)?Notification.permission:"unsupported"}
function updateNotificationButton(){
 const b=$("enableNotifications");if(!b)return;
 const p=notificationPermission();
 const label=p==="granted"?"Alerts on":p==="denied"?"Alerts blocked":p==="unsupported"?"Alerts unavailable":"Alerts";
 b.title=p==="granted"?"Browser notifications are enabled":p==="denied"?"Allow notifications for this site in browser settings":"Enable new-message browser notifications";
 b.setAttribute("aria-label",label);
 b.classList.toggle("notifications-on",p==="granted");
 b.classList.toggle("notifications-blocked",p==="denied");
}
function sendMessageNotification(kind,row){
 if(!row||!user||notificationPermission()!=="granted")return;
 if(kind==="group"&&row.user_id===user.id)return;
 if(kind==="direct"&&row.recipient_id!==user.id)return;
 const activeView=kind==="group"?"groupView":"directView";
 if(!document.hidden&&!$(activeView).classList.contains("hidden"))return;
 const sender=kind==="group"?displayName(row.author_email):(team.find(x=>x.user_id===row.sender_id)?.display_name||"CTR Member");
 const raw=String(row.body||"").replace(/\s+/g," ").trim();
 const body=raw.length>130?raw.slice(0,127)+"…":raw;
 try{
  const note=new Notification(kind==="group"?"CTR · Group Chat":"CTR · Direct Message",{body:sender+": "+body,tag:"ctr-"+kind+"-"+row.id,renotify:false});
  note.onclick=()=>{window.focus();showView(kind==="group"?"group":"direct");note.close()};
 }catch(e){console.warn("CTR notification unavailable",e)}
}
async function enableNotifications(){
 if(!("Notification" in window)){status("This browser does not support notifications.");updateNotificationButton();return}
 if(Notification.permission==="granted"){status("New-message notifications are already enabled.");updateNotificationButton();return}
 if(Notification.permission==="denied"){status("Notifications are blocked. Allow them from this site's browser settings.");updateNotificationButton();return}
 const p=await Notification.requestPermission();updateNotificationButton();
 status(p==="granted"?"New-message notifications enabled.":"Notification permission was not granted.");
}
function realtime(){
 if(channel)db.removeChannel(channel);
 channel=db.channel("ctr-live-"+user.id)
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_group_notes"},async(payload)=>{if(payload.eventType==="INSERT")sendMessageNotification("group",payload.new);try{const [data,profiles]=await Promise.all([fetchAllRows(()=>db.from("ctr_group_notes").select("*").order("created_at",{ascending:true}).order("id",{ascending:true})),db.from("ctr_profiles").select("user_id,chat_color")]);const colors=Object.fromEntries((profiles.data||[]).map(x=>[x.user_id,x.chat_color]));group=data.map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));renderGroup();renderAgentDashboard()}catch(e){status("Group history refresh failed: "+e.message)}})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_profiles"},async()=>{const [{data:mine},{data:profiles}]=await Promise.all([db.from("ctr_profiles").select("chat_color").eq("user_id",user.id).maybeSingle(),db.from("ctr_profiles").select("user_id,chat_color")]);renderColors(mine?.chat_color||null);const colors=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.chat_color]));group=group.map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));renderGroup()})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_personal_notes"},async()=>{try{personal=await fetchAllRows(()=>db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).order("id",{ascending:false}));renderPersonal();renderAgentDashboard()}catch(e){status("Personal notes refresh failed: "+e.message)}})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_direct_messages"},async(payload)=>{if(payload.eventType==="INSERT")sendMessageNotification("direct",payload.new);await loadDirect()})
 .on("postgres_changes",{event:"*",schema:"public",table:"ctr_followups"},loadFollowups)
 .subscribe(s=>{if(s==="SUBSCRIBED")status("Live sync connected · group updates appear automatically.");if(s==="CHANNEL_ERROR"||s==="TIMED_OUT")status("Live sync interrupted. Refresh to reconnect.")});
}
async function enter(u){
 user=u;$("authView").classList.add("hidden");$("appView").classList.remove("hidden");setupAccountSettings();
 const name=displayName(u.email);$("userEmail").textContent=name;updateNotificationButton();
 try{await loadAll();realtime();await loadDirect()}catch(e){status("Database error: "+(e.message||"Unable to load records."))}
}
async function ensureSupabaseLibrary(){
 if(window.supabase?.createClient)return true;
 const esmSources=["https://esm.sh/@supabase/supabase-js@2","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"];
 for(const src of esmSources){
  try{
   const mod=await Promise.race([import(src),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Supabase module timed out")),12000))]);
   if(typeof mod.createClient==="function"){window.supabase={createClient:mod.createClient};return true}
  }catch(err){console.warn("Supabase ESM source failed",src,err)}
 }
 const sources=["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js","https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js"];
 for(const src of sources){
  try{
   await new Promise((resolve,reject)=>{
    const script=document.createElement("script");script.src=src;script.async=true;
    let settled=false;const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value)};
    const timer=setTimeout(()=>finish(reject,new Error("Supabase library request timed out")),12000);
    script.onload=()=>window.supabase?.createClient?finish(resolve):finish(reject,new Error("Supabase createClient is unavailable"));
    script.onerror=()=>finish(reject,new Error("Could not load "+src));
    document.head.appendChild(script);
   });
   if(window.supabase?.createClient)return true;
  }catch(err){console.warn("Supabase UMD source failed",src,err)}
 }
 return false;
}
async function boot(){
 status("Connecting to sign-in service…",true);$("authRetry")?.classList.add("hidden");
 if(!await ensureSupabaseLibrary()){status("Could not connect to the sign-in service. Check internet and tap Retry connection.",true);$("authRetry")?.classList.remove("hidden");return}
 db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const {data,error}=await db.auth.getSession();if(error){status("Session error: "+error.message,true);return}
 if(data.session)await enter(data.session.user);
 db.auth.onAuthStateChange(async(_e,s)=>{if(s?.user){if(!user||user.id!==s.user.id)await enter(s.user)}else{user=null;$("appView").classList.add("hidden");$("authView").classList.remove("hidden")}});
}
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!db){status("Sign-in service is still connecting. Wait a few seconds and try again.",true);return;}
 const email=$("email").value.trim().toLowerCase(),password=$("password").value;
 $("authSubmit").disabled=true;status("Signing in…",true);
 try{const r=await db.auth.signInWithPassword({email,password});if(r.error)status("Sign-in failed: "+r.error.message,true);else if(r.data.user)await enter(r.data.user)}
 catch(err){status("Sign-in error: "+(err.message||"Please try again."),true)}
 finally{$("authSubmit").disabled=false}
});
$("authSubmit").addEventListener("click",()=>{if(!db)status("Connecting to sign-in service…",true)});
$("authRetry")?.addEventListener("click",()=>boot().catch(err=>{console.error("CTR retry failed",err);status("Connection failed: "+(err?.message||"Please try again."),true)}));
$("forgotPassword").onclick=async()=>{if(!db)return;const email=$("email").value.trim().toLowerCase();if(!email){status("Enter your registered email address first.",true);$("email").focus();return}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:"https://nottybuddy.github.io/CTR/"});status(error?error.message:"If this email belongs to a CTR account, a password reset link will be sent.",true)};
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("colorChoices").onclick=e=>{const b=e.target.closest("[data-color]");if(b&&!b.disabled)chooseColor(b.dataset.color)};
$("generateAI").onclick=generateNotes;
$("refreshData").onclick=refreshMessages;$("enableNotifications")?.addEventListener("click",enableNotifications);
$("directRecipient").onchange=()=>{selectedDirectRecipient=$("directRecipient").value||"";selectedDirectKey=selectedDirectRecipient?directPairKey(user.id,selectedDirectRecipient):"";renderDirect()};
$("dmNewRecipient").addEventListener("change",e=>{const id=e.target.value;if(!id)return;openDirectConversation(id);$("directInput").focus()});
$("dmThreadHeader").addEventListener("click",()=>{if(window.matchMedia("(max-width:760px)").matches){mobileThreadOpen=false;$("directView").querySelector(".dm-inbox").classList.remove("mobile-thread-open")}});
document.querySelectorAll("[data-dm-filter]").forEach(b=>b.addEventListener("click",()=>{directInboxFilter=b.dataset.dmFilter;document.querySelectorAll("[data-dm-filter]").forEach(x=>x.classList.toggle("active",x===b));renderDirect()}));
 document.addEventListener("click",e=>{
 const t=e.target instanceof Element?e.target:null;if(!t)return;
 const agent=t.closest("[data-audit-agent]");if(agent){adminAuditAgentId=agent.dataset.auditAgent;adminAuditPairKey="";renderAgentDashboard();return}
 if(t.closest("[data-audit-back-agents]")){adminAuditAgentId="";adminAuditPairKey="";renderAgentDashboard();return}
 if(t.closest("[data-audit-back-list]")){adminAuditPairKey="";renderAdminChatExplorer();return}
 const pair=t.closest("[data-audit-pair]");if(pair){adminAuditPairKey=pair.dataset.auditPair;renderAdminChatExplorer()}
});
document.addEventListener("input",e=>{if(e.target?.id==="agentChatAuditSearch"){adminAuditSearch=e.target.value;const pos=e.target.selectionStart;renderAdminChatExplorer();const input=$("agentChatAuditSearch");input?.focus();input?.setSelectionRange(pos,pos)}});
document.addEventListener("change",e=>{if(e.target?.id==="agentChatAuditDate"){adminAuditDate=e.target.value;renderAdminChatExplorer()}});

$("globalSearch")?.addEventListener("input",e=>globalSearch(e.target.value));
$("groupSearch").oninput=e=>{groupFilter=e.target.value.toLowerCase().trim();renderGroup()};$("groupDate").onchange=e=>{dateFilter=e.target.value;renderGroup()};$("personalSearch").oninput=e=>{personalFilter=e.target.value.toLowerCase().trim();renderPersonal()};$("directSearch").oninput=e=>{directFilter=e.target.value||"";renderDirect()};$("clearFilters").onclick=()=>{$("groupSearch").value="";$("groupDate").value="";groupFilter=dateFilter="";renderGroup()};
$("directForm").onsubmit=async e=>{
 e.preventDefault();
 const body=$("directInput").value.trim();
 const recipient=selectedDirectRecipient||$("directRecipient").value||(team.find(p=>directPairKey(user.id,p.user_id)===selectedDirectKey)?.user_id)||"";
 if(!user||!recipient||recipient===user.id){status("Open a team member chat before sending.");return}
 if(!body)return;
 const send=$("directForm").querySelector('button[type="submit"]');
 send.disabled=true;
 try{
  const {error}=await db.from("ctr_direct_messages").insert({sender_id:user.id,recipient_id:recipient,sender_email:user.email,body});
  if(error){status("Message could not be sent: "+error.message);return}
  $("directInput").value="";
  selectedDirectRecipient=String(recipient);
  selectedDirectKey=directPairKey(user.id,recipient);
  $("directRecipient").value=recipient;
  await loadDirect();
  if(selectedDirectRecipient===String(recipient))renderDirect();
  markSeen("direct");
  status("Message sent.");
 }catch(err){status("Message failed: "+(err?.message||"Please try again."))}
 finally{send.disabled=false}
};
$("directInboxList").addEventListener("click",e=>{
 const target=e.target instanceof Element?e.target:null;if(!target)return;
 if(target.closest("[data-direct-retry]")){loadDirect();return}
 const row=target.closest("button.dm-conversation[data-dm-other]");
 if(!row||!$("directInboxList").contains(row))return;
 e.preventDefault();
 const id=row.dataset.dmOther;
 if(!id)return;
 openDirectConversation(id);
});
document.addEventListener("click",async e=>{
 const cp=e.target.closest("[data-copy-phone]");if(cp){try{await navigator.clipboard.writeText(cp.dataset.copyPhone);status("Phone copied.")}catch{status("Clipboard unavailable.")}return}
 const cn=e.target.closest("[data-copy-note]");if(cn){const n=group.find(x=>x.id===cn.dataset.copyNote);if(n){try{await navigator.clipboard.writeText(n.body);status("CRM note copied.")}catch{status("Clipboard unavailable.")}}return}
 const dmCopy=e.target.closest("[data-copy-dm]");if(dmCopy){const m=direct.find(x=>x.id===dmCopy.dataset.copyDm);if(m){try{await navigator.clipboard.writeText(m.body);status("Message copied.")}catch{status("Clipboard unavailable.")}}return}
 const searchHit=e.target.closest("[data-search-view]");if(searchHit){const view=searchHit.dataset.searchView;showView(view);const q=$("globalSearch").value.trim();if(view==="group"){$("groupSearch").value=q;groupFilter=q;renderGroup()}else if(view==="personal"){$("personalSearch").value=q;personalFilter=q;renderPersonal()}else if(view==="direct"){$("directSearch").value=q;directFilter=q;renderDirect()}else if(view==="followups"){followupSearchFilter=q;renderFollowups();requestAnimationFrame(()=>{const target=$("followupList").querySelector(".followup-item");target?.scrollIntoView({behavior:"smooth",block:"center"})})}$("globalSearchResults").classList.add("hidden");return}
 const done=e.target.closest("[data-follow-done]");if(done){if(!window.confirm("Mark this follow-up as complete? It will be removed from Pending Follow-ups."))return;done.disabled=true;const r=await db.from("ctr_followups").update({status:"completed",completed_at:new Date().toISOString()}).eq("id",done.dataset.followDone).eq("status","pending");done.disabled=false;if(r.error)status("Could not complete follow-up: "+r.error.message);else{await loadFollowups();status("Follow-up completed and removed from pending list.")}return}
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
$("followupForm").onsubmit=async e=>{e.preventDefault();if(!user)return;const customer_name=$("followupCustomer").value.trim(),phone=$("followupPhone").value.trim(),rawAt=$("followupAt").value,callback=new Date(rawAt);if(!customer_name||!phone||!rawAt||Number.isNaN(callback.getTime())){status("Enter customer name, phone and a valid callback date/time.");return}const submit=$("followupForm").querySelector("button[type=submit]");submit.disabled=true;const payload={user_id:user.id,customer_name,phone,callback_at:callback.toISOString(),details:$("followupDetails").value.trim(),status:"pending"};const r=await db.from("ctr_followups").insert(payload).select("id").single();submit.disabled=false;if(r.error){status("Could not schedule follow-up: "+r.error.message);return}$("followupForm").reset();$("followupForm").classList.add("hidden");$("newFollowupBtn").textContent="＋ Create Follow-up";await loadFollowups();status("Callback saved to the shared pending list.");};
$("noteForm").onsubmit=async e=>{e.preventDefault();const body=$("noteInput").value.trim();if(!body||!user)return;const {error}=await db.from("ctr_group_notes").insert({user_id:user.id,author_email:user.email,body});if(error)status("Could not send: "+error.message);else {$("noteInput").value="";renderGroup(true)}};
$("personalForm").onsubmit=async e=>{
 e.preventDefault();
 const body=$("personalInput").value.trim();
 if(!body||!user)return;
 const submit=$("personalForm").querySelector('button[type="submit"]');
 submit.disabled=true;
 try{
  const {error}=await db.from("ctr_personal_notes").insert({user_id:user.id,body});
  if(error){status("Could not save personal note: "+error.message);return}
  $("personalInput").value="";
  let refreshFailed=false;
  try{personal=await fetchAllRows(()=>db.from("ctr_personal_notes").select("*").order("created_at",{ascending:false}).order("id",{ascending:false}))}
  catch(readError){refreshFailed=true;status("Note saved, but refresh failed: "+readError.message)}
  renderPersonal();
  if(!refreshFailed)status("Personal note saved.");
 }catch(err){status("Could not save personal note: "+(err?.message||"Please try again."))}
 finally{submit.disabled=false}
};
document.addEventListener("click",async e=>{const target=e.target.closest("button");if(!target)return;const g=target.dataset.gdelete,p=target.dataset.pdelete,d=target.dataset.ddelete;const edit=target.dataset.edit,pedit=target.dataset.pedit,pin=target.dataset.pin,rid=target.dataset.react,emoji=target.dataset.emoji;
if(edit){const n=group.find(x=>x.id===edit);if(n){const body=prompt("Edit message",n.body);if(body!==null&&body.trim()){const {error}=await db.from("ctr_group_notes").update({body:body.trim(),edited_at:new Date().toISOString()}).eq("id",edit);if(error)status(error.message)}}}
if(pedit){const n=personal.find(x=>x.id===pedit);if(n){const body=prompt("Edit personal note",n.body);if(body!==null&&body.trim()){const {error}=await db.from("ctr_personal_notes").update({body:body.trim(),edited_at:new Date().toISOString()}).eq("id",pedit);if(error)status(error.message)}}}
if(pin&&isAdmin()){const n=group.find(x=>x.id===pin);if(n){target.disabled=true;const {error}=await db.rpc("ctr_toggle_group_pin",{p_note_id:pin});target.disabled=false;if(error){status("Pin update failed: "+error.message)}else{let data;try{data=await fetchAllRows(()=>db.from("ctr_group_notes").select("*").order("created_at",{ascending:true}).order("id",{ascending:true}))}catch(readError){status("Pin saved, refresh failed: "+readError.message);return}{group=data;const {data:profiles}=await db.from("ctr_profiles").select("user_id,chat_color");const colors=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.chat_color]));group=group.map(row=>({...row,chat_color:colors[row.user_id]||"#8E7CFF"}));renderGroup();status(n.is_pinned?"Message unpinned.":"Message pinned.")}}}}
if(rid&&emoji){target.disabled=true;const {error}=await db.rpc("ctr_toggle_group_reaction",{p_note_id:rid,p_emoji:emoji});target.disabled=false;if(error){status("Reaction failed: "+error.message)}else{let data;try{data=await fetchAllRows(()=>db.from("ctr_group_notes").select("*").order("created_at",{ascending:true}).order("id",{ascending:true}))}catch(readError){status("Reaction saved, refresh failed: "+readError.message);return}{group=data;const {data:profiles}=await db.from("ctr_profiles").select("user_id,chat_color");const colors=Object.fromEntries((profiles||[]).map(x=>[x.user_id,x.chat_color]));group=group.map(n=>({...n,chat_color:colors[n.user_id]||"#8E7CFF"}));renderGroup();status("Reaction updated.")}}}
if(g&&isAdmin()){if(!confirm("Admin: permanently delete this group message?"))return;const {error}=await db.from("ctr_group_notes").delete().eq("id",g);if(error)status("Delete failed: "+error.message);else{group=group.filter(n=>n.id!==g);renderGroup();status("Group message deleted by admin.")}}if(p&&isAdmin()){if(!confirm("Admin: permanently delete this personal note?"))return;const {error}=await db.from("ctr_personal_notes").delete().eq("id",p);if(error)status("Delete failed: "+error.message);else{personal=personal.filter(n=>n.id!==p);renderPersonal();status("Personal note deleted by admin.")}}if(d&&isAdmin()){if(!confirm("Admin: permanently delete this direct message?"))return;const {error}=await db.from("ctr_direct_messages").delete().eq("id",d);if(error)status("Delete failed: "+error.message);else{direct=direct.filter(m=>m.id!==d);renderDirect();status("Direct message deleted by admin.")}}});
$("signOut").onclick=async()=>{if(channel)await db.removeChannel(channel);await db.auth.signOut()};
boot().catch(err=>{console.error("CTR startup failed",err);status("App startup failed: "+(err?.message||"Please refresh the page."),true)});

document.addEventListener("visibilitychange",()=>{if(!document.hidden&&user){if(!$("groupView").classList.contains("hidden"))markSeen("group");if(!$("directView").classList.contains("hidden"))markSeen("direct")}});
let holdTimer;document.addEventListener("touchstart",e=>{const card=e.target.closest(".note[data-note-id]");if(!card)return;holdTimer=setTimeout(()=>{const n=group.find(x=>x.id===card.dataset.noteId);if(n&&confirm("Quote this message in Group Chat?")){$("noteInput").value="↪ "+displayName(n.author_email)+": "+n.body+"\n\n";$("noteInput").focus()}},650)},{passive:true});document.addEventListener("touchend",()=>clearTimeout(holdTimer),{passive:true});document.addEventListener("touchmove",()=>clearTimeout(holdTimer),{passive:true});
document.addEventListener("touchstart",e=>{const c=e.target.closest(".note[data-note-id]");if(c)c.dataset.startX=e.touches[0].clientX},{passive:true});document.addEventListener("touchend",async e=>{const c=e.target.closest(".note[data-note-id]");if(!c||!c.dataset.startX)return;const dx=e.changedTouches[0].clientX-Number(c.dataset.startX);delete c.dataset.startX;const n=group.find(x=>x.id===c.dataset.noteId);if(!n)return;if(dx>85){$("noteInput").value="↪ "+displayName(n.author_email)+": "+n.body+"\n\n";$("noteInput").focus()}else if(dx< -85){try{await navigator.clipboard.writeText(n.body);status("CRM note copied by swipe.")}catch{status("Clipboard unavailable.")}}},{passive:true});


// Desktop sidebar expand/collapse preference.
(()=>{
 const root=document.querySelector(".app-view");
 const toggle=document.getElementById("sidebarToggle");
 if(!root||!toggle)return;
 const key="ctr_sidebar_collapsed";
 const apply=collapsed=>{
  root.classList.toggle("sidebar-collapsed",collapsed);
  toggle.setAttribute("aria-label",collapsed?"Expand sidebar":"Collapse sidebar");
  toggle.title=collapsed?"Expand sidebar":"Collapse sidebar";
  const label=toggle.querySelector(".toggle-label");
  if(label)label.textContent=collapsed?"Expand":"Collapse";
 };
 apply(localStorage.getItem(key)==="1");
 toggle.addEventListener("click",()=>{
  const collapsed=!root.classList.contains("sidebar-collapsed");
  localStorage.setItem(key,collapsed?"1":"0");
  apply(collapsed);
 });
})();
