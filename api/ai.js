module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  try {
    const { prompt, image } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt missing' });
    const parts = [{ text: String(prompt).slice(0, 8000) }];
    if (image) parts.push({ inline_data: { mime_type: 'image/jpeg', data: image } });
    const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let last = '';
    for (const m of models) {
      for (let i = 0; i < 2; i++) {
        const r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({ contents: [{ parts }] }),
          }
        );
        if (r.ok) {
          const d = await r.json();
          const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
          return res.status(200).json({ text });
        }
        last = m + ' ' + r.status + ' ' + (await r.text()).slice(0, 200);
        if (![429, 500, 503].includes(r.status)) break;
        await new Promise(ok => setTimeout(ok, 1000));
      }
    }
    return res.status(502).json({ error: 'upstream ' + last });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};
