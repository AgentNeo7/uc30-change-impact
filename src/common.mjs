import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
export const arr=x=>x===undefined?[]:Array.isArray(x)?x:[x];
export function read(file){const b=fs.readFileSync(file);if(b.length>2_000_000)throw Error('Input exceeds 2MB');return b.toString('utf8');}
export function xml(file){const s=read(file);if(/<!DOCTYPE|<!ENTITY/i.test(s))throw Error('DTD/entity declarations unsupported');const valid=XMLValidator.validate(s);if(valid!==true)throw Error('Malformed XML: '+valid.err.msg);const parsed=new XMLParser({ignoreAttributes:false,parseTagValue:false,trimValues:false}).parse(s);const roots=Object.entries(parsed).filter(([k])=>!k.startsWith('?'));if(roots.length!==1||roots[0][1]?.['@_xmlns']!=='http://soap.sforce.com/2006/04/metadata')throw Error('Salesforce Metadata API XML namespace required');return parsed;}
export function files(root,suffix=''){if(!fs.existsSync(root))return [];let out=[];for(const e of fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.isSymbolicLink())continue;const p=path.join(root,e.name);if(e.isDirectory()&&!['node_modules','.git'].includes(e.name))out.push(...files(p,suffix));else if(e.isFile()&&p.endsWith(suffix))out.push(p);}return out;}
export const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
export const rel=(r,f)=>path.relative(r,f).split(path.sep).join('/');
export const bool=x=>x===true||x==='true';
export function finish(findings,extra={}){return {schemaVersion:1,platform:'Salesforce',evidence_status:'simulated',native_execution:'not_run',status:findings.some(f=>f.severity==='error')?'fail':findings.some(f=>f.severity==='unknown')?'unknown':'pass',findings,...extra};}
export const sourceFiles=root=>files(path.join(root,'force-app'));
export function flowFiles(root){return files(path.join(root,'force-app'),'.flow-meta.xml').map(file=>({file,flow:xml(file).Flow}));}
export function stripApex(s){return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');}
export function cli(analyze){const args=process.argv.slice(2);let root='.',config='examples/config.json';for(let i=0;i<args.length;i++){if(args[i]==='--project')root=args[++i];else if(args[i]==='--config')config=args[++i];else throw Error('Usage: node src/cli.mjs --project . --config examples/config.json');}const c=JSON.parse(read(config));console.log(JSON.stringify(analyze(path.resolve(root),c),null,2));}
