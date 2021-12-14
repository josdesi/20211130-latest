'use strict';
const Database = use('Database');
const methods = {
  multipleFilterParser: function(input) {
    if (!input) return null;
    if (Array.isArray(input)) return input;
    try {
      const parsedInput = JSON.parse(input);
      return Array.isArray(parsedInput) ? parsedInput : [parsedInput];
    } catch(err) {
      const result = input.split(',');
      return result.length > 0 ? result : null;
    }
  },

  defaultWhereResolver: function ({query, column, value, operator = '='}) {
    query.where(column, operator, value);
  },

  multipleWhereResolver({query, column, value}) {
    query.whereIn(column, value);
  },

  positionFilterResolver: async function({query, column, value}) {
    const relatedPositionsQuery = Database.from('v_positions')
      .select(Database.raw('unnest(v_positions.related_position_ids)'))
      .whereIn('id', value);
    query.whereIn(column, relatedPositionsQuery);
  },

  applyOrderClause: function({column, columnsMap, query, direction}) {
    const validDirections = ['asc', 'desc'];
    const lowerCaseDirection = direction && direction.toLowerCase();
    const directionToApply = validDirections.includes(lowerCaseDirection) ? lowerCaseDirection : 'asc';
    const columnToApply = columnsMap[column];
    if (!columnToApply) return;
    query.orderBy(columnToApply, directionToApply);
  },

  getRadiusFilterResolver: function ({zipColumn, coordsColumn}) {
    return async function({value, query}) {
      const {radius, zips} = value;
      const isRadiusValid = radius && !Number.isNaN(radius);
      const isZipValid = Array.isArray(zips) && zips.length > 0;
      if (!isRadiusValid && !isZipValid) return;
      if (isZipValid && !isRadiusValid) {
        query.whereIn(zipColumn, zips);
        return;
      } else if(isRadiusValid && isZipValid) {
        const distance = radius * 1609.34;
        const zipsWithCoordinates = await Database.table('zip_codes').select(['longitude', 'latitude']).whereIn('zip_ch', zips);
        const rawSentences = zipsWithCoordinates.map((_, index) => `ST_DWithin(${coordsColumn}, ST_MakePoint(:longitude_${index},:latitude_${index})::geography, :distance)`).join(' or ');
        const parametersMap = {distance};
        zipsWithCoordinates.forEach((value, index) => {
          parametersMap[`longitude_${index}`] = value.longitude;
          parametersMap[`latitude_${index}`] = value.latitude;
        })
        query.where(function() {
          this.whereRaw(`(${rawSentences})`, parametersMap).orWhereIn(zipColumn, zips);
        })
  
      }
  
    }
  } 

}

module.exports = methods;
