'use strict';

const { test, trait, before, after } = use('Test/Suite')('Bulk email templates');

//Models
const EmailTemplate = use('App/Models/EmailTemplate');
const EmailTemplateFolder = use('App/Models/EmailTemplateFolder');
const EmailBody = use('App/Models/EmailBody');
const EmailHistory = use('App/Models/EmailHistory');

//Utils
const Helpers = use('Helpers');
const Database = use('Database');
const url = 'api/v1';
const baseUrl = `${url}/bulk-emails/templates`;
const { EmailOptOutTypes, BulkEmailScopeTypes, Smartags } = use('App/Helpers/Globals');
const moment = use('moment');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let rootFolderId;
let templateFolder;
let templateFolderChildren;
let template;
let templateBody;
let folderName;
let folderChildrenName;

const subject = 'Bulk Email testing';
const text = 'This email was part of a test, please ignore it!';
const html = '<strong>This</strong> email was part of a test, please ignore it!';

before(async () => {
  folderName = `Folder unit testing ${moment.now()}`;
  folderChildrenName = `Folder children unit testing ${moment.now()}`;
});

test('Should return 200 when all bulk email templates are requested, creating the user test folders', async ({
  client,
  user,
  assert,
}) => {
  const response = await client.get(`${url}/bulk-emails/templates`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['gpac', 'shared', 'mine']);
  rootFolderId = (
    await EmailTemplateFolder.query().where('created_by', user.id).where('is_default_folder', true).first()
  ).toJSON().id;
});

test('Should return 401 when not sending a token', async ({ assert, client, user }) => {
  assert.plan(1);
  const response = await client.post(`${baseUrl}`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a bulk email template folder', async ({ client, user, assert }) => {
  const response = await client
    .post(`${url}/bulk-emails/folders`)
    .loginVia(user, 'jwt')
    .send({
      name: folderName,
      parent_folder_id: rootFolderId,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    name: folderName,
    parent_folder_id: rootFolderId,
  });
  assert.containsAllKeys(response.body, [
    'created_by',
    'name',
    'is_private',
    'parent_folder_id',
    'is_system_folder',
    'created_at',
    'updated_at',
    'id',
    'entity',
    'parent_folder_tree',
  ]);

  templateFolder = await EmailTemplateFolder.findOrFail(response.body.id);
});

test('Should return 201 when creating a bulk email template folder children', async ({ client, user }) => {
  const response = await client
    .post(`${url}/bulk-emails/folders`)
    .loginVia(user, 'jwt')
    .send({
      name: folderChildrenName,
      parent_folder_id: templateFolder.id,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    name: folderChildrenName,
    parent_folder_id: templateFolder.id,
  });

  templateFolderChildren = await EmailTemplateFolder.findOrFail(response.body.id);
});

test('Should return 201 when creating a bulk email template', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      bulk_email_scope_type_id: BulkEmailScopeTypes.Recruiting,
      name: 'Template test validator',
      parent_folder_id: templateFolder.id,
      subject,
      text,
      html,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    name: 'Template test validator',
    created_by: user.id,
    email_template_folder_id: templateFolder.id,
    emailBody: {
      subject,
      text,
      html,
      attachments: [],
    },
  });

  assert.containsAllKeys(response.body, [
    'name',
    'created_by',
    'email_body_id',
    'email_template_folder_id',
    'created_at',
    'updated_at',
    'id',
    'emailBody',
    'entity',
    'parent_folder_tree',
    'bulkType',
    'bulk_email_scope_type_id',
  ]);

  template = await EmailTemplate.findOrFail(response.body.id);
  templateBody = await EmailBody.findOrFail(response.body.emailBody.id);
});

test('Should return 200 when all bulk email templates are requested', async ({ client, user, assert }) => {
  const filter = `?keyword=validator`;
  const response = await client.get(`${baseUrl}/${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  // assert.containsAllKeys(response.body, ['gpac', 'shared', 'mine']);
  assert.containsAllKeys(response.body, ['gpac', 'mine']);
  assert.containsAllKeys(response.body.mine[0], [
    'id',
    'created_by',
    'name',
    'created_at',
    'updated_at',
    'is_private',
    'parent_folder_id',
    'created_by_name',
    'entity',
    'children',
  ]);
});

test('Should return 200 when one bulk email template is requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/${template.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, [
    'bulkType',
    'bulk_email_scope_type_id',
    'id',
    'name',
    'created_by',
    'email_body_id',
    'email_template_folder_id',
    'created_at',
    'updated_at',
    'emailBody',
    'emailTemplateFolder',
    'parent_folder_id',
    'parent_folder_tree',
    'entity',
  ]);
  assert.containsAllKeys(response.body.emailBody, [
    'id',
    'subject',
    'text',
    'html',
    'created_at',
    'updated_at',
    'attachments',
  ]);
});

test('Should return 200 when updating a bulk email template', async ({ client, user, assert }) => {
  const response = await client
    .put(`${baseUrl}/${template.id}`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Template test validator 2',
      parent_folder_id: templateFolder.id,
      subject,
      text,
      html,
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    id: template.id,
    name: 'Template test validator 2',
    created_by: user.id,
    email_template_folder_id: templateFolder.id,
    emailBody: {
      id: templateBody.id,
      subject,
      text,
      html,
      attachments: [],
    },
  });

  assert.containsAllKeys(response.body, [
    'name',
    'created_by',
    'email_body_id',
    'email_template_folder_id',
    'created_at',
    'updated_at',
    'id',
    'emailBody',
    'entity',
    'parent_folder_tree',
    'emailTemplateFolder',
    'bulkType',
    'bulk_email_scope_type_id',
  ]);
});

test('Should return 200 when deleting a bulk email template', async ({ client, user }) => {
  const response = await client.delete(`${baseUrl}/${template.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset({
    id: template.id,
    name: 'Template test validator 2',
    created_by: user.id,
    email_template_folder_id: templateFolder.id,
    emailBody: {
      id: templateBody.id,
      subject,
      text,
      html,
      attachments: [],
    },
  });
});

test('Should return 200 when deleting a bulk email template folder children', async ({ client, user }) => {
  const response = await client
    .delete(`${url}/bulk-emails/folders/${templateFolderChildren.id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    id: templateFolderChildren.id,
    created_by: user.id,
    name: folderChildrenName,
    is_private: templateFolder.is_private,
  });
});

test('Should return 200 when deleting a bulk email template folder', async ({ client, user }) => {
  const response = await client.delete(`${url}/bulk-emails/folders/${templateFolder.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset({
    id: templateFolder.id,
    created_by: user.id,
    name: folderName,
  });
});

test('Should return 200 when requesting the Smartags', async ({ client, user, assert }) => {
  const parsedSmartags = Smartags.map(({ value, name }) => {
    return { value: `{{${value}}}`, name };
  });
  const response = await client.get(`${url}/bulk-emails/smartags`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset(parsedSmartags);
});

after(async () => {
  if (templateBody) {
    await templateBody.delete();
  }

  if (template) {
    await template.delete();
  }

  if (templateFolderChildren) {
    await templateFolderChildren.delete();
  }

  if (templateFolder) {
    await templateFolder.delete();
  }
});
