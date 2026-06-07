const paths = {
  '@gitroom/backend/(.*)': '<rootDir>/apps/backend/src/$1',
  '@gitroom/frontend/(.*)': '<rootDir>/apps/frontend/src/$1',
  '@gitroom/helpers/(.*)': '<rootDir>/libraries/helpers/src/$1',
  '@gitroom/nestjs-libraries/(.*)':
    '<rootDir>/libraries/nestjs-libraries/src/$1',
  '@gitroom/react/(.*)': '<rootDir>/libraries/react-shared-libraries/src/$1',
  '@gitroom/plugins/(.*)': '<rootDir>/libraries/plugins/src/$1',
  '@gitroom/orchestrator/(.*)': '<rootDir>/apps/orchestrator/src/$1',
  '@gitroom/extension/(.*)': '<rootDir>/apps/extension/src/$1',
};

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          isolatedModules: true,
          module: 'commonjs',
          target: 'es2020',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          baseUrl: '.',
        },
      },
    ],
  },
  moduleNameMapper: paths,
};
