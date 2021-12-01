'use strict';

//Models
const Candidate = use('App/Models/Candidate');
const HiringAuthority = use('App/Models/HiringAuthority');
const Name = use('App/Models/Name');
const User = use('App/Models/User');
const SearchProject = use('App/Models/SearchProject');

//Utils
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();
const appInsights = require('applicationinsights');
const Database = use('Database');
const Env = use('Env');

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
class EmailRepository {
  async parseSmartags(smartags) {
    const parsedSmartags = {};

    for (const key of Object.keys(smartags)) {
      if (smartags[key] === null) {
        parsedSmartags[key] = '';
      } else {
        parsedSmartags[key] = smartags[key];
      }
    }

    return parsedSmartags;
  }

  /**
   * Returns an object containing the smartags from the candidates
   *
   * @description This method should be used in the bulkemail helper, it returns the smartags of the ca passed
   *
   * @param {Number[]} candidateIds - The candidates ids from where the smartags will be searched from
   *
   * @return {Object[]} An array containing the candidate alongside its smartags
   *
   */
  async getCandidatesSmartags(candidateIds) {
    if (candidateIds.length <= 0) return [];

    const employerCompany = Database.table('company_has_candidate_employees')
      .select('candidate_id', 'company_id')
      .distinct()
      .where('is_current_company', true)
      .as('employee');

    const smartags = await Candidate.query()
      .select([
        'candidates.id',
        'candidates.email',
        'pi.full_name',
        Database.raw(
          "CASE WHEN (select concat(cty.title,', ',st.slug)) = ', ' THEN '' ELSE (select concat(cty.title,', ',st.slug)) END as location"
        ),
        'companies.name as company_name',
        'st.title as state',
        'cty.title as city',
        'spec.title as specialty',
        'sub.title as subspecialty',
        'candidates.specialty_id',
        'candidates.subspecialty_id',
        'cty.id as city_id',
        'st.id as state_id',
        'candidates.title',
        'pi.first_name',
        'pi.last_name',
        'add.address',
        'add.zip',
        'contacts.phone',
        'contacts.ext',
        'contacts.mobile',
      ])
      .leftJoin(employerCompany, 'candidates.id', 'employee.candidate_id')
      .leftJoin('companies', 'employee.company_id', 'companies.id')
      .leftJoin('personal_informations as pi', 'candidates.personal_information_id', 'pi.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('contacts', 'pi.contact_id', 'contacts.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'candidates.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'candidates.subspecialty_id')
      .whereIn('candidates.id', candidateIds)
      .fetch();

    const smartagsJSON = smartags.toJSON();

    const parsedSmartagsPromises = smartagsJSON.map((smartag) => this.parseSmartags(smartag));
    const parsedSmartags = await Promise.all(parsedSmartagsPromises);

    return parsedSmartags;
  }

  /**
   * Returns an object containing the smartags from the hiring authorities
   *
   * @description This method should be used in the bulkemail helper, it returns the smartags of the ha passed
   *
   * @param {Number[]} haIds - The user ids from where the smartags will be searched from
   *
   * @return {Object[]} An array containing the ha alongside its smartags
   *
   */
  async getHiringAuthoritiesSmartags(haIds) {
    if (haIds.length <= 0) return [];

    const smartags = await HiringAuthority.query()
      .select([
        'hiring_authorities.id',
        'hiring_authorities.work_email as email',
        'hiring_authorities.full_name',
        // Database.raw('null as location'),
        Database.raw(
          "CASE WHEN (select concat(cty.title,', ',st.slug)) = ', ' THEN '' ELSE (select concat(cty.title,', ',st.slug)) END as location"
        ),
        // Database.raw('null as state'),
        'st.title as state',
        // Database.raw('null as city'),
        'cty.title as city',
        'comp.name as company_name',
        'spec.title as specialty',
        'sub.title as subspecialty',
        'hiring_authorities.specialty_id',
        'hiring_authorities.subspecialty_id',
        'cty.id as city_id',
        'st.id as state_id',
        'hiring_authorities.title',
        'hiring_authorities.first_name',
        'hiring_authorities.last_name',
        // Database.raw('null as address'),
        'comp.address',
        // Database.raw('null as zip'),
        'comp.zip',
        'hiring_authorities.work_phone as phone',
        'hiring_authorities.ext',
        Database.raw('null as mobile'),
      ])
      .leftJoin('companies as comp', 'hiring_authorities.company_id', 'comp.id')
      .leftJoin('cities as cty', 'comp.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'hiring_authorities.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'hiring_authorities.subspecialty_id')
      .whereIn('hiring_authorities.id', haIds)
      .fetch();

    const smartagsJSON = smartags.toJSON();

    const parsedSmartagsPromises = smartagsJSON.map((smartag) => this.parseSmartags(smartag));
    const parsedSmartags = await Promise.all(parsedSmartagsPromises);

    return parsedSmartags;
  }

  /**
   * Returns an object containing the smartags from the names
   *
   * @description This method should be used in the bulkemail helper, it returns the smartags of the ca passed
   *
   * @param {Number[]} nameIds - The names ids from where the smartags will be searched from
   *
   * @return {Object[]} An array containing the name alongside its smartags
   *
   */
  async getNamesSmartags(nameIds) {
    if (nameIds.length <= 0) return [];

    const employerCompany = Database.table('company_has_name_employees')
      .select('name_id', 'company_id')
      .distinct()
      .where('is_current_company', true)
      .as('employee');

    const smartags = await Name.query()
      .select([
        'names.id',
        'names.email',
        'pi.full_name',
        Database.raw(
          "CASE WHEN (select concat(cty.title,', ',st.slug)) = ', ' THEN '' ELSE (select concat(cty.title,', ',st.slug)) END as location"
        ),
        'companies.name as company_name',
        'st.title as state',
        'cty.title as city',
        'spec.title as specialty',
        'sub.title as subspecialty',
        'names.specialty_id',
        'names.subspecialty_id',
        'cty.id as city_id',
        'st.id as state_id',
        'names.title',
        'pi.first_name',
        'pi.last_name',
        'add.address',
        'add.zip',
        'contacts.phone',
        'contacts.ext',
        'contacts.mobile',
      ])
      .leftJoin(employerCompany, 'names.id', 'employee.name_id')
      .leftJoin('companies', 'employee.company_id', 'companies.id')
      .innerJoin('name_statuses', 'name_statuses.id', 'names.name_status_id')
      .leftJoin('personal_informations as pi', 'names.personal_information_id', 'pi.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('contacts', 'pi.contact_id', 'contacts.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'names.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'names.subspecialty_id')
      .whereIn('names.id', nameIds)
      .fetch();

    const smartagsJSON = smartags.toJSON();

    const parsedSmartagsPromises = smartagsJSON.map((smartag) => this.parseSmartags(smartag));
    const parsedSmartags = await Promise.all(parsedSmartagsPromises);

    return parsedSmartags;
  }

  /**
   * Returns an object containing the smartags that comes from the sender
   *
   * @description This method should be used in the bulkemail helper, it returns the smartags of the sender, other wise known as recruiter
   *
   * @param {Number} userId - The user sending the bulk email, the original creator
   *
   * @return {Object[]} An array containing the name alongside its smartags
   *
   */
  async getSenderSmartags(userId) {
    const select = [
      'id',
      'email_signature as your_signature',
      'personalInformation.full_name as your_full_name',
      'personalInformation.first_name as your_first_name',
      'personalInformation.last_name as your_last_name'
    ]
    const smartags = await UserRepository.getDetails(userId,{ userHiddenFieldsToShow : ['email_signature'], customSelect: select });
    const parsedSmartags = await this.parseSmartags(smartags);

    return parsedSmartags;
  }

  /**
   * @summary Sends an email to the user that his bulk email was successfuly sent
   *
   * @param {Number} userId - The user that will be notified
   * @param {Number} searchProjectName - The search project name that will be shown to the user
   *
   */
  async notifyUserBulkSent(userId, searchProjectId) {
    try {
      const userInformation = (
        await User.query()
          .where('id', userId)
          .with('personalInformation', (builder) => builder.with('address').with('address.city'))
          .first()
      ).toJSON();

      const searchProjectInformationRaw = await SearchProject.query().where('id', searchProjectId).first();
      if (!searchProjectInformationRaw) throw new Error(`The search project could not be found: ${searchProjectId}`);

      const searchProjectInformation = searchProjectInformationRaw.toJSON();

      const recipients = [
        {
          to: {
            name: userInformation.personalInformation.full_name,
            email: userInformation.email,
          },
          dynamic_template_data: {
            first_name: userInformation.personalInformation.first_name,
            search_project_name: searchProjectInformation.name,
            view_url: `${Env.get('PUBLIC_URL_WEB')}/bulkemail`,
          },
        },
      ];

      const generalDynamicTemplateData = null;

      const sendgridConfigurationName = 'bulkEmailSuccessfullySent';

      await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      return { success: true };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, error };
    }
  }
}

module.exports = EmailRepository;
