// Downloads the bundled fonts from the npm registry (Fontsource packages) into assets/fonts and writes
// assets/fonts/fonts.json, the catalog the server sends to the interface.
// Each family keeps its regular and bold weights, upright and italic where they exist, latin subset, WOFF format.
// Usage: node tools/fonts.mjs
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'assets', 'fonts');

// [package, display name, category]
const FAMILIES = [
  ['comic-neue', 'Comic Neue', 'Casual'], ['comic-relief', 'Comic Relief', 'Casual'], ['patrick-hand', 'Patrick Hand', 'Casual'],
  ['short-stack', 'Short Stack', 'Casual'], ['gochi-hand', 'Gochi Hand', 'Casual'], ['kalam', 'Kalam', 'Casual'],
  ['roboto', 'Roboto', 'Sans'], ['open-sans', 'Open Sans', 'Sans'], ['lato', 'Lato', 'Sans'], ['montserrat', 'Montserrat', 'Sans'],
  ['poppins', 'Poppins', 'Sans'], ['nunito', 'Nunito', 'Sans'], ['inter', 'Inter', 'Sans'], ['source-sans-3', 'Source Sans 3', 'Sans'],
  ['work-sans', 'Work Sans', 'Sans'], ['rubik', 'Rubik', 'Sans'],
  ['oswald', 'Oswald', 'Condensed and display'], ['bebas-neue', 'Bebas Neue', 'Condensed and display'], ['anton', 'Anton', 'Condensed and display'],
  ['barlow-condensed', 'Barlow Condensed', 'Condensed and display'], ['archivo-black', 'Archivo Black', 'Condensed and display'],
  ['cinzel', 'Cinzel', 'Fantasy and serif'], ['cinzel-decorative', 'Cinzel Decorative', 'Fantasy and serif'], ['medievalsharp', 'MedievalSharp', 'Fantasy and serif'],
  ['uncial-antiqua', 'Uncial Antiqua', 'Fantasy and serif'], ['im-fell-english', 'IM Fell English', 'Fantasy and serif'],
  ['cormorant-garamond', 'Cormorant Garamond', 'Fantasy and serif'], ['merriweather', 'Merriweather', 'Fantasy and serif'], ['spectral', 'Spectral', 'Fantasy and serif'],
  ['fredoka', 'Fredoka', 'Rounded and technical'], ['varela-round', 'Varela Round', 'Rounded and technical'], ['quicksand', 'Quicksand', 'Rounded and technical'],
  ['roboto-mono', 'Roboto Mono', 'Rounded and technical'],
];
const STYLES = [['400', 'normal', '400'], ['700', 'normal', '700'], ['400', 'italic', '400i'], ['700', 'italic', '700i']];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toplabel-fonts-'));
const catalog = [];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [pkg, name, cat] of FAMILIES) {
  const dir = path.join(tmp, pkg); fs.mkdirSync(dir);
  const tgz = execFileSync('npm', ['pack', '@fontsource/' + pkg, '--silent'], { cwd: dir }).toString().trim().split('\n').pop();
  execFileSync('tar', ['xzf', tgz], { cwd: dir });
  const p = path.join(dir, 'package'), meta = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'));
  const dest = path.join(OUT, pkg); fs.mkdirSync(dest);
  const files = {};
  for (const [w, st, key] of STYLES) {
    const f = path.join(p, 'files', `${pkg}-latin-${w}-${st}.woff`);
    if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(dest, key + '.woff')); files[key] = key + '.woff'; }
  }
  if (!files['400']) { // families without a regular weight use their first upright weight
    const any = fs.readdirSync(path.join(p, 'files')).filter(f => new RegExp(`^${pkg}-latin-\\d+-normal\\.woff$`).test(f)).sort()[0];
    if (any) { fs.copyFileSync(path.join(p, 'files', any), path.join(dest, '400.woff')); files['400'] = '400.woff'; }
  }
  fs.copyFileSync(path.join(p, 'LICENSE'), path.join(dest, 'LICENSE'));
  catalog.push({ id: pkg, name, cat, license: meta.license || 'OFL-1.1', version: meta.version, files });
  process.stdout.write(`${name}: ${Object.keys(files).join(' ')}\n`);
}
fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify(catalog, null, 1) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${catalog.length} families written to assets/fonts`);
