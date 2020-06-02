# Change Log

## [Unreleased]

[Unreleased]: https://github.com/sounisi5011/package-version-git-tag/compare/v3.0.0...master

## [3.0.0] (2020-06-02 UTC)

* Drop support for Node.js 8, 9, 11 and 13
* Don't pin non-dev dependencies
* Update dev dependencies

### Supported Node version

`8.3.0 - 14.x` -> `10.x || 12.x || 14.x`

* [#138] - Omit unsupported Node.js

### Documentation

* [#140] - Update markdown syntax
* [#142] - Fix install step in README
* [#143] - Add Change Log section to README

### Updated Dependencies

#### devDependencies

* `@types/cross-spawn`
    * [#133] - `6.0.1` -> `6.0.2`
* `@typescript-eslint/eslint-plugin`
    * [#129] - `2.30.0` -> `2.34.0`
* `@typescript-eslint/parser`
    * [#129] - `2.30.0` -> `2.34.0`
* `del-cli`
    * [#134] - `3.0.0` -> `3.0.1`
* `lint-staged`
    * [#127] - `10.2.0` -> `10.2.7`
* `sort-package-json`
    * [#127] - `1.42.1` -> `1.44.0`
* `ts-node`
    * [#128] - `8.9.1` -> `8.10.2`
* `typescript`
    * [#131] - `3.8.3` -> `3.9.3`

### Added Dependencies

#### devDependencies

* [#137] - `@sounisi5011/readme-generator@0.0.2`
* [#137] - `check-peer-deps@1.1.3`
* [#137] - `patch-package@6.2.2`

### Removed Dependencies

#### devDependencies

* [#137] - `@sounisi5011/check-peer-deps`

### Tests

* [#146] - Fix error handling of `Git.listen()` method in node-git-server

### Others

* [#136] - Pin only devDependencies
* [#137] - Change project file structure
* [#139] - Enable compilerOptions.inlineSources
* [#141] - Update to strict type definition code
* [#144] - Fix patch-package config

[3.0.0]: https://github.com/sounisi5011/package-version-git-tag/compare/v2.1.0...v3.0.0
[#136]: https://github.com/sounisi5011/package-version-git-tag/pull/136
[#138]: https://github.com/sounisi5011/package-version-git-tag/pull/138
[#137]: https://github.com/sounisi5011/package-version-git-tag/pull/137
[#139]: https://github.com/sounisi5011/package-version-git-tag/pull/139
[#140]: https://github.com/sounisi5011/package-version-git-tag/pull/140
[#141]: https://github.com/sounisi5011/package-version-git-tag/pull/141
[#142]: https://github.com/sounisi5011/package-version-git-tag/pull/142
[#143]: https://github.com/sounisi5011/package-version-git-tag/pull/143
[#144]: https://github.com/sounisi5011/package-version-git-tag/pull/144
[#129]: https://github.com/sounisi5011/package-version-git-tag/pull/129
[#127]: https://github.com/sounisi5011/package-version-git-tag/pull/127
[#128]: https://github.com/sounisi5011/package-version-git-tag/pull/128
[#134]: https://github.com/sounisi5011/package-version-git-tag/pull/134
[#131]: https://github.com/sounisi5011/package-version-git-tag/pull/131
[#133]: https://github.com/sounisi5011/package-version-git-tag/pull/133
[#146]: https://github.com/sounisi5011/package-version-git-tag/pull/146

## [2.1.0] (2020-04-30 UTC)

* Support Node.js 14
* Added `-V` as alias for `--version` option
* Replace [`commander` package](https://www.npmjs.com/package/commander/v/5.0.0) to [`cac` package](https://www.npmjs.com/package/cac/v/6.5.8)
* Update dev dependencies

### Features

* [#125] - Add `-V` option

### Breaking Changes

* [#125] - Change output format:

    + ```ShellSession
      $ package-version-git-tag --version
      2.0.3
      ```

      ↓

      ```ShellSession
      $ package-version-git-tag --version
      package-version-git-tag/2.0.3 darwin-x64 node-v10.18.0
      ```

    + ```ShellSession
      $ package-version-git-tag --help
      Usage: bin [options]

      Add Git tag corresponding to the version field of package.json

      Options:
        -v, --version  output the version number
        --push         `git push` the added tag to the remote repository
        --verbose      show details of executed git commands
        -n, --dry-run  perform a trial run with no changes made
        -h, --help     display help for command
      ```

      ↓

      ```ShellSession
      $ package-version-git-tag --help
      package-version-git-tag v2.0.3

      Add Git tag corresponding to the version field of package.json

      Usage:
        $ package-version-git-tag [options]

      Options:
        -V, -v, --version  Display version number 
        -h, --help         Display this message 
        --push             `git push` the added tag to the remote repository 
        --verbose          show details of executed git commands 
        -n, --dry-run      perform a trial run with no changes made 
      ```

    + ```ShellSession
      $ package-version-git-tag --typo-option
      error: unknown option '--typo-option'
      ```

      ↓

      ```ShellSession
      $ package-version-git-tag --typo-option
      unknown option: --typoOption
      Try `package-version-git-tag --help` for valid options.
      ```

### Supported Node version

`>=8.3.0` -> `8.3.0 - 14.x`

* [#122] - Support Node.js 14

### Updated Dependencies

#### devDependencies

* `@typescript-eslint/eslint-plugin`
    * [#121] - `2.29.0` -> `2.30.0`
* `@typescript-eslint/parser`
    * [#121] - `2.29.0` -> `2.30.0`
* `eslint-config-prettier`
    * [#121] - `6.10.1` -> `6.11.0`
* `eslint-plugin-simple-import-sort`
    * [#121] - `5.0.2` -> `5.0.3`
* `lint-staged`
    * [#120] - `10.1.7` -> `10.2.0`
* `make-dir`
    * [#123] - `3.0.2` -> `3.1.0`
* `prettier`
    * [#120] - `2.0.4` -> `2.0.5`
* `sort-package-json`
    * [#120] - `1.42.0` -> `1.42.1`
* `ts-node`
    * [#123] - `8.9.0` -> `8.9.1`

### Added Dependencies

#### dependencies

* [#125] - `cac@6.5.8`

### Removed Dependencies

#### dependencies

* [#125] - `commander`

[2.1.0]: https://github.com/sounisi5011/package-version-git-tag/compare/v2.0.3...v2.1.0
[#122]: https://github.com/sounisi5011/package-version-git-tag/pull/122
[#125]: https://github.com/sounisi5011/package-version-git-tag/pull/125
[#120]: https://github.com/sounisi5011/package-version-git-tag/pull/120
[#121]: https://github.com/sounisi5011/package-version-git-tag/pull/121
[#123]: https://github.com/sounisi5011/package-version-git-tag/pull/123

## [2.0.3] (2020-04-21 UTC)

* Update dependencies
* Downgrade supported Node version

### Supported Node version

`>=8.10.0` -> `>=8.3.0`

* [#92] - Downgrade supported Node version

### Updated Dependencies

#### dependencies

* `commander`
    * [#112] - `4.0.1` -> `5.0.0`
* `cross-spawn`
    * [#115] - `7.0.1` -> `7.0.2`

#### devDependencies

* `@typescript-eslint/eslint-plugin`
    * [#103] - `2.7.0` -> `2.29.0`
* `@typescript-eslint/parser`
    * [#103] - `2.7.0` -> `2.29.0`
* `eslint`
    * [#103] - `6.6.0` -> `6.8.0`
* `eslint-config-prettier`
    * [#103] - `6.5.0` -> `6.10.1`
* `eslint-config-standard`
    * [#103] - `14.1.0` -> `14.1.1`
* `eslint-plugin-import`
    * [#103] - `2.18.2` -> `2.20.2`
* `eslint-plugin-node`
    * [#106] - `10.0.0` -> `11.1.0`
* `eslint-plugin-prettier`
    * [#103] - `3.1.1` -> `3.1.3`
* `eslint-plugin-simple-import-sort`
    * [#106] - `4.0.0` -> `5.0.2`
* `git-branch-is`
    * [#104] - `3.0.0` -> `3.1.0`
* `husky`
    * [#109] - `3.0.9` -> `4.2.5`
* `lint-staged`
    * [#109] - `9.4.2` -> `10.1.6`
    * [#117] - `10.1.6` -> `10.1.7`
* `make-dir`
    * [#105] - `3.0.0` -> `3.0.2`
* `node-git-server`
    * [#105] - `0.6.0` -> `0.6.1`
* `prettier`
    * [#109] - `1.19.1` -> `2.0.4`
* `prettier-package-json`
    * [#102] - `2.1.0` -> `2.1.3`
* `sort-package-json`
    * [#102] - `1.23.1` -> `1.42.0`
* `ts-node`
    * [#105] - `8.5.0` -> `8.9.0`
* `typescript`
    * [#107] - `3.7.2` -> `3.8.3`

### Others

* [#101] - Renovate package groups

[2.0.3]: https://github.com/sounisi5011/package-version-git-tag/compare/v2.0.2...v2.0.3
[#92]: https://github.com/sounisi5011/package-version-git-tag/pull/92
[#101]: https://github.com/sounisi5011/package-version-git-tag/pull/101
[#112]: https://github.com/sounisi5011/package-version-git-tag/pull/112
[#115]: https://github.com/sounisi5011/package-version-git-tag/pull/115
[#109]: https://github.com/sounisi5011/package-version-git-tag/pull/109
[#106]: https://github.com/sounisi5011/package-version-git-tag/pull/106
[#103]: https://github.com/sounisi5011/package-version-git-tag/pull/103
[#102]: https://github.com/sounisi5011/package-version-git-tag/pull/102
[#105]: https://github.com/sounisi5011/package-version-git-tag/pull/105
[#104]: https://github.com/sounisi5011/package-version-git-tag/pull/104
[#107]: https://github.com/sounisi5011/package-version-git-tag/pull/107
[#117]: https://github.com/sounisi5011/package-version-git-tag/pull/117

## [2.0.2] (2019-11-12 UTC)

### Documentation

* [#90] - Fix document

[2.0.2]: https://github.com/sounisi5011/package-version-git-tag/compare/v2.0.1...v2.0.2
[#90]: https://github.com/sounisi5011/package-version-git-tag/pull/90

## [2.0.1] (2019-11-11 UTC)

### Documentation

* [#88] - Fix document

[2.0.1]: https://github.com/sounisi5011/package-version-git-tag/compare/v2.0.0...v2.0.1
[#88]: https://github.com/sounisi5011/package-version-git-tag/pull/88

## [2.0.0] (2019-11-11 UTC)

### Features

* [#81] - Custom tag prefix
* [#83] - Annotated Git tag
* [#85] - Windows support

### Supported Node version

`>=8.3.0` -> `>=8.10.0`

* [#57] - Update dependency eslint to v6.6.0

### Documentation

* [#80] - Introduce README generator

### Updated Dependencies

#### dependencies

* `commander`
    * [#84] - `4.0.0` -> `4.0.1`

#### devDependencies

* `@typescript-eslint/eslint-plugin`
    * [#86] - `2.6.1` -> `2.7.0`
* `@typescript-eslint/parser`
    * [#86] - `2.6.1` -> `2.7.0`
* `eslint`
    * [#57] - `6.3.0` -> `6.6.0`
* `ts-node`
    * [#82] - `8.4.1` -> `8.5.0`

[2.0.0]: https://github.com/sounisi5011/package-version-git-tag/compare/v1.2.0...v2.0.0
[#57]: https://github.com/sounisi5011/package-version-git-tag/pull/57
[#80]: https://github.com/sounisi5011/package-version-git-tag/pull/80
[#81]: https://github.com/sounisi5011/package-version-git-tag/pull/81
[#82]: https://github.com/sounisi5011/package-version-git-tag/pull/82
[#83]: https://github.com/sounisi5011/package-version-git-tag/pull/83
[#84]: https://github.com/sounisi5011/package-version-git-tag/pull/84
[#85]: https://github.com/sounisi5011/package-version-git-tag/pull/85
[#86]: https://github.com/sounisi5011/package-version-git-tag/pull/86

## [1.2.0] (2019-11-09 UTC)

### Features

* [#77] - Add `--verbose` option
* [#78] - Add `--dry-run` option

### Updated Dependencies

#### dependencies

* `commander`
    * [#70] - `3.0.1` -> `4.0.0`

#### devDependencies

* `@types/node`
    * [#74], [#75] - `12.7.4` -> `*`
* `@typescript-eslint/eslint-plugin`
    * [#60] - `2.2.0` -> `2.6.1`
* `@typescript-eslint/parser`
    * [#60] - `2.2.0` -> `2.6.1`
* `ava`
    * [#59] - `2.3.0` -> `2.4.0`
* `can-npm-publish`
    * [#68] - `1.3.1` -> `1.3.2`
* `eslint-config-prettier`
    * [#54] - `6.2.0` -> `6.5.0`
* `eslint-plugin-prettier`
    * [#61] - `3.1.0` -> `3.1.1`
* `husky`
    * [#67] - `3.0.5` -> `3.0.9`
* `lint-staged`
    * [#65] - `9.2.5` -> `9.4.2`
* `prettier`
    * [#72] - `1.18.2` -> `1.19.0`
    * [#76] - `1.19.0` -> `1.19.1`
* `sort-package-json`
    * [#71] - `1.22.1` -> `1.23.1`
* `ts-node`
    * [#58] - `8.3.0` -> `8.4.1`
* `typescript`
    * [#55] - `3.6.2` -> `3.7.2`

### Others

* [#73] - Migrate from Travis CI to Azure Pipelines

[1.2.0]: https://github.com/sounisi5011/package-version-git-tag/compare/v1.1.2...v1.2.0
[#54]: https://github.com/sounisi5011/package-version-git-tag/pull/54
[#55]: https://github.com/sounisi5011/package-version-git-tag/pull/55
[#58]: https://github.com/sounisi5011/package-version-git-tag/pull/58
[#59]: https://github.com/sounisi5011/package-version-git-tag/pull/59
[#60]: https://github.com/sounisi5011/package-version-git-tag/pull/60
[#61]: https://github.com/sounisi5011/package-version-git-tag/pull/61
[#65]: https://github.com/sounisi5011/package-version-git-tag/pull/65
[#67]: https://github.com/sounisi5011/package-version-git-tag/pull/67
[#68]: https://github.com/sounisi5011/package-version-git-tag/pull/68
[#70]: https://github.com/sounisi5011/package-version-git-tag/pull/70
[#71]: https://github.com/sounisi5011/package-version-git-tag/pull/71
[#72]: https://github.com/sounisi5011/package-version-git-tag/pull/72
[#73]: https://github.com/sounisi5011/package-version-git-tag/pull/73
[#74]: https://github.com/sounisi5011/package-version-git-tag/pull/74
[#75]: https://github.com/sounisi5011/package-version-git-tag/pull/75
[#76]: https://github.com/sounisi5011/package-version-git-tag/pull/76
[#77]: https://github.com/sounisi5011/package-version-git-tag/pull/77
[#78]: https://github.com/sounisi5011/package-version-git-tag/pull/78

## [1.1.2] (2019-09-10 UTC)

Code minifying update: The code included in the package has been minified.

### Updated Dependencies

#### devDependencies

* `@types/node`
    * [#46] - `12.7.3` -> `12.7.4`
* `@typescript-eslint/eslint-plugin`
    * [#49] - `2.1.0` -> `2.2.0`
* `@typescript-eslint/parser`
    * [#49] - `2.1.0` -> `2.2.0`
* `del-cli`
    * [#48] - `2.0.0` -> `3.0.0`
* `eslint-config-prettier`
    * [#45] - `6.1.0` -> `6.2.0`
* `eslint-plugin-node`
    * [#47] - `9.2.0` -> `10.0.0`
* `typescript`
    * [#38] - `3.5.3` -> `3.6.2`

### Others

* [#50] - Replace reading of `package.json` in this package with `require()` from `readJSONFile()` function
* [#51] - Change TypeScript output from ES2015 to ES2017
* [#52] - Exclude branches of Git tag indicating package version from CI

[1.1.2]: https://github.com/sounisi5011/package-version-git-tag/compare/v1.1.1...v1.1.2
[#38]: https://github.com/sounisi5011/package-version-git-tag/pull/38
[#45]: https://github.com/sounisi5011/package-version-git-tag/pull/45
[#46]: https://github.com/sounisi5011/package-version-git-tag/pull/46
[#47]: https://github.com/sounisi5011/package-version-git-tag/pull/47
[#48]: https://github.com/sounisi5011/package-version-git-tag/pull/48
[#49]: https://github.com/sounisi5011/package-version-git-tag/pull/49
[#50]: https://github.com/sounisi5011/package-version-git-tag/pull/50
[#51]: https://github.com/sounisi5011/package-version-git-tag/pull/51
[#52]: https://github.com/sounisi5011/package-version-git-tag/pull/52

## [1.1.1] (2019-09-02 UTC)

### Updated Dependencies

#### dependencies

* `commander`
    * [#28] - `2.20.0` -> `3.0.1`

#### devDependencies

* `@types/node`
    * [#26] - `12.6.9` -> `12.7.3`
* `@typescript-eslint/eslint-plugin`
    * [#30] - `1.13.0` -> `2.0.0`
    * [#42] - `2.0.0` -> `2.1.0`
* `@typescript-eslint/parser`
    * [#30] - `1.13.0` -> `2.0.0`
    * [#42] - `2.0.0` -> `2.1.0`
* `ava`
    * [#32] - `2.2.0` -> `2.3.0`
* `del`
    * [#36] - `5.0.0` -> `5.1.0`
* `eslint`
    * [#4] - `5.16.0` -> `6.3.0`
* `eslint-config-prettier`
    * [#33] - `6.0.0` -> `6.1.0`
* `eslint-config-standard`
    * [#34] - `12.0.0` -> `14.1.0`
* `eslint-plugin-node`
    * [#39] - `9.1.0` -> `9.2.0`
* `eslint-plugin-standard`
    * [#35] - `4.0.0` -> `4.0.1`
* `git-branch-is`
    * [#29] - `2.1.0` -> `3.0.0`
* `husky`
    * [#27] - `3.0.2` -> `3.0.5`
* `lint-staged`
    * [#31] - `9.2.1` -> `9.2.5`

### Removed Dependencies

#### dependencies

* [#43] - `read-pkg`

### Others

* [#41] - Exclude branches that update packages that cannot be tested with CI

[1.1.1]: https://github.com/sounisi5011/package-version-git-tag/compare/v1.1.0...v1.1.1
[#4]:  https://github.com/sounisi5011/package-version-git-tag/pull/4
[#26]: https://github.com/sounisi5011/package-version-git-tag/pull/26
[#27]: https://github.com/sounisi5011/package-version-git-tag/pull/27
[#28]: https://github.com/sounisi5011/package-version-git-tag/pull/28
[#29]: https://github.com/sounisi5011/package-version-git-tag/pull/29
[#30]: https://github.com/sounisi5011/package-version-git-tag/pull/30
[#31]: https://github.com/sounisi5011/package-version-git-tag/pull/31
[#32]: https://github.com/sounisi5011/package-version-git-tag/pull/32
[#33]: https://github.com/sounisi5011/package-version-git-tag/pull/33
[#34]: https://github.com/sounisi5011/package-version-git-tag/pull/34
[#35]: https://github.com/sounisi5011/package-version-git-tag/pull/35
[#36]: https://github.com/sounisi5011/package-version-git-tag/pull/36
[#39]: https://github.com/sounisi5011/package-version-git-tag/pull/39
[#41]: https://github.com/sounisi5011/package-version-git-tag/pull/41
[#42]: https://github.com/sounisi5011/package-version-git-tag/pull/42
[#43]: https://github.com/sounisi5011/package-version-git-tag/pull/43

## [1.1.0] (2019-08-02 UTC)

### Features

* [#20] - Add `--help` option
* [#21] - Add `--version` option and add CLI description in help

### Updated Dependencies

#### devDependencies

* `@types/node`
    * [#12] - `12.6.2` -> `12.6.8`
    * [#22] - `12.6.8` -> `12.6.9`
* `@typescript-eslint/eslint-plugin`
    * [#11] - `1.11.0` -> `1.12.0`
    * [#16] - `1.12.0` -> `1.13.0`
* `@typescript-eslint/parser`
    * [#11] - `1.11.0` -> `1.12.0`
    * [#16] - `1.12.0` -> `1.13.0`
* `eslint-plugin-import`
    * [#14] - `2.18.0` -> `2.18.2`
* `husky`
    * [#13] - `3.0.0` -> `3.0.2`
* `lint-staged`
    * [#18] - `9.2.0` -> `9.2.1`

### Added Dependencies

#### dependencies

* [#20] - `commander@2.20.0`
* [#21] - `read-pkg@5.2.0`

#### devDependencies

* [#21] - `escape-string-regexp@2.0.0`

### Tests

* [#23] - Use npm's local install for testing

### Others

* [#17] - Setting Renovate to follow Emoji Prefix
* [#19] - Setting Renovate to follow Emoji Prefix
* [#23] - Change bin file path: `bin/cli.js` -> `dist/bin.js`

[1.1.0]: https://github.com/sounisi5011/package-version-git-tag/compare/v1.0.0...v1.1.0
[#11]: https://github.com/sounisi5011/package-version-git-tag/pull/11
[#12]: https://github.com/sounisi5011/package-version-git-tag/pull/12
[#13]: https://github.com/sounisi5011/package-version-git-tag/pull/13
[#14]: https://github.com/sounisi5011/package-version-git-tag/pull/14
[#16]: https://github.com/sounisi5011/package-version-git-tag/pull/16
[#17]: https://github.com/sounisi5011/package-version-git-tag/pull/17
[#18]: https://github.com/sounisi5011/package-version-git-tag/pull/18
[#19]: https://github.com/sounisi5011/package-version-git-tag/pull/19
[#20]: https://github.com/sounisi5011/package-version-git-tag/pull/20
[#21]: https://github.com/sounisi5011/package-version-git-tag/pull/21
[#22]: https://github.com/sounisi5011/package-version-git-tag/pull/22
[#23]: https://github.com/sounisi5011/package-version-git-tag/pull/23

## [1.0.0] (2019-07-12 UTC)

[1.0.0]: https://github.com/sounisi5011/package-version-git-tag/compare/v0.0.0...v1.0.0
