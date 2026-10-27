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
const SECTION_LABELS = ['CONFIRMED-BY-READING', 'UNVERIFIED', 'DISPROVEN'];
const MIN_SECTION_LENGTH = 20;

function isReview(text) {
  if (text.length < MIN_REVIEW_LENGTH) return false;
  return REQUIRED_MARKERS.every(m => text.includes(m));
}

// A single section is not a full review, so it is validated on its own terms:
// after trimming it must be at least MIN_SECTION_LENGTH characters long and
// contain at least one of the section labels. isReview is deliberately not used.
function isValidSection(text) {
  const t = text.trim();
  if (t.length < MIN_SECTION_LENGTH) return false;
  return SECTION_LABELS.some(l => t.includes(l));
}

// Names why a section answer is not usable: empty, too short, or missing label.
function sectionInvalidReason(text) {
  const t = (text || '').trim();
  if (!t) return 'empty';
  if (t.length < MIN_SECTION_LENGTH) return 'too short';
  return 'missing label';
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

// One corrective follow-up for section mode: replay the original prompt and the
// rejected section, then ask for a single labelled answer. Returns the corrected
// answer text (trimmed, non-empty) when one comes back, otherwise undefined.
// A single section is not a full review, so isReview is deliberately not used.
async function requestCorrectedSection(rejectedSection) {
  const messages = [
    { role: 'user', content: prompt },
    { role: 'assistant', content: rejectedSection },
    {
      role: 'user',
      content:
        'Your previous answer was not usable. Return a single labelled answer to the ' +
        'one question asked, using exactly one of CONFIRMED-BY-READING, UNVERIFIED, ' +
        'or DISPROVEN. The answer must be at least 20 characters and must not contain ' +
        'XML tags or wrapper elements.',
    },
  ];

  let res;
  try {
    res = await postChat(messages);
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      console.error(
        'judge: corrective section request timed out after ' + Math.round(timeoutMs / 1000) + 's'
      );
    } else {
      console.error(
        'judge: corrective section request failed: ' + (err && err.message ? err.message : err)
      );
    }
    return undefined;
  }

  if (!res.ok) {
    console.error(
      'judge: corrective section request HTTP ' +
        res.status +
        ' ' +
        (await res.text()).slice(0, 2000)
    );
    return undefined;
  }

  const data = await res.json();
  const { content } = parseMessage(data);
  const corrected = content.trim();
  if (corrected) {
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

// Section mode: a single question is not a full review, so validate the answer
// against the section rules and print it verbatim, without running isReview.
// An invalid first answer (empty, too short, or missing a label) gets one
// corrective attempt; if that is also invalid, report the reason and fail.
// Reasoning is never passed as if it were an answer.
if (sectionMode) {
  const section = content.trim();
  if (isValidSection(section)) {
    process.stdout.write(section + '\n');
    process.exit(0);
  }
  const corrected = await requestCorrectedSection(section);
  if (corrected && isValidSection(corrected)) {
    process.stdout.write(corrected + '\n');
    process.exit(0);
  }
  console.error('judge: section answer is not usable (' + sectionInvalidReason(corrected) + ')');
  if (!section && reasoning.trim()) {
    console.error('judge: section returned reasoning but no answer');
    console.error(reasoning.trim());
  }
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
