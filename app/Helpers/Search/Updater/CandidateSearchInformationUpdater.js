      



const SearchInformationUpdater = use('App/Helpers/Search/Updater/SearchInformationUpdater');
const Database = use('Database');
const { parseInteger, parseArrayOfIntegers } = use('App/Utils/DataParser');

const CANDIDATE_SEARCH_INFORMATION_QUERY = `
SELECT COALESCE(
  ST_MakePoint(address.coordinates[0], address.coordinates[1])::geography,
  ST_MakePoint(cp.coordinates[0], cp.coordinates[1])::geography,
  (SELECT ST_MakePoint(zips.longitude, zips.latitude)::geography FROM zip_codes zips where zips.zip_ch = address.zip LIMIT 1)
  ) as coordinates,
  ca.id as id
FROM
  candidates ca
JOIN personal_informations pi_ca ON ca.personal_information_id = pi_ca.id
LEFT JOIN addresses address ON address.id = pi_ca.address_id
LEFT JOIN (select distinct candidate_id, company_id from company_has_candidate_employees where is_current_company = true) as candidate_employees ON ca.id = candidate_employees.candidate_id
LEFT JOIN companies cp ON cp.id = candidate_employees.company_id
`;
class CandidateSearchInformationUpdater extends SearchInformationUpdater {
  constructor() {

    super();
  }


  getSearchInformationQueryForId(id) {
    const parsedId = parseInteger(id);
    if (!parsedId) throw new Error(`'id' parameter must be an integer`);
    return `
      ${CANDIDATE_SEARCH_INFORMATION_QUERY}
      WHERE ca.id = ${parsedId}
    `;
  }

  getUpdateQuery(id) {
    const parsedId = parseInteger(id);
    if (!parsedId) throw new Error(`'id' parameter must be an integer`);
    return `
    UPDATE candidates SET
      coordinates = search_information.coordinates
    FROM (
      ${this.getSearchInformationQueryForId(parsedId)}
    ) AS search_information
    WHERE candidates.id = ${parsedId}`
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
      const idsInObjects = await Database.from('candidates').select('id').where(foreignKey, value);
      const ids = idsInObjects.map(({id}) => id);
      return await this.updateSearchInformationByIds(ids);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return false;
    }
  }

  getUpdateAllQuery() {
    return `
    UPDATE candidates SET
      coordinates = search_information.coordinates
    FROM (
      ${CANDIDATE_SEARCH_INFORMATION_QUERY}
    ) AS search_information
    WHERE search_information.id = candidates.id`;
  }
}

module.exports = CandidateSearchInformationUpdater;
