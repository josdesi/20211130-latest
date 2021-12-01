'use strict';

// Repositories
const BulkEmailDashboardRepository = new (use('App/Helpers/BulkEmailDashboardRepository'))();

//Utils
const SpreadSheet = use('SpreadSheet');
const { getSupportedSheetFormat, parseBoolean } = use('App/Helpers/Globals');
const Antl = use('Antl');

class BulkEmailDashboardController {
  async totalBulkSent({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const result = await BulkEmailDashboardRepository.totalBulkSent(userFilters, dateRange);

    return response.status(result.code).send(result.data || result);
  }

  async totalBulkStats({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const result = await BulkEmailDashboardRepository.totalBulkStats(userFilters, dateRange);

    return response.status(result.code).send(result.data || result);
  }

  async trendBulkSent({ request, response }) {
    const offset = request.header('Timezone');
    const granularity = request.input(['entityType']);
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const result = await BulkEmailDashboardRepository.trendBulkSent(userFilters, dateRange, offset, granularity);

    return response.status(result.code).send(result.data || result);
  }

  async tableBulkSent({ request, response }) {
    const offset = request.header('Timezone');
    const [userFilters, dateRange] = this.getFilters(request, offset);
    const withoutBulks = request.input(['withoutBulks']);
    const result = await BulkEmailDashboardRepository.tableBulkSent(userFilters, dateRange);
    const downloadSpreadSheet = ({ code }) => userFilters.format && code === 200;

    if (result.data && parseBoolean(withoutBulks)) {
      const withOutBulksResult = await BulkEmailDashboardRepository.getUsersWithoutBulks(result.data, userFilters);

      if (downloadSpreadSheet(withOutBulksResult)) return this.getCSV(response, withOutBulksResult, userFilters.format);
      return response.status(withOutBulksResult.code).send(withOutBulksResult.data || withOutBulksResult);
    }

    if (downloadSpreadSheet(result)) return this.getCSV(response, result, userFilters.format);
    return response.status(result.code).send(result.data || result);
  }

  getCSV(response, result, format) {
    try {
      const csvData = BulkEmailDashboardRepository.convertTableDataToCSV(result.data);
      const fileName = `Bulk-Email-Dashboard-${new Date().toJSON()}`;

      const spreadSheet = new SpreadSheet(response, getSupportedSheetFormat(format));
      spreadSheet.addSheet('Bulk-Dashboard', csvData);
      spreadSheet.download(fileName);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      const result = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'spreadsheet',
        }),
      };
      return response.status(result.code).send(result);
    }
  }

  getFilters(request, offset) {
    const userFilters = request.only(['coachId', 'recruiterId', 'regionalId', 'allRecruiters', 'format']);
    const { startDate, endDate } = request.only(['startDate', 'endDate']);
    const dateRange = BulkEmailDashboardRepository.getDates(startDate, endDate, offset);
    return [userFilters, dateRange];
  }
}

module.exports = BulkEmailDashboardController;
