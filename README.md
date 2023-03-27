# package-version-git-tag

[![Go to the latest release page on npm](https://img.shields.io/npm/v/package-version-git-tag.svg)][npm]
[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)][github-license]
![Supported Node.js version: ^14.14.0 || 16.x || >=18.x](https://img.shields.io/static/v1?label=node&message=%5E14.14.0%20%7C%7C%2016.x%20%7C%7C%20%3E%3D18.x&color=brightgreen)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/package-version-git-tag/3.0.0)](https://bundlephobia.com/result?p=package-version-git-tag@3.0.0)
[![Install Size Details](https://packagephobia.now.sh/badge?p=package-version-git-tag@3.0.0)](https://packagephobia.now.sh/result?p=package-version-git-tag@3.0.0)
[![Dependencies Status](https://david-dm.org/sounisi5011/package-version-git-tag/status.svg)](https://david-dm.org/sounisi5011/package-version-git-tag)
[![Build Status](https://github.com/sounisi5011/package-version-git-tag/actions/workflows/ci.yaml/badge.svg)](https://github.com/sounisi5011/package-version-git-tag/actions/workflows/ci.yaml?query=branch%3Amaster)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/ac675a219746d53b79bc/maintainability)](https://codeclimate.com/github/sounisi5011/package-version-git-tag/maintainability)

[npm]: https://www.npmjs.com/package/package-version-git-tag
[github-license]: https://github.com/sounisi5011/package-version-git-tag/tree/v3.0.0/LICENSE

Add Git tag corresponding to the `version` field of `package.json`.

## Install

```sh
npm install --save-dev package-version-git-tag
```

## Usage

```console
$ package-version-git-tag --help
package-version-git-tag v3.0.0

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

For example, suppose that `package.json` exists in the current directory, and version is `1.2.3`:

```json
{
    "name": "my-awesome-package",
    "version": "1.2.3",
    ...
}
```

In this case, this command is:

```sh
package-version-git-tag
```

Equivalent to this operation:

```console
$ git tag v1.2.3 -m 1.2.3
```

If you add the `--push` flag, it will also run `git push`. That is, this command is:

```sh
package-version-git-tag --push
```

Equivalent to this operation:

```console
$ git tag v1.2.3 -m 1.2.3
$ git push origin v1.2.3
```

### Customize tag name format

If you want to change the tag name, you can customize it in the same way as the `npm/yarn/pnpm version` command:

<details><summary>npm / pnpm</summary>
[pnpm]: https://pnpm.io/

If you want to run this command in npm or [pnpm], you can change the prefix of the git tag by using [`tag-version-prefix`](https://docs.npmjs.com/cli/v6/using-npm/config#tag-version-prefix).
You can change the configurations using the following commands:

```sh
# Set the tag prefix to "foo-bar-"
npm config set --location=project tag-version-prefix foo-bar-
# Or, if you are using pnpm, run the following command:
pnpm config set --location=project tag-version-prefix foo-bar-
```

> **Note**: Forgetting [the `--location` option](https://docs.npmjs.com/cli/v7/commands/npm-config#location) will change the user configuration.
> If you want to change the prefix only within your project, **do not forget the `--location` option**.
>
> If you are using npm v7.19 or earlier, or pnpm v7.20 or earlier, you need to edit the `.npmrc` file directly, because it does not support the `--location` option.

Alternatively, you can directly edit [the `.npmrc` file](https://docs.npmjs.com/cli/v6/configuring-npm/npmrc):

**`.npmrc`**
```ini
; Set the tag prefix to "foo-bar-"
tag-version-prefix = "foo-bar-"
```

After editing the `.npmrc` file, check the value using the `npm config get tag-version-prefix` command (or the `pnpm config get tag-version-prefix` command).
</details>

<details><summary>Yarn</summary>
[yarn]: https://yarnpkg.com

> **Note**: Currently, **[Yarn 2 and Yarn 3](https://github.com/yarnpkg/berry) is not supported**.

If you want to run this command in [yarn], [you can change the prefix of the git tag by using `version-tag-prefix`](https://classic.yarnpkg.com/lang/en/docs/cli/version/#toc-git-tags).
You can change the configuration by editing [the `.yarnrc` file](https://classic.yarnpkg.com/lang/en/docs/yarnrc/):

**`.yarnrc`**
```
# Set the tag prefix to "foo-bar-"
version-tag-prefix foo-bar-
```

After editing the `.yarnrc` file, check the value using the `yarn config get version-tag-prefix` command.

Alternatively, you can use [the `yarn config set` command](https://classic.yarnpkg.com/en/docs/cli/config#toc-yarn-config-set-g-global).

> **Note**: The `yarn config set` command updates the `.yarnrc` file in the home directory.
> If you want to change the prefix only within your project, you need to edit the `.yarnrc` file directly.

```sh
# Set the tag prefix to "foo-bar-"
yarn config set version-tag-prefix foo-bar-
```
</details>

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
npm install
npm test
```

## Change Log

see [CHANGELOG.md](https://github.com/sounisi5011/package-version-git-tag/tree/v3.0.0/CHANGELOG.md)

## Contributing

see [CONTRIBUTING.md](https://github.com/sounisi5011/package-version-git-tag/tree/master/CONTRIBUTING.md)

## Related

* [taggit](https://github.com/okunishinishi/node-taggit)
