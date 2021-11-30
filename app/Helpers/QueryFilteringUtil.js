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
  }

}

module.exports = methods;
