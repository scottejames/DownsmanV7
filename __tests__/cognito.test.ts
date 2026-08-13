import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  NotAuthorizedException,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { login, register, refresh, AuthError } from '@/services/cognito';

process.env.COGNITO_USER_POOL_ID = 'test-pool';
process.env.COGNITO_CLIENT_ID = 'test-client';
process.env.COGNITO_REGION = 'eu-west-2';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

beforeEach(() => cognitoMock.reset());

describe('login', () => {
  it('returns tokens on success', async () => {
    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      AuthenticationResult: { IdToken: 'id', AccessToken: 'access', RefreshToken: 'refresh', ExpiresIn: 3600 },
    });
    const result = await login('scott', 'password1');
    expect(result).toEqual({
      kind: 'tokens',
      tokens: { idToken: 'id', accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 },
    });
  });

  it('returns a challenge when a new password is required', async () => {
    cognitoMock.on(AdminInitiateAuthCommand).resolves({ ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 'sess-1' });
    const result = await login('scott', 'temp-pass');
    expect(result).toEqual({ kind: 'newPasswordRequired', session: 'sess-1' });
  });

  it('throws AuthError on bad credentials', async () => {
    cognitoMock.on(AdminInitiateAuthCommand).rejects(
      new NotAuthorizedException({ message: 'Incorrect username or password.', $metadata: {} })
    );
    await expect(login('scott', 'wrong')).rejects.toThrow(AuthError);
  });
});

describe('register', () => {
  it('creates the user and immediately promotes the password to permanent', async () => {
    cognitoMock.on(AdminCreateUserCommand).resolves({});
    cognitoMock.on(AdminSetUserPasswordCommand).resolves({});

    await register('newuser', 'password1', 'new@example.com', '07000000000');

    expect(cognitoMock.commandCalls(AdminCreateUserCommand)[0].args[0].input).toMatchObject({
      Username: 'newuser',
      TemporaryPassword: 'password1',
      MessageAction: 'SUPPRESS',
    });
    expect(cognitoMock.commandCalls(AdminSetUserPasswordCommand)[0].args[0].input).toMatchObject({
      Username: 'newuser',
      Password: 'password1',
      Permanent: true,
    });
  });

  it('throws AuthError when the username is taken', async () => {
    cognitoMock.on(AdminCreateUserCommand).rejects(
      new UsernameExistsException({ message: 'User already exists', $metadata: {} })
    );
    await expect(register('scott', 'password1')).rejects.toThrow(AuthError);
  });
});

describe('refresh', () => {
  it('returns new tokens, falling back to the given refresh token if none is reissued', async () => {
    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      AuthenticationResult: { IdToken: 'new-id', AccessToken: 'new-access', ExpiresIn: 3600 },
    });
    const tokens = await refresh('old-refresh');
    expect(tokens).toEqual({ idToken: 'new-id', accessToken: 'new-access', refreshToken: 'old-refresh', expiresIn: 3600 });
  });

  it('throws AuthError when the refresh token is invalid', async () => {
    cognitoMock.on(AdminInitiateAuthCommand).rejects(
      new NotAuthorizedException({ message: 'Refresh Token has expired', $metadata: {} })
    );
    await expect(refresh('bad-token')).rejects.toThrow(AuthError);
  });
});
