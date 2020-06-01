export default {
  compileEnhancements: false,
  extensions: ['ts'],
  files: ['./test/**/*.ts'],
  helpers: ['**/helpers/**/*'],
  require: ['ts-node/register/transpile-only'],
};
