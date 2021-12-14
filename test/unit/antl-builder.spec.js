'use strict';

// Utils
const { test } = use('Test/Suite')('Antl Builder');
const AntlBuilder = use('App/Helpers/AntlBuilder');

// Constants
const FIELD = 'test field';
const ENTITY = 'entity field';
const REASON = 'reason test';
const TYPE = 'type test';
const ACTION = 'action test';
const SIZE = 'size test';
const ERROR_STRING = 'The Antl message should be an string';
const ERROR_INCLUDE = 'The Antl message does not contains the parameters passed';
const ANTL_ERROR_VARIABLE_NOT_PROVIDED = ' was not provided to the string ';

test('check required() method is working & returning the string with the correct arguments passed', async ({
  assert,
}) => {
  const antlMessage = AntlBuilder.required(FIELD);
  assert.isString(antlMessage, ERROR_STRING);
  assert.include(antlMessage, FIELD, ERROR_INCLUDE);
});

test('check required() method fails if bad arguments are passed', async ({ assert }) => {
  assert.plan(1);
  try {
    const antlMessage = AntlBuilder.required();
    assert.isString(antlMessage, ERROR_STRING);
  } catch (error) {
    assert.include(error.message, ANTL_ERROR_VARIABLE_NOT_PROVIDED);
  }
});

test('check requiredIf() method is working & returning the string with the correct arguments passed', async ({
  assert,
}) => {
  const antlMessage = AntlBuilder.requiredIf(FIELD, REASON);
  assert.isString(antlMessage, ERROR_STRING);
  assert.include(antlMessage, FIELD, ERROR_INCLUDE);
  assert.include(antlMessage, REASON, ERROR_INCLUDE);
});

test('check requiredIf() method fails if bad arguments are passed', async ({ assert }) => {
  assert.plan(1);
  try {
    const antlMessage = AntlBuilder.requiredIf(FIELD);
    assert.isString(antlMessage, ERROR_STRING);
  } catch (error) {
    assert.include(error.message, ANTL_ERROR_VARIABLE_NOT_PROVIDED);
  }
});

test('check type() method is working & returning the string with the correct arguments passed', async ({ assert }) => {
  const antlMessage = AntlBuilder.type(FIELD, TYPE);
  assert.isString(antlMessage, ERROR_STRING);
  assert.include(antlMessage, FIELD, ERROR_INCLUDE);
  assert.include(antlMessage, TYPE, ERROR_INCLUDE);
});

test('check type() method fails if bad arguments are passed', async ({ assert }) => {
  assert.plan(1);
  try {
    const antlMessage = AntlBuilder.type(FIELD);
    assert.isString(antlMessage, ERROR_STRING);
  } catch (error) {
    assert.include(error.message, ANTL_ERROR_VARIABLE_NOT_PROVIDED);
  }
});

test('check exists() method is working & returning the string with the correct arguments passed', async ({
  assert,
}) => {
  const antlMessage = AntlBuilder.exists(ENTITY);
  assert.isString(antlMessage, ERROR_STRING);
  assert.include(antlMessage, ENTITY, ERROR_INCLUDE);
});

test('check exists() method fails if bad arguments are passed', async ({ assert }) => {
  assert.plan(1);
  try {
    const antlMessage = AntlBuilder.exists();
    assert.isString(antlMessage, ERROR_STRING);
  } catch (error) {
    assert.include(error.message, ANTL_ERROR_VARIABLE_NOT_PROVIDED);
  }
});

test('check withOutAll() method is working & returning the string with the correct arguments passed', async ({
  assert,
}) => {
  const antlMessage = AntlBuilder.withOutAll(ACTION, ENTITY);
  assert.isString(antlMessage, ERROR_STRING);
  assert.include(antlMessage, ACTION, ERROR_INCLUDE);
  assert.include(antlMessage, ENTITY, ERROR_INCLUDE);
});

test('check withOutAll() method fails if bad arguments are passed', async ({ assert }) => {
  assert.plan(1);
  try {
    const antlMessage = AntlBuilder.withOutAll(ACTION);
    assert.isString(antlMessage, ERROR_STRING);
  } catch (error) {
    assert.include(error.message, ANTL_ERROR_VARIABLE_NOT_PROVIDED);
  }
});

test('check max() method is working & returning the string with the correct arguments passed', async ({ assert }) => {
  const antlMessage = AntlBuilder.max(FIELD, SIZE);
  assert.isString(antlMessage, ERROR_STRING);
  assert.include(antlMessage, FIELD, ERROR_INCLUDE);
  assert.include(antlMessage, SIZE, ERROR_INCLUDE);
});

test('check max() method fails if bad arguments are passed', async ({ assert }) => {
  assert.plan(1);
  try {
    const antlMessage = AntlBuilder.max(FIELD);
    assert.isString(antlMessage, ERROR_STRING);
  } catch (error) {
    assert.include(error.message, ANTL_ERROR_VARIABLE_NOT_PROVIDED);
  }
});
