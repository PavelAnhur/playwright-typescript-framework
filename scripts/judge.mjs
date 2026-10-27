// Minimal chat-completions client for the judge step. ASCII source only.
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

const REQUIRED_MARKERS = ['## 1.', '## 2.', '## 3.', '## 4.'];
const MIN_REVIEW_LENGTH = 350;

function isReview(text) {
  if (text.length < MIN_REVIEW_LENGTH) return false;
  return REQUIRED_MARKERS.every(m => text.includes(m));
}

const sectionMode = process.argv.includes('--section');
const promptPath = process.argv.slice(2).find(a => a !== '--section');
if (!promptPath) {
  console.error('usage: node scripts/judge.mjs <prompt-file> [--section]');
  process.exit(2);
}

const key = process.env.DSH_API_KEY || envFromFile('.env.local', 'DSH_API_KEY');
if (!key) {
  console.error('judge: DSH_API_KEY not set and not found in .env.local');
  process.exit(2);
}

const base = (process.env.AIAI_BASE_URL || 'https://api.aiai.by/v1').replace(/\/$/, '');
const model = process.env.JUDGE_MODEL || 'deepseek-v4-flash';
const timeoutMs = Number.parseInt(process.env.JUDGE_TIMEOUT_MS || '', 10) || 300000;
const prompt = fs.readFileSync(promptPath, 'utf8');

async function postChat(messages) {
  return fetch(base + '/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function parseMessage(data) {
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

  return { content, reasoning };
}

// One corrective follow-up: replay the original prompt and the rejected answer,
// then ask for the same review with the required headings. Returns the corrected
// review text when it passes isReview, otherwise undefined.
async function requestCorrectedReview(rejectedReview) {
  const messages = [
    { role: 'user', content: prompt },
    { role: 'assistant', content: rejectedReview },
    {
      role: 'user',
      content:
        'Your answer did not contain the required "## 1." through "## 4." sections. ' +
        'Return the review again, with each answer under its own heading, exactly ' +
        '"## 1." through "## 4.", one heading before each question, in order.',
    },
  ];

  let res;
  try {
    res = await postChat(messages);
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      console.error(
        'judge: corrective request timed out after ' + Math.round(timeoutMs / 1000) + 's'
      );
    } else {
      console.error(
        'judge: corrective request failed: ' + (err && err.message ? err.message : err)
      );
    }
    return undefined;
  }

  if (!res.ok) {
    console.error(
      'judge: corrective request HTTP ' + res.status + ' ' + (await res.text()).slice(0, 2000)
    );
    return undefined;
  }

  const data = await res.json();
  const { content } = parseMessage(data);
  const corrected = content.trim();
  if (corrected && isReview(corrected)) {
    return corrected;
  }
  return undefined;
}

let res;
try {
  res = await postChat([{ role: 'user', content: prompt }]);
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
const { content, reasoning } = parseMessage(data);

// Section mode: a single question is not a full review, so print the model's
// content verbatim and exit 0 without running isReview or the corrective pass.
// An empty content is not a usable answer: if the model returned only reasoning,
// report that and fail rather than exiting 0 with nothing.
if (sectionMode) {
  const section = content.trim();
  if (section) {
    process.stdout.write(section + '\n');
    process.exit(0);
  }
  if (reasoning.trim()) {
    console.error('judge: section returned reasoning but no answer');
    console.error(reasoning.trim());
    process.exit(1);
  }
  console.error('judge: section returned no content: ' + JSON.stringify(data).slice(0, 2000));
  process.exit(1);
}

if (content.trim()) {
  const review = content.trim();
  if (isReview(review)) {
    process.stdout.write(review + '\n');
  } else {
    const corrected = await requestCorrectedReview(review);
    if (corrected) {
      process.stdout.write(corrected + '\n');
    } else {
      const missing = REQUIRED_MARKERS.filter(m => !review.includes(m));
      try {
        fs.mkdirSync('.judge', { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const rejectedPath = '.judge/rejected-' + ts + '.md';
        fs.writeFileSync(rejectedPath, review + '\n');
        console.error('judge: rejected content saved to ' + rejectedPath);
      } catch (err) {
        console.error(
          'judge: could not save rejected content: ' + (err && err.message ? err.message : err)
        );
      }
      console.error(
        'judge: content is not a review (length ' +
          review.length +
          '; missing markers: ' +
          (missing.length ? missing.join(', ') : 'none') +
          ')'
      );
      process.exit(1);
    }
  }
} else if (reasoning.trim()) {
  console.error('judge: content was empty; reasoning is not a review (UNVERIFIED)');
  console.error(reasoning.trim());
  process.exit(1);
} else {
  console.error('judge: no content in response: ' + JSON.stringify(data).slice(0, 2000));
  process.exit(1);
}
