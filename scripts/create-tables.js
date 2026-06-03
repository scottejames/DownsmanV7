const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ endpoint: 'http://localhost:8000', region: 'eu-west-2' });

const tables = [
  {
    TableName: 'User',
    KeySchema: [
      { AttributeName: 'ownerID', KeyType: 'HASH' },
      { AttributeName: 'username', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'ownerID', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' },
    ],
  },
  {
    TableName: 'Team',
    KeySchema: [
      { AttributeName: 'ownerID', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'ownerID', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
  },
  {
    TableName: 'Scouts',
    KeySchema: [
      { AttributeName: 'ownerID', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'ownerID', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
  },
  {
    TableName: 'Support',
    KeySchema: [
      { AttributeName: 'ownerID', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'ownerID', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
  },
  {
    TableName: 'Log',
    KeySchema: [
      { AttributeName: 'ownerID', KeyType: 'HASH' },
      { AttributeName: 'id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'ownerID', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' },
    ],
  },
];

async function createTables() {
  for (const table of tables) {
    try {
      await client.send(new CreateTableCommand({
        ...table,
        BillingMode: 'PAY_PER_REQUEST',
      }));
      console.log(`Created: ${table.TableName}`);
    } catch (e) {
      if (e.name === 'ResourceInUseException') {
        console.log(`Already exists: ${table.TableName}`);
      } else {
        console.error(`Error creating ${table.TableName}:`, e.message);
      }
    }
  }
}

createTables();
