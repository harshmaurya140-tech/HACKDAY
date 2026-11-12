import {readdirSync} from 'node:fs';import {spawnSync} from 'node:child_process';
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory()){if(!['vendor','model','node_modules','.git'].includes(entry.name))walk(path);}else if(/\.(c?js|mjs)$/.test(path)){const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status)throw Error(path+'\n'+result.stderr);}}}
for(const dir of ['extension','src','scripts','tests-browser','tests-js'])walk(dir);console.log('Syntax checks passed.');
