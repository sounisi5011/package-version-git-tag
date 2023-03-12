module.exports = {
  extensions: ['ts'],
  files: ['./test/**/*.ts', '!**/helpers/**/*'],
  require: ['ts-node/register/transpile-only'],
  timeout: '5m',
};
