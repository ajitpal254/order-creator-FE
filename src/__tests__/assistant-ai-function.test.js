/**
 * assistant-ai-function.test.js
 * FEAT-16 (v0.8) — the assistant-ai Netlify Function
 * (netlify/functions/assistant-ai.mjs): method gate, shared-secret
 * auth, gateway-env gate, payload validation, and the happy-path
 * proxy to the AI Gateway's OpenAI-compatible endpoint with a
 * mocked fetch. All secrets below are obvious fakes.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

import handler from '../../netlify/functions/assistant-ai.mjs';

const FAKE_SECRET = 'fake-function-secret-for-tests';
const FAKE_KEY = 'fake-gateway-key-for-tests';
const GATEWAY_BASE = 'https://gateway.example.test/v1';

const originalFetch = globalThis.fetch;

const makeRequest = ({ method = 'POST', secret, body } = {}) =>
  new Request('https://haoverseas.netlify.app/.netlify/functions/assistant-ai', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-assistant-secret': secret } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
  });

const setEnv = (vars) => {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  setEnv({
    ASSISTANT_FUNCTION_SECRET: undefined,
    OPENAI_BASE_URL: undefined,
    OPENAI_API_KEY: undefined,
    NETLIFY_AI_MODEL: undefined,
  });
  vi.restoreAllMocks();
});

describe('assistant-ai Netlify Function', () => {
  it('rejects non-POST requests with 405', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET });
    const res = await handler(makeRequest({ method: 'GET', secret: FAKE_SECRET }));
    expect(res.status).toBe(405);
  });

  it('returns 501 when ASSISTANT_FUNCTION_SECRET itself is unset', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: undefined });
    globalThis.fetch = vi.fn();
    const res = await handler(makeRequest({ secret: 'anything', body: { messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.status).toBe(501);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 401 for a missing or wrong shared secret', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET });
    globalThis.fetch = vi.fn();
    const noHeader = await handler(makeRequest({ body: { messages: [{ role: 'user', content: 'hi' }] } }));
    expect(noHeader.status).toBe(401);
    const wrong = await handler(makeRequest({ secret: 'not-the-secret', body: { messages: [{ role: 'user', content: 'hi' }] } }));
    expect(wrong.status).toBe(401);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 when messages is missing or empty', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET, OPENAI_BASE_URL: GATEWAY_BASE, OPENAI_API_KEY: FAKE_KEY });
    globalThis.fetch = vi.fn();
    expect((await handler(makeRequest({ secret: FAKE_SECRET, body: {} }))).status).toBe(400);
    expect((await handler(makeRequest({ secret: FAKE_SECRET, body: { messages: [] } }))).status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 501 when the AI Gateway env is not injected', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET, OPENAI_BASE_URL: undefined, OPENAI_API_KEY: undefined });
    globalThis.fetch = vi.fn();
    const res = await handler(makeRequest({ secret: FAKE_SECRET, body: { messages: [{ role: 'user', content: 'hi' }] } }));
    expect(res.status).toBe(501);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('proxies to the gateway with the injected key and returns the completion verbatim', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET, OPENAI_BASE_URL: GATEWAY_BASE, OPENAI_API_KEY: FAKE_KEY });
    const completion = { choices: [{ message: { content: 'Your order has shipped.' } }] };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => completion,
    }));

    const tools = [{ type: 'function', function: { name: 'get_order_status', parameters: { type: 'object' } } }];
    const res = await handler(
      makeRequest({
        secret: FAKE_SECRET,
        body: { messages: [{ role: 'user', content: 'Where is my order?' }], tools },
      })
    );
    expect(res.status).toBe(200);
    const returned = await res.json();
    expect(returned).toEqual(completion);

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe(`${GATEWAY_BASE}/chat/completions`);
    expect(options.headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
    const sent = JSON.parse(options.body);
    expect(sent.model).toBe('gpt-5-mini');
    expect(sent.messages).toEqual([{ role: 'user', content: 'Where is my order?' }]);
    expect(sent.tools).toEqual(tools);
    expect(sent.tool_choice).toBe('auto');

    // The gateway key must never appear in the response to the caller.
    expect(JSON.stringify(returned)).not.toContain(FAKE_KEY);
  });

  it('passes upstream error status through with a generic body and no key material', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET, OPENAI_BASE_URL: GATEWAY_BASE, OPENAI_API_KEY: FAKE_KEY });
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: `rate limited for key ${FAKE_KEY}` } }),
    }));
    const res = await handler(
      makeRequest({ secret: FAKE_SECRET, body: { messages: [{ role: 'user', content: 'hi' }] } })
    );
    expect(res.status).toBe(429);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'upstream_error' });
    expect(text).not.toContain(FAKE_KEY);
  });

  it('returns 502 when the gateway is unreachable', async () => {
    setEnv({ ASSISTANT_FUNCTION_SECRET: FAKE_SECRET, OPENAI_BASE_URL: GATEWAY_BASE, OPENAI_API_KEY: FAKE_KEY });
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    const res = await handler(
      makeRequest({ secret: FAKE_SECRET, body: { messages: [{ role: 'user', content: 'hi' }] } })
    );
    expect(res.status).toBe(502);
  });
});
