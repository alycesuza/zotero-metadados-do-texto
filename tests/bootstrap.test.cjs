const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('bootstrap loads in a Zotero scope without a browser console and unregisters menus',async()=>{
 const registered=[],removed=[];
 const Zotero={MenuManager:{registerMenu(options){registered.push(options);return options.menuID;},unregisterMenu(id){removed.push(id);}},DataDirectory:{dir:'synthetic'}};
 const Services={io:{newURI:x=>x},scriptloader:{loadSubScript(url,scope){if(!vm.isContext(scope))vm.createContext(scope);vm.runInContext(fs.readFileSync(url,'utf8'),scope);}}};
 let chromeRemoved=false;
 const Cc={"@mozilla.org/addons/addon-manager-startup;1":{getService:()=>({registerChrome:()=>({destruct:()=>{chromeRemoved=true;}})})}};
 const context={Zotero,Services,ChromeUtils:{},Cc,Ci:{},console:undefined};vm.createContext(context);
 vm.runInContext(fs.readFileSync('src/bootstrap.js','utf8'),context);
 await context.startup({id:require('../src/manifest.json').applications.zotero.id,version:'0.1.0',rootURI:'src/'});
 assert.equal(registered.length,2);assert.ok(registered.some(x=>x.target==='main/menubar/tools'));
 let label;registered[0].menus[0].onShowing({}, {menuElem:{setAttribute(k,v){label=v;}}});assert.ok(label.includes('analisar seleção'));
 context.shutdown();assert.equal(removed.length,2);assert.ok(chromeRemoved);
});
