const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const TABLE_NAME = process.env.USER_TABLE_NAME || 'User';
const REGION = process.env.AWS_REGION || 'eu-west-2';

// Legacy boolean flags on the User table, each mirrored to a same-named
// Cognito group so page.tsx / api routes can read them off cognito:groups
// the same way they'd read any other role.
const SYNCED_FLAGS = [
  { legacyField: 'admin', group: 'admin' },
  { legacyField: 'breakLock', group: 'breakLock' },
];

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cognito = new CognitoIdentityProviderClient({ region: REGION });

exports.handler = async (event) => {
  const attrs = event.request.userAttributes;
  if (attrs['custom:groupsSynced'] === 'true') return event;

  const legacyId = attrs['custom:legacyId'];
  if (legacyId) {
    const legacyUser = await findLegacyUserById(legacyId);
    const currentGroups = await getCurrentGroups(event.userPoolId, event.userName);

    for (const { legacyField, group } of SYNCED_FLAGS) {
      const shouldHave = !!(legacyUser && legacyUser[legacyField]);
      const has = currentGroups.includes(group);
      if (shouldHave && !has) {
        await cognito.send(new AdminAddUserToGroupCommand({
          UserPoolId: event.userPoolId, Username: event.userName, GroupName: group,
        }));
      } else if (!shouldHave && has) {
        await cognito.send(new AdminRemoveUserFromGroupCommand({
          UserPoolId: event.userPoolId, Username: event.userName, GroupName: group,
        }));
      }
    }
  }
  // No legacyId means this is a brand-new (post-Cognito) signup - nothing to
  // reconcile from the legacy table, just mark it synced so we don't scan on
  // every future login.

  await cognito.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: event.userPoolId,
    Username: event.userName,
    UserAttributes: [{ Name: 'custom:groupsSynced', Value: 'true' }],
  }));

  return event;
};

async function findLegacyUserById(legacyId) {
  // The User table's key is {ownerID, username}, not indexed by id, so this is
  // a small scan. The table is tiny (dozens of rows) and this only runs once
  // per user, guarded by custom:groupsSynced above.
  const res = await db.send(new ScanCommand({ TableName: TABLE_NAME }));
  return (res.Items || []).find(u => u.id === legacyId) || null;
}

async function getCurrentGroups(userPoolId, username) {
  const res = await cognito.send(new AdminListGroupsForUserCommand({
    UserPoolId: userPoolId,
    Username: username,
  }));
  return (res.Groups || []).map(g => g.GroupName);
}
