      



const SearchInformationUpdater = use('App/Helpers/Search/Updater/SearchInformationUpdater');
const Database = use('Database');
const { parseInteger, parseArrayOfIntegers } = use('App/Utils/DataParser');

const JOB_ORDER_SEARCH_INFORMATION_QUERY = `
SELECT COALESCE(
  ST_MakePoint(address.coordinates[0], address.coordinates[1])::geography,
  ST_MakePoint(cp.coordinates[0], cp.coordinates[1])::geography,
  (SELECT ST_MakePoint(zips.longitude, zips.latitude)::geography FROM zip_codes zips where zips.zip_ch = address.zip LIMIT 1)
  ) as coordinates,
  jo.id as id
FROM
  job_orders jo
LEFT JOIN addresses address ON address.id = jo.address_id
LEFT JOIN companies cp ON cp.id = jo.company_id
`;
class JobOrderSearchInformationUpdater extends SearchInformationUpdater {
  constructor() {

    super();
  }

  getSearchInformationQueryForId(id) {
    const parsedId = parseInteger(id);
    if (!parsedId) throw new Error(`'id' parameter must be an integer`);
    return `
      ${JOB_ORDER_SEARCH_INFORMATION_QUERY}
      WHERE jo.id = ${parsedId}
    `;
  }

  getUpdateQuery(id) {
    const parsedId = parseInteger(id);
    if (!parsedId) throw new Error(`'id' parameter must be an integer`);
    return `
    UPDATE job_orders SET
      coordinates = search_information.coordinates
    FROM (
      ${this.getSearchInformationQueryForId(parsedId)}
    ) AS search_information
    WHERE job_orders.id = ${parsedId}`
  }

  async updateSearchInformationByIds(inputIds) {
    const parsedIds = parseArrayOfIntegers(inputIds);
    if (parsedIds.length === 0) return; 
    let errors = [], success = [];
    for (const parsedId of parsedIds) {
      const updateQuery = this.getUpdateQuery(parsedId);
      try {
        await Database.raw(updateQuery);
        success.push(parsedId);
      } catch(error) {
        errors.push({id: parsedId, error});
      }
    }
    return {success, errors};
  }

  async updateSearchInformationForeignKey(foreignKey, value) {
    try {
      const idsInObjects = await Database.from('job_orders').select('id').where(foreignKey, value);
      const ids = idsInObjects.map(({id}) => id);
      return await this.updateSearchInformationByIds(ids);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return false;
    }
  }

  getUpdateAllQuery() {
    return `
    UPDATE job_orders SET
      coordinates = search_information.coordinates
    FROM (
      ${JOB_ORDER_SEARCH_INFORMATION_QUERY}
    ) AS search_information
    WHERE search_information.id = job_orders.id`;
  }
}

module.exports = JobOrderSearchInformationUpdater;
