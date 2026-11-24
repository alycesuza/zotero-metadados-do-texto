const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const core=require('../src/core.js');
function setup(){
 const disk=new Map();let value='10.1234/old',fail=false;
 const item={id:1,key:'SYNTH001',libraryID:1,itemType:'journalArticle',itemTypeID:4,getField:()=>value,setField:(field,next)=>{value=next;},saveTx:async()=>{if(fail)throw Error('Synthetic save failure');}};
 const Zotero={DataDirectory:{dir:'C:\\Synthetic\\Zotero'},File:{pathToFile(path){return {path,append(name){this.path+='\\'+name;},exists(){return disk.has(this.path);}};},getContentsAsync:async path=>disk.get(path),putContentsAsync:async(path,text)=>{assert.ok(!path.includes('/'),'Windows paths must use native append');disk.set(path,text);}},Items:{get:()=>item,getByLibraryAndKeyAsync:async()=>item},ItemFields:{getID:name=>name,isValidForType:()=>true},Utilities:{randomString:()=>String(disk.size)},MenuManager:{unregisterMenu(){}}};
 const context={Zotero,Services:{},ChromeUtils:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('src/runtime.js','utf8'),context);
 const app=context.createMaintenanceApp({id:'synthetic',version:'0.1.0',rootURI:'src/',core,config:{slug:'synthetic',mode:'metadata'}});
 return {app,disk,item,get:()=>value,set:v=>{value=v;},fail:()=>{fail=true;}};
}
const row={itemID:1,key:'SYNTH001',field:'DOI',current:'10.1234/old',proposed:'10.1234/new',sourceKey:'PDF00001',evidence:'Synthetic evidence'};
test('reviewed correction is journaled and reversible, preserving intervening edits',async()=>{
 const env=setup();await env.app.apply(row);assert.equal(env.get(),'10.1234/new');assert.equal(env.disk.size,1);
 env.set('10.1234/manual');await assert.rejects(env.app.undo(),/mudou depois/);assert.equal(env.get(),'10.1234/manual');
 env.set('10.1234/new');await env.app.undo();assert.equal(env.get(),'10.1234/old');
 const history=JSON.parse([...env.disk.values()][0]);assert.equal(history[0].status,'undone');
});
test('stale previews and failed saves cannot silently replace current values',async()=>{
 const stale=setup();stale.set('10.1234/manual');await assert.rejects(stale.app.apply(row),/mudou desde/);assert.equal(stale.disk.size,0);
 const failed=setup();failed.fail();await assert.rejects(failed.app.apply(row),/Synthetic save failure/);assert.equal(failed.get(),'10.1234/old');
 assert.equal(JSON.parse([...failed.disk.values()][0])[0].status,'failed');
});
