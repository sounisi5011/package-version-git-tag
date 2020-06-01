const path = require('path');

/**
 * @param {string} basename
 * @returns {function(string): boolean}
 */
function baseFilter(basename) {
  return (filename) => path.basename(filename) === basename;
}

/**
 * @param  {...string} extList
 * @returns {function(string): boolean}
 */
function extFilter(...extList) {
  extList = extList.map((ext) => ext.replace(/^\.?/, '.'));
  return (filename) => extList.includes(path.extname(filename));
}

/**
 * @param {string[]} commands
 * @param {string[]} allFiles
 * @param {function(string): boolean} filterFn
 * @param {function(string[]): string[]} commandsGenFn
 */
function filterPush(commands, allFiles, filterFn, commandsGenFn) {
  const files = allFiles.filter(filterFn);
  if (files.length >= 1) commands.push(...commandsGenFn(files));
}

module.exports = {
  '*': (/** @type {string[]} */ allFiles) => {
    /** @type {string[]} */
    const commands = [];

    if (allFiles.includes(path.resolve('README.md')))
      commands.push('run-s test:readme');

    filterPush(
      commands,
      allFiles,
      extFilter('js', 'json', 'yaml', 'yml'),
      (prettierTargetFiles) => [
        `prettier --write ${prettierTargetFiles.join(' ')}`,
      ],
    );

    filterPush(commands, allFiles, baseFilter('package.json'), (pkgFiles) => [
      `prettier-package-json --write ${pkgFiles.join(' ')}`,
      `sort-package-json ${pkgFiles.join(' ')}`,
    ]);

    filterPush(commands, allFiles, extFilter('ts'), (tsFiles) => [
      `eslint --fix ${tsFiles.join(' ')}`,
    ]);

    if (allFiles.some((filename) => path.resolve('README.md') !== filename))
      commands.push('run-s build:readme', 'git add ./README.md');

    return commands;
  },
};
