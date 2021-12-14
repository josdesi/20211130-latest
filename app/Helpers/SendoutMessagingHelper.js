'use strict';

const CustomString = use('App/Utils/CustomString');

class SendoutMessagingHelper {
  /**
   * Format recruiter and coach name as recruiter name / coach name if available
   * @param {string} recruiterName Recruiter name
   * @param {string} coachName Coach name

   * @returns {string} Recruiter and Coach 's names formatted for RC message
   */

  formatTeam(recruiterName, coachName) {
    const haveSameName = CustomString(recruiterName).isEqualTo(coachName);
    const isAllTeam = recruiterName && coachName && !haveSameName;
    const isOnlyCoach = !recruiterName && coachName && !haveSameName;

    const message = `${recruiterName}${isAllTeam ? ` / ${coachName}` : isOnlyCoach ? coachName : ''}`;
    return {
      message,
      isEmpty: message.length === 0,
    };
  }

  /**
   * Builds a message to be sent as a notification in Ring Central with the following format:
   * {sendout total} {job order accountable } / {job order accountable coach} - {candidate accountable } / {candidate accountable coach}
   * If the accountables are the same, then only the job order accountable is sent
   * @param {string} recruiterName Recruiter name
   * @param {string} coachName Coach name

   * @returns {string} Formatted text for RC message
   */

  getGlipMessage({ total, candidateAccountable, joborderAccountable, isTheSame = false }) {
    if (!total) return '';

    const {
      recruiter: { full_name: caRecruiter = '' },
      coach: { full_name: caCoach = '' },
    } = candidateAccountable;

    const {
      recruiter: { full_name: joRecruiter = '' },
      coach: { full_name: joCoach = '' },
    } = joborderAccountable;

    const joUserMessage = this.formatTeam(joRecruiter, joCoach);
    const caUserMessage = this.formatTeam(caRecruiter, caCoach);

    if (joUserMessage.isEmpty) return '';

    return `${total} ${joUserMessage.message} ${!caUserMessage.isEmpty && !isTheSame ? '-' : ''} ${
      !isTheSame && !caUserMessage.isEmpty ? caUserMessage.message : ''
    }`.trim();
  }
}

module.exports = SendoutMessagingHelper;
