// Serverless function: receives {prompt, image?} from index.html and returns {text}.
// Uses Google Gemini's free tier. The key is read from the GEMINI_API_KEY environment variable.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });

  try {
    const { prompt, image } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt missing' });

    const parts = [{ text: String(prompt).slice(0, 8000) }];
    if (image) parts.push({ inline_data: { mime_type: 'image/jpeg', data: image } });

    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    );
    if (!r.ok) return res.status(502).json({ error: 'upstream ' + r.status + ' ' + (await r.text()).slice(0, 300) });
    const d = await r.json();
    const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};
