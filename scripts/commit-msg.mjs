// Minimal chat-completions client for commit message generation. ASCII source only.
// Reads the prompt from stdin and writes the model message text to stdout.
// Env: DSH_API_KEY (falls back to .env.local), AIAI_BASE_URL, COMMIT_MODEL, JUDGE_MODEL.
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

const key = process.env.DSH_API_KEY || envFromFile('.env.local', 'DSH_API_KEY');
if (!key) {
  console.error('commit-msg: DSH_API_KEY not set and not found in .env.local');
  process.exit(2);
}

const base = (process.env.AIAI_BASE_URL || 'https://api.aiai.by/v1').replace(/\/$/, '');
const model = process.env.COMMIT_MODEL || process.env.JUDGE_MODEL || 'deepseek-v3.2';
const prompt = fs.readFileSync(0, 'utf8');

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
  console.error('commit-msg: HTTP ' + res.status + ' ' + (await res.text()).slice(0, 2000));
  process.exit(1);
}

const data = await res.json();
const text =
  data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : undefined;

if (!text) {
  console.error('commit-msg: no content in response: ' + JSON.stringify(data).slice(0, 2000));
  process.exit(1);
}

process.stdout.write(text.trim() + '\n');
