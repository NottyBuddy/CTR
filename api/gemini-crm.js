const SUPABASE_URL = "https://icootmtssyergamuxlxb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qgEIXxXXBq2TaNxLMZPkwg_fcwKcdGW";
const ALLOWED_ORIGINS = new Set(["https://nottybuddy.github.io","https://ctr-ai-assistant-notty-buddy.vercel.app","https://ctr-ai-assistant.vercel.app"]);
function send(res,status,body){return res.status(status).json(body)}
module.exports = async function handler(req,res){
 const origin=req.headers.origin||"";
 if(ALLOWED_ORIGINS.has(origin)){res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
 if(req.method==="OPTIONS")return res.status(204).end();
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed."});
 if(origin&&!ALLOWED_ORIGINS.has(origin))return send(res,403,{error:"Origin not allowed."});
 const auth=String(req.headers.authorization||"");
 if(!auth.startsWith("Bearer "))return send(res,401,{error:"Please sign in to CTR again."});
 const token=auth.slice(7).trim();
 try{
  const identity=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+token}});
  if(!identity.ok)return send(res,401,{error:"Your CTR session is invalid or expired. Sign in again."});
  const user=await identity.json();
  if(!user?.id)return send(res,401,{error:"Could not verify your CTR account."});
  const input=String(req.body?.input||"").trim();
  if(!input)return send(res,400,{error:"Add the call details first."});
  if(input.length>9000)return send(res,413,{error:"Keep one call note under 9,000 characters."});
  const key=process.env.GEMINI_API_KEY;
  if(!key)return send(res,503,{code:"GEMINI_NOT_CONFIGURED",error:"Gemini free-tier key is not configured on the server yet."});
  const today=new Date().toISOString().slice(0,10);
  const system=[
   "You are CTR's expert CRM assistant for an Indian sales/calling team. Understand raw shorthand, typos, Hindi, Hinglish and English like a capable conversational assistant. Infer meaning from full context, not isolated abbreviations.",
   "Examples: cx=customer, req=requirement, loc=location, Mum=Mumbai, MH=Maharashtra, cb/call bck=callback, new constru=new construction. '45w' may mean 45 windows near uPVC, glass, frames or construction product context; 45 weeks near follow-up, callback, duration, delivery or timeline; Wi-Fi near router/networking. If context does not disambiguate, do not guess; ask one concise clarification.",
   "Interpret numeric shorthand conservatively. '12w 4d' means 12 weeks 4 days only when timeline context exists. '2 mon' means two months when timeline context supports it. Unknown abbreviations such as CLR must remain unexpanded unless context establishes meaning.",
   "Never invent customer name, phone, budget, product, project stage, city, PIN, call outcome, commitment or dates. Preserve all supplied facts. Separate customer statements from agent assumptions. If customer name or contact is missing, mark Not provided.",
   "Current date is "+today+". Calculate relative callback dates accurately from this date and state the exact date. Preserve location and PIN exactly as supplied; do not infer a city from a PIN unless certain.",
   "Write concise, polished, professional Indian CRM English. Understand mixed-language input and produce English unless another language is requested.",
   "Return valid JSON only: {crm_note:string, group_note:string, clarifying_questions:string[], extracted_facts:string[], uncertainty_flags:string[], follow_up_date:string, confidence:'high'|'medium'|'low'}.",
   "CRM note headings: Customer Name | Contact Number; Call Summary; Customer Requirement; Project Details; Location; Call Outcome; Follow-up Required; Next Action. Do not add empty invented facts. Group note should be concise and must not expose phone numbers or unnecessary personal data.",
   "Ask only essential clarifying questions. Draft the best possible note even when a few details are missing."
  ].join("\n");
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:"Raw CTR call details:\n"+input}]}],generationConfig:{temperature:0.2,maxOutputTokens:1800,responseMimeType:"application/json"}})
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
   const status=response.status;
   if(status===429)return send(res,429,{code:"GEMINI_FREE_QUOTA",error:"Gemini free-tier quota is currently exhausted. No paid fallback is enabled; please retry after the quota resets."});
   console.error("Gemini API error",status,payload?.error?.message||"");
   return send(res,status===503?503:502,{error:status===503?"Gemini is temporarily unavailable. Please retry shortly.":"Gemini could not prepare this note. Check the free-tier API key and project quota."});
  }
  const output=payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
  if(!output)return send(res,502,{error:"Gemini returned an empty response. Please retry."});
  let result;try{result=JSON.parse(output)}catch{return send(res,502,{error:"Gemini returned an invalid draft format. Please retry."})}
  if(typeof result.crm_note!=="string"||typeof result.group_note!=="string")return send(res,502,{error:"Gemini did not return both CRM drafts."});
  return send(res,200,{crm:result.crm_note,group:result.group_note,questions:Array.isArray(result.clarifying_questions)?result.clarifying_questions:[],facts:Array.isArray(result.extracted_facts)?result.extracted_facts:[],uncertainties:Array.isArray(result.uncertainty_flags)?result.uncertainty_flags:[],followUpDate:typeof result.follow_up_date==="string"?result.follow_up_date:"",confidence:["high","medium","low"].includes(result.confidence)?result.confidence:"medium",provider:"Gemini free tier"});
 }catch(error){console.error("CTR Gemini CRM assistant failed",error);return send(res,500,{error:"CRM assistant encountered a server error. Please retry."})}
};