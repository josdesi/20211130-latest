'use strict';

//The commented Seeds are only to keep a reference of the actual order condsidering all the files

const FileTypeSeeder = require('./FileTypeSeeder');
const JobOrderStatusSeeder = require('./JobOrderStatusSeeder');
const CandidateStatusSeeder = require('./CandidateStatusSeeder');
const CountrySeeder = require('./CountrySeeder');
const StateSeeder = require('./StateSeeder');
const UserStatusSeeder = require('./UserStatusSeeder');
const RoleSeeder = require('./RoleSeeder');
const PositionSeeder = require('./PositionSeeder');
const IndustrySeeder = require('./IndustrySeeder');
const SourceTypeSeeder = require('./SourceTypeSeeder');
const FeeAgreementTypeSeeder = require('./FeeAgreementTypeSeeder');
const UserSeeder = require('./UserSeeder');
const ActivityLogTypeSeeder = require('./ActivityLogTypeSeeder');
const RecruiterHasIndustrySeeder = require('./RecruiterHasIndustrySeeder');
const SpecialtySeeder = require('./SpecialtySeeder');
const SubspecialtySeeder = require('./SubspecialtySeeder');
const TimeStartTypeSeeder = require('./TimeStartTypeSeeder');
const NameStatusSeeder = require('./NameStatusSeeder');
const PermissionSeeder = require('./PermissionSeeder');
const SendoutTypeSeeder = require('./SendoutTypeSeeder');
const SendoutStatusSeeder = require('./SendoutStatusSeeder');
const SendoutInterviewTypeSeeder = require('./SendoutSendoutInterviewTypeSeeder');
const SendoutTemplate = require('./SendoutTemplate');

//const CitySeeder = require('./CitySeeder');
//const ZipCodeSeeder = require('./ZipCodeSeeder');

class DataBaseSeeder {
  async run() {
    await FileTypeSeeder.run();
    await JobOrderStatusSeeder.run();
    await CandidateStatusSeeder.run();
    await CountrySeeder.run();
    await StateSeeder.run();
    //await CitySeeder.run();
    //await ZipCodeSeeder.run();
    await UserStatusSeeder.run();
    await RoleSeeder.run();
    await UserSeeder.run();
    await IndustrySeeder.run();
    await SpecialtySeeder.run();
    await SubspecialtySeeder.run();
    await PositionSeeder.run();
    await SourceTypeSeeder.run();
    await FeeAgreementTypeSeeder.run();
    await ActivityLogTypeSeeder.run();
    await RecruiterHasIndustrySeeder.run();
    await TimeStartTypeSeeder.run();
    await NameStatusSeeder.run();
    await PermissionSeeder.run();
    await SendoutTypeSeeder.run();
    await SendoutStatusSeeder.run();
    await SendoutInterviewTypeSeeder.run();
    await SendoutTemplate.run();

  }
}

module.exports = DataBaseSeeder;
