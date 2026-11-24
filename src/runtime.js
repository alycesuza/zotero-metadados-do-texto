"use strict";
function createMaintenanceApp({id,version,rootURI,panelURI,core,config}) {
  const menuIDs=[],windows=new Set();let active=true;
  function dataPath(name){const file=Zotero.File.pathToFile(Zotero.DataDirectory.dir);file.append(name);return file.path;}
  const journalFile=()=>dataPath(config.slug+"-history.json");
  const expectedFile=()=>dataPath(config.slug+"-expected.json");
  const asJSON=value=>JSON.parse(JSON.stringify(value));
  async function readJSON(path,fallback) {
    if(!Zotero.File.pathToFile(path).exists())return fallback;
    return JSON.parse(await Zotero.File.getContentsAsync(path));
  }
  async function writeJSON(path,value){await Zotero.File.putContentsAsync(path,JSON.stringify(value,null,2));}
  function regularItems(items) {
    const result=new Map();
    for(let item of items) {
      if(item.isAttachment()&&item.parentItemID)item=Zotero.Items.get(item.parentItemID);
      if(item&&!item.deleted&&(item.isRegularItem()||item.isAttachment()))result.set(item.id,item);
    }
    return [...result.values()];
  }
  function values(item) {
    const field=name=>{try{return item.getField(name)||"";}catch{return "";}};
    return {id:item.id,key:item.key,libraryID:item.libraryID,type:item.itemType,
      title:field(item.itemType==="statute"?"nameOfAct":"title"),date:field(item.itemType==="statute"?"dateEnacted":"date"),DOI:field("DOI"),ISBN:field("ISBN"),publisher:field("publisher"),
      creators:asJSON(item.getCreators()),tags:item.getTags().map(x=>x.tag),attachments:[]};
  }
  async function attachmentValue(item,readText) {
    const modes=["imported_file","imported_url","linked_file","linked_url","embedded_image"];
    const row={id:item.id,key:item.key,title:item.getField("title"),contentType:item.attachmentContentType,
      linkMode:modes[item.attachmentLinkMode]||"unknown",exists:false,text:""};
    if(row.linkMode==="linked_url")return row;
    const path=await item.getFilePathAsync();row.exists=Boolean(path&&Zotero.File.pathToFile(path).exists());
    if(!readText||!row.exists)return row;
    try {
      if(row.contentType==="application/pdf") {
        const extracted=await Zotero.PDFWorker.getFullText(item.id,5);
        row.text=String(extracted.text||"").slice(0,150000);row.totalPages=extracted.totalPages;row.extractedPages=extracted.extractedPages;
      } else if(/html|plain|xml/.test(row.contentType||"")) {
        let text=await Zotero.File.getContentsAsync(path,"utf-8",1000000);
        if(/html|xml/.test(row.contentType||"")) {
          const win=Zotero.getMainWindow();const doc=new win.DOMParser().parseFromString(text,"text/html");
          for(const node of doc.querySelectorAll("script,style,nav,footer"))node.remove();
          text=doc.body.textContent;
        }
        row.text=String(text).slice(0,150000);
      } else {
        const cache=Zotero.Fulltext.getItemCacheFile(item);
        if(cache.exists())row.text=(await Zotero.File.getContentsAsync(cache,"utf-8",150000)).slice(0,150000);
      }
    } catch(error){row.error=String(error.message||error);}
    return row;
  }
  async function describe(items,onProgress) {
    const result=[];
    for(let index=0;index<items.length;index++) {
      if(!active)throw new Error("Extensão desativada.");
      const item=items[index],row=values(item);
      const ids=item.isAttachment()?[item.id]:item.getAttachments(false);
      for(const attachment of Zotero.Items.get(ids))row.attachments.push(await attachmentValue(attachment,["metadata","document"].includes(config.mode)));
      // OCR-only notes are a fallback and stay visibly identified as notes.
      if(config.mode==="metadata"&&!row.attachments.some(a=>a.text?.trim())&&item.isRegularItem()) {
        for(const note of Zotero.Items.get(item.getNotes(false))) {
          if(!/ocr/i.test(note.getNoteTitle()))continue;
          const win=Zotero.getMainWindow();const text=new win.DOMParser().parseFromString(note.getNote(),"text/html").body.textContent;
          row.attachments.push({key:note.key,title:"Nota OCR",text,exists:true,linkMode:"note"});
        }
      }
      result.push(row);onProgress?.(index+1,items.length);
    }
    return result;
  }
  async function collect(win,all=false) {
    const source=all?win.ZoteroPane.itemsView.getSortedItems():win.ZoteroPane.getSelectedItems();
    const items=regularItems(source);
    if(!items.length)throw new Error("Selecione uma ou mais referências na biblioteca. A opção de visão atual usa os itens visíveis, respeitando filtros.");
    return items;
  }
  async function analyze(win,all,expected,onProgress) {
    const rows=await describe(await collect(win,all),onProgress);
    if(config.mode==="reference")return core.audit(rows);
    if(config.mode==="document")return core.audit(rows);
    if(config.mode==="coverage")return core.coverage(rows,expected);
    const proposals=[];
    for(const item of rows) {
      let extracted=0;
      for(const a of item.attachments) {
        if(!a.text?.trim())continue;
        const found=core.extract(a.text,item,a.key);extracted+=found.length;
        for(const candidate of found)proposals.push({...candidate,itemID:item.id,sourceTitle:a.title});
      }
      if(!extracted)proposals.push({key:item.key,title:item.title,field:"",message:"Nenhuma proposta pelas regras desta versão. Confirme se o PDF tem camada de texto ou se existe uma nota OCR. Leitura inicial limitada a cinco páginas de cada PDF."});
    }
    return proposals;
  }
  function nativeField(item,field) {
    if(field==="creators")return field;
    const mapping=item.itemType==="statute"?{title:"nameOfAct",date:"dateEnacted"}:{};
    const native=mapping[field]||field;
    const fieldID=Zotero.ItemFields.getID(native);
    if(!fieldID||!Zotero.ItemFields.isValidForType(fieldID,item.itemTypeID))throw new Error("O campo "+field+" não é válido para este tipo de item. Ajuste o tipo manualmente primeiro.");
    return native;
  }
  let mutation=Promise.resolve();
  function serialized(fn){const next=mutation.then(fn);mutation=next.catch(()=>{});return next;}
  async function apply(row) {
    return serialized(async()=>{
      if(!active||config.mode!=="metadata"||!["title","date","DOI","ISBN","publisher","creators"].includes(row.field))throw new Error("Proposta não aplicável.");
      const item=Zotero.Items.get(row.itemID);
      if(!item||item.key!==row.key||item.deleted)throw new Error("O item foi removido ou mudou. Analise novamente.");
      const field=nativeField(item,row.field);
      const before=field==="creators"?asJSON(item.getCreators()):item.getField(field)||"";
      const expected=field==="creators"?row.current:row.current||"";
      if(JSON.stringify(before)!==JSON.stringify(expected))throw new Error("O campo mudou desde a análise. Refaça a análise para preservar a edição mais recente.");
      const after=field==="creators"?JSON.parse(row.proposed):String(row.proposed).trim();
      if(!after||(Array.isArray(after)&&!after.length))throw new Error("Proposta vazia.");
      if(field==="DOI"&&!core.validDOI(after))throw new Error("DOI com formato inválido.");
      if(field==="ISBN"&&!core.isbn(after))throw new Error("ISBN sem dígito verificador válido.");
      const journal=await readJSON(journalFile(),[]);
      const entry={id:Date.now()+"-"+Zotero.Utilities.randomString(6),date:new Date().toISOString(),libraryID:item.libraryID,key:item.key,field,before,after,sourceKey:row.sourceKey,evidence:row.evidence,status:"prepared"};
      journal.push(entry);await writeJSON(journalFile(),journal);
      try {
        if(field==="creators")item.setCreators(after);else item.setField(field,after);
        await item.saveTx();
      } catch(error) {
        if(field==="creators")item.setCreators(before);else item.setField(field,before);
        entry.status="failed";await writeJSON(journalFile(),journal);throw error;
      }
      entry.status="applied";await writeJSON(journalFile(),journal);return entry;
    });
  }
  async function undo() {
    return serialized(async()=>{
      const journal=await readJSON(journalFile(),[]);
      const entry=[...journal].reverse().find(x=>["applied","prepared"].includes(x.status));
      if(!entry)throw new Error("Nenhuma alteração disponível para desfazer.");
      const item=await Zotero.Items.getByLibraryAndKeyAsync(entry.libraryID,entry.key);
      if(!item||item.deleted)throw new Error("O registro não está disponível.");
      const current=entry.field==="creators"?asJSON(item.getCreators()):item.getField(entry.field)||"";
      if(!core.canRestore(current,entry))throw new Error("O campo mudou depois da correção. A reversão foi interrompida para preservar essa edição.");
      if(entry.field==="creators")item.setCreators(entry.before);else item.setField(entry.field,entry.before);
      await item.saveTx();entry.status="undone";entry.undoneAt=new Date().toISOString();await writeJSON(journalFile(),journal);return entry;
    });
  }
  async function exportCSV(win,rows) {
    if(!rows.length)throw new Error("Analise os itens antes de exportar.");
    const {FilePicker}=ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
    const picker=new FilePicker();picker.init(win,"Exportar relatório CSV",picker.modeSave);picker.appendFilter("CSV","*.csv");picker.defaultString=config.slug+".csv";
    const result=await picker.show();if(result===picker.returnCancel)return false;
    await Zotero.File.putContentsAsync(picker.file,core.csv(rows));return true;
  }
  function open(win,all=false) {
    const args={title:config.title,mode:config.mode,version,core,config,analyze:(expected,progress)=>analyze(win,all,expected,progress),apply,undo,
      loadExpected:()=>readJSON(expectedFile(),[]),saveExpected:rows=>writeJSON(expectedFile(),core.validateExpected(rows)),
      exportCSV:(panel,rows)=>exportCSV(panel,rows),select:key=>{
        const item=Zotero.Items.getByLibraryAndKey(win.ZoteroPane.getSelectedLibraryID(),key);
        if(item)win.ZoteroPane.selectItem(item.id);
      }};
    const panel=win.openDialog(panelURI||rootURI+"panel.xhtml",config.slug+"-"+Date.now(),"chrome,centerscreen,resizable,width=1100,height=760",args);
    windows.add(panel);panel.addEventListener("unload",()=>windows.delete(panel),{once:true});
    return panel;
  }
  function start() {
    for(const target of ["main/menubar/tools","main/library/item"]) {
      menuIDs.push(Zotero.MenuManager.registerMenu({menuID:config.slug+"-"+target.replaceAll("/","-"),pluginID:id,target,menus:[{
        menuType:"menuitem",onShowing(event,context){context.menuElem.setAttribute("label",config.title+" - analisar seleção");},
        onCommand(){open(Zotero.getMainWindow(),false);}
      },...(target==="main/menubar/tools"?[{menuType:"menuitem",onShowing(event,context){context.menuElem.setAttribute("label",config.title+" - analisar visão atual");},onCommand(){open(Zotero.getMainWindow(),true);}}]:[])]}));
    }
  }
  function stop(){active=false;for(const key of menuIDs)Zotero.MenuManager.unregisterMenu(key);for(const win of windows)if(!win.closed)win.close();}
  return {start,stop,open,analyze,apply,undo,describe};
}
