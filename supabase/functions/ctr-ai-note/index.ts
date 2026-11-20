import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in first.");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { raw } = await req.json();
    if (typeof raw !== "string" || raw.trim().length < 10 || raw.length > 12000) {
      return new Response(JSON.stringify({ error: "Enter customer details between 10 and 12,000 characters." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY secret is not configured for this Edge Function.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a careful CRM documentation assistant. Convert rough customer call details into two useful outputs: normal_note and follow_up_note. Preserve every supplied fact accurately. Do not invent missing dimensions, dates, commitments, prices, or customer intent. Use clear professional English. Normal note should be a readable paragraph with customer name and phone, location, requirement, project/property type, timeline, discussion and assigned person when provided. Follow-up note should clearly state action, owner, timing/site visit request, pending information and next step. Mark unknown information as To be confirmed. Return only valid JSON with string keys normal_note and follow_up_note." },
          { role: "user", content: raw.trim() }
        ]
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || "AI provider request failed.");
    const text = result.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI returned an empty response.");
    const parsed = JSON.parse(text);
    return new Response(JSON.stringify({ normal_note: parsed.normal_note, follow_up_note: parsed.follow_up_note }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unable to generate notes." }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
