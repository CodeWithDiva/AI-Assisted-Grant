// Loads a realistic demo workspace through the API, for client demos and screenshots.
//
//   node scripts/seed-demo.mjs [base-url]
//
// Creates (or reuses) demo@grantpilot.test / DemoPass2026 with one organization,
// a filled profile, a custom funder template, three proposals and four deadlines.
// The funder and organization are fictional.

const BASE = process.argv[2] ?? 'http://localhost:4000/api/v1';
const EMAIL = 'demo@grantpilot.test';
const PASSWORD = 'DemoPass2026';
let cookie = '';

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length) {
    cookie = setCookies.map((value) => value.split(';')[0]).join('; ');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return data;
}

const daysFromNow = (days) => new Date(Date.now() + days * 864e5).toISOString();

async function main() {
  try {
    await call('POST', '/auth/register', {
      name: 'Ayesha Malik',
      email: EMAIL,
      password: PASSWORD,
    });
    console.log('Created demo user');
  } catch {
    await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    console.log('Signed in as existing demo user');
  }

  const orgs = await call('GET', '/orgs');
  let org = orgs.find((item) => item.name === 'Roshni Education Trust');
  if (org) {
    console.log('Demo organization already exists — nothing to do.');
    return;
  }

  org = await call('POST', '/orgs', {
    name: 'Roshni Education Trust',
    type: 'NONPROFIT',
    country: 'Pakistan',
    website: 'https://roshni.example.org',
  });

  await call('PUT', `/orgs/${org.id}/profile`, {
    mission:
      'Roshni Education Trust keeps girls in rural Sindh in school through community classrooms, scholarships and teacher training.',
    vision: 'Every girl in rural Sindh completes secondary school.',
    beneficiaries:
      'Girls aged 6–16 in 14 villages of Thatta and Sujawal districts; 1,180 students enrolled in 2025.',
    teamSummary:
      'Twelve full-time staff led by founder Ayesha Malik (16 years in education programmes), 38 community teachers, and a volunteer board of five.',
    annualBudget: 185000,
    currency: 'USD',
    programs: [
      {
        name: 'Community classrooms',
        description:
          'Twenty-two single-room schools run in donated village spaces, taught by women recruited from the same villages.',
      },
      {
        name: 'Scholarships for secondary school',
        description:
          'Fees, uniforms and transport for girls moving to government secondary schools; 94% retention in 2025.',
      },
      {
        name: 'Teacher training',
        description:
          'A twelve-week certificate in early-grade literacy and numeracy, delivered with the district education office.',
      },
    ],
  });

  const template = await call('POST', `/orgs/${org.id}/templates`, {
    name: 'Rural Education Grants 2027',
    funderName: 'Indus Learning Fund',
    description: 'Two-year grants of 40,000–120,000 USD for girls’ education in rural South Asia.',
    eligibility: [
      'Registered nonprofit with at least three years of audited accounts',
      'Programmes delivered in rural districts of Pakistan, India or Bangladesh',
      'At least 60% of beneficiaries are girls',
    ],
    evaluationCriteria: [
      { name: 'Evidence of need', weight: 25, description: 'Local data on enrolment and drop-out' },
      {
        name: 'Programme design',
        weight: 30,
        description: 'Clear activities, timeline and staffing',
      },
      {
        name: 'Measurable outcomes',
        weight: 25,
        description: 'Targets with a credible way to track them',
      },
      { name: 'Sustainability', weight: 20, description: 'How results continue after the grant' },
    ],
    amountMin: 40000,
    amountMax: 120000,
    currency: 'USD',
    sections: [
      {
        title: 'Executive summary',
        instructions: 'The request, the programme and the expected change.',
        wordLimit: 250,
        required: true,
      },
      {
        title: 'Statement of need',
        instructions: 'Local evidence of the problem, with sources.',
        wordLimit: 400,
        required: true,
      },
      {
        title: 'Programme design',
        instructions: 'Activities, timeline, staffing and partners.',
        wordLimit: 600,
        required: true,
      },
      {
        title: 'Outcomes and measurement',
        instructions: 'Targets for each year and how they will be tracked.',
        wordLimit: 350,
        required: true,
      },
      {
        title: 'Budget narrative',
        instructions: 'Main cost lines and why each is needed.',
        wordLimit: 300,
        required: true,
      },
      {
        title: 'Sustainability',
        instructions: 'How the programme continues after the grant.',
        wordLimit: 250,
        required: true,
      },
    ],
  });

  const main = await call('POST', `/orgs/${org.id}/proposals`, {
    templateId: template.id,
    title: 'Keeping girls in school — Thatta & Sujawal, 2027–28',
    requestedAmount: 96000,
  });

  const texts = [
    'Roshni Education Trust requests 96,000 USD over two years to expand its community classrooms from 22 to 30 villages in Thatta and Sujawal, and to carry 400 more girls through the move to secondary school.\n\nSince 2019 the Trust has enrolled 1,180 girls, 94% of whom stayed in school through 2025. The grant funds eight new classrooms, 240 secondary-school scholarships, and a second cohort of community teachers trained with the district education office.',
    'In Thatta district, fewer than one in three girls who finish primary school enrol in secondary school. The nearest government secondary school is more than five kilometres from 11 of the 14 villages the Trust serves, and families cite transport and fees as the main reasons daughters leave.\n\n[NEEDS INPUT: 2024 district enrolment figures and source]',
    'The programme runs in three strands over 24 months. Eight community classrooms open in the first six months, each in a donated village space and taught by a woman from the same village.',
  ];
  for (const [index, text] of texts.entries()) {
    await call(
      'PATCH',
      `/orgs/${org.id}/proposals/${main.id}/sections/${main.sections[index].id}`,
      { text },
    );
  }

  const library = (await call('GET', `/orgs/${org.id}/templates`)).find((item) => item.isLibrary);
  const loi = await call('POST', `/orgs/${org.id}/proposals`, {
    templateId: library.id,
    title: 'Teacher training certificate — letter of inquiry',
    requestedAmount: 35000,
  });
  await call('PATCH', `/orgs/${org.id}/proposals/${loi.id}`, { status: 'SUBMITTED' });

  const past = await call('POST', `/orgs/${org.id}/proposals`, {
    templateId: template.id,
    title: 'Scholarship fund renewal 2026',
    requestedAmount: 60000,
  });
  await call('PATCH', `/orgs/${org.id}/proposals/${past.id}`, { status: 'AWARDED' });

  await call('POST', `/orgs/${org.id}/deadlines`, {
    title: 'Full proposal — Indus Learning Fund',
    type: 'FULL_PROPOSAL',
    dueAt: daysFromNow(5),
    proposalId: main.id,
  });
  await call('POST', `/orgs/${org.id}/deadlines`, {
    title: 'Interim report — scholarship fund',
    type: 'REPORT',
    dueAt: daysFromNow(-2),
    proposalId: past.id,
  });
  await call('POST', `/orgs/${org.id}/deadlines`, {
    title: 'Letter of inquiry follow-up call',
    type: 'OTHER',
    dueAt: daysFromNow(19),
    proposalId: loi.id,
  });
  await call('POST', `/orgs/${org.id}/deadlines`, {
    title: 'Annual narrative report',
    type: 'REPORT',
    dueAt: daysFromNow(74),
  });

  console.log(`Demo workspace ready. Sign in with ${EMAIL} / ${PASSWORD}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
