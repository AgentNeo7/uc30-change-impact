import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {analyze,inventory} from '../src/impact.mjs';
const load=p=>JSON.parse(fs.readFileSync(p));
for(const org of ['org-a','org-b'])test(org+' frozen metadata oracle',()=>{const root='examples/'+org,r=analyze(root+'/base',root+'/head',load(root+'/tests.json')),o=load(root+'/oracle.json');assert.deepEqual(r.changes.map(c=>c.id),o.changes);assert.deepEqual(r.selectedTests,o.selectedTests);assert.equal(r.fullSuiteFallback,o.fullSuiteFallback);assert.equal(r.metrics.nativeTestsExecuted,0);assert.ok(r.impactPaths.every(p=>p.line>0&&p.path.endsWith('.flow-meta.xml')));});
function mutate(fn){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'uc30-'));try{fs.cpSync('examples/org-a',tmp,{recursive:true});return fn(tmp);}finally{fs.rmSync(tmp,{recursive:true,force:true});}}
const field='head/force-app/main/default/objects/UC30_Review__c/fields/Decision__c.field-meta.xml';
const flow='head/force-app/main/default/flows/UC30_ReviewFlow.flow-meta.xml';
const run=tmp=>analyze(tmp+'/base',tmp+'/head',load(tmp+'/tests.json'));
test('cosmetic XML produces no semantic change',()=>mutate(tmp=>{fs.cpSync(tmp+'/base',tmp+'/head',{recursive:true});const f=tmp+'/'+field;fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/></g,'>\n  <'));assert.equal(run(tmp).changes.length,0);}));
test('unmapped changes retain whole declared suite',()=>mutate(tmp=>{const f=tmp+'/head/force-app/main/default/objects/UC30_Review__c/fields/Other__c.field-meta.xml';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('<length>40','<length>80'));assert.equal(run(tmp).fullSuiteFallback,true);assert.equal(run(tmp).selectedTests.length,2);}));
test('unknown action type remains unknown',()=>mutate(tmp=>{const f=tmp+'/'+flow;fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('<apiVersion>','<actionCalls><actionType>externalService</actionType><actionName>unknown</actionName></actionCalls><apiVersion>'));assert.equal(run(tmp).coverage,'unknown');assert.equal(run(tmp).selectedTests.length,2);}));
test('malformed XML refuses analysis',()=>mutate(tmp=>{fs.writeFileSync(tmp+'/'+field,'<CustomField>');assert.throws(()=>run(tmp),/Malformed XML/);}));
test('missing snapshot refuses analysis',()=>assert.throws(()=>inventory('/nonexistent'),/requires/));
test('DTD rejected',()=>mutate(tmp=>{fs.writeFileSync(tmp+'/'+field,'<!DOCTYPE x><CustomField/>');assert.throws(()=>run(tmp),/DTD/);}));
test('empty test suite refuses false safety',()=>assert.throws(()=>analyze('examples/org-a/base','examples/org-a/head',{tests:[]}),/nonempty/));
test('Apex body change requires full fallback',()=>mutate(tmp=>{fs.appendFileSync(tmp+'/head/force-app/main/default/classes/UC30_ReviewAction.cls','\n// changed\n');assert.equal(run(tmp).fullSuiteFallback,true);}));
test('duplicate metadata ids refused',()=>mutate(tmp=>{fs.cpSync(tmp+'/head/force-app/main/default',tmp+'/head/force-app/duplicate',{recursive:true});assert.throws(()=>run(tmp),/Duplicate/);}));
test('unresolved subflow keeps whole suite',()=>mutate(tmp=>{const f=tmp+'/'+flow;fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('<apiVersion>','<subflows><flowName>Absent</flowName></subflows><apiVersion>'));assert.equal(run(tmp).fullSuiteFallback,true);}));

test('unhandled Flow decision does not silently narrow tests',()=>mutate(tmp=>{const f=tmp+'/'+flow;fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('<apiVersion>','<decisions><name>Branch</name></decisions><apiVersion>'));assert.equal(run(tmp).fullSuiteFallback,true);}));
test('Apex API metadata changes require full suite',()=>mutate(tmp=>{const f=tmp+'/head/force-app/main/default/classes/UC30_ReviewAction.cls-meta.xml';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('64.0','65.0'));assert.equal(run(tmp).fullSuiteFallback,true);assert.ok(run(tmp).changes.some(c=>c.id==='ApexClass:UC30_ReviewAction'));}));
test('foreign namespace refused',()=>mutate(tmp=>{const f=tmp+'/'+field;fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('http://soap.sforce.com/2006/04/metadata','https://not-salesforce.invalid'));assert.throws(()=>run(tmp),/namespace/);}));
