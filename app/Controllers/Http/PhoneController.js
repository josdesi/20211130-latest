'use strict'

const PhoneRepository = new (use('App/Helpers/PhoneRepository'))();
const UserRepository = new (use("App/Helpers/UserRepository"))();
const { parseBoolean } = use('App/Helpers/Globals');

class PhoneController {
  getFilters(request, offset) {
    const userFilters = request.only(['coachId', 'recruiterId', 'regionalId']);
    let { startDate, endDate } = request.only(['startDate', 'endDate']);
    const dateRange = PhoneRepository.getDates(startDate, endDate, offset);
    return [userFilters, dateRange];
  }

  async totalCallsInventory({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    
    const result = await PhoneRepository.graphTotalCallsData(userFilters, dateRange);
    return response.status(result.code).send(result.data || result);
  }

  async totalCallsInventoryList({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const withoutItems = parseBoolean(request.input(['withoutItems']));
    const result = await PhoneRepository.listCallsInventory(userFilters, dateRange);
    if (result.data && withoutItems) {
      const res = await PhoneRepository.getUsersWithoutItems(result.data, userFilters);
      return response.status(res.code).send(res.data || res);
    }

    return response.status(result.code).send(result.data || result);
  }

  async callsInventoryListByRecruiter({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    
    const result = await PhoneRepository.listCallsInventoryByRecruiter(userFilters, dateRange);
    return response.status(result.code).send(result.data || result);
  }

  async totalCallsActivityInTime({ request, response }) {
    const offset = request.header('Timezone');
    const granularity = request.input(['entityType']);
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const result = await PhoneRepository.lineGraphTotalCallsActivity(
      userFilters,
      dateRange,
      offset,
      granularity
    );

    return response.status(result.code).send(result.data || result);
  }

  async totalSMSInventory({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);

    const result = await PhoneRepository.graphTotalSMSData(userFilters, dateRange);
    return response.status(result.code).send(result.data || result);
  }

  async totalSMSInventoryList({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const withoutItems = parseBoolean(request.input(['withoutItems']));
    const result = await PhoneRepository.listSMSInventory(userFilters, dateRange);
    if (result.data && withoutItems) {
      const res = await PhoneRepository.getUsersWithoutItems(result.data, userFilters);
      return response.status(res.code).send(res.data || res);
    }

    return response.status(result.code).send(result.data || result);
  }

  async totalSMSActivityInTime({ request, response }) {
    const offset = request.header('Timezone');
    const granularity = request.input(['entityType']);
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const result = await PhoneRepository.lineGraphTotalSMSActivity(
      userFilters,
      dateRange,
      offset,
      granularity
    );

    return response.status(result.code).send(result.data || result);
  }

  async phoneLastUpdate({ request, response }) {
    const offset = request.header('Timezone');
    
    const result = await PhoneRepository.getPhoneLogsLastUpdate(offset);
    return response.status(result.code).send(result.data || result);
  }

  async newRecordsInserted({ response }) {
    const result = await PhoneRepository.notifyNewRecords();

    return response.status(result.code).send(result);
  }

  async newActivityLogsInserted({ request, response }) {
    const { activityLogs } = request.body;
    const result = await PhoneRepository.notifyNewActivityLogs(activityLogs);

    return response.status(result.code).send(result);
  }

  async trackPhoneEvent({ auth, request, response }){
    const user = await UserRepository.getDetails(auth.current.user.id);
    const { dataEvent, activityLogTypeId } = request.body;
    const result = await PhoneRepository.registerPhoneActivityLog(dataEvent, user, activityLogTypeId);

    return response.status(result.code).send(result);
  }

  async sendPhoneMetricsCoach({ request, response }) {
    const timezone = request.input('timezone');
    const result = await PhoneRepository.sendEmailCoach(timezone);

    return response.status(result.code).send(result);
  }

  async sendPhoneMetricsRegional({ request, response }) {
    const timezone = request.input('timezone');
    const result = await PhoneRepository.sendEmailRegional(timezone);

    return response.status(result.code).send(result);
  }
}

module.exports = PhoneController

