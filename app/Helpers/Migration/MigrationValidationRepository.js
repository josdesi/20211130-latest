'use strict';

//Models
const HiringAuthority = use('App/Models/HiringAuthority');
const Name = use('App/Models/Name');
const MigrationBriteverifyList = use('App/Models/MigrationBriteverifyList');
const SendgridEmailValidation = use('App/Models/SendgridEmailValidation');

//Repositories
const BriteVerifyHelper = new (use('App/Helpers/BriteVerifyHelper'))();

//Utils
const Antl = use('Antl');
const { uniq } = use('lodash');
const moment = use('moment');
const { batchInsert } = use('App/Helpers/QueryUtils');
const Database = use('Database');

//Constants
const { Regex } = use('App/Helpers/Globals');
const { JobNames } = use('App/Scheduler/Constants');
const EMAIL_VALIDATION_CHECK_MINUTES_INTERVAL = 2;

class MigrationValidationRepository {
  /**
   * Starts the process of validating & storing a migration email list
   *
   * @summary The overall flow of this process is done in two steps, first this one obtains the emails & sends them to the email validation service,
   *  then a job is scheduled to later on check the list state, & if everything goes ok, the is stored
   *
   * @param {Number} migrationId - The migration that the process will work on
   */
  async startMigrationEmailsValidation(migrationId) {
    try {
      const emails = await this.getMigrationEmails(migrationId);
      if (emails.length <= 0) return false;

      const emailValidationQueued = await BriteVerifyHelper.validateEmailsBatch(emails);
      if (!emailValidationQueued.success) return emailValidationQueued;

      const emailListId = emailValidationQueued.data.emailListId;
      await MigrationBriteverifyList.create({
        migration_id: migrationId,
        email_list_id: emailListId,
      });

      await this.scheduleNextListCheck(migrationId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'validating',
          entity: 'migration emails',
        }),
      };
    }
  }

  /**
   * Get the emails from a contact migration
   *
   * @summary This method returns the new emails that came from a contact migration
   *
   * @param {Number} migrationId - The migration that the emails belong to
   *
   * @return {String[]} An array of emails
   */
  async getMigrationEmails(migrationId) {
    const hiringAuthorities = await HiringAuthority.query()
      .select(['work_email', 'personal_email'])
      .where('migration_id', migrationId)
      .fetch();
    const names = await Name.query()
      .select('names.email', 'contacts.personal_email')
      .leftJoin('personal_informations as pi', 'pi.id', 'names.personal_information_id')
      .leftJoin('contacts', 'contacts.id', 'pi.contact_id')
      .where('migration_id', migrationId)
      .fetch();

    const emailIsValid = (email) => email && !!Regex.email.exec(email);

    const haEmails = hiringAuthorities.rows
      .flatMap(({ work_email, personal_email }) => [work_email, personal_email])
      .filter(emailIsValid);
    const nameEmails = names.rows.flatMap(({ email, personal_email }) => [email, personal_email]).filter(emailIsValid);

    const emails = uniq([...haEmails, ...nameEmails]);

    return emails;
  }

  /**
   * Schedules a job to check the emails list state in the next EMAIL_VALIDATION_CHECK_MINUTES_INTERVAL minutes
   *
   * @summary This method schedules a simple job that will check later how is faring the email list
   *
   * @param {Number} migrationId - The migration being scheduled
   *
   * @return {Object} The emails list state
   */
  async scheduleNextListCheck(migrationId, isFromError = false) {
    const Agenda = use('Services/Agenda');
    const nextCheckDate = moment().add(EMAIL_VALIDATION_CHECK_MINUTES_INTERVAL, 'minute').format();
    const response = await Agenda.create(JobNames.Migrations.EmailValidation, {
      migrationId,
      isFromError,
    })
      .schedule(nextCheckDate)
      .save();

    return response;
  }

  /**
   * Checks the emails list state in the validation service
   *
   * @summary This method is expected to be called from the scheduler listener, it checks if the list has finished the process, if so, then the list is stored
   *
   * @param {Number} migrationId - The migration being check
   *
   * @return {Object} The emails list state
   */
  async checkMigrationEmailsListState(migrationId) {
    try {
      const migrationList = await MigrationBriteverifyList.query().where('migration_id', migrationId).first();

      const result = await BriteVerifyHelper.checkEmailsBatchStatus(migrationList.email_list_id);
      if (!result.success) throw result.message;

      const listState = {
        last_status_check: 'now()',
        validation_failed: result.data.error,
        validation_finished: result.data.finished,
        validation_stored: false,
        validation_payload: [],
      };

      await migrationList.merge(listState);
      await migrationList.save();

      if (listState.validation_failed) throw new Error('BriteVerify could not validate the list');

      if (listState.validation_finished) {
        await this.storeEmailsList(migrationList);
      } else {
        await this.scheduleNextListCheck(migrationId);
      }

      return listState;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'checking',
          entity: 'migration emails list status',
        }),
      };
    }
  }

  /**
   * Stores the BriteVerify list result
   *
   * @summary This method is expected to be called the the list state is 'finished' meaning that Briteverify has validated all the emails & the endpoint is up for usage
   *
   * @param {Object} migrationList - The MigrationBriteverifyList model instancied
   */
  async storeEmailsList(migrationList) {
    let trx;
    try {
      const result = await BriteVerifyHelper.getEmailsBatchList(migrationList.email_list_id);
      if (!result.success) throw result.message;

      const briteVerifyBatchInsertJSON = result.data.map((validation) =>
        BriteVerifyHelper.buildBriteVerifyBatchInsertJSON(validation)
      );

      trx = await Database.beginTransaction();

      const newValidations = await batchInsert(SendgridEmailValidation, briteVerifyBatchInsertJSON, trx);

      await trx.commit();

      await migrationList.merge({ validation_stored: true, validation_payload: result.data });
      await migrationList.save();

      return newValidations;
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'storing',
          entity: 'migration emails list',
        }),
      };
    }
  }
}

module.exports = MigrationValidationRepository;
