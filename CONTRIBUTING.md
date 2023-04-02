# Contributing rules

* MUST NOT commit to the master branch.
* MUST NOT merge locally into the master branch. MUST use Pull Request.
* MUST NOT use "merge commit" or "Rebase and merge". MUST use "Squash and merge".
* [SHOULD insert Emoji Prefix in git commit message](#git-commit-message-style).
* If you make a fix that changes behavior (feature addition, bug fix, etc), you MUST add a test codes that fails before the fixes and succeeds after the fixes.
* If you want to update the `README.md` file, you MUST edit the `.template/readme.njk` file instead.

## Brunch Workflow

We use [GitHub Flow](https://guides.github.com/introduction/flow/).

## Git Commit Message Style

commit message format:

```
{emoji} Subject

Commit body...
```

* Emoji Prefix SHOULD use Unicode code points (eg `🎨`). SHOULD NOT use emoji code (eg `:art:`).

### Emoji List

Inspired of [Atom Contributing] and [Gitmoji].

[Atom Contributing]: https://github.com/atom/atom/blob/f8bae3f84cf1d869d0b3f833c7d3ced8b40523d2/CONTRIBUTING.md#git-commit-messages
[Gitmoji]: https://gitmoji.carloscuesta.me/

* `🎨` - improving the format/structure of the code
* `✨` - introducing new features
* `💥` - introducing breaking changes
* `🐎` - improving performance
* `👽` - updating code due to external API changes
* `💩` - writing bad code that needs to be improved
* `🚨` - removing linter warnings
* `♻️` - refactoring code
* `📝` - writing docs
* `🚀` - deploying stuff
* `🐛` - fixing a bug
* `🔥` - removing code or files
* `✅` - adding or updating tests
* `👷` - adding CI build system
* `💚` - fixing CI Build
* `➕` - adding a dependency
* `⬆️` - upgrading dependencies
* `⬇️` - downgrading dependencies
* `➖` - removing a dependency
* `🏷️` - adding or updating types (TypeScript)
* `🔧` - changing configuration files
* `🙈` - adding or updating a `.gitignore` file
* `📄` - adding or updating license
* `🚚` - moving or renaming files
* `⏪` - reverting changes

### Running linting/tests

#### All Test

```console
$ pnpm run test
```

#### Only Main Test

```console
$ pnpm run test --test-only
```

#### Lint & README Test

```console
$ pnpm run test --pre-test-only
```

#### Lint

```console
$ pnpm run lint
```

#### Format

```console
$ pnpm run fmt
```

##### Format only `package.json`

```console
$ pnpm run fmt pkg
```

##### Format only `*.ts`

```console
$ pnpm run fmt ts
```

##### Format only `*.js` and `*.ts`

```console
$ pnpm run fmt ts js
```
