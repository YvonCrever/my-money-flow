import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const patches = [
  {
    filePath: path.join(projectRoot, 'node_modules/tailwindcss/src/corePlugins.js'),
    before: `postcss.parse(
      fs.readFileSync(path.join(__dirname, './css/preflight.css'), 'utf8')
    )`,
    after: `postcss.parse(
      fs.readFileSync(path.join(__dirname, './css/preflight.css'), 'utf8'),
      { from: path.join(__dirname, './css/preflight.css') }
    )`,
  },
  {
    filePath: path.join(projectRoot, 'node_modules/tailwindcss/src/lib/generateRules.js'),
    before: "postcss.parse(`a{${property}:${value}}`).toResult()",
    after: "postcss.parse(`a{${property}:${value}}`, { from: 'tailwindcss-arbitrary-value.css' }).toResult()",
  },
  {
    filePath: path.join(projectRoot, 'node_modules/postcss/lib/parse.js'),
    before: `function parse(css, opts) {
  let input = new Input(css, opts)
  let parser = new Parser(input)`,
    after: `function parse(css, opts) {
  let normalizedOpts = opts && typeof opts === 'object' ? { ...opts } : {}
  if (!normalizedOpts.from) {
    normalizedOpts.from = 'postcss-generated.css'
  }
  let input = new Input(css, normalizedOpts)
  let parser = new Parser(input)`,
  },
  {
    filePath: path.join(projectRoot, 'node_modules/postcss/lib/parse.js'),
    before: `      if (e.name === 'CssSyntaxError' && opts && opts.from) {
        if (/\\.scss$/i.test(opts.from)) {
          e.message +=
            '\\nYou tried to parse SCSS with ' +
            'the standard CSS parser; ' +
            'try again with the postcss-scss parser'
        } else if (/\\.sass/i.test(opts.from)) {
          e.message +=
            '\\nYou tried to parse Sass with ' +
            'the standard CSS parser; ' +
            'try again with the postcss-sass parser'
        } else if (/\\.less$/i.test(opts.from)) {`,
    after: `      if (e.name === 'CssSyntaxError' && normalizedOpts && normalizedOpts.from) {
        if (/\\.scss$/i.test(normalizedOpts.from)) {
          e.message +=
            '\\nYou tried to parse SCSS with ' +
            'the standard CSS parser; ' +
            'try again with the postcss-scss parser'
        } else if (/\\.sass/i.test(normalizedOpts.from)) {
          e.message +=
            '\\nYou tried to parse Sass with ' +
            'the standard CSS parser; ' +
            'try again with the postcss-sass parser'
        } else if (/\\.less$/i.test(normalizedOpts.from)) {`,
  },
  {
    filePath: path.join(projectRoot, 'node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js'),
    before: `        if (!importer) {
          opts.logger.warnOnce(
            "\\nA PostCSS plugin did not pass the \`from\` option to \`postcss.parse\`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue."
          );
        }
        const isCssUrl = cssUrlRE.test(declaration.value);
        const isCssImageSet = cssImageSetRE.test(declaration.value);
        if (isCssUrl || isCssImageSet) {`,
    after: `        const isCssUrl = cssUrlRE.test(declaration.value);
        const isCssImageSet = cssImageSetRE.test(declaration.value);
        if ((isCssUrl || isCssImageSet) && !importer) {
          opts.logger.warnOnce(
            "\\nA PostCSS plugin did not pass the \`from\` option to \`postcss.parse\`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue."
          );
        }
        if (isCssUrl || isCssImageSet) {`,
  },
];

for (const patch of patches) {
  if (!fs.existsSync(patch.filePath)) {
    continue;
  }

  const source = fs.readFileSync(patch.filePath, 'utf8');
  if (source.includes(patch.after)) {
    continue;
  }

  if (!source.includes(patch.before)) {
    console.warn(`[patch-tailwind-postcss] expected snippet not found in ${path.relative(projectRoot, patch.filePath)}`);
    continue;
  }

  fs.writeFileSync(patch.filePath, source.replace(patch.before, patch.after));
  console.log(`[patch-tailwind-postcss] patched ${path.relative(projectRoot, patch.filePath)}`);
}
