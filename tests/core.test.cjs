const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const core=require('../src/core.js');
const item=(overrides={})=>({key:'SYNTH001',title:'Synthetic example',date:'2020',type:'book',creators:[{lastName:'Example'}],tags:[],attachments:[],...overrides});
test('CSV export protects spreadsheet formulas and preserves quotes',()=>{
 const csv=core.csv([{title:'=HYPERLINK("x")',evidence:'Line; "quoted"'}]);
 assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('""quoted""'));
});
test('package contains no database, account credentials or real document fixture',()=>{
 const manifest=require('../src/manifest.json');const pkg=require('../package.json');
 assert.equal(manifest.version,pkg.version);assert.equal(manifest.applications.zotero.id,pkg.zotero.id);
 assert.equal(manifest.applications.zotero.strict_min_version,'10.0');
 for(const file of fs.readdirSync('src'))assert.ok(!/\.(sqlite|pdf|docx|env)$/i.test(file));
 for(const file of fs.readdirSync('src').filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync('src/'+file,'utf8'),{filename:file});
});
test('extracts candidates with source evidence and rejects invalid ISBN',()=>{
 const text='Title: Synthetic book\nPublication year: 2021\nPublisher: Example Press\nISBN: 978-0-306-40615-7\nDOI: 10.1234/example.\n';
 const rows=core.extract(text,item(),'PDF00001');
 assert.ok(rows.some(x=>x.field==='title'&&x.proposed==='Synthetic book'));
 assert.ok(rows.some(x=>x.field==='DOI'&&x.proposed==='10.1234/example'));
 assert.ok(rows.some(x=>x.field==='ISBN'));
 assert.ok(rows.every(x=>x.evidence&&x.sourceKey==='PDF00001'));
 assert.ok(!core.extract('ISBN: 978-0-306-40615-8',item()).some(x=>x.field==='ISBN'));
});
test('does not infer publication year from a coverage range or replace a matching value',()=>{
 assert.equal(core.extract('National strategy 2025-2030',item()).length,0);
 assert.equal(core.extract('Title: Synthetic example',item()).length,0);
});
test('undo must preserve subsequent user edits',()=>{
 assert.equal(core.canRestore('Later manual edit',{before:'Old',after:'New'}),false);
 assert.equal(core.canRestore('New',{before:'Old',after:'New'}),true);
});
