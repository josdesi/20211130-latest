const flatten = use('flat');

const loading = {
  bulkemail: {
    creation: {
      Start: 'Nice! Your bulk email reached our servers',
      ValidatingCandidates: 'Validating the candidates being marketed',
      ValidatingJobOrder: 'Validating the job order for the recruiting',
      ValidatingSender: 'Validating the sender',
      ValidatingSearchProject: 'Validating the search project',
      ValidatingTemplate: 'Validating the bulk template',
      ValidationEnd: 'Bulk passed the initial validation',
      CreatingBulk: 'Creating the bulk email',
      BulkCreated: 'Bulk Created',
      SendingBulk: 'Sending the bulk email',
      BulkSent: 'Bulk sent!',
      End: 'Amazing! Your bulk was created & sent successfully!',
    },
  },
};

module.exports = flatten(loading);
