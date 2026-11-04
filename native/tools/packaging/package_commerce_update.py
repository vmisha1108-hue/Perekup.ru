from pathlib import Path
import json,zipfile,hashlib,subprocess,re,os
base=Path(__file__).resolve().parents[4]
project=base/'perekup-native/project';build=base/'build-tools/windows-build';restore=base/'restore'
assert len(list(build.glob('*_test.exe')))==34
source=restore/'Perekup-Windows-x64-2026-10-26.zip'
with zipfile.ZipFile(source) as old:
 provided={Path(n).name.lower() for n in old.namelist() if n.endswith('.dll')}
 imports=json.loads(old.read('Perekup/IMPORTS.json'))
 replacements={'Perekup.exe':(build/'perekup_native_desktop.exe').read_bytes(),'PORT-STATUS.md':(project/'STATUS.md').read_bytes(),'BUILD-REPORT.json':(project/'verification/build-report.json').read_bytes(),'Check-Career.cmd':(project/'tools/windows/Check-Career.cmd').read_bytes(),'data/photo-crops.json':(project/'data/photo-crops.json').read_bytes()}
 for file in build.glob('*_test.exe'):replacements['checks/'+file.name]=file.read_bytes()
 for name in ['commerce-visuals.json']:replacements['data/'+name]=(project/'data'/name).read_bytes()
 for file in (project/'assets/img/urban').rglob('*'):
  if file.is_file():replacements['assets/'+str(file.relative_to(project/'assets'))]=file.read_bytes()
 replacements['Check-Commerce.cmd']=(project/'tools/windows/Check-Commerce.cmd').read_bytes()
 replacements['README-UPDATE.txt']=(project/'tools/packaging/commerce-update-readme.txt').read_bytes()
 replacements['README-RU.txt']=replacements['README-UPDATE.txt']

 assert len(list(build.glob('*_test.exe')))==34
 system=set('advapi32 authz bcrypt comdlg32 crypt32 d2d1 d3d11 d3d9 dcomp dnsapi dwmapi dwrite dxgi gdi32 imm32 iphlpapi kernel32 mpr msvcrt netapi32 ntdll ole32 oleaut32 powrprof propsys psapi secur32 setupapi shcore shell32 shlwapi synchronization user32 userenv uxtheme version winmm winspool ws2_32 wtsapi32'.split())
 objdump=str(base/'build-tools/sysroot/usr/bin/x86_64-w64-mingw32-objdump')
 for name in ['Perekup.exe',*[k for k in replacements if k.endswith('_test.exe')]]:
  file=build/('perekup_native_desktop.exe' if name=='Perekup.exe' else Path(name).name)
  result=subprocess.check_output([objdump,'-p',str(file)],text=True)
  dlls=re.findall(r'DLL Name: (\S+)',result);imports[name]=dlls
  for dll in dlls:
   lower=dll.lower()
   assert lower in provided or lower.removesuffix('.dll') in system or lower.startswith(('api-ms-win-','ext-ms-win-')),f'Unresolved {dll}'
  if name=='Perekup.exe':assert re.search(r'Subsystem\s+00000002',result),'Not Windows GUI subsystem'
 replacements['IMPORTS.json']=json.dumps(imports,indent=2).encode()
 # Full package: preserve original licensed assets/runtimes, replace only release files.
 entries={}
 temporary=restore/'Perekup-Windows-Career-temporary.zip'
 with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED) as out:
  for info in old.infolist():
   relative=info.filename.removeprefix('Perekup/')
   if relative=='FILES-SHA256.json' or relative in replacements:continue
   if any(p.startswith('.') for p in Path(relative).parts):continue
   data=old.read(info.filename)
   if relative.startswith('saves/') and data:raise RuntimeError('Full package contains save data')
   out.writestr(info,data)
   if not info.is_dir():entries[relative]=hashlib.sha256(data).hexdigest()
  for name,data in replacements.items():out.writestr('Perekup/'+name,data);entries[name]=hashlib.sha256(data).hexdigest()
  manifest=json.dumps([{'path':k,'sha256':v} for k,v in sorted(entries.items())],indent=2).encode()
  out.writestr('Perekup/FILES-SHA256.json',manifest)
os.replace(temporary,source)
with zipfile.ZipFile(source) as z:
 assert z.testzip() is None
 assert z.read('Perekup/Perekup.exe')==replacements['Perekup.exe']
 rows=json.loads(z.read('Perekup/FILES-SHA256.json'))
 for row in rows:assert hashlib.sha256(z.read('Perekup/'+row['path'])).hexdigest()==row['sha256']
 assert len([n for n in z.namelist() if '/checks/' in n and n.endswith('_test.exe')])==34

patch=restore/'Perekup-Update-Commerce-2026-10-26.zip'
# All runtime changes plus the focused new test; the full distro has all tests.
patchEntries={name:data for name,data in replacements.items() if not name.startswith('checks/') or name=='checks/perekup_commerce_complete_test.exe'}
with zipfile.ZipFile(patch,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in patchEntries.items():z.writestr('Perekup/'+name,data)
 z.writestr('Perekup/UPDATE-COMMERCE-SHA256.json',json.dumps([{'path':name,'sha256':hashlib.sha256(data).hexdigest()} for name,data in sorted(patchEntries.items())],indent=2))
with zipfile.ZipFile(patch) as z:
 assert z.testzip() is None
 assert z.read('Perekup/Perekup.exe')==(build/'perekup_native_desktop.exe').read_bytes()
print(json.dumps({'fullBytes':source.stat().st_size,'updateBytes':patch.stat().st_size,'windowsTests':34,'exeSha256':hashlib.sha256(replacements['Perekup.exe']).hexdigest(),'fullFiles':len(entries)},indent=2))
