// Minimal chat-completions client for the judge step. ASCII source only.
// argv[2] = prompt file path; review is written to stdout.
// Env: DSH_API_KEY (falls back to .env.local), AIAI_BASE_URL, JUDGE_MODEL.
import fs from 'node:fs';

function envFromFile(file, key) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* file may not exist */
  }
  return undefined;
}

const REQUIRED_MARKERS = ['## 1.', '## 2.', '## 3.', '## 4.', '## 5.', '## 6.'];
const MIN_REVIEW_LENGTH = 500;

function isReview(text) {
  if (text.length < MIN_REVIEW_LENGTH) return false;
  return REQUIRED_MARKERS.every(m => text.includes(m));
}

const promptPath = process.argv[2];
if (!promptPath) {
  console.error('usage: node scripts/judge.mjs <prompt-file>');
  process.exit(2);
}

const key = process.env.DSH_API_KEY || envFromFile('.env.local', 'DSH_API_KEY');
if (!key) {
  console.error('judge: DSH_API_KEY not set and not found in .env.local');
  process.exit(2);
}

const base = (process.env.AIAI_BASE_URL || 'https://api.aiai.by/v1').replace(/\/$/, '');
const model = process.env.JUDGE_MODEL || 'deepseek-v3.2';
const timeoutMs = Number.parseInt(process.env.JUDGE_TIMEOUT_MS || '', 10) || 120000;
const prompt = fs.readFileSync(promptPath, 'utf8');

let res;
try {
  res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
} catch (err) {
  if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    console.error('judge: request timed out after ' + Math.round(timeoutMs / 1000) + 's');
    process.exit(1);
  }
  throw err;
}

if (!res.ok) {
  console.error('judge: HTTP ' + res.status + ' ' + (await res.text()).slice(0, 2000));
  process.exit(1);
}

const data = await res.json();
const message =
  data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message
    : undefined;

const content = message && typeof message.content === 'string' ? message.content : '';
const reasoning =
  message && typeof message.reasoning === 'string' && message.reasoning.trim()
    ? message.reasoning
    : message && typeof message.reasoning_content === 'string' && message.reasoning_content.trim()
      ? message.reasoning_content
      : '';

if (content.trim()) {
  const review = content.trim();
  if (isReview(review)) {
    process.stdout.write(review + '\n');
  } else {
    const missing = REQUIRED_MARKERS.filter(m => !review.includes(m));
    console.error(
      'judge: content is not a review (length ' +
        review.length +
        '; missing markers: ' +
        (missing.length ? missing.join(', ') : 'none') +
        ')'
    );
    process.exit(1);
  }
} else if (reasoning.trim()) {
  console.error('judge: content was empty; reasoning is not a review (UNVERIFIED)');
  console.error(reasoning.trim());
  process.exit(1);
} else {
  console.error('judge: no content in response: ' + JSON.stringify(data).slice(0, 2000));
  process.exit(1);
}
