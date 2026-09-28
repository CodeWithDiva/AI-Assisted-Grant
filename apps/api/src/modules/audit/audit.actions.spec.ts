import { describe, expect, it } from 'vitest';
import { actionFor, detailsOf } from './audit.actions';

describe('actionFor', () => {
  it('names the handlers worth recording', () => {
    expect(actionFor('ProposalsController', 'create')).toBe('proposal.created');
    expect(actionFor('OrganizationsController', 'updateMemberRole')).toBe('member.role_changed');
  });

  it('ignores reads, downloads and anything unmapped', () => {
    expect(actionFor('ProposalsController', 'list')).toBeNull();
    expect(actionFor('ExportsController', 'download')).toBeNull();
    expect(actionFor('HealthController', 'check')).toBeNull();
  });
});

describe('detailsOf', () => {
  it('keeps names and states, and takes the id from the answer', () => {
    const { entityId, metadata } = detailsOf(
      {
        id: 'prop_1',
        title: 'Girls in school',
        status: 'SUBMITTED',
        sections: [{ text: 'secret' }],
      },
      { proposalId: 'prop_1' },
    );
    expect(entityId).toBe('prop_1');
    expect(metadata).toEqual({ title: 'Girls in school', status: 'SUBMITTED' });
  });

  it('falls back to the id in the URL when nothing is returned', () => {
    expect(detailsOf(undefined, { deadlineId: 'dl_9' })).toEqual({
      entityId: 'dl_9',
      metadata: {},
    });
  });

  it('never carries proposal text through', () => {
    const { metadata } = detailsOf({ text: 'confidential draft', body: 'also long' }, {});
    expect(metadata).toEqual({});
  });
});
