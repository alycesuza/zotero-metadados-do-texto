"""Build a deterministic Zotero XPI using only the Python standard library."""
import argparse,hashlib,json,pathlib,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
manifest=json.loads((root/'src/manifest.json').read_text(encoding='utf-8'));package=json.loads((root/'package.json').read_text(encoding='utf-8'))
assert manifest['version']==package['version'],'Manifest and package versions differ'
assert manifest['applications']['zotero']['id']==package['zotero']['id']
files=sorted(p for p in (root/'src').rglob('*') if p.is_file())
assert {'bootstrap.js','manifest.json'}<={p.name for p in files}
for p in files:
 assert not any(part.startswith('.') for part in p.relative_to(root/'src').parts),'Unexpected hidden file in XPI'
 assert p.suffix.lower() in {'.js','.json','.xhtml','.css','.ftl','.svg','.png'},p
if args.check:
 print('Package metadata validated');raise SystemExit(0)
out=root/'build';out.mkdir(exist_ok=True);archive=out/f"{package['name']}-{manifest['version']}.xpi"
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in files:
  info=zipfile.ZipInfo(p.relative_to(root/'src').as_posix(),date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  payload=p.read_bytes()
  if p.suffix.lower()!='.png':payload=payload.replace(b'\r\n',b'\n')
  z.writestr(info,payload)
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
(out/(archive.name+'.sha256')).write_text(checksum+'  '+archive.name+'\n',encoding='utf-8')
url=f"https://github.com/alycesuza/{package['name']}/releases/download/v{manifest['version']}/{archive.name}"
updates={'addons':{package['zotero']['id']:{'updates':[{'version':manifest['version'],'update_link':url,'update_hash':'sha256:'+checksum,'applications':{'zotero':{'strict_min_version':'10.0','strict_max_version':'10.0.*'}}}]}}}
(out/'updates.json').write_text(json.dumps(updates,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(archive.name+' SHA256 '+checksum)
