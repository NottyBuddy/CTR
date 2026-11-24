const SUPABASE_URL = "https://icootmtssyergamuxlxb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qgEIXxXXBq2TaNxLMZPkwg_fcwKcdGW";
const ALLOWED_ORIGINS = new Set([
  "https://nottybuddy.github.io",
  "https://ctr-ai-assistant-notty-buddy.vercel.app",
  "https://ctr-ai-assistant-git-main-notty-buddy.vercel.app"
]);
function send(res, status, body) { res.status(status).json(body); }

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { error: "Origin not allowed." });

  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return send(res, 401, { error: "Please sign in again." });
  const token = auth.slice(7).trim();
  if (!token || token.length > 5000) return send(res, 401, { error: "Invalid session." });

  try {
    const identity = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + token }
    });
    if (!identity.ok) return send(res, 401, { error: "Your CTR session is invalid or expired. Sign in again." });
    const user = await identity.json();
    if (!user || !user.id || !user.email) return send(res, 401, { error: "Could not verify your CTR account." });

    const input = String(req.body?.input || "").trim();
    if (!input) return send(res, 400, { error: "Add the call details first." });
    if (input.length > 9000) return send(res, 413, { error: "Please keep one call note under 9,000 characters." });

    const gatewayToken = process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
    if (!gatewayToken) return send(res, 503, { error: "AI service is not configured on the server yet." });

    const system = [
      "You are CTR's senior CRM call-note assistant for an Indian sales/calling team. Convert raw call shorthand, misspellings, abbreviations, Hindi, Hinglish and English into accurate, professional CRM documentation.",
      "Understand context, not just isolated abbreviations. Example: 45w near windows, uPVC, glass, frames or construction-product context can mean 45 windows; near callback, follow-up, after/in, delivery or duration it can mean 45 weeks; near Wi-Fi, router or networking it may refer to Wi-Fi, but 45w alone is ambiguous. Use nearby words and domain context. If two interpretations remain plausible, ask one short targeted clarification and mark it unconfirmed.",
      "Interpret common shorthand such as cx=customer, req=requirement, loc=location, Mum=Mumbai, MH=Maharashtra, cb/call bck=callback, new constru=new construction, 12w 4d=12 weeks 4 days only when timeline context supports it. Treat CLR as unknown unless context makes meaning clear.",
      "Never invent customer name, phone, budget, product, project stage, location, PIN, outcome, commitment or dates. Preserve confirmed facts and distinguish customer statements from assumptions.",
      "Calculate relative callback dates from current date " + new Date().toISOString().slice(0,10) + ". State exact date and do not confuse weeks with windows. If location and PIN are given, preserve both. Do not infer city from PIN unless certain.",
      "Write polished, concise, professional Indian CRM English. Understand mixed language and write professional English unless another language is requested.",
      "Return valid JSON only with keys: group_note (string), crm_note (string), clarifying_questions (array of strings), extracted_facts (array of strings), uncertainty_flags (array of strings), follow_up_date (string or empty), confidence (high|medium|low).",
      "crm_note structure: Customer Name | Contact Number; Call Summary; Customer Requirement; Project Details; Location; Call Outcome; Follow-up Required; Next Action. Omit unavailable sections or mark Not provided rather than guessing.",
      "group_note is a concise team update with relevant facts and next action. Ask only the most important clarification questions. If none are needed, return an empty array."
    ].join("\n");

    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + gatewayToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: "CTR agent's raw call details:\n" + input }
        ]
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("AI Gateway error", response.status, result?.error?.message || result);
      return send(res, response.status === 429 ? 429 : 502, { error: response.status === 429 ? "AI request limit reached. Please retry shortly." : "AI service could not complete this note. Please retry." });
    }
    const output = result?.choices?.[0]?.message?.content;
    if (!output) return send(res, 502, { error: "AI returned an empty response. Please retry." });
    let parsed;
    try { parsed = JSON.parse(output); } catch { return send(res, 502, { error: "AI response format was invalid. Please retry." }); }
    if (typeof parsed.crm_note !== "string" || typeof parsed.group_note !== "string") return send(res, 502, { error: "AI did not return both CRM drafts. Please retry." });
    return send(res, 200, {
      group: parsed.group_note, crm: parsed.crm_note,
      questions: Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : [],
      facts: Array.isArray(parsed.extracted_facts) ? parsed.extracted_facts : [],
      uncertainties: Array.isArray(parsed.uncertainty_flags) ? parsed.uncertainty_flags : [],
      followUpDate: typeof parsed.follow_up_date === "string" ? parsed.follow_up_date : "",
      confidence: ["high","medium","low"].includes(parsed.confidence) ? parsed.confidence : "medium"
    });
  } catch (error) {
    console.error("CTR CRM assistant failed", error);
    return send(res, 500, { error: "CRM assistant encountered a server error. Please retry." });
  }
};