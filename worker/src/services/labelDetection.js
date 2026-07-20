const OpenAI = require('openai');

function getMimeType(buf) {
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf.length >= 2 && buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.length >= 12 && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return 'image/jpeg';
}

async function getLabels(imageBuffer) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const mime = getMimeType(imageBuffer);
  const b64 = imageBuffer.toString('base64');
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        { type: 'text', text: 'List the main objects and labels in this image. Return ONLY a JSON array like: [{"description":"Dog","score":0.98}]. Maximum 10 items, scores 0-1.' },
      ],
    }],
    max_tokens: 300,
  });
  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) return [];
  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]).map(l => ({ description: String(l.description), score: Number(l.score) }));
  } catch {
    return [];
  }
}

module.exports = { getLabels };
