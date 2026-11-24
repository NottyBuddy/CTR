/* CTR Private Local AI
 * Runs Qwen2.5-0.5B-Instruct in this browser via Transformers.js.
 * The model files are downloaded from the public Hugging Face model repository
 * on first use and cached by the browser. Customer prompts are passed only to
 * the in-browser model runtime; this file makes no prompt/API requests.
 */
(function (root) {
  "use strict";
  let pipelinePromise = null;
  const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

  async function getGenerator(onProgress) {
    if (!pipelinePromise) {
      pipelinePromise = (async () => {
        const { pipeline, env } = await import(
          "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2"
        );
        env.allowRemoteModels = true;
        env.useBrowserCache = true;
        return pipeline("text-generation", MODEL_ID, {
          dtype: "q4",
          progress_callback: (progress) => {
            if (typeof onProgress === "function") onProgress(progress);
          }
        });
      })().catch((error) => {
        pipelinePromise = null;
        throw error;
      });
    }
    return pipelinePromise;
  }

  function outputText(result) {
    const generated = result?.[0]?.generated_text;
    if (typeof generated === "string") return generated;
    if (Array.isArray(generated)) {
      const last = generated[generated.length - 1];
      return typeof last?.content === "string" ? last.content : "";
    }
    return "";
  }

  function parseJSON(text) {
    const cleaned = String(text || "").replace(/^﻿/, "").trim()
      .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Local model returned an unreadable draft. Please retry.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  async function generate(raw, onProgress) {
    const input = String(raw || "").trim();
    if (!input) throw new Error("Enter customer call details first.");
    const generator = await getGenerator(onProgress);
    const today = new Date().toLocaleDateString("en-CA");
    const messages = [
      {
        role: "system",
        content: [
          "You are CTR's private CRM note assistant for an Indian calling and sales team.",
          "Understand Hindi, Hinglish, English, typos, phonetic shorthand and the full call context. Think carefully before expanding abbreviations.",
          "Examples: cx=customer, req=requirement, loc=location, Mum=Mumbai, MH=Maharashtra, cb/call bck=callback, new constru=new construction.",
          "The abbreviation 'w' is ambiguous. Interpret 45w as 45 windows only with window/uPVC/glass/frame/construction product context; 45 weeks only with duration/callback/follow-up/timeline context; Wi-Fi only with router/network/internet context. If context is insufficient, do not guess; ask one short clarification.",
          "Interpret '12w 4d' as 12 weeks 4 days only when timeline context supports it. Unknown terms such as CLR must remain unchanged unless meaning is clear.",
          "Never invent customer name, phone, budget, product, project stage, city, PIN, call outcome, commitment or dates. Mark missing customer/contact details as Not provided. Preserve exact supplied facts.",
          "Current date: " + today + ". Calculate relative callback dates accurately. Separate confirmed facts from assumptions. Group note must omit phone numbers and unnecessary personal data.",
          "Write polished professional CRM English unless user asks for another language. Be concise, useful and specific.",
          "Return ONLY valid JSON with keys crm_note, group_note, clarifying_questions, uncertainty_flags, follow_up_date, confidence. confidence must be high, medium or low.",
          "CRM note should use suitable headings: Customer Name | Contact Number, Call Summary, Customer Requirement, Project Details, Location, Call Outcome, Follow-up Required, Next Action. Do not force empty headings.",
          "Group note should be a short safe summary. Ask only essential clarifying questions and still provide the best possible draft."
        ].join("\n")
      },
      { role: "user", content: "Prepare CTR notes from these call details.\n\n" + input }
    ];
    const result = await generator(messages, {
      max_new_tokens: 650,
      temperature: 0.15,
      do_sample: false,
      repetition_penalty: 1.08
    });
    const parsed = parseJSON(outputText(result));
    if (typeof parsed.crm_note !== "string" || typeof parsed.group_note !== "string") {
      throw new Error("Local model did not return both note formats. Please retry.");
    }
    return {
      crm: parsed.crm_note,
      group: parsed.group_note,
      questions: Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : [],
      uncertainties: Array.isArray(parsed.uncertainty_flags) ? parsed.uncertainty_flags : [],
      followUpDate: typeof parsed.follow_up_date === "string" ? parsed.follow_up_date : "",
      confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium"
    };
  }

  root.CTRLocalAI = Object.freeze({ generate, model: MODEL_ID });
})(window);
