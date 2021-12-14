const SearchInformationUpdater = use('App/Helpers/Search/Updater/SearchInformationUpdater');
const Database = use('Database');
const { parseInteger, parseArrayOfIntegers } = use('App/Utils/DataParser');

const COMPANY_SEARCH_INFORMATION_QUERY = `
SELECT COALESCE(
  ST_MakePoint(cp.coordinates[0], cp.coordinates[1])::geography,
  (SELECT ST_MakePoint(zips.longitude, zips.latitude)::geography FROM zip_codes zips where zips.zip_ch = cp.zip LIMIT 1)
  ) as coordinates,
  cp.id as id,
  cp.name as name,
  cp.name as searchable_text,
  TO_TSVECTOR('simple', cp.name) as document_tokens
FROM
  companies cp
`;
class CompanySearchInformationUpdater extends SearchInformationUpdater {
  constructor() {
    super();
  }


  getSearchInformationQueryForId(id) {
    const parsedId = parseInteger(id);
    if (!parsedId) throw new Error(`'id' parameter must be an integer`);
    return `
      ${COMPANY_SEARCH_INFORMATION_QUERY}
      WHERE cp.id = ${parsedId}
    `;
  }

  getUpdateQuery(id) {
    const parsedId = parseInteger(id);
    if (!parsedId) throw new Error(`'id' parameter must be an integer`);
    return `
    UPDATE
      companies
    SET
      searchable_text = search_information.searchable_text,
      document_tokens = search_information.document_tokens,
      coordinates_as_geography = search_information.coordinates
    FROM (
      ${this.getSearchInformationQueryForId(parsedId)}
    ) AS search_information
    WHERE companies.id = ${id}`;
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
      const idsInObjects = await Database.from('companies').select('id').where(foreignKey, value);
      const ids = idsInObjects.map(({id}) => id);
      return await this.updateSearchInformationByIds(ids);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return false;
    }
  }

  getUpdateAllQuery() {
    return `
      UPDATE
        companies
      SET
        searchable_text = search_information.searchable_text,
        document_tokens = search_information.document_tokens,
        coordinates_as_geography = search_information.coordinates
      FROM (
        ${COMPANY_SEARCH_INFORMATION_QUERY}
      ) AS search_information
      WHERE search_information.id = companies.id`;
  }
}

module.exports = CompanySearchInformationUpdater;
