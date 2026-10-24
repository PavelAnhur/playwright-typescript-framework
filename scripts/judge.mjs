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
const prompt = fs.readFileSync(promptPath, 'utf8');

const res = await fetch(base + '/chat/completions', {
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
});

if (!res.ok) {
  console.error('judge: HTTP ' + res.status + ' ' + (await res.text()).slice(0, 2000));
  process.exit(1);
}

const data = await res.json();
const text =
  data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : undefined;

if (!text) {
  console.error('judge: no content in response: ' + JSON.stringify(data).slice(0, 2000));
  process.exit(1);
}
process.stdout.write(text.trim() + '\n');
