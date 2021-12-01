'use strict';

const types = Object.freeze({
  BLUESHEET: {
    _id: 1,
    _module: 'inventory',
    _title:'Blue Sheet',
    _required: false,
    _order: null,
    _multiple: false
  },
  WHITESHEET: {
    _id: 2,
    _module: 'inventory',
    _title:'White Sheet',
    _required: false,
    _order: null,
    _multiple: false
  },
  FEEAGREEMENT: {
    _id: 3,
    _module: 'inventory',
    _title:'Fee Agreement',
    _required: false,
    _order: null,
    _multiple: false
  },
  RESUME: {
    _id: 4,
    _module: 'inventory',
    _title:'Resume',
    _required: false,
    _order: null,
    _multiple: false
  },
  ATTACHMENT: {
    _id: 5,
    _module: 'inventory',
    _title:'Attachment',
    _required: false,
    _order: null,
    _multiple: false
  },
  CANDIDATE_DATA_SHEET: {
    _id: 6,
    _module: 'placement',
    _title:'Candidate Data Sheet',
    _required: true,
    _order: 3, 
    _multiple: true
  },
  REFERENCES: {
    _id: 7,
    _module: 'placement',
    _title:'References',
    _required: true,
    _order: 6,
    _multiple: true
  },
  OFFER_LETTER: {
    _id: 8,
    _module: 'placement',
    _title:'Offer Letter',
    _required: false,
    _order: 8,
    _multiple: true
  },
  REFERENCE_RELEASE_EMAIL: {
    _id: 9,
    _module: 'placement',
    _title:'Reference Release Email',
    _required: false,
    _order: 5,
    _multiple: true
  },
  CANDIDATE_RESUME: {
    _id: 10,
    _module: 'placement',
    _title:'Candidate Resume',
    _required: true,
    _order: 4,
    _multiple: true
  },
  ASSIGNMENT_SHEET: {
    _id: 11,
    _module: 'placement',
    _title:'Assignment Data Sheet',
    _required: true,
    _order: 2,
    _multiple: true
  },
  CANDIDATE_DEBRIEF: {
    _id: 12,
    _module: 'placement',
    _title:'Candidate Debrief',
    _required: true,
    _order: 6,
    _multiple: true
  },
  EMPLOYER_DEBRIEF: {
    _id: 13,
    _module: 'placement',
    _title:'Employer Debrief',
    _required: true,
    _order: 7,
    _multiple: true
  },
  PlACEMENT_FEE: {
    _id: 14,
    _module: 'placement',
    _title:'Company Fee Agreement',
    _required: true,
    _order: 1,
    _multiple: true
  }
});
/**
 *
 * @param {*} option
 */
const fileType = (option) => {
  return types[option] && types[option]._id;
};

module.exports = {
  fileType,
  types
};
