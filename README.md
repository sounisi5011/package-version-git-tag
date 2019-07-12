# package-version-git-tag

[![npm package](https://img.shields.io/npm/v/package-version-git-tag.svg)][npm]
[![GitHub License](https://img.shields.io/github/license/sounisi5011/package-version-git-tag.svg)][github-license]
[![Build Status](https://travis-ci.com/sounisi5011/package-version-git-tag.svg?branch=master)](https://travis-ci.com/sounisi5011/package-version-git-tag)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/ac675a219746d53b79bc/maintainability)](https://codeclimate.com/github/sounisi5011/package-version-git-tag/maintainability)

[npm]: https://www.npmjs.com/package/package-version-git-tag
[github-license]: https://github.com/sounisi5011/package-version-git-tag/blob/master/LICENSE

Add Git tag corresponding to the `version` field of `package.json`.

## Install

```sh
npm install package-version-git-tag
```

## Usage

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
