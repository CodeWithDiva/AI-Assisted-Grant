// Exercises every AI feature once against a running API, with the real Anthropic key.
// Run it after setting up the AI provider (see .env.example), before a demo, and after changing a prompt.
//
//   node scripts/seed-demo.mjs          # once, creates the demo workspace
//   node scripts/ai-check.mjs [base-url] [--keep]
//
// Steps: RFP extraction → section draft (streamed) → refine → compliance → fit score.
// Everything it creates is deleted at the end unless --keep is passed.
// The funder call below is fictional.

const args = process.argv.slice(2);
const BASE = args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:4000/api/v1';
const KEEP = args.includes('--keep');
const EMAIL = 'demo@grantpilot.test';
const PASSWORD = 'DemoPass2026';
const DEMO_ORG = 'Roshni Education Trust';

const SAMPLE_RFP = `Northbridge Learning Fund — Call for Proposals 2027
Programme: Rural Girls' Secondary Education

The Northbridge Learning Fund invites registered non-profit organizations in South Asia to apply
for grants of USD 40,000 to USD 120,000 for projects of 12 to 24 months that increase secondary
school completion among girls in rural districts.

Eligibility
- Registered non-profit with at least three years of operating history
- Audited financial statements for the last two years
- Programmes delivered directly in rural communities

Proposal sections
1. Executive summary (maximum 300 words)
2. Problem statement (maximum 500 words)
3. Project design and activities (maximum 800 words)
4. Monitoring and evaluation (maximum 400 words)
5. Budget narrative (maximum 400 words)

Evaluation criteria
- Relevance and need: 30%
- Quality of project design: 30%
- Organizational capacity: 20%
- Value for money: 20%

Deadlines
Concept note due 15 January 2027. Full proposal due 1 March 2027.
`;

let cookie = '';
const created = { documentId: null, proposalId: null };
const results = [];

async function request(method, path, body, { raw = false } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length) cookie = setCookies.map((value) => value.split(';')[0]).join('; ');
  if (raw) {
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
    return res;
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Reads a server-sent event stream; returns the `done` payload and the streamed text. */
async function stream(path, body) {
  const res = await request('POST', path, body, { raw: true });
  const decoder = new TextDecoder();
  let buffer = '';
  let streamed = '';
  let deltas = 0;
  let done = null;

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (!event || data === undefined) continue;
      const payload = JSON.parse(data);
      if (event === 'delta') {
        streamed += payload.text;
        deltas += 1;
        if (deltas === 1) process.stdout.write('    ');
        if (deltas % 10 === 0) process.stdout.write('.');
      } else if (event === 'done') {
        done = payload;
      } else if (event === 'error') {
        throw new Error(payload.message);
      }
    }
  }
  if (deltas) process.stdout.write('\n');
  if (!done) throw new Error('The stream ended without a done event');
  return { done, streamed, deltas };
}

async function step(name, run) {
  const started = Date.now();
  process.stdout.write(`\n▸ ${name}\n`);
  try {
    const detail = await run();
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    results.push({ name, ok: true, seconds });
    console.log(`  ✓ ${seconds}s${detail ? ` — ${detail}` : ''}`);
    return true;
  } catch (error) {
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    results.push({ name, ok: false, seconds });
    console.log(`  ✗ ${seconds}s — ${error.message}`);
    return false;
  }
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

async function main() {
  const health = await request('GET', '/health').catch((error) => {
    throw new Error(
      `The API is not reachable at ${BASE} (${error.message}). Start it with pnpm dev.`,
    );
  });
  if (health.ai !== 'configured') {
    throw new Error(
      'No AI provider is set up on the API. Set AI_PROVIDER and AI_API_KEY in apps/api/.env and restart the API.',
    );
  }

  await request('POST', '/auth/login', { email: EMAIL, password: PASSWORD }).catch(() => {
    throw new Error('The demo user does not exist yet. Run: node scripts/seed-demo.mjs');
  });
  const org = (await request('GET', '/orgs')).find((item) => item.name === DEMO_ORG);
  check(org, `Organization "${DEMO_ORG}" not found. Run: node scripts/seed-demo.mjs`);
  const orgPath = `/orgs/${org.id}`;
  console.log(
    `API ${health.version} at ${BASE}, AI ${health.aiProvider}, organization "${org.name}"`,
  );

  await step('RFP extraction', async () => {
    const form = new FormData();
    form.append('kind', 'RFP');
    form.append(
      'file',
      new Blob([SAMPLE_RFP], { type: 'text/plain' }),
      'ai-check-northbridge-rfp.txt',
    );
    const document = await request('POST', `${orgPath}/documents`, form);
    created.documentId = document.id;

    const template = await request('POST', `${orgPath}/templates/extract`, {
      documentId: document.id,
    });
    check(template.sections.length >= 4, `expected 5 sections, got ${template.sections.length}`);
    check(
      template.sections.some((section) => section.wordLimit === 300),
      'the 300-word limit on the executive summary was not read',
    );
    check(template.evaluationCriteria.length >= 3, 'evaluation criteria were not read');
    check(template.amountMax === 120000, `expected amountMax 120000, got ${template.amountMax}`);
    return `${template.funderName}: ${template.sections.length} sections, ${template.evaluationCriteria.length} criteria, ${template.deadlines.length} deadlines`;
  });

  const templates = await request('GET', `${orgPath}/templates`);
  const template = templates.find((item) => !item.isLibrary) ?? templates[0];
  check(template, 'No template available to draft against');
  const proposal = await request('POST', `${orgPath}/proposals`, {
    templateId: template.id,
    title: `AI check ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  });
  created.proposalId = proposal.id;
  const section = proposal.sections[0];
  const sectionPath = `${orgPath}/proposals/${proposal.id}/sections/${section.id}`;
  let draftText = '';

  const drafted = await step(`Draft "${section.title}" (streamed)`, async () => {
    const { done, deltas } = await stream(`${sectionPath}/generate`, {});
    draftText = done.text;
    check(deltas > 1, 'the answer arrived in one piece instead of streaming');
    check(words(done.text) >= 40, `the draft is only ${words(done.text)} words`);
    if (section.wordLimit) {
      check(
        words(done.text) <= section.wordLimit * 1.1,
        `${words(done.text)} words is over the ${section.wordLimit}-word limit`,
      );
    }
    return `${words(done.text)} words in ${deltas} chunks`;
  });

  if (drafted) {
    await step('Refine: shorten', async () => {
      const { done } = await stream(`${sectionPath}/refine`, { action: 'SHORTEN' });
      check(
        words(done.text) < words(draftText),
        `not shorter (${words(draftText)} → ${words(done.text)} words)`,
      );
      return `${words(draftText)} → ${words(done.text)} words`;
    });
  }

  await step('Compliance review', async () => {
    const report = await request('POST', `${orgPath}/proposals/${proposal.id}/compliance`);
    check(typeof report.summary === 'string' && report.summary.length > 0, 'no summary');
    check(report.criteria.length > 0, 'no criteria were scored');
    for (const criterion of report.criteria) {
      check(
        criterion.score >= 0 && criterion.score <= criterion.maxScore,
        `score out of range for "${criterion.name}"`,
      );
    }
    return `${report.issues.length} issues, ${report.criteria.length} criteria scored`;
  });

  await step('Fit score', async () => {
    const fit = await request('POST', `${orgPath}/proposals/${proposal.id}/fit-score`);
    check(Number.isInteger(fit.score) && fit.score >= 0 && fit.score <= 100, 'score not 0-100');
    check(fit.reasons.length > 0, 'no reasons given');
    return `${fit.score}/100, ${fit.reasons.length} reasons, ${fit.gaps.length} gaps`;
  });
}

async function cleanUp() {
  if (KEEP) {
    console.log('\n--keep: the test proposal and RFP document were left in the demo workspace.');
    return;
  }
  const orgs = cookie ? await request('GET', '/orgs').catch(() => []) : [];
  const org = orgs.find((item) => item.name === DEMO_ORG);
  if (!org) return;
  if (created.proposalId) {
    await request('DELETE', `/orgs/${org.id}/proposals/${created.proposalId}`).catch(() => {});
  }
  if (created.documentId) {
    await request('DELETE', `/orgs/${org.id}/documents/${created.documentId}`).catch(() => {});
  }
}

try {
  await main();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  await cleanUp();
}

if (results.length) {
  const failed = results.filter((result) => !result.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} AI checks passed` +
      (failed.length ? ` — failed: ${failed.map((result) => result.name).join(', ')}` : ''),
  );
  if (failed.length) process.exitCode = 1;
}
