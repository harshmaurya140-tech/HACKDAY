/* Developer-side toolchain, not an end-user installation requirement.
 * npm install; npm run prepare:model; npm run build:model
 */
import {build} from 'esbuild';
import {copyFileSync,mkdirSync,readdirSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd();
await build({
  entryPoints:[path.join(root,'scripts/gliner2-dependencies.mjs')],
  outfile:path.join(root,'extension/private/vendor.bundle.js'),
  bundle:true,platform:'browser',format:'iife',target:['chrome138'],
  minify:false,legalComments:'inline'
});
const folder=path.join(root,'node_modules/onnxruntime-web/dist');
const output=path.join(root,'extension/private');
mkdirSync(output,{recursive:true});
for(const file of readdirSync(folder))if(file.endsWith('.wasm'))copyFileSync(path.join(folder,file),path.join(output,file));
console.log('Runtime bundled. Model weights and reference span-parity tests must still pass before release.');
