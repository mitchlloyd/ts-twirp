module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^ts-twirp$': '<rootDir>/src',
    '^ts-twirp\/(.*)$': '<rootDir>/src/$1',
  }
};
