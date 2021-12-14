'use strict';
const { userFilters, SendoutStatusSchemes } = use('App/Helpers/Globals');
const { FeeAmountConditionalCopy } = use('App/Helpers/HotSheet/FeeAmountConditionalFilters');

class FeeAmountConditionalStub {
  users = {
    coach: {
      JossueHernandez: { userId: 668, initials: 'JDH' },
    },
    recruiter: {
      KevinVelazquez: { userId: 425, initials: 'K1V' },
      DianaAlonso: { userId: 390, initials: 'D1A' },
      JorgeFelix: { userId: 589, initials: 'JFC' },
      FortPacRegionalA: {userId:676, initials:'(FRA'},
      GhostCoach: {userId:678, initials:'GCHA'},
      GhostRecruiter1A: {userId:680, initials:'GR1A'},
      GhostRecruiter2A: {userId:684, initials:'GR2A'},
      AlienCoach: {userId:681, initials:'ACHA'},
      AlienRecruiter1A: {userId:683, initials:'AR1A'},
      AlienRecruiter2A: {userId:685, initials:'AR2A'},
      FortPacRegionalB: {userId:677, initials:'(FRB'},
      PhantomCoach: {userId:686, initials:'PCHB'},
      PhantomRecruiter1B: {userId:690, initials:'PR1B'},
      PhantomRecruiter2B: {userId:691, initials:'PR2B'},
      MonsterCoach: {userId:688, initials:'MCHB'},
      MonsterRecruiter1B: {userId:692, initials:'MR1B'},
      MonsterRecruiter2B: {userId:693, initials:'MR2B'}
    },
  };
  getUsers() {
    return this.users;
  }
  getFilterMetricsCountStub() {
    return [
      [
        { userFilter: userFilters.Mine },
        'My Sendouts',
        {
          metrics: { activeFees: '50000.00', normalMetric: '10000.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.recruiter,
        },
      ],
      [
        { userFilter: userFilters.MyTeam, statusIds: SendoutStatusSchemes.Placed },
        'My Team Sendouts in status Placed',
        {
          metrics: { activeFees: '0.00', normalMetric: '0.00', totalFees: '27500.00', averageFee: '6875.00' },
          copy: new FeeAmountConditionalCopy().copy.coach,
        },
      ],
      [
        {
          userFilter: userFilters.MyTeam,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: this.users.recruiter.KevinVelazquez.userId,
        },
        `My Team Sendouts, active status and single recruiter of my team (${this.users.recruiter.KevinVelazquez.initials})`,
        {
          metrics: { activeFees: '68549.00', normalMetric: '13709.80', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.coach,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.GhostRecruiter1A.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.GhostRecruiter1A.initials})`,
        {
          metrics: { activeFees: '258785.00', normalMetric: '51757.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],      
      [
        {
          userFilter: userFilters.All,
          statusIds: [SendoutStatusSchemes.Active,SendoutStatusSchemes.Placed],
          recruiterIds: [this.users.recruiter.GhostRecruiter1A.userId],
        },
        `All Sendouts, active and placed status and single recruiter (${this.users.recruiter.GhostRecruiter1A.initials})`,
        {
          metrics: { activeFees: '258785.00', normalMetric: '51757.00', totalFees: '63700.00', averageFee: '31850.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],      
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.GhostRecruiter2A.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.GhostRecruiter2A.initials})`,
        {
          metrics: { activeFees: '170940.00', normalMetric: '34188.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],    
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.GhostRecruiter1A.userId,this.users.recruiter.GhostRecruiter2A.userId],
        },
        `All Sendouts, active status and two recruiter (${this.users.recruiter.GhostRecruiter1A.initials}/${this.users.recruiter.GhostRecruiter2A.initials})`,
        {
          metrics: { activeFees: '429725.00', normalMetric: '85945.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.AlienRecruiter1A.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.AlienRecruiter1A.initials})`,
        {
          metrics: { activeFees: '221851.50', normalMetric: '44370.30', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],   
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.AlienRecruiter2A.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.AlienRecruiter2A.initials})`,
        {
          metrics: { activeFees: '39300.00', normalMetric: '7860.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.AlienRecruiter1A.userId,this.users.recruiter.AlienRecruiter2A.userId],
        },
        `All Sendouts, active status and two recruiter (${this.users.recruiter.AlienRecruiter1A.initials}/${this.users.recruiter.AlienRecruiter2A.initials})`,
        {
          metrics: { activeFees: '261151.50', normalMetric: '52230.30', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.GhostRecruiter1A.userId,this.users.recruiter.AlienRecruiter1A.userId],
        },
        `All Sendouts, active status and two recruiter (${this.users.recruiter.GhostRecruiter1A.initials}/${this.users.recruiter.AlienRecruiter1A.initials})`,
        {
          metrics: { activeFees: '480636.50', normalMetric: '96127.30', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.PhantomRecruiter1B.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.PhantomRecruiter1B.initials})`,
        {
          metrics: { activeFees: '222150.00', normalMetric: '44430.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.PhantomRecruiter2B.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.PhantomRecruiter2B.initials})`,
        {
          metrics: { activeFees: '254200.00', normalMetric: '50840.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.PhantomRecruiter1B.userId,this.users.recruiter.PhantomRecruiter2B.userId],
        },
        `All Sendouts, active status and two recruiter (${this.users.recruiter.PhantomRecruiter1B.initials}/${this.users.recruiter.PhantomRecruiter2B.initials})`,
        {
          metrics: { activeFees: '476350.00', normalMetric: '95270.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.MonsterRecruiter1B.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.MonsterRecruiter1B.initials})`,
        {
          metrics: { activeFees: '412250.00', normalMetric: '82450.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.MonsterRecruiter2B.userId],
        },
        `All Sendouts, active status and single recruiter (${this.users.recruiter.MonsterRecruiter2B.initials})`,
        {
          metrics: { activeFees: '79000.00', normalMetric: '15800.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
      [
        {
          userFilter: userFilters.All,
          statusIds: SendoutStatusSchemes.Active,
          recruiterIds: [this.users.recruiter.MonsterRecruiter1B.userId,this.users.recruiter.MonsterRecruiter2B.userId],
        },
        `All Sendouts, active status and two recruiter (${this.users.recruiter.MonsterRecruiter1B.initials}/${this.users.recruiter.MonsterRecruiter2B.initials})`,
        {
          metrics: { activeFees: '491250.00', normalMetric: '98250.00', totalFees: '0.00', averageFee: '0.00' },
          copy: new FeeAmountConditionalCopy().copy.generic,
        },
      ],
    ];
  }

  getFilterStubsExceptions() {
    return [
      [{ userFilter: userFilters.MyIndustries }, 'MyIndustries', false],
      [{ userFilter: userFilters.All }, 'All Sendouts', false],
      [{ userFilter: userFilters.MyCollaborations }, 'MyCollaborations', false],
      [{ userFilter: userFilters.FreeGame }, 'FreeGame', false],
      [{ userFilter: userFilters.MyInventory }, 'MyInventory', true],
      [{ userFilter: userFilters.MyRegion }, 'MyRegion', true],
    ];
  }

  getfilterStubs() {
    return [
      [
        { userFilter: userFilters.Mine },
        'My Sendouts',
        {
          copy: new FeeAmountConditionalCopy().copy.recruiter,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { userFilter: userFilters.MyTeam },
        'My Team Sendouts',
        {
          copy: new FeeAmountConditionalCopy().copy.coach,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { userFilter: userFilters.MyTeam, statusIds: SendoutStatusSchemes.Active, recruiterIds: 425 },
        'My Team Sendouts, active status and single recruiter of my team',
        {
          copy: new FeeAmountConditionalCopy().copy.coach,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { recruiterIds: 274 },
        'a single recruiter',
        {
          copy: new FeeAmountConditionalCopy().copy.recruiter,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { recruiterIds: [274, 120, 235] },
        'multiple recruiter',
        {
          copy: new FeeAmountConditionalCopy().copy.recruiter,
          isFilterValid: true,
          areThereMultipleRecruiters: true,
        },
      ],
      [
        { coachIds: 110 },
        'couch',
        {
          copy: new FeeAmountConditionalCopy().copy.coach,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { regionalDirectorIds: 415 },
        'regional',
        {
          copy: new FeeAmountConditionalCopy().copy.generic,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { regionalDirectorIds: 415, coachIds: 110 },
        'Distinct regional',
        {
          copy: new FeeAmountConditionalCopy().copy.coach,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { userFilter: userFilters.All, recruiterIds: 247 },
        'All Sendouts and Recruiter',
        {
          copy: new FeeAmountConditionalCopy().copy.generic,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { userFilter: userFilters.All, recruiterIds: [274, 120, 235] },
        'All Sendouts and multiple recruiter',
        {
          copy: new FeeAmountConditionalCopy().copy.generic,
          isFilterValid: true,
          areThereMultipleRecruiters: true,
        },
      ],
      [
        { userFilter: userFilters.All, coachIds: this.users.coach.JossueHernandez.userId },
        'All Sendouts and Couch',
        {
          copy: new FeeAmountConditionalCopy().copy.generic,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [
        { userFilter: userFilters.All, regionalDirectorIds: 415 },
        'All Sendouts and Regional',
        {
          copy: new FeeAmountConditionalCopy().copy.generic,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ],
      [{
        userFilter: userFilters.MyTeam,
        statusIds: SendoutStatusSchemes.Active,
        recruiterIds: [this.users.recruiter.DianaAlonso.userId, this.users.recruiter.JorgeFelix.userId],
      },
      'My Team Sendouts, active status and multiple recruiters of my team',
      {        
        copy: new FeeAmountConditionalCopy().copy.coach,        
        isFilterValid: true,
        areThereMultipleRecruiters: true,
      }],
      [
        { 
          userFilter: userFilters.All, 
          recruiterIds:  this.users.recruiter.GhostRecruiter1A.userId
        },
        'All Sendouts and Regional',
        {
          copy: new FeeAmountConditionalCopy().copy.generic,
          isFilterValid: true,
          areThereMultipleRecruiters: false,
        },
      ]
    ];
  }
}
module.exports = {
  FeeAmountConditionalStub,
};
