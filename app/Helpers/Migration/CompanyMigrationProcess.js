'use strict';

// Utils
const capitals = use('App/Helpers/Migration/Capitals');
const appInsights = use('applicationinsights');
const {
  createContact,
  createAddress,
  getUserByInitials,
  createMigrationLog,
  extractZipCode,
  loadCityAndState,
  broadcastLog,
  unwrapEntryData,
} = use('App/Helpers/Migration/MigrationUtils');
const Database = use('Database');
const { companyType, migrationType } = use('App/Helpers/Globals');
const { find } = use('lodash');
const companyTypeMap = {
  V: companyType.Vendor,
  X: companyType.Client,
};
const { sourceTypes } = use('App/Helpers/Migration/Constants');
const Event = use('Event');
const EventType = use('App/Helpers/Events')

// Models
const Company = use('App/Models/Company');
const ZipCode = use('App/Models/ZipCode');

// Services
const PCRService = new (use('App/Helpers/Migration/PCRService'))();

class CompanyMigrationProcess {
  async setupData(migrationData, industriesMapping, fieldsMapped, sourceId) {
    const [ citiesResult, statesResult, countriesResult ] = await loadCityAndState(migrationData, fieldsMapped.country, fieldsMapped.state, fieldsMapped.city);
    this.defaultUserId = await getUserByInitials('1GP');
    this.states = statesResult.rows;
    this.countries = countriesResult.rows;
    this.cities = citiesResult.rows;
    this.industriesMapping = industriesMapping;
    this.errorsFound = [];
    this.contacts = [];
    this.successUploads = [];
    this.fieldsMapped = fieldsMapped;
    await PCRService.initialize();
    switch (sourceId) {
      case sourceTypes.PCR.id:
        this.processSource = this.processPCR;
        this.sourceId = sourceTypes.PCR.id;
        break;
    
      default:
        this.processSource = this.processZoomInfo;
        this.sourceId = sourceTypes.ZoomInfo.id;
        break;
    }
  }

  async start(migrationId, migrationData, industriesMapping, fieldsMapped, sourceId) {
    this.migrationId = migrationId;
    let count = migrationData.length;
    let processed = 0;
    let progress = 0;
    try {
      await this.setupData(migrationData, industriesMapping, fieldsMapped, sourceId);
  
      for (const entry of migrationData) {
        const res = await this.migrate(entry);

        processed += 1;
        progress = (processed * 100) / count;
        const migrationLog = await createMigrationLog({
          id: migrationId,
          description: res.success ? `Migrated ${entry[this.fieldsMapped.name]}` : `Error on ${entry[this.fieldsMapped.name]} [${res.error}]`,
          progress: Math.round(progress),
          type: migrationType.Company,
        });
        await Database.table('migrations').where('id', migrationId).update({ last_progress: Math.round(progress) });
        await broadcastLog('companies',migrationLog);
  
        if (!res.success) {
          this.errorsFound.push({
            ...entry,
            error: res.error,
          });
        }else{
          this.successUploads.push(entry);
        }
      }
  
      Event.fire(EventType.Migration.Companies.Completed);

      return {
        success:true,
        errorsFound: this.errorsFound,
        contacts: this.contacts,
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
    try {
      const data = unwrapEntryData(entry, this.fieldsMapped);
      trx = await Database.beginTransaction();

      const res = await this.processSource(
        {
          data,
          entry,
        },
        trx
      );
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

  async processZoomInfo({ data, entry }, trx) {
    let company_id = null;
    const { state, city, zip, name, country, industry, specialty, subspecialty, initials } = data;

    company_id = await this.searchForExistingCompany(state, city, zip, name, country);
    if (!company_id) {
      const creationResult = await this.createCompany(data, trx);
      if(!creationResult.success){
        return {
          success: false,
          error: creationResult.error
        };
      }
      company_id = creationResult.companyId;
    }
    this.contacts.push({
      CompanyId: company_id,
      ...entry,
      [this.fieldsMapped.initials]: initials,
      [this.fieldsMapped.industry]: industry,
      [this.fieldsMapped.specialty]: specialty,
      [this.fieldsMapped.subspecialty]: subspecialty
    });

    return {
      success: true,
    };
  }

  async processPCR({ data }, trx) {
    let company_id = null;
    const { state, city, zip, name, industry, specialty, subspecialty, city_pcr, state_pcr, country, website } = data;
    company_id = await this.searchForExistingCompany(state, city, zip, name, country);

    const resultCompanyPCR = await PCRService.getCompany(name, city_pcr, state_pcr);

    if (resultCompanyPCR.success && resultCompanyPCR.data.length === 0) {
      trx && (await trx.rollback());
      return {
        error: `Company Not found.Make sure that the name, state, and city matches with the values on PCR`,
        success: false,
      };
    } else if (!resultCompanyPCR.success) {
      return {
        error: `Error From PCR Trying to get Company ${resultCompanyPCR.error}`,
        success: false,
      };
    }

    const resultConctactsPCR = await PCRService.getContactsByCompanyId(resultCompanyPCR.data[0].CompanyId);

    if (!company_id) {
      data.website = website || resultCompanyPCR.data[0].EmailWWWAddress;
      const creationResult = await this.createCompany(data, trx);
      if(!creationResult.success){
        return {
          success: false,
          error: creationResult.error
        };
      }
      company_id = creationResult.companyId;
    }

    if (resultConctactsPCR.success && resultConctactsPCR.data.length > 0) {
      await resultConctactsPCR.data.map((data) => {
        const {
          FirstName,
          LastName,
          Title,
          City,
          State,
          PostalCode,
          HomePhone,
          MobilePhone,
          WorkPhone,
          EmailAddress,
          Status,
          UserName,
        } = data || {};
        const [otherEmailData = {}] = data.CustomFields;
        const [otherEmail = ''] = otherEmailData.Values;
        this.contacts.push({
          CompanyId: company_id,
          CurrentCompany: name,
          FirstName,
          LastName,
          Title,
          City,
          State,
          PostalCode,
          HomePhone,
          MobilePhone,
          WorkPhone,
          EmailAddress,
          Status,
          UserName,
          Industry: industry,
          Specialty: specialty,
          Subspecialty: subspecialty,
          email_other: otherEmail
        });
      });
    } else if (!resultConctactsPCR.success) {
      return {
        error: `Error From PCR Trying to get Contacts ${resultConctactsPCR.error}`,
        success: false,
      };
    }

    return {
      success: true,
    };
  }

  async searchForExistingCompany(state, city, zip, name, country) {
    let zipCodeData, cityData;
    const countryData = find(this.countries, { slug: country });
    const stateData = find(this.states, { slug: state, country_id: countryData ? countryData.id : null });
    if (stateData) {
      const { city: capital = ''} = find(capitals.data, { abbr: state, country: countryData.slug });
      cityData =
        find(this.cities, { state_id: stateData.id, title: String(city).formatToCompare() }) ||
        find(this.cities, { state_id: stateData.id, title: String(capital).formatToCompare() });
    } else {
      const zipCode = extractZipCode(zip);
      zipCodeData = await ZipCode.findBy('zip_ch', zipCode);
    }

    const companyResult = await Database.raw(
      `
      SELECT cp.id, cp.city_id, cty.state_id FROM companies as cp 
      left join cities as cty on cp.city_id = cty.id
      WHERE LOWER(name) = LOWER(?) 
      and cty.id ${!cityData && !zipCodeData ? 'is null ' : ` = ${cityData ? cityData.id : zipCodeData.city_id} `}
      and cty.state_id  ${
        !stateData && !zipCodeData ? 'is null ' : ` = ${stateData ? stateData.id : zipCodeData.state_id} `
      }
      limit(1)
    `,
      [name]
    );

    if (companyResult && companyResult.rowCount > 0) {
      return companyResult.rows[0].id;
    }

    return null;
  }

  async createCompany(
    { initials, phone, state, city, zip, address, name, industry, specialty, subspecialty, status, website, country },
    trx
  ) {
    if (!industry || !specialty) {
      trx && (await trx.rollback());
      return {
        error: `There is no Specialty or Industry on the Company`,
        success: false,
      };
    }
    const userId = (initials && (await getUserByInitials(initials))) || this.defaultUserId;

    const contactResult = await createContact(phone, null, null, trx);

    if (!contactResult.success) {
      trx && (await trx.rollback());
      return {
        error: `Error on Contact Creation {${contactResult.error}}`,
        success: false,
      };
    }

    const addressResult = await createAddress(
      zip,
      state,
      city,
      address,
      this.states,
      this.cities,
      this.countries,
      country,
      trx,
      'companies'
    );

    if (!addressResult.success) {
      trx && (await trx.rollback());
      return {
        error: `Error on Address Creation {${addressResult.error}}`,
        success: false,
      };
    }

    const { specialty_id, subspecialty_id } = find(this.industriesMapping, {
      industry: String(industry).formatToCompare(),
      specialty: String(specialty).formatToCompare(),
      subspecialty: subspecialty ? String(subspecialty).formatToCompare() : null,
    });
    const company = await Company.create(
      {
        contact_id: contactResult.data.id,
        recruiter_id: userId,
        name,
        created_by: userId,
        updated_by: userId,
        specialty_id,
        subspecialty_id,
        company_type_id: companyTypeMap.hasOwnProperty(status) ? companyTypeMap[status] : companyType.NotSigned,
        website,
        migration_record: true,
        migration_record_changed: true,
        migration_source_type_id: this.sourceId,
        migration_id: this.migrationId,
        ...addressResult.data,
      },
      trx
    );
    return {
      success: true,
      companyId: company.id
    };
  }

}
module.exports = CompanyMigrationProcess;
