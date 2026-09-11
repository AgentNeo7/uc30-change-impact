import {read} from './common.mjs';
import {analyze} from './impact.mjs';
try {
 const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i+=2){if(!['--base','--head','--tests'].includes(args[i])||!args[i+1]||o[args[i]])throw Error('Usage: --base DX --head DX --tests mapping.json');o[args[i]]=args[i+1];}
 if(Object.keys(o).length!==3)throw Error('Usage: --base DX --head DX --tests mapping.json');
 console.log(JSON.stringify(analyze(o['--base'],o['--head'],JSON.parse(read(o['--tests']))),null,2));
} catch(e){console.error(JSON.stringify({status:'input-error',message:e.message}));process.exitCode=2;}
