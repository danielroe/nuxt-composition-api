module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  verbose: true,
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/test/unit/setup'],
  moduleNameMapper: {
    '@nuxtjs/composition-api/dist/runtime/globals':
      '<rootDir>/src/runtime/globals',
    '@nuxtjs/composition-api/dist/runtime/register':
      '<rootDir>/src/runtime/register',
  },
}
