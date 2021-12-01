const { 
  FeeAgreementStatus,
} = use('App/Helpers/Globals');
const appInsights = require("applicationinsights");

const CompanyFeeAgreement = use('App/Models/CompanyFeeAgreement');
const FeeAgreementRepository = new (use('App/Helpers/FeeAgreementRepository'))

const MAX_DAYS_FOR_EXPIRATION = 30;
class FeeAgreementScheduledJobsWorker {

  async expireFeeAgreements() {
    try {
      function sleep(seconds) {
        return new Promise(function executor(resolve) {
          setTimeout(resolve, 1000 * seconds);
        });
      }
      const feeAgreementsToExpire = await CompanyFeeAgreement.query()
        .whereRaw(`Date_part('day', Now() - validated_date) >= ?`, [MAX_DAYS_FOR_EXPIRATION])
        .whereIn('fee_agreement_status_id', [FeeAgreementStatus.PendingHiringAuthoritySignature, FeeAgreementStatus.PendingProductionDirectorSignature])
        .fetch();
      const results = [];
      for(const feeAgreement of feeAgreementsToExpire.rows) {
        const result = await FeeAgreementRepository.expireFeeAgreement(feeAgreement.id);
        results.push(result);
        await sleep(0.8);
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async sendExpirationReminder() {

    const getLabeledFeeAgreementsAboutExpire = async (daysLeft) => {
      const daysElapsed = MAX_DAYS_FOR_EXPIRATION - daysLeft;
      const feeAgreements = await CompanyFeeAgreement.query()
        .whereRaw('abs(extract(day from now() - validated_date)) = ?', [daysElapsed])
        .whereRaw('fee_agreement_status_id in (?,?)', [FeeAgreementStatus.PendingHiringAuthoritySignature, FeeAgreementStatus.PendingProductionDirectorSignature])
        .fetch();
      return {
        days: daysLeft,
        feeAgreements: feeAgreements.rows
      };
    };
    const notifyLabeledFeeAgreementsAboutExpire = (labeledFeeAgreements) => {
      return labeledFeeAgreements.map(({days, feeAgreements}) =>  {
        return Promise.all(feeAgreements.map(feeAgreement => FeeAgreementRepository.registerAboutToExpire(feeAgreement.id, days)));
      });
    };

    try {
      const daysToNotifyLabels = [3, 2, 1];
      const labeledFeeAgreementsAboutExpire = await Promise.all(daysToNotifyLabels.map(getLabeledFeeAgreementsAboutExpire));
      const promises = notifyLabeledFeeAgreementsAboutExpire(labeledFeeAgreementsAboutExpire);
      await Promise.all(promises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  
}

module.exports = FeeAgreementScheduledJobsWorker;