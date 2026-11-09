import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindPostcss from '@tailwindcss/postcss';

const inputPath = path.resolve('app/globals.src.css');
const outputPath = path.resolve('app/globals.css');
const publicPath = path.resolve('public/styles.css');

if (!fs.existsSync(inputPath)) {
  console.error('Source CSS file not found:', inputPath);
  process.exit(1);
}

const inputCss = fs.readFileSync(inputPath, 'utf8');

postcss([tailwindPostcss])
  .process(inputCss, { from: inputPath, to: outputPath })
  .then(result => {
    fs.writeFileSync(outputPath, result.css);
    fs.writeFileSync(publicPath, result.css);
    console.log(`[build-css] Successfully compiled CSS (${(result.css.length / 1024).toFixed(1)} KB) -> app/globals.css & public/styles.css`);
  })
  .catch(err => {
    console.error('[build-css] Compilation failed:', err);
    process.exit(1);
  });
