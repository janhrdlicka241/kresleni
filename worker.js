// Cloudflare Worker pro sekci Pohádky v aplikaci Kreslíme (v1.14)
// Drží Claude API klíč v tajnosti a předává dotazy z aplikace do Claude API.
//
// Nastavení v Cloudflare (Workers → tvůj worker → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (Secret)  – klíč z console.anthropic.com
//   ALLOWED_ORIGIN     (Text)    – https://janhrdlicka241.github.io
//   MODEL              (Text, nepovinné) – výchozí claude-sonnet-5-5

const SYSTEM = 'Jsi laskavý vypravěč pohádek pro malé děti a ilustrátor jednoduchých SVG obrázků. '
  + 'Píšeš česky, spisovně a bez chyb. Obsah je vždy vhodný pro děti: nic krutého, strašidelného ani nebezpečného, vždy dobrý konec. '
  + 'Odpovídáš přesně ve formátu, o který tě aplikace požádá.';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
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
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt || prompt.length > 6000) return json({ error: 'Chybí nebo příliš dlouhé zadání' }, 400, cors);
    const kind = body.kind === 'svg' ? 'svg' : 'text';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.MODEL || 'claude-sonnet-5-5',
        max_tokens: kind === 'svg' ? 6000 : 3000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      return json({ error: 'Claude API ' + r.status, detail: detail.slice(0, 300) }, 502, cors);
    }
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return json({ text }, 200, cors);
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}
