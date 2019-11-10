#!/usr/bin/env node
/* @see https://github.com/sounisi5011/metalsmith-dart-sass/blob/v1.0.1/script/readme-generator/index.js */

const fs = require("fs");
const path = require("path");
const util = require("util");

const matter = require("gray-matter");
const Mustache = require("mustache");

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

async function tryReadFile(...args) {
  try {
    return await readFileAsync(...args);
  } catch (error) {
    return null;
  }
}

function parseArgs(args) {
  const options = new Map();
  const targets = [];

  let optname;
  for (const arg of args) {
    if (/^--/.test(arg)) {
      optname = arg.substring(2);
      options.set(optname, true);
    } else if (/^-/.test(arg)) {
      for (const optchar of arg.substring(1)) {
        optname = optchar;
        options.set(optname, true);
      }
    } else if (optname) {
      options.set(optname, arg);
      optname = null;
    } else {
      targets.push(arg);
    }
  }

  return { options, targets };
}

async function main(args) {
  const cwd = process.cwd();
  const cwdRelativePath = path.relative.bind(path, cwd);

  const { options } = parseArgs(args);
  const templatePath = path.resolve(
    cwd,
    options.get("template") || "README.mustache"
  );
  const { content: templateCode, data: templateData } = matter(
    await readFileAsync(templatePath, "utf8")
  );
  const pkg = require(path.resolve(cwd, "package.json"));
  const view = {
    pkg,
    pkgLock: require(path.resolve(cwd, "package-lock.json")),
    encURL: () => (text, render) =>
      encodeURIComponent(render(text.trim())).replace(
        /[!'()*]/g,
        char =>
          `%${char
            .charCodeAt(0)
            .toString(16)
            .toUpperCase()}`
      ),
    ...templateData,
    githubTreeRoot: `https://github.com/sounisi5011/${pkg.name}/tree/v${pkg.version}`,
    githubFileRoot: `https://github.com/sounisi5011/${pkg.name}/blob/v${pkg.version}`
  };
  const output = Mustache.render(templateCode.replace(/^[\r\n]+/, ""), view);
  const outputPath = path.resolve(path.dirname(templatePath), "README.md");

  if (options.has("test")) {
    const origReadme = await tryReadFile(outputPath);
    if (origReadme && !origReadme.equals(Buffer.from(output))) {
      throw new Error(
        `Do not edit '${cwdRelativePath(
          outputPath
        )}' manually! You MUST edit '${cwdRelativePath(
          templatePath
        )}' instead of '${cwdRelativePath(outputPath)}'`
      );
    }
  } else {
    await writeFileAsync(outputPath, output);
  }
}

(async () => {
  try {
    await main(process.argv.slice(2));
  } catch (err) {
    process.exitCode = 1;
    console.error(err);
  }
})();
