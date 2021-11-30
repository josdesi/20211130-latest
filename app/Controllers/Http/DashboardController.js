'use strict';

const DashboardRepository = new (use('App/Helpers/DashboardRepository'))();

class DashboardController {
  getFilters(request, offset) {
    const userFilters = request.only(['coachId', 'recruiterId', 'regionalId']);
    const { startDate, endDate } = request.only(['startDate', 'endDate']);
    const digFilters = request.only(['specialtyId', 'stateId', 'industryId']);
    const dateRange = DashboardRepository.getDates(startDate, endDate, offset);
    return [userFilters, dateRange, digFilters];
  }

  async totalInventory({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange, digFilters] = this.getFilters(request, offset);
    const result = await DashboardRepository.graphTotalInventory(userFilters, dateRange, digFilters);

    return response.status(result.code).send(result.data || result);
  }

  async totalListInventory({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange, digFilters] = this.getFilters(request, offset);
    const withoutItems = request.input(['withoutItems']);
    const result = await DashboardRepository.listInventory(userFilters, dateRange, digFilters);

    if (result.data && withoutItems === 'true') {
      const res = await DashboardRepository.getUsersWithoutItems(result.data, userFilters);
      return response.status(res.code).send(res.data || res);
    }

    return response.status(result.code).send(result.data || result);
  }

  async candidateOrJobOrderTypesOrStatus({ request, response }) {
    const offset = request.header('Timezone');
    const { identifier, entityType } = request.only(['format', 'entityType', 'identifier']);
    const [userFilters, dateRange, digFilters] = this.getFilters(request, offset);
    const result = await DashboardRepository.graphCandidateOrJobOrderTypesOrStatus(
      userFilters,
      dateRange,
      digFilters,
      entityType,
      identifier
    );

    return response.status(result.code).send(result.data || result);
  }

  async totalListActivityCompany({ request, response }) {
    const offset = request.header('Timezone');
    const entityType = request.input(['entityType']);
    const [userFilters, dateRange, digFilters] = this.getFilters(request, offset);
    const withoutItems = request.input(['withoutItems']);
    const result = await DashboardRepository.listActivity(userFilters, dateRange, digFilters, entityType);

    if (result.data && withoutItems === 'true') {
      const res = await DashboardRepository.getUsersWithoutItems(result.data, userFilters);
      return response.status(res.code).send(res.data || res);
    }

    return response.status(result.code).send(result.data || result);
  }

  async totalActivityNoteInTime({ request, response }) {
    const offset = request.header('Timezone');
    const granularity = request.input(['entityType']);
    const [userFilters, dateRange, digFilters] = this.getFilters(request, offset);
    const result = await DashboardRepository.lineGraphTotalActivityNote(
      userFilters,
      dateRange,
      digFilters,
      offset,
      granularity
    );

    return response.status(result.code).send(result.data || result);
  }

  async candidateOrJobOrderListTypesOrStatus({ request, response }) {
    const offset = request.header('Timezone');
    const { identifier, entityType } = request.only(['identifier', 'entityType']);

    const [userFilters, dateRange, digFilters] = this.getFilters(request, offset);
    const result = await DashboardRepository.listCandidateOrJobOrderTypesOrStatus(
      userFilters,
      dateRange,
      digFilters,
      entityType,
      identifier
    );

    return response.status(result.code).send(result.data || result);
  }
}

module.exports = DashboardController;
