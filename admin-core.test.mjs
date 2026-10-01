import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseData,serialize,validate,publish,createApi} from './admin-core.mjs';
const original=parseData(await readFile(new URL('./data.js',import.meta.url),'utf8'));
test('Japanese data round-trips without evaluating JavaScript',()=>{
 assert.deepEqual(parseData(serialize(original)),original);
 assert.throws(()=>parseData('window.EXHIBITION_DATA = (() => { throw Error("executed"); })();'));
});
test('invalid membership, duplicate slug, unsafe image are rejected',()=>{
 for(const mutate of [d=>d.exhibits[0].roomId='missing',d=>d.exhibits[0].slug=d.exhibits[1].slug,d=>d.rooms[0].image='javascript:alert(1)']){
  const d=structuredClone(original);mutate(d);assert.throws(()=>validate(d));
 }
});
test('a changed branch is rejected before any write',async()=>{
 const calls=[];const api=async(path,method='GET')=>{calls.push(method);return{object:{sha:'new'}};};
 await assert.rejects(publish(api,original,new Map(),'old'),/上書き/);
 assert.deepEqual(calls,['GET']);
});
test('images and data are published in one non-forced commit, preserving base tree',async()=>{
 const calls=[];
 const data=structuredClone(original);data.exhibits[0].images=[{src:'images/uploads/test.webp',alt:'画像',caption:''}];
 const api=async(path,method='GET',body)=>{
  calls.push({path,method,body});
  if(path==='/git/ref/heads/main')return{object:{sha:'base'}};
  if(path==='/git/commits/base')return{tree:{sha:'original-tree'}};
  if(path==='/git/blobs')return{sha:'image-blob'};
  if(path==='/git/trees')return{sha:'new-tree'};
  if(path==='/git/commits')return{sha:'new-commit'};
  if(path==='/git/refs/heads/main')return{object:{sha:'new-commit'}};
  throw Error(path);
 };
 const result=await publish(api,data,new Map([['images/uploads/test.webp',{base64:'YWJj'}],['images/uploads/unused.webp',{base64:'YWJj'}]]),'base');
 assert.equal(result,'new-commit');
 assert.equal(calls.filter(c=>c.path==='/git/blobs').length,1);
 const tree=calls.find(c=>c.path==='/git/trees').body;
 assert.equal(tree.base_tree,'original-tree');assert.equal(tree.tree.length,2);
 assert.equal(tree.tree[0].path,'data.js');assert.equal(tree.tree[1].sha,'image-blob');
 assert.deepEqual(calls.at(-1).body,{sha:'new-commit',force:false});
});
test('failed image upload never advances the branch',async()=>{
 const d=structuredClone(original);d.exhibits[0].images=[{src:'images/uploads/test.webp',alt:'test',caption:''}];
 const paths=[];
 const api=async(path)=>{paths.push(path);if(path==='/git/ref/heads/main')return{object:{sha:'base'}};if(path==='/git/commits/base')return{tree:{sha:'tree'}};throw Error('upload failed');};
 await assert.rejects(publish(api,d,new Map([['images/uploads/test.webp',{base64:'YWJj'}]]),'base'),/upload failed/);
 assert.ok(!paths.includes('/git/refs/heads/main'));
});
test('API token is sent only to fixed GitHub repo in Authorization; errors do not expose it',async()=>{
 const secret='test-token-not-real';let request;
 const api=createApi(secret,async(url,options)=>{request={url,options};return{ok:false,status:401};});
 await assert.rejects(api('/contents/data.js'),e=>!e.message.includes(secret));
 assert.equal(request.url,'https://api.github.com/repos/butumu2027/Butumu2027/contents/data.js');
 assert.equal(request.options.headers.Authorization,'Bearer '+secret);
 assert.equal(request.options.redirect,'error');
});
