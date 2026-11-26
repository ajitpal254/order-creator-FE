/**
 * assistant-ai — Netlify Function for the H.A. Overseas Order Desk
 * Assistant (FEAT-16 Stage 2, v0.8).
 *
 * The Render backend (ASSISTANT_PROVIDER=netlify) POSTs an OpenAI-style
 * chat payload here; this function forwards it to the model through
 * Netlify's AI Gateway and returns the completion verbatim.
 *
 * AI Gateway: in Netlify compute contexts (Functions / Edge Functions),
 * Netlify automatically injects provider credentials and gateway base
 * URLs as environment variables — OPENAI_API_KEY and OPENAI_BASE_URL
 * for the OpenAI-compatible endpoint. No model-provider key is stored
 * in this repo or in the site's own env vars; usage is billed as
 * Netlify credits. Outside a Netlify compute context those variables
 * are absent and this function answers 501.
 *
 * Auth: every request must carry the header 'x-assistant-secret'
 * matching ASSISTANT_FUNCTION_SECRET, which Ajit sets in the Netlify
 * dashboard (Site settings -> Environment variables) to the same value
 * as the backend's NETLIFY_AI_SHARED_SECRET on Render. Without it the
 * function refuses to run — it must NEVER be an open AI proxy.
 *
 * Deploy note: Netlify Functions deploy only via a git-connected build
 * or the Netlify CLI. A plain drag-drop of the built dist folder does
 * NOT deploy functions, so this file takes effect only once the site
 * is built from the repository (or deployed with `netlify deploy`).
 */

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const expectedSecret = process.env.ASSISTANT_FUNCTION_SECRET;
  if (!expectedSecret) {
    return json(501, { error: 'function_not_configured' });
  }
  if (req.headers.get('x-assistant-secret') !== expectedSecret) {
    return json(401, { error: 'unauthorized' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: 'messages_required' });
  }

  const base = process.env.OPENAI_BASE_URL;
  const key = process.env.OPENAI_API_KEY;
  if (!base || !key) {
    return json(501, { error: 'ai_gateway_not_active' });
  }

  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
  const upstreamBody = {
    model: body.model || process.env.NETLIFY_AI_MODEL || 'gpt-5-mini',
    messages: body.messages,
    ...(hasTools ? { tools: body.tools, tool_choice: 'auto' } : {}),
  };

  let upstream;
  try {
    upstream = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(upstreamBody),
    });
  } catch {
    return json(502, { error: 'upstream_unreachable' });
  }

  if (!upstream.ok) {
    // Pass the status through with a generic body — never leak the
    // upstream payload, headers, or any credential material.
    return json(upstream.status, { error: 'upstream_error' });
  }

  const data = await upstream.json().catch(() => null);
  if (!data) return json(502, { error: 'upstream_error' });
  return json(200, data);
};
