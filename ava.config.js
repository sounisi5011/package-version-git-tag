export default {
  extensions: ['ts'],
  files: ['./test/**/*.ts', '!**/helpers/**/*'],
  require: ['ts-node/register/transpile-only'],
};
