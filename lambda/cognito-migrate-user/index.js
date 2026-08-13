const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.USER_TABLE_NAME || 'User';
const REGION = process.env.AWS_REGION || 'eu-west-2';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// Deliberately duplicated from src/utils/hash.ts rather than shared - this Lambda
// ships as its own zip with no build step, and this is the last place this
// (deliberately weak, legacy-only) hash should ever run.
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

exports.handler = async (event) => {
  const username = event.userName;

  const res = await db.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { ownerID: 'None', username },
  }));
  const legacyUser = res.Item;

  if (!legacyUser) {
    throw new Error('Bad credentials');
  }

  if (event.triggerSource === 'UserMigration_Authentication') {
    const password = event.request.password;
    if (!password || legacyUser.password !== hashPassword(password)) {
      throw new Error('Bad credentials');
    }
  }
  // UserMigration_ForgotPassword has no password to check here - the user is
  // migrating via "forgot password", so the legacy record's existence is enough
  // to seed the Cognito user; Cognito's own emailed confirmation code is the
  // actual gate before a new password is set.

  const userAttributes = {
    'custom:legacyId': legacyUser.id,
  };
  if (legacyUser.email) {
    userAttributes.email = legacyUser.email;
    userAttributes.email_verified = 'true';
  }

  event.response.userAttributes = userAttributes;
  event.response.finalUserStatus = 'CONFIRMED';
  event.response.messageAction = 'SUPPRESS';

  return event;
};
