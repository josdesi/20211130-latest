'use strict';

// Utils
const appInsights = use('applicationinsights');
const Database = use('Database');
const {
  extractExt,
  extractPhone,
  createContact,
  createAddress,
  createPersonalInfo,
  getUserByInitials,
  createMigrationLog,
  loadCityAndState,
  broadcastLog,
  unwrapEntryData
} = use('App/Helpers/Migration/MigrationUtils');
const { hiringAuthorityStatus, nameStatus, migrationType, CandidateSourceURLTypes, DateFormats } = use('App/Helpers/Globals');
const { find } = use('lodash');
const Env = use('Env');
const Event = use('Event');
const EventType = use('App/Helpers/Events')
const { sourceTypes } = use('App/Helpers/Migration/Constants');
const moment = use('moment');

// Repository
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();

// Models
const HiringAuthority = use('App/Models/HiringAuthority');
const Name = use('App/Models/Name');
const HiringAuthorityFromName = use('App/Models/HiringAuthorityFromName');

class ContactsMigrationProcess {
  async setupData(migrationData, positionsMapping, industriesMapping, companyId, fieldsMapped, sourceId) {
    const [ citiesResult, statesResult, countriesResult ] = await loadCityAndState(migrationData, fieldsMapped.country, fieldsMapped.state, fieldsMapped.city);
    this.hasCompanyId = Number.isSafeInteger(Number(companyId));
    this.defaultUserId = await getUserByInitials('1GP');
    this.states = statesResult.rows;
    this.countries = countriesResult.rows;
    this.cities = citiesResult.rows;
    this.positionsMapping = positionsMapping;
    this.industriesMapping = industriesMapping;
    this.errorsFound = [];
    this.successUploads = [];
    switch (sourceId) {
      case sourceTypes.PCR.id:
        this.sourceId = sourceTypes.PCR.id;
        break;

      default:
        this.sourceId = sourceTypes.ZoomInfo.id;
        break;
    }
    if(this.hasCompanyId){
      this.fieldsMapped = {
        ...fieldsMapped,
        companyId: 'CompanyId'
      };
    }else{
      this.fieldsMapped = fieldsMapped
    }
  }

  async start(migrationId, migrationData, industriesMapping, positionsMapping, companyId, fieldsMapped, sourceId) {
    this.migrationId = migrationId;
    let count = migrationData.length;
    let processed = 0;
    let progress = 0;
    try {
      await this.setupData(migrationData, positionsMapping, industriesMapping, companyId, fieldsMapped, sourceId);
      for (const entry of migrationData) {
        if(this.hasCompanyId){
          entry.CompanyId = companyId;
        }
        const res = await this.migrate(entry);
  
        processed += 1;
        progress = processed * 100 / count;
        const full_name = `${entry[this.fieldsMapped.firstName]} ${entry[this.fieldsMapped.lastName]}`;
        const migrationLog = await createMigrationLog({
          id: migrationId,
          description:  res.success ? `Migrated  ${full_name}` : `Error on ${full_name} [${res.error}]`,
          progress: Math.round(progress),
          type: migrationType.Contact,
        });
        await Database.table('migrations').where('id', migrationId).update({ last_progress: Math.round(progress) });
        await broadcastLog('contacts',migrationLog);
  
        if (!res.success) {
          this.errorsFound.push({
            ...entry,
            error: res.error,
          });
        }else{
          this.successUploads.push(entry);
        }
      }
      Event.fire(EventType.Migration.Contacts.Completed, { migrationId });

      return {
        success:true,
        errorsFound: this.errorsFound,
        successUploads: this.successUploads
      };
    } catch (error) {
      return {
        success:false,
        error
      };
    }
  }

  async migrate(entry) {
    let trx;
    let res;
    try {
      const companyResult = await Database.raw('SELECT id,name FROM companies WHERE id = ?', [entry.CompanyId]);
      if (companyResult.rowCount === 0) {
        throw `Provided company does not exist!`;
      }
      entry.CurrentCompany = companyResult.rows[0].name;
      const data = unwrapEntryData(entry, this.fieldsMapped);
      const dataFormatted = {
        ...data,
        industry: String(data.industry).formatToCompare(),
        specialty: String(data.specialty).formatToCompare(),
        subspecialty: data.subspecialty ? String(data.subspecialty).formatToCompare() : null,
        email: data.email ? String(data.email).formatToCompare() : null,
        otherEmail: data.otherEmail ? String(data.otherEmail).formatToCompare() : null,
        functionalTitle: data.functionalTitle ? String(data.functionalTitle).formatToCompare() : null
      }
      if(dataFormatted.email === dataFormatted.otherEmail){
        dataFormatted.otherEmail = null;
      }
      trx = await Database.beginTransaction();

      switch (data.status) {
        case 'HiringAuthority':
          case 'HA':
            case 'H':
              res = !dataFormatted.email
                ? await this.processName(dataFormatted, nameStatus.Name.HiringAuthority, trx)
                : await this.processHiring(dataFormatted, trx);
          break;
        default:
          res = await this.processName(dataFormatted, nameStatus.Name.Candidate, trx);
          break;
      }
      trx && (await trx.commit());

      return res;
    } catch (error) {
      trx && (await trx.rollback());

      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        error,
      };
    }
  }

  async processHiring(data, trx) {
    const {
      email,
      otherEmail,
      companyId,
      industry,
      specialty,
      subspecialty,
      functionalTitle,
      firstName,
      lastName,
      mobilePhone,
      title,
      workPhone,
      status,
      linkedInURL
    } = data;

    const hiringResult = await Database.raw(
      'SELECT id FROM hiring_authorities WHERE LOWER(work_email) = ? LIMIT(1)',
      [email]
    );

    if (hiringResult.rowCount > 0) {
      return {
        error:`Record already on FP ${Env.get('PUBLIC_URL_WEB')}/hiringauthority/profile/${hiringResult.rows[0].id}`,
        success:false
      }
    }

    const { specialty_id, subspecialty_id } = find(this.industriesMapping, {
      industry: industry,
      specialty: specialty,
      subspecialty: subspecialty,
    });

    const { id: position_id } = find(this.positionsMapping, function (val) {
      return (
        (val.specialty.id === specialty_id && val.title === functionalTitle) ||
        null
      );
    });
    const hiringData = {
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      title: title || functionalTitle,
      personal_phone: extractPhone(mobilePhone),
      work_email: email,
      personal_email: otherEmail,
      work_phone: extractPhone(workPhone),
      migration_record: true,
      ext: extractExt(workPhone),
      hiring_authority_status_id: hiringAuthorityStatus.Inactive,
      position_id,
      specialty_id,
      subspecialty_id,
      migration_status : status,
      migration_source_type_id: this.sourceId,
      migration_id: this.migrationId
    };
    if(linkedInURL){
      hiringData.link_profile = linkedInURL;
      hiringData.source_type_id = CandidateSourceURLTypes.LinkedIn.id;
    }
    const nameResult = await Name.query().whereRaw('LOWER(email) = ?',[email]).first();

    if (nameResult) {
      //create from name
      const res = await this.createHiringFromName(nameResult, hiringData, trx);
      if (res.success) {
        return { success: true };
      }
      throw res.error;
    }

    await HiringAuthority.create(hiringData, trx);

    return {
      success: true
    };
  }

  async processName(data, nameStatusId, trx) {
    const {
      initials,
      workPhone,
      mobilePhone,
      state,
      city,
      zip,
      address,
      email,
      otherEmail,
      firstName,
      lastName,
      currentCompany,
      functionalTitle,
      title,
      industry,
      specialty,
      subspecialty,
      companyId,
      country,
      status,
      linkedInURL
    } = data;
    const candidateResult = await Database.raw('SELECT id FROM candidates WHERE LOWER(email) = ? LIMIT(1)', [
      email,
    ]);

    if (candidateResult.rowCount > 0) {
      return {
        error:`Record already on FP see ${Env.get('PUBLIC_URL_WEB')}/candidates/profile/${candidateResult.rows[0].id}`,
        success:false
      }
    }

    const hiringResult = await Database.raw(
      'SELECT id FROM hiring_authorities WHERE LOWER(work_email) = ? LIMIT(1)',
      [email]
    );

    if (hiringResult.rowCount > 0) {
      return {
        error:`Record already on FP ${Env.get('PUBLIC_URL_WEB')}/hiringauthority/profile/${hiringResult.rows[0].id}`,
        success:false
      }
    }
    const nameResult = await Database.raw('SELECT id FROM names WHERE LOWER(email) = ? LIMIT(1)', [email]);

    if (nameResult.rowCount > 0) {
      return {
        error:`Record already on FP ${Env.get('PUBLIC_URL_WEB')}/contacts/profile/${nameResult.rows[0].id}`,
        success:false
      }
    }

    const userId = (initials && (await getUserByInitials(initials))) || this.defaultUserId;
    const contactResult = await createContact(workPhone, mobilePhone, otherEmail, trx);

    if (!contactResult.success) {
      return {
        error:`Error on Contact Creation {${contactResult.error}}`,
        success:false
      }
    }

    const addressResult = await createAddress(zip, state, city, address, this.states, this.cities, this.countries, country, trx, 'contacts');

    if (!addressResult.success) {
      return {
        error:`Error on Address Creation {${addressResult.error}}`,
        success:false
      }
    }

    const personalInfoResult = await createPersonalInfo(
      contactResult.data.id,
      addressResult.data.id,
      firstName,
      lastName,
      userId,
      trx
    );

    if (!personalInfoResult.success) {
      return {
        error: `Error on Personal Informartion Creation {${personalInfoResult.error}}`,
        success:false
      }
    }

    const { specialty_id, subspecialty_id } = find(this.industriesMapping, {
      industry: industry,
      specialty: specialty,
      subspecialty: subspecialty,
    });
    const { id: position_id } = find(this.positionsMapping, function (val) {
      return (
        (val.specialty.id === specialty_id && val.title === functionalTitle ) ||
        null
      );
    });
    const nameData = {
      current_company: currentCompany,
      personal_information_id: personalInfoResult.data.id,
      name_status_id: nameStatusId,
      position_id,
      specialty_id,
      subspecialty_id,
      email: email,
      title,
      created_by: userId,
      updated_by: userId,
      migration_record: true,
      company_id: companyId,
      migration_status : status,
      migration_source_type_id: this.sourceId,
      migration_id: this.migrationId
    }
    if(linkedInURL){
      nameData.link_profile = linkedInURL;
      nameData.source_type_id = CandidateSourceURLTypes.LinkedIn.id;
    }
    const name = await Name.create(
      nameData,
      trx
    );
    await NameRepository.createEmployerRelationship(name.id, companyId, true, userId, trx);


    return {
      success: true
    };
  }

  async createHiringFromName(name, data, trx){
    try {
      const hiringAuthority = await HiringAuthority.create(data, trx);
      await HiringAuthorityFromName.create({ name_id: name.id, hiring_authority_id: hiringAuthority.id }, trx);
      name.title = data.title;
      name.convertion_date = moment().format(DateFormats.SystemDefault);
      await name.save(trx);
      await HiringAuthorityRepository.copyDataFromName(name, hiringAuthority.id, trx);
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

}

module.exports = ContactsMigrationProcess;
