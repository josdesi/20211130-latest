'use strict';

//Utils
const { unwrapEntryData, createMigrationLog, broadcastLog } = use('App/Helpers/Migration/MigrationUtils');
const Database = use('Database');
const { migrationType } = use('App/Helpers/Globals');

class NameMigrationProcess {
  async setupData(fieldsMapped) {
    this.candidatesId = [];
    this.namesId = [];
    this.hiringsId = [];
    this.errorsFound = [];
    this.successUploads = [];
    this.fieldsMapped = fieldsMapped;
  }

  async start(migrationId, migrationData, fieldsMapped) {
    let count = migrationData.length;
    let processed = 0;
    let progress = 0;
    try {
      await this.setupData(fieldsMapped);
      for (const entry of migrationData) {
        const res = await this.process(entry);

        processed += 1;
        progress = processed * 100 / count;
        const full_name = `${entry[this.fieldsMapped.firstName]} ${entry[this.fieldsMapped.lastName]}`;
        const migrationLog = await createMigrationLog({
          id: migrationId,
          description:  res.success ? `Migrated  ${full_name}` : `Error on ${full_name} [${res.error}]`,
          progress: Math.round(progress),
          type: migrationType.SearchProject,
        });
        await Database.table('migrations').where('id', migrationId).update({ last_progress: Math.round(progress) });
        await broadcastLog('searchprojects',migrationLog);

        if (!res.success) {
          this.errorsFound.push({
            ...entry,
            error: res.error,
          });
        }else{
          this.successUploads.push(entry);
        }
      }

      return {
        success:true,
        candidatesId: this.candidatesId,
        namesId: this.namesId,
        hiringsId: this.hiringsId,
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

  async process(entry) {
    try {
      const {
        email
      } = unwrapEntryData(entry, this.fieldsMapped);
      const _email = email ? String(email).formatToCompare() : null;
      const candidateResult = await Database.raw('SELECT id FROM candidates WHERE LOWER(email) = ? LIMIT(1)', [
        _email,
      ]);
      if (candidateResult.rowCount > 0) {
        this.candidatesId.push(candidateResult.rows[0].id);
        return { success: true };
      }
      const hiringResult = await Database.raw(
        'SELECT id FROM hiring_authorities WHERE LOWER(work_email) = ? LIMIT(1)',
        [_email]
      );
      if (hiringResult.rowCount > 0) {
        this.hiringsId.push(hiringResult.rows[0].id);
        return { success: true };
      }
      const nameResult = await Database.raw('SELECT id FROM names WHERE LOWER(email) = ? LIMIT(1)', [_email]);
      if (nameResult.rowCount > 0) {
        this.namesId.push(nameResult.rows[0].id);
        return { success: true };
      }
      return {
        success: false,
        error: 'The contact was not found'
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }

}

module.exports = NameMigrationProcess;
