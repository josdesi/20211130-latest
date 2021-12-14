class SearchInformationUpdater {
  constructor() {
    const expectedFunctions = [
      'updateSearchInformationByIds',
      'updateSearchInformationForeignKey',
      'getUpdateAllQuery'
    ];
    for(const expectedFuction of expectedFunctions) {
      if (!(this[expectedFuction] instanceof Function)) throw new Error(`${expectedFuction} must be implemented`);
    }

  }
}

module.exports = SearchInformationUpdater;