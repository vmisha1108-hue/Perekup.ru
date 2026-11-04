from pathlib import Path
import zipfile,hashlib,json,re,subprocess,shutil
from PIL import Image
b=Path.cwd();p=b/'project';out=b/'deliverables';out.mkdir(exist_ok=True)
readme='''Perekyp · OS V6 · 28 октября 2026 · Windows x64

УСТАНОВКА
Полная игра: распакуйте всю папку Perekyp и запускайте Perekyp.exe. Для продолжения перенесите свою папку saves рядом с EXE.
Обновление: закройте игру, сделайте копию saves и перенесите СОДЕРЖИМОЕ папки Perekyp из архива в папку игры с заменой, включая assets и data. Сохранения не удаляйте. Основной файл Perekyp.exe. В обновлении также есть совместимая копия perekup.exe для прежних ярлыков. Это тот же EXE; без DLL и каталога обновление самостоятельно не запускается.

ОФОРМЛЕНИЕ ПО ВАШЕМУ ОПИСАНИЮ
— Тёмная рамка #252d36, боковые панели #242c35, бирюзовый акцент #14796f, светлые поверхности, небольшие скругления и тонкие границы. Шапки окон 43 px, линейные значки приложений нарисованы векторно средствами Qt.
— Верхняя панель: PEREKYP OS с бирюзовой точкой, часы HH:mm, город, музыка и баланс.
— Восемь ярлыков: авторынок, гараж, переезд, банк, документы, календарь, калькулятор, часы. Остальные приложения — в меню P. Сетка, ячейка назначения и сохранение координат остались.
— Док с открытыми приложениями: по центру, 16 px от низа; короткие бирюзовые индикаторы, подъём значка при наведении. Меню P в два столбца, выход из игры.
— Окна запоминают положение и размер; анимированы сворачивание и раскрытие. Обычное перетаскивание следует за мышью.
— Светлая и тёмная темы в настройках с сохранением выбора. Профиль с аватаркой-заглушкой, миниатюры обоев. Пользовательские обои, разрешения, языки, музыка и громкость сохранены.
— Авторынок: боковая навигация, избранное, гараж, история сделок, силуэт города. Три колонки карточек с исходными фото, ценой, характеристиками и городом. Фильтры цены, расстояния от вашего города, характера продавца, сортировки и доступности по балансу. Избранное и заметки хранятся в настройках интерфейса.
— Окно объявления: полное крупное фото, описание, история машины, заметки, переход к продавцу.
— Переписка: аватар, имя и характер, настроение с анимацией 450 мс, отдельные плашки сообщений, быстрые реплики, предложение цены и назначение встречи. Используются прежние действия переговоров.
— Договор: бумажный блок с двумя сторонами, группы полей в две колонки, прежнее заполнение по документам и ручная подпись. Подписанный документ открывается как бумажный лист. Бесплатной подсказки сохранённой подписи нет.
— Гараж: карточки автомобилей с прежними действиями ремонта, продажи, перевозки и парковки. Остальные приложения используют общий каркас и палитру.

МЕХАНИКИ СОХРАНЕНЫ
Код игровых правил вне интерфейса и все файлы data сравнены с V5: 71 файл полностью совпадает по SHA-256. Каталог, цены, фотографии, торг, вероятности, кредиты, карьера, сюжет, подписи и формат сохранений не изменялись. Устаревшие технические сведения и правила из описания старой веб-версии не заменяют актуальную C++-игру.
Подпись — четыре заглавные латинские буквы по памяти, напоминание 10 000 ₽. Коллекторы — после 30 дней просрочки. Часы без секунд и без ускорения; ×2 — только во время активной игры в змейку.

ПРОВЕРКИ
Собран Windows x64 EXE, импорты сверены с DLL полной игры; архивы проверены на целостность.
Проверки Linux Qt/offscreen: окна/док/сетка/меню/анимации/размеры экрана, переключение темы без изменения финансов, банк/календарь/поездки/калькулятор/сон, восстановление ярлыков и окон после перезапуска, тёмная тема при старте, полный путь покупки до подписанного ДКП и гаража, диагностика/ремонт/карьера, автосалон/импорт/цвета/поставки/акты, обучение/языки/настройка музыки.
Windows EXE и физический звук здесь не проверялись. Отдельные системные диалоги оформляет Windows; шрифты, тени и степень прозрачности могут отличаться от веб-образца. Это нативный C++/Qt Widgets; HTML используется только как справочник дизайна.
'''
checks=json.loads((b/'mechanics-v5-baseline.json').read_text());assert all(hashlib.sha256(Path(name).read_bytes()).hexdigest()==digest for name,digest in checks.items())
runtime=b/'runtime';runtime.mkdir(exist_ok=True);base=b/'restore-v6/Perekup-Windows-x64-2026-10-26.zip'
with zipfile.ZipFile(base) as z:
 for item in z.infolist():
  if item.filename.count('/')==1 and item.filename.lower().endswith('.dll'):(runtime/Path(item.filename).name).write_bytes(z.read(item))
obj=str(b/'build-tools/sysroot/usr/bin/x86_64-w64-mingw32-objdump');dump=subprocess.check_output([obj,'-p',str(b/'perekup.exe')],text=True);assert 'Windows GUI' in dump
exports={f.name.lower():subprocess.check_output([obj,'-p',str(f)],text=True) for f in runtime.glob('*.dll')};counts={}
for block in dump.split('The Function Table')[0].split('DLL Name: ')[1:]:
 name=block.splitlines()[0].strip()
 if name.lower() not in exports:continue
 symbols=[m[1] for line in block.splitlines()[1:] if (m:=re.match(r'\s+[0-9a-f]+\s+\d+\s+(\S+)',line)) and m[1]!='00000000'];missing=[n for n in symbols if not re.search(r'\]\s+'+re.escape(n)+r'\s*(?:\n|$)',exports[name.lower()])];assert not missing,(name,missing);counts[name]=len(symbols)
(p/'verification/os-v6-imports.json').write_text(json.dumps({'passed':True,'symbols':counts,'windowsExecuted':False},indent=2))
for name,marker in {'os':'OS GUI passed:','os-restart':'Window geometry restored on a new process','purchase':'Purchase GUI passed:','commerce':'Commerce GUI passed:','onboarding':'Onboarding GUI passed:','career':'Career GUI: client signature'}.items():
 log=(b/('test-'+name+'.log')).read_text();assert marker in log and 'failed:' not in log.lower() and 'First-run test timeout' not in log,name;(p/'verification'/('os-v6-'+name+'.log')).write_text(log)
skipped=[]
for f in list((b/'apps-v6-previews').glob('*.png'))+[b/'preview-os.png',b/'preview-os-restart.jpg',b/'purchase-preview-details.png',b/'purchase-preview-contract.png',b/'tutorial-preview.png']:
 try:im=Image.open(f);im.load()
 except (OSError,FileNotFoundError):skipped.append(f.name);continue
 shutil.copyfile(f,p/'verification'/('v6-'+f.name))
(p/'verification/os-v6-screenshots.json').write_text(json.dumps({'omittedInvalidCaptures':skipped},indent=2));(p/'verification/os-v6.txt').write_text(readme)
status=(p/'STATUS.md').read_text().split('\n\n## 28 октября 2026 · OS V6')[0];(p/'STATUS.md').write_text(status+'\n\n## 28 октября 2026 · OS V6\n'+readme)
shutil.copyfile('build.py',p/'tools/build-os-v6.py');shutil.copyfile('test-gui.py',p/'tools/run-gui-v6.py');shutil.copyfile('package-v6.py',p/'tools/packaging/package-os-v6.py')
files={'Perekyp.exe':(b/'perekup.exe').read_bytes(),'README-OS.txt':readme.encode('utf-8-sig')}
for name in ['dealer-showroom-v1.webp','dealer-showroom-v2.webp','dealer-showroom-v1.json','dealer-showroom-v2.json']:files['assets/img/commerce/'+name]=(p/'assets/img/commerce'/name).read_bytes()
for name in ['locales/en.json','tutorial.json']:files['data/'+name]=(p/'data'/name).read_bytes()
update=out/'Perekyp-OS-v6-Update-2026-10-28.zip'
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
