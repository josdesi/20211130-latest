const  { userFields } = use('App/Helpers/Globals');
const {  findKey } = use('lodash');

const placementStatus = {
  Pending_Coach_Validation:{
    _id: 1,
    _title: 'Pending Coach Validation',
    _style: '#B00020'
  },
  Pending_Update: {
    _id: 2,
    _title: 'Pending Update',
    _style: '#F39C12'
  },
  Pending_To_Invoiced: {
    _id: 3,
    _title: 'Pending to be Invoiced',
    _style: '#A9CE10'
  },
  Invoiced: {
    _id: 4,
    _title: 'Invoiced',
    _style: '#27AE60'
  },
  FallOff: {
    _id: 5,
    _title: 'Fall Off Completed',
    _style: '#525764'
  },
  Pending_Regional_Validation: {
    _id: 6,
    _title: 'Pending Regional Validation',
    _style: '#EB0000AF'
  },
  Pending_To_FallOff: {
    _id: 7,
    _title: 'Fall Off Requested',
    _style: '#8FA9CB'
  },
  Pending_To_Revert_FallOff: {
    _id: 8,
    _title: 'Revert Fall Off Requested',
    _style: '#4056F4'
  },
}

const placementReasonsToFallOff = [
  {
    id: 1,
    title: 'Counter offer accepted.',
    order: 1
  },
  {
    id: 2,
    title: 'Candidate background verification failed.',
    order: 2
  },
  {
    id: 3,
    title: "Candidate didn't show up for work.",
    order: 3
  },
  {
    id: 4,
    title: 'Candidate performance issues.',
    order: 4
  },
  {
    id: 5,
    title: "The company doesn't require the position anymore.",
    order: 5
  },
  {
    id: 6,
    title: 'The company is not able to hire new employees.',
    order: 6
  },
  {
    id: 7,
    title: 'Other.',
    order: 7
  }
]

//Only For email
const adjustmentsToShow = [
  {
    title:'Fee Percent',
    field:'fee_percentage',
    format: 'percentage'
  },
  {
    title:'Fee Amount',
    field:'fee_amount',
    format: 'currency'
  },
  {
    title:'Start Date',
    field:'start_date',
    format: 'date'
  },
  {
    title:'Service Months',
    field:'service_months',
    format: 'number'
  },
  {
    title:'Guarantee Days',
    field:'guarantee_days',
    format: 'number'
  }
]

const placementEmailTemplates = {
  PlacementOnRecruiterCreation: {
    template_id: 'd-9a93c80739184c748ef172f24bcaf44a',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnRecruiterCreation'
  },
  PlacementOnCoachCreation: {
    template_id: 'd-9ff0b3900b0846d984bc2db9b6c64b19',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnCoachCreation'
  },
  PlacementOnRegionalCreation: {
    template_id: 'd-524e50ffac73416d9db1dd3106a10202',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnRegionalCreation'
  },
  PlacementOnRequestedUpdate: {
    template_id: 'd-2a3084e484614d84be80afdab0002fee',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnRequestedUpdate'
  },
  PlacementOnUpdatedRequest: {
    template_id: 'd-e4e5919d3aa640408f6fedb07463226f',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnUpdatedRequest'
  },
  PlacementOnRegionalApproval: {
    template_id: 'd-7d1b9cc4eace4e28afd67c3cd9147acd',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnRegionalApproval'
  },
  PlacementRecruiterRevertFallOffEmail: {
    template_id: 'd-e1b4061e96e843168e81f62b2dbb36b6',
    sender: 'notifications@gogpac.com',
    type:'PlacementRecruiterRevertFallOffEmail'
  },
  PlacementRecruiterAdjustmentEmail: {
    template_id: 'd-0cf55f2727a04d70af3b15cdcbfaa7e1',
    sender: 'notifications@gogpac.com',
    type:'PlacementRecruiterAdjustmentEmail'
  },
  PlacementOnCoachApproval: {
    template_id: 'd-c79a7aa6ece341d8825e9e8d027a80f2',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnCoachApproval'
  },
  PlacementOnPaymentAdded: {
    template_id: 'd-0e305f31d1ad435ebbb73392802a5868',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnPaymentAdded'
  },
  PlacementOnInvoiceAdded: {
    template_id: 'd-599f297dcb504497ade796ba9bebd2c7',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnInvoiceAdded'
  },
  PlacementOnFallOffRequest: {
    template_id: 'd-c6b9fb5408e94938bdb280bb6492f666',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnFallOffRequest'
  },
  PlacementOnFallOffCompleted: {
    template_id: 'd-ef56bc35f5dc462b8b529a20efc867fd',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnFallOffCompleted'
  },
  PlacementOnRevertFallOffRequest: {
    template_id: 'd-1bfaceadbab0454bab193bc288aee67c',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnRevertFallOffRequest'
  },
  PlacementOnRevertFallOffCompleted: {
    template_id: 'd-1f553a4b6c674e68aeb76ad0dcc9d164',
    sender: 'notifications@gogpac.com',
    type:'PlacementOnRevertFallOffCompleted'
  },
}

const profileDefaultRelations = [
  {
    relation: 'paymentScheme',
  },
  {
    relation: 'splits',
    hideFields: { fields: ['placement_id'] },
    load: [
      {
        relation: 'user',
        hideFields: { fields: [...userFields, 'job_title'] },
        load: [
          {
            relation: 'personalInformation',
            extend: [
              {
                method: 'select',
                params: ['id', 'full_name'],
              },
            ],
          },
        ],
      },
      {
        relation: 'channelPartner',
        load: [
          {
            relation: 'referralUser',
            hideFields: { fields: [...userFields, 'job_title'] },
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    relation: 'files',
    hideFields: { hideAuditFields: false },
    load: [
      {
        relation: 'fileType',
      },
    ],
  },
  {
    relation: 'suggestedUpdates',
    hideFields: { hideAuditFields: false },
    load: [
      {
        relation: 'user',
        hideFields: { fields: [...userFields, 'job_title'] },
        load: [
          {
            relation: 'personalInformation',
            extend: [
              {
                method: 'select',
                params: ['id', 'full_name'],
              },
            ],
          },
        ],
      },
    ],
    extend: [
      {
        method: 'orderBy',
        params: ['created_at', 'desc'],
      },
    ],
  },
];

const summaryColumns = [
  {
    key: 'production_totals',
    rows: [
      {
        key: 'total',
        type: 'normal',
        label: 'Total Placements',
        style: {
          formatter: 'bold',
        },
      },
      {
        key: findKey(placementStatus, { _id: placementStatus.Pending_Coach_Validation._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
      {
        key: findKey(placementStatus, { _id: placementStatus.Pending_Regional_Validation._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
    ],
  },

  {
    key: 'validation_totals',
    rows: [
      {
        key: findKey(placementStatus, { _id: placementStatus.Pending_Update._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
      {
        key: findKey(placementStatus, { _id: placementStatus.Pending_To_Invoiced._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
      {
        key: findKey(placementStatus, { _id: placementStatus.Invoiced._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
    ],
  },

  {
    key: 'finance_totals',
    rows: [
      {
        key: findKey(placementStatus, { _id: placementStatus.Pending_To_FallOff._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
      {
        key: findKey(placementStatus, { _id: placementStatus.FallOff._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
      {
        key: findKey(placementStatus, { _id: placementStatus.Pending_To_Revert_FallOff._id }),
        type: 'status',
        style: {
          formatter: 'bold',
        },
      },
    ],
  },
];

module.exports = {
  placementReasonsToFallOff,
  placementStatus,
  adjustmentsToShow,
  placementEmailTemplates,
  profileDefaultRelations,
  summaryColumns
};