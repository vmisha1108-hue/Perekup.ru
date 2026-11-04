from pathlib import Path
import json,zipfile,hashlib,subprocess,re,os
base=Path(__file__).resolve().parents[4]
project=base/'perekup-native/project';build=base/'build-tools/windows-build';restore=base/'restore'
report=json.loads((project/'verification/build-report.json').read_text())
report.update(nativeCTest={'passed':33,'total':33,'assertionsEnabled':True},nativeUiSmoke={'passed':True,'catalogTotal':1037,'firstPageCards':24,'lastPageCards':5,'firstCardHeight':414,'webp':True,'cropDecodedSize':[384,360]},windowsTestExecutables=33,windowsExecuted=False,windowsUserReport='Player confirmed previous market fix responsive; current repair/career update not yet tested on their Windows PC',career={'implemented':True,'levels':4,'orderTypes':5,'clientContracts':True,'nativeTestsPassed':True,'nativeGuiJourneyPassed':True,'sourceParityCases':2021,'sourceStories':1037,'sourceOrderBatches':384,'sourceMarketCases':600},repair={'diagnosis':True,'wear':True,'mechanical':True,'includedInBasisAndContract':True,'publicSaleWithReloadTestPassed':True},supply={'nativeOrderAndDeliveryUi':True,'dealerOffers':49,'importOffers':38,'manualSignature':True,'factoryColorAndFullManagerDialogue':False},tuningEnabled=False)
report['diagnosisFix']={'signedMeetingsReleasedAtSigning':True,'oldSavesReconciledOnLoad':True,'activeMeetingsPreserved':True,'disabledButtonsVisible':True,'repairBlockReasonShown':True,'nativeRegressionTestPassed':True,'windowsExecuted':False}
report['firstRunFix']['nativeGuiFirstRunAndExitPassed']=True
report['marketFix'].update(windowsUserConfirmedResponsive=True,firstPageMs=58,lastPageCards=5)
(project/'verification/build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
source=restore/'Perekup-Windows-x64-2026-10-26.zip'
with zipfile.ZipFile(source) as old:
 provided={Path(n).name.lower() for n in old.namelist() if n.endswith('.dll')}
 imports=json.loads(old.read('Perekup/IMPORTS.json'))
 replacements={'Perekup.exe':(build/'perekup_native_desktop.exe').read_bytes(),'PORT-STATUS.md':(project/'STATUS.md').read_bytes(),'BUILD-REPORT.json':(project/'verification/build-report.json').read_bytes(),'Check-Career.cmd':(project/'tools/windows/Check-Career.cmd').read_bytes(),'data/photo-crops.json':(project/'data/photo-crops.json').read_bytes()}
 for file in build.glob('*_test.exe'):replacements['checks/'+file.name]=file.read_bytes()
 assert len(list(build.glob('*_test.exe')))==33
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
 readme='''Perekup — обновление «Ремонт и карьера», исправление диагностики, 26 октября 2026.

Исправлено: подписанная встреча больше не блокирует диагностику. Старые сохранения исправляются при загрузке без сброса прогресса. Недоступные кнопки серые; окно ремонта показывает причину ограничения и нехватку денег.

Установка обновления:
1. Полностью закройте игру.
2. Откройте папку Perekup из архива обновления.
3. Скопируйте её содержимое в вашу существующую папку Perekup, где лежит Perekup.exe, и согласитесь на замену файлов.
4. Запустите Perekup.exe. Существующие сохранения остаются в папке saves; удалять её не нужно.

Новое: в гараже «Ремонт и диагностика», в нижней панели «Бизнес».
В «Бизнесе» находятся карьера до своего автосалона, заказы клиентов, новости, помощник, претензии и кнопка «Автосалон и импорт».
Подпись при сделках вводится вручную. Напоминание стоит 10 000 ₽; повторное напоминание для того же договора бесплатно. Тюнинга нет.

Это обновление для уже скачанного портативного приложения, а не отдельная полная игра: DLL, data и assets берутся из вашей папки.
Если скачан полный Perekup-Windows-x64-2026-10-26.zip, распакуйте всю его папку Perekup и запустите EXE. Все данные и сохранения хранятся внутри неё.

Проверки: 33/33 на Linux, 2021 сравнение карьеры с исходной игрой, реальный Qt-сценарий ремонта и ДКП клиента. Windows EXE собран, но этот выпуск ещё не запущен на Windows в среде сборки.
Check-Career.cmd запускает автоматическую проверку в отдельной тестовой подпапке saves; текущий профиль не используется. Verify-Windows.cmd — проверки ядра и авторынка.

Окончательное оформление ОС, музыка, языки и полное обучение ещё не готовы. Подробности — PORT-STATUS.md.
'''
 replacements['README-UPDATE.txt']=readme.encode('utf-8')
 replacements['README-RU.txt']=readme.encode('utf-8')
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
 assert len([n for n in z.namelist() if '/checks/' in n and n.endswith('_test.exe')])==33
patch=restore/'Perekup-Update-Career-2026-10-26.zip'
with zipfile.ZipFile(patch,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in replacements.items():z.writestr('Perekup/'+name,data)
 z.writestr('Perekup/FILES-SHA256.json',manifest)
with zipfile.ZipFile(patch) as z:assert z.testzip() is None
print(json.dumps({'fullBytes':source.stat().st_size,'updateBytes':patch.stat().st_size,'windowsTests':33,'exeSha256':hashlib.sha256(replacements['Perekup.exe']).hexdigest(),'fullFiles':len(entries)},indent=2))

fix=restore/'Perekup-Fix-Diagnosis-2026-10-26.zip'
fixEntries={name:data for name,data in replacements.items() if name in ['Perekup.exe','PORT-STATUS.md','BUILD-REPORT.json','README-UPDATE.txt','checks/perekup_diagnosis_after_purchase_test.exe']}
with zipfile.ZipFile(fix,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in fixEntries.items():z.writestr('Perekup/'+name,data)
 z.writestr('Perekup/UPDATE-DIAGNOSIS-SHA256.json',json.dumps([{'path':name,'sha256':hashlib.sha256(data).hexdigest()} for name,data in sorted(fixEntries.items())],indent=2))
with zipfile.ZipFile(fix) as z:assert z.testzip() is None
print('Diagnosis fix bytes:',fix.stat().st_size)
