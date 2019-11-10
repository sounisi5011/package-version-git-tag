# package-version-git-tag

[![Go to the latest release page on npm](https://img.shields.io/npm/v/package-version-git-tag.svg)][npm]
[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)][github-license]
![Supported Node.js version: >=8.10.0](https://img.shields.io/static/v1?label=node&message=%3E%3D8.10.0&color=brightgreen)
[![bundle size](https://img.shields.io/bundlephobia/min/package-version-git-tag/1.2.0)](https://bundlephobia.com/result?p=package-version-git-tag@1.2.0)
[![Dependencies Status](https://david-dm.org/sounisi5011/package-version-git-tag/status.svg)](https://david-dm.org/sounisi5011/package-version-git-tag)
[![Build Status](https://dev.azure.com/sounisi5011/npm%20projects/_apis/build/status/sounisi5011.package-version-git-tag?branchName=master)](https://dev.azure.com/sounisi5011/npm%20projects/_build/latest?definitionId=2&branchName=master)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/ac675a219746d53b79bc/maintainability)](https://codeclimate.com/github/sounisi5011/package-version-git-tag/maintainability)

[npm]: https://www.npmjs.com/package/package-version-git-tag
[github-license]: https://github.com/sounisi5011/package-version-git-tag/blob/v1.2.0/LICENSE

Add Git tag corresponding to the `version` field of `package.json`.

## Install

```sh
npm install package-version-git-tag
```

## Usage

```console
$ package-version-git-tag --help
Usage: package-version-git-tag [options]

Add Git tag corresponding to the version field of package.json

Options:
  -v, --version  output the version number
  --push         `git push` the added tag to the remote repository
  --verbose      show details of executed git commands
  -n, --dry-run  perform a trial run with no changes made
  -h, --help     output usage information
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
$ git tag v1.2.3
```

If you add the `--push` flag, it will also run `git push`. That is, this command is:

```sh
package-version-git-tag --push
```

Equivalent to this operation:

```console
$ git tag v1.2.3
$ git push origin v1.2.3
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
