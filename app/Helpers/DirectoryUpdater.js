/**
 * This class is meant to be used as an interface which requires three methods to be implemented:
 * - updateOrCreateDirectoryInformation which updates the directory information of an entity, if doesn't exists is created.
 * - deleteDirectoryInformation must be called when the entity is not part of the inventory anymore, when it's deleted.
 * - synchronizeAllUnSynchronized creates all directory informations for all the entities that are not registered yet.
 */
class DirectoryUpdater {
  constructor() {
    if (!(this.updateOrCreateDirectoryInformation instanceof Function))
      throw new Error('updateOrDirectoryInformation not should be implemented');
    if (!(this.deleteDirectoryInformation instanceof Function))
      throw new Error('deleteDirectoryInformation not should be implemented');
    if (!(this.synchronizeAllUnSynchronized instanceof Function))
      throw new Error('synchronizeAllUnSynchronized not should be implemented');

    if (!(this.updateAllExistents instanceof Function))
      throw new Error('updateAllExistents not should be implemented');
    
    if (!(this.refreshByForeignKey instanceof Function))
      throw new Error('refreshByForeignKey not should be implemented');

    if (!(this.getSynchronizationQuery instanceof Function))
      throw new Error('getSynchronizationQuery not should be implemented');

    if (!(this.getUpdateAllQuery instanceof Function))
      throw new Error('getUpdateAllQuery not should be implemented');
  }

    

  getDirectoryInformationId(id) {
    return `${this.nameType}-${id}`;
  }

  async updateOrCreateMultipleDirectoryInformation(ids) {
    const promises = ids.map(id => this.updateOrCreateDirectoryInformation(id));
    return await Promise.all(promises);
  }

}

module.exports = DirectoryUpdater;
