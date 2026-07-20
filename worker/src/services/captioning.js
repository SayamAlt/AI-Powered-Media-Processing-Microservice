const OpenAI = require('openai');

function getMimeType(buf) {
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf.length >= 2 && buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.length >= 12 && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return 'image/jpeg';
}

async function getCaption(imageBuffer) {
  if (process.env.HF_API_KEY) {
    try {
      const model = 'Salesforce/blip-image-captioning-base';
      const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.generated_text) {
          return data[0].generated_text.trim();
        }
      }
    } catch (err) {
      console.warn('Hugging Face captioning failed, falling back to OpenAI:', err.message);
    }
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const mime = getMimeType(imageBuffer);
  const b64 = imageBuffer.toString('base64');
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        { type: 'text', text: 'Describe this image in one short sentence.' },
      ],
    }],
    max_tokens: 100,
  });
  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('No caption returned from OpenAI');
  return text;
}

module.exports = { getCaption };
