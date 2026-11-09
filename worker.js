// Cloudflare Worker pro sekci Pohádky v aplikaci Kreslíme (v1.17)
// Drží Claude API klíč v tajnosti a předává dotazy z aplikace do Claude API.
//
// Nastavení v Cloudflare (Workers → tvůj worker → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (Secret)  – klíč z console.anthropic.com (jen samotný klíč sk-ant-…)
//   ALLOWED_ORIGIN     (Text)    – https://janhrdlicka241.github.io
//   MODEL              (Text, nepovinné) – výchozí claude-sonnet-5-5

const SYSTEM = 'Jsi laskavý vypravěč pohádek pro malé děti a ilustrátor jednoduchých SVG obrázků. '
  + 'Píšeš česky, spisovně a bez chyb. Obsah je vždy vhodný pro děti: nic krutého, strašidelného ani nebezpečného, vždy dobrý konec. '
  + 'Odpovídáš přesně ve formátu, o který tě aplikace požádá.';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return new Response('Zakázaný původ', { status: 403, headers: cors });
    if (request.method !== 'POST') return new Response('Jen POST', { status: 405, headers: cors });

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Špatný požadavek' }, 400, cors); }

    // klíč: vezme jen samotné sk-ant-… i kdyby se do pole vložilo víc textu
    const raw = String(env.ANTHROPIC_API_KEY || '');
    const m = raw.match(/sk-ant-[A-Za-z0-9_\-]+/);
    const key = m ? m[0] : raw.trim();

    if (body.ping) return json({ ok: true, version: '1.17', key: key ? 'ok' : 'chybí', model: (env.MODEL || 'claude-sonnet-5-5').trim() }, 200, cors);
    if (!key) return json({ error: 'Ve workeru chybí ANTHROPIC_API_KEY' }, 500, cors);

    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt || prompt.length > 8000) return json({ error: 'Chybí nebo příliš dlouhé zadání' }, 400, cors);

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: (env.MODEL || 'claude-sonnet-5-5').trim(),
          max_tokens: 8000,
          system: SYSTEM,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch (e) {
      return json({ error: 'Nepodařilo se spojit s Claude API: ' + e.message }, 502, cors);
    }
    if (!r.ok) {
      const detail = await r.text();
      return json({ error: 'Claude API ' + r.status, detail: detail.slice(0, 300) }, 502, cors);
    }
    const data = await r.json();
    const blocks = Array.isArray(data.content) ? data.content : [];
    // text z jakéhokoli bloku, který text obsahuje (kromě přemýšlení)
    const text = blocks.filter(c => c && typeof c.text === 'string' && !/thinking/.test(c.type || '')).map(c => c.text).join('');
    const diag = 'stop=' + (data.stop_reason || '?') + ', bloky=[' + blocks.map(c => c && c.type).join(',') + '], model=' + (data.model || '?')
      + (data.usage ? ', tokeny=' + data.usage.output_tokens : '');
    console.log('pohadky ' + kindLabel(body.kind) + ': ' + diag + ', délka textu=' + text.length);
    if (!text.trim()) return json({ error: 'Claude vrátil prázdnou odpověď', detail: diag }, 502, cors);
    return json({ text, stop: data.stop_reason || '', diag }, 200, cors);
  },
};

function kindLabel(k) { return k === 'svg' ? 'obrázek' : 'text'; }

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}
