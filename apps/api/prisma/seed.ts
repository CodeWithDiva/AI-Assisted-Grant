import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

interface SeedTemplate {
  name: string;
  description: string;
  sections: { title: string; instructions: string; wordLimit: number }[];
}

// Generic starter formats for the global template library (not tied to a specific funder).
const templates: SeedTemplate[] = [
  {
    name: 'Standard Foundation Grant',
    description: 'Common full-proposal format used by private and family foundations.',
    sections: [
      {
        title: 'Executive Summary',
        instructions: 'Summarize the request, amount, project and expected impact.',
        wordLimit: 250,
      },
      {
        title: 'Organization Background',
        instructions: 'Mission, history, programs and track record.',
        wordLimit: 400,
      },
      {
        title: 'Statement of Need',
        instructions: 'The problem, who is affected, and supporting evidence.',
        wordLimit: 500,
      },
      {
        title: 'Project Description & Activities',
        instructions: 'What you will do, how, where and for whom.',
        wordLimit: 750,
      },
      {
        title: 'Goals, Objectives & Outcomes',
        instructions: 'Measurable objectives and expected results.',
        wordLimit: 400,
      },
      {
        title: 'Evaluation Plan',
        instructions: 'How progress and success will be measured and reported.',
        wordLimit: 400,
      },
      {
        title: 'Budget & Budget Narrative',
        instructions: 'Major cost categories and why each is needed.',
        wordLimit: 400,
      },
      {
        title: 'Sustainability',
        instructions: 'How the work continues after the grant ends.',
        wordLimit: 300,
      },
    ],
  },
  {
    name: 'Letter of Inquiry (LOI)',
    description: 'Short pre-proposal letter many funders request before a full application.',
    sections: [
      {
        title: 'Introduction & Request',
        instructions: 'Who you are, the amount requested and the purpose.',
        wordLimit: 150,
      },
      {
        title: 'Organization Overview',
        instructions: 'Mission and relevant experience.',
        wordLimit: 200,
      },
      {
        title: 'Need & Project Summary',
        instructions: 'The problem and your proposed solution.',
        wordLimit: 300,
      },
      {
        title: 'Expected Outcomes',
        instructions: 'Key results the project will deliver.',
        wordLimit: 150,
      },
      {
        title: 'Budget Summary & Closing',
        instructions: 'Total budget, other funding sources and contact details.',
        wordLimit: 150,
      },
    ],
  },
  {
    name: 'Startup Innovation Grant',
    description: 'Format for innovation, accelerator and early-stage technology grants.',
    sections: [
      {
        title: 'Company Overview',
        instructions: 'Company stage, founders, traction to date.',
        wordLimit: 250,
      },
      {
        title: 'Problem & Market Opportunity',
        instructions: 'The problem, target customers and market size.',
        wordLimit: 400,
      },
      {
        title: 'Solution & Innovation',
        instructions: 'Your product and what is new or better about it.',
        wordLimit: 500,
      },
      {
        title: 'Business Model & Commercialization',
        instructions: 'How you make money and reach customers.',
        wordLimit: 400,
      },
      { title: 'Team', instructions: 'Key people and why they can deliver.', wordLimit: 300 },
      {
        title: 'Milestones & Timeline',
        instructions: 'Deliverables during the grant period.',
        wordLimit: 300,
      },
      { title: 'Use of Funds', instructions: 'How the grant money will be spent.', wordLimit: 300 },
      {
        title: 'Impact',
        instructions: 'Economic, social or environmental impact.',
        wordLimit: 250,
      },
    ],
  },
  {
    name: 'Government / Public Sector Grant',
    description: 'Detailed format typical of government and multilateral funding calls.',
    sections: [
      {
        title: 'Project Abstract',
        instructions: 'One-paragraph overview of the project.',
        wordLimit: 300,
      },
      {
        title: 'Eligibility & Organizational Capacity',
        instructions: 'Eligibility, registration, systems and past grants managed.',
        wordLimit: 500,
      },
      {
        title: 'Needs Assessment',
        instructions: 'Data-backed description of the need in the target area.',
        wordLimit: 600,
      },
      {
        title: 'Project Design & Work Plan',
        instructions: 'Activities, timeline, responsibilities and deliverables.',
        wordLimit: 1000,
      },
      {
        title: 'Performance Measures & Evaluation',
        instructions: 'Indicators, targets, data collection and reporting.',
        wordLimit: 500,
      },
      {
        title: 'Budget Justification',
        instructions: 'Line-item justification and cost-effectiveness.',
        wordLimit: 600,
      },
      {
        title: 'Partnerships',
        instructions: 'Partners, their roles and commitments.',
        wordLimit: 300,
      },
      {
        title: 'Sustainability Plan',
        instructions: 'Continuation of results beyond the funding period.',
        wordLimit: 300,
      },
    ],
  },
];

async function main() {
  for (const template of templates) {
    const existing = await prisma.funderTemplate.findFirst({
      where: { organizationId: null, name: template.name },
    });
    if (existing) continue;

    await prisma.funderTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        sections: {
          create: template.sections.map((section, index) => ({ ...section, order: index + 1 })),
        },
      },
    });
    console.log(`Seeded template: ${template.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
