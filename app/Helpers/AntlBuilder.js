'use strict';

/**
 *
 * A quick way to call the most common messages in the validatos,
 * so instead of doing `Antl.formatMessage('messages.validation.required_if', { field: 'search project name', reason: 'is required if needed' });`
 * this can be used `requiredIf('search project name', 'is required if needed'),`
 * and removes the doubt of human typo errores, since these methods are less likely to fail
 *
 */

//Utils
const Antl = use('Antl');

/**
 * Builds the variables that will be passed to Antl, by using the passed variables
 *
 * @summary The reason why this is here is that we don't want to throw away the Antl validation. If any variable is a falsy value, that variable is removed
 *  making Antl to detect it as not passed, causing the desired error.
 *
 * @param {Object} passedVariables - The context variables desired to be passed to the Antl formatMessage
 *
 * @return {Object} contextVariables - The object that contains the non-falsy variables
 */
const buildContextVariables = (passedVariables = {}) => {
  const contextVariables = {};
  for (const [key, value] of Object.entries(passedVariables)) {
    if (value) contextVariables[key] = value;
  }
  return contextVariables;
};

const methods = {
  required(field) {
    const contextVariables = buildContextVariables({ field });
    return Antl.formatMessage('messages.validation.required', contextVariables);
  },

  requiredIf(field, reason) {
    const contextVariables = buildContextVariables({ field, reason });
    return Antl.formatMessage('messages.validation.required_if', contextVariables);
  },

  type(field, type) {
    const contextVariables = buildContextVariables({ field, type });
    return Antl.formatMessage('messages.validation.type', contextVariables);
  },

  exists(entity) {
    const contextVariables = buildContextVariables({ entity });
    return Antl.formatMessage('messages.validation.notExist', contextVariables);
  },

  withOutAll(action, entity) {
    const contextVariables = buildContextVariables({ action, entity });
    return Antl.formatMessage('messages.validation.withOutAll', contextVariables);
  },

  max(field, size) {
    const contextVariables = buildContextVariables({ field, size });
    return Antl.formatMessage('messages.validation.max', contextVariables);
  },
};

module.exports = methods;
