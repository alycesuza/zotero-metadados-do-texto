"use strict";
const args=window.arguments[0];let rows=[],busy=false;
const $=id=>document.getElementById(id);
function status(text){$("status").textContent=text;}
function element(name,text){const node=document.createElementNS("http://www.w3.org/1999/xhtml",name);if(text!==undefined)node.textContent=typeof text==="object"?JSON.stringify(text):String(text??"");return node;}
async function action(fn){if(busy)return;busy=true;$("analyze").disabled=true;try{await fn();}catch(error){status("Erro: "+(error.message||error));}finally{busy=false;$("analyze").disabled=false;}}
function render(){
  const query=$("filter").value.toLocaleLowerCase();const filtered=rows.filter(row=>JSON.stringify(row).toLocaleLowerCase().includes(query));
  $("results").replaceChildren();
  if(!filtered.length){$("results").append(element("p",rows.length?"Nenhum resultado para esse filtro.":"Nenhum apontamento pelas regras desta versão. Isso não comprova que todos os dados estejam corretos."));return;}
  const keys=args.mode==="metadata"?["key","field","current","proposed","confidence","evidence","sourceKey","explanation","message"]:[...new Set(filtered.flatMap(row=>Object.keys(row)))];
  const labels={key:"Chave",title:"Título",field:"Campo",current:"Valor atual",proposed:"Proposta editável",confidence:"Conferência",evidence:"Evidência",sourceKey:"Chave da fonte",explanation:"Observação",message:"Apontamento",severity:"Prioridade",country:"País",category:"Categoria",status:"Situação",keys:"Chaves",records:"Registros"};
  const table=element("table"),head=element("thead"),tr=element("tr");
  for(const key of keys)tr.append(element("th",labels[key]||key));if(args.mode==="metadata")tr.append(element("th","Ação"));head.append(tr);table.append(head);
  const body=element("tbody");
  for(const row of filtered){const tr=element("tr");
    for(const key of keys){const td=element("td");
      if(key==="proposed"&&row.field){const input=element("input");input.value=row.proposed;input.setAttribute("aria-label","Proposta para "+row.field+" de "+row.key);input.addEventListener("input",()=>row.proposed=input.value);td.append(input);}
      else td.textContent=typeof row[key]==="object"?JSON.stringify(row[key]):String(row[key]??"");
      if(key==="evidence")td.className="evidence";tr.append(td);
    }
    if(args.mode==="metadata"){const td=element("td");if(row.field){const button=element("button",row.applied?"Aplicado":"Aplicar esta proposta");button.disabled=Boolean(row.applied);button.addEventListener("click",()=>action(async()=>{await args.apply(row);row.applied=true;render();status("Correção salva. O histórico permite desfazer enquanto o valor não for alterado novamente.");}));td.append(button);}tr.append(td);}
    body.append(tr);
  }table.append(body);$("results").append(table);
}
$("title").textContent=args.title+" "+args.version;document.title=args.title;
$("description").textContent=args.config.description;$("limits").textContent=args.config.limits;
$("coverage").hidden=args.mode!=="coverage";$("undo").hidden=args.mode!=="metadata";
$("analyze").addEventListener("click",()=>action(async()=>{
  status("Analisando... Os arquivos originais serão preservados.");
  const expected=args.mode==="coverage"?JSON.parse($("expected").value||"[]"):[];
  rows=await args.analyze(expected,(n,total)=>status(`Analisando ${n}/${total}...`));render();status(rows.length+" resultado(s). Revise os limites desta análise.");
}));
$("filter").addEventListener("input",render);
$("export").addEventListener("click",()=>action(async()=>{if(await args.exportCSV(window,rows))status("Relatório CSV exportado.");}));
$("undo").addEventListener("click",()=>action(async()=>{const entry=await args.undo();status("Correção desfeita: "+entry.key+", campo "+entry.field+". Analise novamente para atualizar as propostas.");rows=[];render();}));
$("saveExpected").addEventListener("click",()=>action(async()=>{await args.saveExpected(JSON.parse($("expected").value||"[]"));status("Lista esperada salva neste computador.");}));
$("close").addEventListener("click",()=>window.close());
if(args.mode==="coverage")action(async()=>{$("expected").value=JSON.stringify(await args.loadExpected(),null,2);});
