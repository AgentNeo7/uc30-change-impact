import fs from 'node:fs';
import path from 'node:path';
import {arr,files,xml,read,hash,rel} from './common.mjs';
const sort=x=>[...x].sort();
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).filter(k=>!(k==='#text'&&typeof x[k]==='string'&&!x[k].trim())).sort().map(k=>[k,canonical(x[k])])):x;
function location(root,file,token){const lines=read(file).split('\n');return {path:rel(root,file),line:Math.max(1,lines.findIndex(l=>l.includes(token))+1)};}
export function inventory(root){
 if(!fs.existsSync(path.join(root,'sfdx-project.json')))throw Error('Snapshot requires sfdx-project.json');
 const project=JSON.parse(read(path.join(root,'sfdx-project.json')));
 if(!project.packageDirectories?.length)throw Error('Missing DX package directory');
 const nodes=new Map(),edges=[],gaps=[],inputHashes=[];
 const add=(id,file,value)=>{if(nodes.has(id))throw Error('Duplicate metadata identity: '+id);nodes.set(id,{id,...location(root,file,''),semanticHash:hash(JSON.stringify(canonical(value)))});};
 for(const pkg of project.packageDirectories){
  const dir=path.resolve(root,pkg.path);if(!dir.startsWith(path.resolve(root)+path.sep))throw Error('Package escapes snapshot');
  if(!fs.existsSync(dir)||fs.lstatSync(dir).isSymbolicLink())throw Error('Missing or symbolic package directory');
  const list=files(dir);if(list.length>2000)throw Error('Snapshot exceeds 2000 files');
  for(const f of list){const text=read(f);inputHashes.push({path:rel(root,f),sha256:hash(text)});
   if(f.endsWith('.field-meta.xml')){
    const meta=xml(f).CustomField;if(!meta?.fullName)throw Error('Invalid CustomField');const object=path.basename(path.dirname(path.dirname(f)));add('CustomField:'+object+'.'+meta.fullName,f,meta);
   }else if(f.endsWith('.flow-meta.xml')){
    const meta=xml(f).Flow;if(!meta)throw Error('Invalid Flow');const id='Flow:'+path.basename(f,'.flow-meta.xml');add(id,f,meta);
    for(const sub of arr(meta.subflows)){if(!sub.flowName){gaps.push({component:id,reason:'Missing subflow name'});continue;}edges.push({from:id,to:'Flow:'+sub.flowName,kind:'subflow',...location(root,f,sub.flowName)});}
    for(const call of arr(meta.actionCalls)){if(call.actionType!=='apex'||!call.actionName){gaps.push({component:id,reason:'Unsupported Flow action type: '+call.actionType});continue;}edges.push({from:id,to:'ApexClass:'+call.actionName,kind:'invocable-action',...location(root,f,call.actionName)});}
    for(const tag of ['recordLookups','recordUpdates','recordCreates','recordDeletes'])for(const op of arr(meta[tag])){
     if(!op.object){gaps.push({component:id,reason:'Dynamic record reference in '+tag});continue;}
     for(const field of [...arr(op.filters),...arr(op.inputAssignments)].map(v=>v.field)){
      if(typeof field!=='string'||field.includes('.')){gaps.push({component:id,reason:'Unsupported relationship/dynamic field'});continue;}
      const target='CustomField:'+op.object+'.'+field;
      if(field.endsWith('__c'))edges.push({from:id,to:target,kind:tag,...location(root,f,field)});
     }
    }
    const supported=new Set(['@_xmlns','apiVersion','label','description','interviewLabel','processType','status','environments','start','variables','subflows','actionCalls','recordLookups','recordUpdates','recordCreates','recordDeletes']);
    for(const key of Object.keys(meta))if(!supported.has(key)&&!(key==='#text'&&typeof meta[key]==='string'&&!meta[key].trim()))gaps.push({component:id,reason:'Unsupported Flow dependency surface: '+key});
    if(meta.start?.object||meta.start?.recordTriggerType)gaps.push({component:id,reason:'Record-triggered start requires a runtime dependency adapter'});
    const scan=(v)=>{if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if((k==='elementReference'&&typeof x==='string'&&/[.$]/.test(x))||k==='objectType')gaps.push({component:id,reason:'Record or relationship reference requires additional mapping: '+String(x)});scan(x);}};scan(meta);
   }else if(f.endsWith('.cls'))add('ApexClass:'+path.basename(f,'.cls'),f,{source:text.replace(/\r\n/g,'\n'),descriptor:fs.existsSync(f+'-meta.xml')?xml(f+'-meta.xml'):null});
   else if(f.endsWith('.cls-meta.xml')||f.endsWith('.object-meta.xml')){ /* packaging descriptors; unsupported object semantics handled below */
    if(f.endsWith('.object-meta.xml'))add('CustomObject:'+path.basename(f,'.object-meta.xml'),f,xml(f));
   }else{gaps.push({component:'File:'+rel(root,f),reason:'Unsupported metadata file',sha256:hash(text)});}
  }
 }
 for(const e of edges)if(!nodes.has(e.to))gaps.push({component:e.from,reason:'Unresolved dependency '+e.to});
 return {apiVersion:project.sourceApiVersion,nodes:[...nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)),edges:edges.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),gaps,inputHashes:inputHashes.sort((a,b)=>a.path.localeCompare(b.path))};
}
export function analyze(basePath,headPath,testMap){
 if(!testMap||!Array.isArray(testMap.tests)||testMap.tests.length===0||testMap.tests.some(t=>!t.id||!Array.isArray(t.components))||new Set(testMap.tests.map(t=>t.id)).size!==testMap.tests.length)throw Error('Declare a nonempty unique test suite with component arrays');
 const base=inventory(basePath),head=inventory(headPath),b=new Map(base.nodes.map(n=>[n.id,n])),h=new Map(head.nodes.map(n=>[n.id,n]));
 const changes=sort(new Set([...b.keys(),...h.keys()])).filter(id=>b.get(id)?.semanticHash!==h.get(id)?.semanticHash).map(id=>({id,kind:!b.has(id)?'added':!h.has(id)?'removed':'modified',source:h.get(id)||b.get(id)}));
 const allEdges=[...base.edges,...head.edges],affected=new Set(changes.map(c=>c.id)),paths=[];
 let more=true;while(more){more=false;for(const e of allEdges)if(affected.has(e.to)&&!affected.has(e.from)){affected.add(e.from);paths.push(e);more=true;}}
 const gaps=[...base.gaps,...head.gaps];
 if(base.apiVersion!==head.apiVersion)gaps.push({reason:'API version changed; platform semantics unverified'});
 for(const c of changes)if(c.id.startsWith('ApexClass:')||c.id.startsWith('CustomObject:'))gaps.push({component:c.id,reason:'Apex/object behavior dependencies require native validation'});
 const mapped=testMap.tests.filter(t=>t.components.some(c=>affected.has(c))).map(t=>t.id);
 for(const c of changes){const dependents=new Set([c.id]);let expanded=true;while(expanded){expanded=false;for(const e of allEdges)if(dependents.has(e.to)&&!dependents.has(e.from)){dependents.add(e.from);expanded=true;}}
  if(!testMap.tests.some(t=>t.components.some(id=>dependents.has(id))))gaps.push({component:c.id,reason:'Changed component has no mapped test'});
 }
 const fallback=gaps.length>0,selected=sort(fallback?testMap.tests.map(t=>t.id):mapped);
 return {schemaVersion:1,platform:'Salesforce',execution:'offline-metadata-analysis',evidence_status:'simulated',nativeExecution:'not_run',scope:'Explicit Flow subflows, Apex calls and custom fields in supported record elements',coverage:gaps.length?'unknown':'supported-subset-only',changes,affected:sort(affected),impactPaths:paths,coverageGaps:gaps,selectedTests:selected,fullSuiteFallback:fallback,metrics:{declaredTests:testMap.tests.length,selectedTestIds:selected.length,extractedEdges:head.edges.length,nativeTestsExecuted:0},input:{base:base.inputHashes,head:head.inputHashes},conclusion:'Potential impact only; no runtime safety or differentiation claim'};
}
