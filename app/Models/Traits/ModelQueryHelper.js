'use strict'


const { auditFields } = use('App/Helpers/Globals');
const { upperFirst, get } = use('lodash');

const validMethods = {
 'select': true,
 'orderBy': true,
 'where': true
};

const entitiesThatNeedAuditfields = ['notes','files','activityLogs'];

const schemaToUse = (builder, reference) => {
  if(builder.scope){
    const methodName = builder.customScope ? builder.scope : 'with'.concat(upperFirst(builder.scope));
    typeof reference[methodName] === 'function' && reference[methodName]();
  }else if(builder.relation){
    const { relation, load, hideFields, extend } = builder;
    reference._with({ relation,  hideFields, load, extend});
  }
}

class ModelQueryHelper {
  register (Model, options) {
    Model.queryMacro('include', function (items) {
      for(const item of items){
        schemaToUse(item, this);
      }
      return this;
    })

    Model.queryMacro('hideFields', function ({ fields = [] , hideAuditFields = true , relation = ''}) {
      const fieldsToHide = [];
      fieldsToHide.push(...fields);
      if(hideAuditFields && 
          !entitiesThatNeedAuditfields.includes(relation) && 
          !entitiesThatNeedAuditfields.includes(relation.split('.').pop())
        ){
          fieldsToHide.push(...auditFields);
      }
      this.setHidden(fieldsToHide);
      return this;
    })

    Model.queryMacro('_with', function ({ relation, extend = [], load = [], hideFields = {} }) {
      return this.with(relation, (builder) => {
        builder.hideFields({
          ...hideFields,
          relation
        });
        for(const custom of extend){
          if(custom.method && !validMethods[custom.method]){
            continue;
          }
          builder[custom.method](...custom.params);
        }
        for(const loadItem of load){
          schemaToUse(loadItem, builder);
        }
      });
    })


    /**
     * Remap the key/values from a Model Object
     * if a single position ['*'] is passed returns the same key/values
     * 
     * @method selectCustomMap
     *
     * @param  {Array} fieldsToSelect
     * 
     * @ModelFunction
     */
    Model.prototype.selectCustomMap = function (fieldsToSelect  = []) {
      const jsonData = this.toJSON(); 
      if(fieldsToSelect.length === 1 && fieldsToSelect[0] === '*'){
        return jsonData;
      }
      const newObject = {};
      for(const field of fieldsToSelect){
        let path, newKey;
        const asIndex = field.toLowerCase().indexOf(' as ');
        if (asIndex !== -1) {
          path = field.slice(0, asIndex).trim();
          newKey = field.slice(asIndex + 4).trim();
        }else{
          ([path, newKey] = field.trim().split(/\s+/));
        }
        const splittedPath = path.split('.');
        newObject[newKey ||  splittedPath[splittedPath.length - 1]] = get(jsonData, path, null);
      }
      return newObject;
    }

    /**
     * Define fields to be hidden for a single
     * query.
     *
     * @method setHidden
     *
     * @param  {Array} fields
     * @param  {Array} defaultFieldsToIgnore
     * 
     * @chainable
     */
     Model.queryMacro('setHidden', function (hiddenValues = [], { defaultFieldsToIgnore = []  } = {}) {
      const defaultValuesToHide = Model.hidden || [];
      this._hiddenFields = [ ...hiddenValues, ...defaultValuesToHide];
      if(defaultFieldsToIgnore.length > 0){
        this._hiddenFields = this._hiddenFields.filter((val) => !defaultFieldsToIgnore.includes(val))
      }
      return this;
    })

    
    /**
     * Define hidden model fields to be visibles for a single
     * query.
     * 
     * @method setVisibleHidden
     *
     * @param  {Array} hiddenValues

     * @chainable
     */
    Model.queryMacro('setVisibleHidden', function (hiddenValues = []) {
      this._hiddenFields = this._hiddenFields.filter((field) => !hiddenValues.includes(field));
      return this;
    })

  }
}

module.exports = ModelQueryHelper
