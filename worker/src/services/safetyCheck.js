const OpenAI = require('openai');

const CATEGORIES = ['adult', 'spoof', 'medical', 'violence', 'racy'];
const FLAGGED_LEVELS = new Set(['LIKELY', 'VERY_LIKELY']);

function scoreToLevel(score) {
  if (score >= 0.8) return 'VERY_LIKELY';
  if (score >= 0.5) return 'LIKELY';
  if (score >= 0.2) return 'POSSIBLE';
  if (score >= 0.05) return 'UNLIKELY';
  return 'VERY_UNLIKELY';
}

function getMimeType(buf) {
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf.length >= 2 && buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf.length >= 12 && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return 'image/jpeg';
}

async function checkSafety(imageBuffer) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const mime = getMimeType(imageBuffer);
  const b64 = imageBuffer.toString('base64');
  const response = await client.moderations.create({
    model: 'omni-moderation-latest',
    input: [{ type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } }],
  });
  const scores = response.results?.[0]?.category_scores || {};
  const safetyResult = {
    adult: scoreToLevel(scores['sexual'] || 0),
    spoof: scoreToLevel(scores['harassment'] || 0),
    medical: scoreToLevel(scores['self-harm'] || 0),
    violence: scoreToLevel(scores['violence'] || 0),
    racy: scoreToLevel(scores['sexual'] || 0),
  };
  const flaggedCategories = CATEGORIES.filter(cat => FLAGGED_LEVELS.has(safetyResult[cat]));
  return { safetyResult, flagged: flaggedCategories.length > 0, flaggedCategories };
}

module.exports = { checkSafety };
