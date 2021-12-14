'use strict';
const { test, before } = use('Test/Suite')('Sendout Messaging Helper');
const SendoutMessagingHelper = use('App/Helpers/SendoutMessagingHelper');

const recruiterJohn = { full_name: 'John Doe' };
const coachJane = { full_name: 'Jane Doe' };
const recruiterSteve = { full_name: 'Steve Foe' };
const coachStella = { full_name: 'Stella Foe' };

const teamJane = {
  recruiter: recruiterJohn,
  coach: coachJane,
};

const teamStella = {
  recruiter: recruiterSteve,
  coach: coachStella,
};

const coachAsRecruiter = {
  recruiter: coachJane,
  coach: coachJane,
};

let messagingHelper = null;
before(() => {
  messagingHelper = new SendoutMessagingHelper();
});

test('should return empty if there are no sendouts', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({ total: 0, joborderAccountable: teamJane, candidateAccountable: teamStella }),
    ''
  );
});

test('should return right message if there is split in a sendout', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({ total: 1, joborderAccountable: teamJane, candidateAccountable: teamStella }),
    '1 John Doe / Jane Doe - Steve Foe / Stella Foe'
  );
});

test('should return right message if the accountables are the same', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({
      total: 1,
      joborderAccountable: teamJane,
      candidateAccountable: teamJane,
      isTheSame: true,
    }),
    '1 John Doe / Jane Doe'
  );
});

test('should return right message if a coach is accountable and there is a split', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({
      total: 1,
      joborderAccountable: coachAsRecruiter,
      candidateAccountable: teamStella,
      isTheSame: false,
    }),
    '1 Jane Doe - Steve Foe / Stella Foe'
  );
});

test('should return right message if a coach is accountable and no split', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({
      total: 1,
      joborderAccountable: coachAsRecruiter,
      candidateAccountable: coachAsRecruiter,
      isTheSame: true,
    }),
    '1 Jane Doe'
  );
});

test('should return right message if recruiters dont have coach', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({
      total: 1,
      joborderAccountable: { recruiter: recruiterJohn, coach: {} },
      candidateAccountable: { recruiter: recruiterSteve, coach: {} },
    }),
    '1 John Doe - Steve Foe'
  );
});

test('should return right message if only coaches are available', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({
      total: 1,
      joborderAccountable: { recruiter: {}, coach: coachJane },
      candidateAccountable: { recruiter: {}, coach: coachStella },
    }),
    '1 Jane Doe - Stella Foe'
  );
});

test('should return empty if no full names', async ({ assert }) => {
  assert.equal(
    messagingHelper.getGlipMessage({
      total: 1,
      joborderAccountable: { recruiter: {}, coach: {} },
      candidateAccountable: { recruiter: {}, coach: {} },
    }),
    ''
  );
});
