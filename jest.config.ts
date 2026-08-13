import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // jest-environment-jsdom defaults to resolving the "browser" package.json
  // export condition, which breaks CJS-only deps that ship a browser/ESM
  // build under that condition (e.g. sinon, pulled in by aws-sdk-client-mock).
  // Fall back to "require"/"default" instead.
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};

export default config;
