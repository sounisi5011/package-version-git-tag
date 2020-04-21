# package-version-git-tag

[![Go to the latest release page on npm](https://img.shields.io/npm/v/package-version-git-tag.svg)][npm]
[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)][github-license]
![Supported Node.js version: >=8.3.0](https://img.shields.io/static/v1?label=node&message=%3E%3D8.3.0&color=brightgreen)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/package-version-git-tag/2.0.2)](https://bundlephobia.com/result?p=package-version-git-tag@2.0.2)
[![Install Size Details](https://packagephobia.now.sh/badge?p=package-version-git-tag@2.0.2)](https://packagephobia.now.sh/result?p=package-version-git-tag@2.0.2)
[![Dependencies Status](https://david-dm.org/sounisi5011/package-version-git-tag/status.svg)](https://david-dm.org/sounisi5011/package-version-git-tag)
[![Build Status](https://dev.azure.com/sounisi5011/npm%20projects/_apis/build/status/sounisi5011.package-version-git-tag?branchName=master)](https://dev.azure.com/sounisi5011/npm%20projects/_build/latest?definitionId=2&branchName=master)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/ac675a219746d53b79bc/maintainability)](https://codeclimate.com/github/sounisi5011/package-version-git-tag/maintainability)

[npm]: https://www.npmjs.com/package/package-version-git-tag
[github-license]: https://github.com/sounisi5011/package-version-git-tag/blob/v2.0.2/LICENSE

Add Git tag corresponding to the `version` field of `package.json`.

## Install

```sh
npm install package-version-git-tag
```

## Usage

```ShellSession
$ package-version-git-tag --help
Usage: package-version-git-tag [options]

Add Git tag corresponding to the version field of package.json

Options:
  -v, --version  output the version number
  --push         `git push` the added tag to the remote repository
  --verbose      show details of executed git commands
  -n, --dry-run  perform a trial run with no changes made
  -h, --help     display help for command
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

```ShellSession
$ git tag v1.2.3 -m 1.2.3
```

If you add the `--push` flag, it will also run `git push`. That is, this command is:

```sh
package-version-git-tag --push
```

Equivalent to this operation:

```ShellSession
$ git tag v1.2.3 -m 1.2.3
$ git push origin v1.2.3
```

### Customize tag name format

If you want to customize the tag name format, you can take the following steps:

* If you are execute this command with [yarn], change [the `version-tag-prefix` setting of yarn](https://classic.yarnpkg.com/docs/cli/version#toc-git-tags).
  This can be achieved by executing the following command:

  ```sh
  # Set the tag prefix to "foo-bar-"
  yarn config set version-tag-prefix foo-bar-
  ```

  Another way is to create [the `.yarnrc` file](https://classic.yarnpkg.com/docs/yarnrc):

  **`.yarnrc`**
  ```
  # Set the tag prefix to "foo-bar-"
  version-tag-prefix foo-bar-
  ```

  Note: Currently, **[Yarn 2](https://github.com/yarnpkg/berry) is not supported**.

[yarn]: https://yarnpkg.com

* Otherwise, change [the `tag-version-prefix` setting of npm](https://docs.npmjs.com/misc/config#tag-version-prefix).
  This can be achieved by executing the following command:

  ```sh
  # Set the tag prefix to "foo-bar-"
  npm config set tag-version-prefix foo-bar-
  ```

  Another way is to create [the `.npmrc` file](https://docs.npmjs.com/files/npmrc):

  **`.npmrc`**
  ```ini
  ; Set the tag prefix to "foo-bar-"
  tag-version-prefix = "foo-bar-"
  ```

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
npm install
npm test
```

## Contributing

see [CONTRIBUTING.md](https://github.com/sounisi5011/package-version-git-tag/blob/master/CONTRIBUTING.md)

## Related

* [taggit](https://github.com/okunishinishi/node-taggit)
