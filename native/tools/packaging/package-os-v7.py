from pathlib import Path
import zipfile,hashlib,json,re,subprocess,shutil
from PIL import Image
b=Path.cwd();p=b/'project';out=b/'deliverables';out.mkdir(exist_ok=True)
readme='Perekyp · OS V7 · 28 октября 2026 · Windows x64\n\nУСТАНОВКА\nПолная игра: распакуйте всю папку Perekyp и запускайте Perekyp.exe. Для продолжения перенесите свою папку saves рядом с EXE.\nОбновление: закройте игру, сделайте копию saves и скопируйте СОДЕРЖИМОЕ папки Perekyp из обновления в существующую папку игры с заменой. Сохранения не удаляйте. Основной файл Perekyp.exe. Копия perekup.exe в обновлении совместима с прежним ярлыком и содержит ту же сборку. Без DLL и каталога обновление самостоятельно не запускается.\n\nИЗМЕНЕНИЯ ПО ВАШИМ ПЯТИ ИЗОБРАЖЕНИЯМ\n— В доке постоянно видны Авторынок, Гараж, Календарь, Калькулятор, Часы и Настройки. Они остаются на месте при закрытых окнах. У открытых приложений появляется индикатор; остальные запущенные приложения добавляются рядом.\n— Музыка и регулятор громкости перенесены с верхней панели в док. Справа в доке дата и время без секунд. Вверху остались название ОС, игровые часы, город и баланс.\n— Под верхней панелью слегка размываются и затемняются обои. Размытие вычисляется только при смене обоев или размера рабочего стола; текст и значки остаются резкими.\n— Карточки рынка переделаны по пятому изображению: фото заполняет ширину без растяжения пропорций, верхние углы скруглены, название и векторное сердечко стоят в одной строке; далее цена, характеристики, город и кнопка Подробнее → справа внизу. Высота фотографии зависит от ширины карточки в пропорции 1,42. Описания компактные, длинное название сокращается с многоточием и доступно в подсказке.\n— В списке фото масштабируется с заполнением области: может подрезаться фон сверху/снизу. Крупное фото в подробностях по-прежнему показывается целиком. Файлы фотографий не заменялись.\n\nПРАВИЛА И СОХРАНЕНИЯ\nПравила игры и все файлы data сравнены с V6 побайтно: изменений нет. Сохранены цены, каталог, торг, банк, коллекторы после 30 дней, подпись из четырёх латинских букв и напоминание 10 000 ₽, карьера, ремонт, поставки и формат сохранений. Ускорение времени ×2 действует только во время активной игры в змейку.\n\nПРОВЕРКИ\nСобран Windows x64 EXE и проверены его импорты по DLL полной игры. Проверены архивы и соответствие игровых правил и данных предыдущей сборке.\nGUI-проверки Linux Qt/offscreen: закреплённые приложения при закрытых окнах, запуск/сворачивание/возврат/закрытие, музыка только в доке, дата и время, разные размеры экрана, темы, ярлыки, календарь/банк/сон; весь путь покупки от объявления до подписанного ДКП и гаража; обучение, язык и музыка; восстановление геометрии окон и ярлыков при перезапуске.\nWindows EXE и звук физического устройства здесь не проверялись. Возможны отличия шрифтов и системных диалогов на Windows.\n'
checks=json.loads((b/'mechanics-v6-baseline.json').read_text());assert all(hashlib.sha256(Path(name).read_bytes()).hexdigest()==digest for name,digest in checks.items())
(p/'verification/os-v7-mechanics.json').write_text(json.dumps({'baseSourceVersion':40,'unchanged':True,'fileCount':len(checks),'files':checks},indent=2))
runtime=b/'runtime';runtime.mkdir(exist_ok=True);base=b/'restore-v6/Perekyp-v6-runtime.zip'
with zipfile.ZipFile(base) as z:
 for item in z.infolist():
  if item.filename.count('/')==1 and item.filename.lower().endswith('.dll'):(runtime/Path(item.filename).name).write_bytes(z.read(item))
obj=str(b/'build-tools/sysroot/usr/bin/x86_64-w64-mingw32-objdump');dump=subprocess.check_output([obj,'-p',str(b/'perekup.exe')],text=True);assert 'Windows GUI' in dump
exports={f.name.lower():subprocess.check_output([obj,'-p',str(f)],text=True) for f in runtime.glob('*.dll')};counts={}
for block in dump.split('The Function Table')[0].split('DLL Name: ')[1:]:
 name=block.splitlines()[0].strip()
 if name.lower() not in exports:continue
 symbols=[m[1] for line in block.splitlines()[1:] if (m:=re.match(r'\s+[0-9a-f]+\s+\d+\s+(\S+)',line)) and m[1]!='00000000'];missing=[n for n in symbols if not re.search(r'\]\s+'+re.escape(n)+r'\s*(?:\n|$)',exports[name.lower()])];assert not missing,(name,missing);counts[name]=len(symbols)
(p/'verification/os-v7-imports.json').write_text(json.dumps({'passed':True,'symbols':counts,'windowsExecuted':False},indent=2))
for name,marker in {'os':'OS GUI passed:','os-restart':'Window geometry restored on a new process','purchase':'Purchase GUI passed:','onboarding':'Onboarding GUI passed:',}.items():
 log=(b/('test-'+name+'.log')).read_text();assert marker in log and 'failed:' not in log.lower() and 'First-run test timeout' not in log,name;(p/'verification'/('os-v7-'+name+'.log')).write_text(log)
skipped=[]
for f in list((b/'apps-v7-previews').glob('*.png'))+[b/'preview-os.jpg',b/'preview-os-restart.jpg',b/'purchase-preview-details.png',b/'purchase-preview-contract.png',b/'tutorial-preview.png']:
 try:im=Image.open(f);im.load()
 except (OSError,FileNotFoundError):skipped.append(f.name);continue
 shutil.copyfile(f,p/'verification'/('v7-'+f.name))
(p/'verification/os-v7-screenshots.json').write_text(json.dumps({'omittedInvalidCaptures':skipped},indent=2));(p/'verification/os-v7.txt').write_text(readme)
status=(p/'STATUS.md').read_text().split('\n\n## 28 октября 2026 · OS V7')[0];(p/'STATUS.md').write_text(status+'\n\n## 28 октября 2026 · OS V7\n'+readme)
shutil.copyfile('build.py',p/'tools/build-os-v7.py');shutil.copyfile('test-gui.py',p/'tools/run-gui-v7.py');shutil.copyfile('package-v7.py',p/'tools/packaging/package-os-v7.py')
files={'Perekyp.exe':(b/'perekup.exe').read_bytes(),'README-OS.txt':readme.encode('utf-8-sig')}
for name in ['dealer-showroom-v1.webp','dealer-showroom-v2.webp','dealer-showroom-v1.json','dealer-showroom-v2.json']:files['assets/img/commerce/'+name]=(p/'assets/img/commerce'/name).read_bytes()
for name in ['locales/en.json','tutorial.json']:files['data/'+name]=(p/'data'/name).read_bytes()
update=out/'Perekyp-OS-v7-Update-2026-10-28.zip'
with zipfile.ZipFile(update,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in files.items():z.writestr('Perekyp/'+name,data)
 z.writestr('Perekyp/perekup.exe',files['Perekyp.exe'])
full=out/'Perekup-Windows-x64-2026-10-26.zip'
with zipfile.ZipFile(base) as old,zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED) as z:
 for item in old.infolist():
  if item.is_dir():continue
  name=item.filename.split('/',1)[1]
  if name in files or name.lower() in ['perekup.exe','perekyp.exe']:continue
  assert '/saves/' not in item.filename;z.writestr('Perekyp/'+name,old.read(item))
 for name,data in files.items():z.writestr('Perekyp/'+name,data)
paths=[f for f in sorted(p.rglob('*')) if f.is_file() and f.name!='files-sha256.json'];(p/'files-sha256.json').write_text(json.dumps({str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},indent=2))
source=out/'Perekup-Cpp-Source-Checkpoint.zip'
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
 for f in paths+[p/'files-sha256.json']:z.write(f,str(f.relative_to(p)))
for f in [update,full,source]:
 with zipfile.ZipFile(f) as z:assert z.testzip() is None
 print(f.name,f.stat().st_size,flush=True)
print('Unchanged rules and data:',len(checks),'DLL imports:',counts,flush=True)
