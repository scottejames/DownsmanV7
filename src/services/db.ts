import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { UserModel, TeamModel, ScoutModel, SupportModel, LogModel } from '../models/types';
import { hashPassword } from '../utils/hash';

const isDev = process.env.DM_DEV !== 'false';

const client = new DynamoDBClient(
  isDev
    ? { endpoint: 'http://localhost:8000', region: 'eu-west-2' }
    : { region: 'eu-west-2' }
);

const db = DynamoDBDocumentClient.from(client);

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<UserModel[]> {
  const res = await db.send(new QueryCommand({
    TableName: 'User',
    KeyConditionExpression: 'ownerID = :o',
    ExpressionAttributeValues: { ':o': 'None' },
  }));
  return (res.Items || []) as UserModel[];
}

export async function findUserByUsername(username: string): Promise<UserModel | null> {
  const users = await getAllUsers();
  return users.find(u => u.username === username) || null;
}

export async function login(username: string, password: string): Promise<UserModel | null> {
  if (!username || !password) return null;
  const user = await findUserByUsername(username);
  if (!user) return null;
  if (user.password === hashPassword(password)) return user;
  return null;
}

export async function addUser(user: UserModel): Promise<UserModel> {
  if (!user.id) user.id = uuid();
  await db.send(new PutCommand({
    TableName: 'User',
    Item: { ownerID: 'None', ...user },
  }));
  return user;
}

export async function updateUser(user: UserModel): Promise<void> {
  await db.send(new PutCommand({
    TableName: 'User',
    Item: { ownerID: 'None', ...user },
  }));
}

export async function deleteUser(username: string): Promise<void> {
  await db.send(new DeleteCommand({
    TableName: 'User',
    Key: { ownerID: 'None', username },
  }));
}

// ─── Teams ───────────────────────────────────────────────────────────────────

export async function getTeamsByOwner(ownerID: string): Promise<TeamModel[]> {
  const res = await db.send(new QueryCommand({
    TableName: 'Team',
    KeyConditionExpression: 'ownerID = :o',
    ExpressionAttributeValues: { ':o': ownerID },
  }));
  return (res.Items || []) as TeamModel[];
}

export async function getAllTeams(): Promise<TeamModel[]> {
  const res = await db.send(new ScanCommand({ TableName: 'Team' }));
  return (res.Items || []) as TeamModel[];
}

export async function saveTeam(team: TeamModel): Promise<TeamModel> {
  if (!team.id) team.id = uuid();
  await db.send(new PutCommand({ TableName: 'Team', Item: team }));
  return team;
}

export async function deleteTeam(team: TeamModel): Promise<void> {
  // Delete associated scouts and support
  const scouts = await getScoutsByOwner(team.id!);
  for (const s of scouts) await deleteScout(s.ownerID, s.id!);
  const support = await getSupportByOwner(team.id!);
  for (const s of support) await deleteSupport(s.ownerID, s.id!);
  await db.send(new DeleteCommand({ TableName: 'Team', Key: { ownerID: team.ownerID, id: team.id } }));
}

// ─── Scouts ──────────────────────────────────────────────────────────────────

export async function getScoutsByOwner(ownerID: string): Promise<ScoutModel[]> {
  const res = await db.send(new QueryCommand({
    TableName: 'Scouts',
    KeyConditionExpression: 'ownerID = :o',
    ExpressionAttributeValues: { ':o': ownerID },
  }));
  return (res.Items || []) as ScoutModel[];
}

export async function saveScout(scout: ScoutModel): Promise<ScoutModel> {
  if (!scout.id) scout.id = uuid();
  await db.send(new PutCommand({ TableName: 'Scouts', Item: scout }));
  return scout;
}

export async function deleteScout(ownerID: string, id: string): Promise<void> {
  await db.send(new DeleteCommand({ TableName: 'Scouts', Key: { ownerID, id } }));
}

// ─── Support ─────────────────────────────────────────────────────────────────

export async function getSupportByOwner(ownerID: string): Promise<SupportModel[]> {
  const res = await db.send(new QueryCommand({
    TableName: 'Support',
    KeyConditionExpression: 'ownerID = :o',
    ExpressionAttributeValues: { ':o': ownerID },
  }));
  return (res.Items || []) as SupportModel[];
}

export async function saveSupport(support: SupportModel): Promise<SupportModel> {
  if (!support.id) support.id = uuid();
  await db.send(new PutCommand({ TableName: 'Support', Item: support }));
  return support;
}

export async function deleteSupport(ownerID: string, id: string): Promise<void> {
  await db.send(new DeleteCommand({ TableName: 'Support', Key: { ownerID, id } }));
}

// ─── Logs ────────────────────────────────────────────────────────────────────

export async function logEvent(who: string, what: string): Promise<void> {
  const log: LogModel = { id: uuid(), who, when: new Date().toISOString(), what };
  await db.send(new PutCommand({ TableName: 'Log', Item: { ownerID: 'log', ...log } }));
}
