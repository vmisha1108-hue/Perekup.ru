from pathlib import Path
import zipfile,json,hashlib,os
b=Path.cwd();p=b/'project';out=b/'.build/packages';out.mkdir(parents=True,exist_ok=True);published=b/'deliverables';published.mkdir(exist_ok=True);sdk=b/'build-tools/qt-sdk/6.4.2/mingw_64'
files={'Perekyp.exe':b/'.build/bin/perekup.exe','perekup.exe':b/'.build/bin/perekup.exe','seller-ai.exe':b/'.build/ai-windows/seller-ai.exe','Qt6Network.dll':sdk/'bin/Qt6Network.dll','README-V8.2.md':p/'V8.2-README.md','README-OS.txt':p/'V8.2-README.md','models/model-info.json':p/'models/model-info.json','models/expanded-model-info.json':p/'models/expanded-model-info.json'}
for name in ['SellerAI-Qwen3-Apache-2.0.txt','SellerAI-Qwen-Apache-2.0.txt','SellerAI-llama-MIT.txt']:files['licenses/'+name]=p/'licenses'/name
for name in ['qschannelbackend.dll','qcertonlybackend.dll']:files['tls/'+name]=sdk/'plugins/tls'/name
for path in (sdk/'plugins/networkinformation').glob('*.dll'):files['networkinformation/'+path.name]=path
assert files['seller-ai.exe'].stat().st_size>5_000_000
manifest={'version':'V8.2-restored','modelWeightsIncluded':False,'modelDownloadInSettings':True,'files':{name:hashlib.sha256(path.read_bytes()).hexdigest() for name,path in files.items()}}
(p/'verification/v82/runtime-manifest.json').write_text(json.dumps(manifest,indent=2));files['V8.2-files-sha256.json']=p/'verification/v82/runtime-manifest.json'
update=out/'Perekyp-V8.2-Update.zip'
with zipfile.ZipFile(update,'w',zipfile.ZIP_DEFLATED) as z:
 for name,path in files.items():z.write(path,'Perekyp/'+name)
 z.writestr('Perekyp/qt.conf','[Paths]\nPrefix=.\nPlugins=.\n')
full=out/'Perekyp-V8.2-Windows-x64.zip'
with zipfile.ZipFile(b/'recovery/Perekup-Windows-x64-2026-10-26.zip') as old,zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED) as z:
 replacements={'Perekyp/'+name:path for name,path in files.items()}
 for folder in ['assets','data']:
  for path in (p/folder).rglob('*'):
   if path.is_file() and not any(part.startswith('.') for part in path.relative_to(p).parts):replacements['Perekyp/'+str(path.relative_to(p))]=path
 for name in old.namelist():
  if name in replacements or name.startswith('Perekyp/saves/') or name.endswith('.gguf'):continue
  z.writestr(name,old.read(name))
 for name,path in replacements.items():z.write(path,name)
for path in [update,full]:
 with zipfile.ZipFile(path) as z:
  assert len(z.namelist())==len(set(z.namelist())) and z.testzip() is None
  assert not any(n.endswith('.gguf') or '/saves/' in n for n in z.namelist())
  assert hashlib.sha256(z.read('Perekyp/seller-ai.exe')).hexdigest()==manifest['files']['seller-ai.exe']
 print(path.name,path.stat().st_size,'runtime CRC/identity checks passed',flush=True)
paths=[f for f in sorted(p.rglob('*')) if f.is_file() and f.name not in ['files-sha256.json','seller-ai','seller-ai.exe'] and f.suffix!='.gguf' and not any(part.startswith('.') for part in f.relative_to(p).parts) and not(f.is_relative_to(p/'models') and f.suffix not in ['.json','.txt'])]
(p/'files-sha256.json').write_text(json.dumps({str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},indent=2))
source=out/'Perekup-Cpp-Source-Checkpoint.zip'
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
 for f in paths+[p/'files-sha256.json']:z.write(f,str(f.relative_to(p)))
with zipfile.ZipFile(source) as z:assert z.testzip() is None;assert not any(n.endswith('.gguf') for n in z.namelist())
for path in [update,full,source]:
 digest=hashlib.sha256(path.read_bytes()).hexdigest();target=published/path.name;os.replace(path,target);assert hashlib.sha256(target.read_bytes()).hexdigest()==digest
 with zipfile.ZipFile(target) as z:assert z.testzip() is None
 print('Published verified',target.name,target.stat().st_size,flush=True)
