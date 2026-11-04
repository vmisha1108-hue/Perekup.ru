from pathlib import Path
import zipfile,hashlib,json,re,subprocess,shutil
from PIL import Image
b=Path.cwd();p=b/'project';out=b/'deliverables';out.mkdir(exist_ok=True)
readme='Perekyp · V8 · Пробный локальный ИИ · Windows x64\n\nУСТАНОВКА\nПолная игра: распакуйте всю папку Perekyp и запускайте Perekyp.exe. Для продолжения перенесите свою папку saves рядом с EXE.\nОбновление для V7: закройте игру, сделайте копию saves и скопируйте СОДЕРЖИМОЕ папки Perekyp из архива в папку игры с заменой, обязательно включая models и seller-ai.exe. Сохранения не удаляйте. Запускайте Perekyp.exe. Совместимая копия perekup.exe в обновлении содержит ту же версию для старого ярлыка. Обновление без DLL и прежнего каталога отдельно не запускается.\nМодель уже включена в полную игру и в обновление. Она занимает около 1,12 ГБ, поэтому архивы заметно больше предыдущих. Никакой отдельной установки Ollama/LM Studio, аккаунта или интернета во время игры не требуется. Файлы остаются в папке игры.\n\nКАК ПОПРОБОВАТЬ\nМеню P → Пробный ИИ-продавец. Откроется зелёный Opel Vectra 2003 года, объявление id=2, продавец Сергей. Нажмите Связаться с продавцом. Если эта машина уже куплена в вашем сохранении, повторная покупка этого объявления недоступна — это прежнее правило.\nТолько этот продавец использует новый чат. Все остальные продавцы, автосалон и импорт работают как в V7.\nПишите вопросы о машине обычным текстом. Цену указывайте в том же сообщении с кириллической р: «250 000 р», «270000р», «250 тыс р». Латинская p не принимается за обозначение цены. Можно написать «скинь 5 000 р».\nОтдельного поля/кнопки предложения цены в пробном чате нет. Сумму разбирает C++, а уступки рассчитывает прежняя negotiate(): три прежних этапа, ограничения цены и баланса, мгновенное согласие на цену не ниже текущего предложения продавца. Локальная модель не принимает экономических решений.\nПосле согласования цены можно продолжать спрашивать о машине. Когда готовы, напишите «готов забрать», «беру» или «согласен». Дальше без генерации открывается прежнее назначение встречи и обычная схема осмотра/ДКП. Отрицание «не готов забрать» не запускает встречу.\n\nДОЛГИЙ ОТВЕТ\nAVX/AVX2/FMA/F16C/BMI2 не требуются; используется универсальная CPU-сборка для x64. Видеокарта не нужна.\nВо время подготовки ответа продавец «сейчас занят, ответит позже», а при генерации текста — «печатает…». Чат можно закрыть и заниматься другими делами. Ответ появится в переписке и уведомлении. Даже если открыт другой продавец, ответ сохраняется в правильном диалоге.\nВ измерениях здесь обычные ответы занимали 81–112 секунд; проверка через C++/Qt-клиент заняла 141 секунду с продолжающим работать интерфейсом. Это замеры данной среды, а не обещание скорости на вашем компьютере. На другом CPU/при нехватке памяти ожидание может быть иным.\nПредельное ожидание — 5 минут, затем используется заранее сохранённая обычная реплика. Ошибка, нехватка памяти или повреждение модели также переключают на заготовку. Это помечено в пробном чате. При выходе из игры незавершённый запрос не зависает навечно: остаётся сохранённая заготовка.\n\nКАК ОГРАНИЧЕН ИИ\nМодель Qwen2.5-1.5B-Instruct Q4_K_M через llama.cpp работает в отдельном процессе, только через локальные stdin/stdout. Она получает видимое описание машины, готовое решение торга и несколько последних сообщений. Ответ проверяется на посторонние числа, цены, решения о сделке, служебные инструкции и неподтверждённые сведения. В тесте отклонены выдуманное отсутствие ДТП и согласие на постороннюю инструкцию.\nФильтр не гарантирует идеального русского языка и отсутствия любой языковой неточности. Это пилот для одного продавца. Суммы и состояние игры из ответа модели никогда не извлекаются: даже неправильная фраза не меняет деньги, скидки и владение машиной.\nПравила торга, банк, коллекторы, ремонт, карьера, подпись, фотографии и файлы data сохранены. Восемь ярлыков, закреплённый док и оформление V7 остаются.\n\nПРОВЕРКИ\nСобраны Windows x64 игра и настоящий статически связанный seller-ai.exe, проверены импорты по DLL игры и Windows. Проверен SHA-256 включённого GGUF.\nРеальная модель проверена отдельно и через настоящий C++/Qt-клиент; в последнем ответ принят фильтром, события интерфейса продолжали обрабатываться.\nGUI-сценарии диалога проверялись с отдельной протокольной тестовой заглушкой: текстовые цены/уступки/переплата, разговор после согласования, готовность/шаблоны, закрытие во время ожидания, ответ в нужный chatStore, уведомление и отсутствие передачи денег/машин до ДКП. Заглушка в игру не включена. Дополнительно прошёл обычный путь покупки до ДКП и гаража, ОС/банк/календарь/сон/змейка и перезапуск. Правила и data побайтно сверены с V7.\nЗапуск EXE на реальном Windows и на физически старом процессоре здесь не проверялся. AVX2 в параметры сборки не входит.\nЛицензии модели и llama.cpp приложены в models и licenses. Исходный архив содержит код/проверки/сведения о модели, но не дублирует гигабайтные веса — они есть в полной игре и обновлении.\n'
checks=json.loads((b/'mechanics-v6-baseline.json').read_text());assert all(hashlib.sha256(Path(name).read_bytes()).hexdigest()==digest for name,digest in checks.items())
(p/'verification/os-v8-mechanics.json').write_text(json.dumps({'baseSourceVersion':41,'unchanged':True,'fileCount':len(checks),'files':checks},indent=2))
runtime=b/'runtime';runtime.mkdir(exist_ok=True);base=b/'restore-v6/Perekyp-v7-runtime.zip'
with zipfile.ZipFile(base) as z:
 for item in z.infolist():
  if item.filename.count('/')==1 and item.filename.lower().endswith('.dll'):(runtime/Path(item.filename).name).write_bytes(z.read(item))
obj=str(b/'build-tools/sysroot/usr/bin/x86_64-w64-mingw32-objdump');dump=subprocess.check_output([obj,'-p',str(b/'perekup.exe')],text=True);assert 'Windows GUI' in dump
exports={f.name.lower():subprocess.check_output([obj,'-p',str(f)],text=True) for f in runtime.glob('*.dll')};counts={}
for block in dump.split('The Function Table')[0].split('DLL Name: ')[1:]:
 name=block.splitlines()[0].strip()
 if name.lower() not in exports:continue
 symbols=[m[1] for line in block.splitlines()[1:] if (m:=re.match(r'\s+[0-9a-f]+\s+\d+\s+(\S+)',line)) and m[1]!='00000000'];missing=[n for n in symbols if not re.search(r'\]\s+'+re.escape(n)+r'\s*(?:\n|$)',exports[name.lower()])];assert not missing,(name,missing);counts[name]=len(symbols)
workerDump=subprocess.check_output([obj,'-p',str(b/'ai-work/windows/seller-ai.exe')],text=True);assert 'Windows CUI' in workerDump;assert all(name.lower() in ['kernel32.dll','msvcrt.dll','advapi32.dll'] for name in re.findall(r'DLL Name: (\S+)',workerDump))
(p/'verification/os-v8-imports.json').write_text(json.dumps({'passed':True,'symbols':counts,'windowsExecuted':False},indent=2))
for f in ['model-quality.json','real-client-result.json']:
 shutil.copyfile(b/'ai-work'/f,p/'verification'/('v8-'+f))
assert json.loads((b/'ai-work/real-client-result.json').read_text())['safe']
for name,marker in {'os':'OS GUI passed:','os-restart':'Window geometry restored on a new process','purchase':'Purchase GUI passed:','pilot':'Pilot GUI passed:',}.items():
 log=(b/('test-'+name+'.log')).read_text();assert marker in log and 'failed:' not in log.lower() and 'First-run test timeout' not in log,name;(p/'verification'/('os-v8-'+name+'.log')).write_text(log)
skipped=[]
for f in list((b/'apps-v8-previews').glob('*.png'))+[b/'preview-os.jpg',b/'preview-os-restart.jpg',b/'purchase-preview-details.png',b/'purchase-preview-contract.png',b/'tutorial-preview.png']:
 try:im=Image.open(f);im.load()
 except (OSError,FileNotFoundError):skipped.append(f.name);continue
 shutil.copyfile(f,p/'verification'/('v8-'+f.name))
(p/'verification/os-v8-screenshots.json').write_text(json.dumps({'omittedInvalidCaptures':skipped},indent=2));(p/'verification/os-v8.txt').write_text(readme)
status=(p/'STATUS.md').read_text().split('\n\n## 28 октября 2026 · OS V8')[0];(p/'STATUS.md').write_text(status+'\n\n## 28 октября 2026 · OS V8\n'+readme)
shutil.copyfile('build.py',p/'tools/build-os-v8.py');shutil.copyfile('test-gui.py',p/'tools/run-gui-v8.py');shutil.copyfile('package-v8.py',p/'tools/packaging/package-os-v8.py')
files={'Perekyp.exe':(b/'perekup.exe').read_bytes(),'README-OS.txt':readme.encode('utf-8-sig')}
for name in ['dealer-showroom-v1.webp','dealer-showroom-v2.webp','dealer-showroom-v1.json','dealer-showroom-v2.json']:files['assets/img/commerce/'+name]=(p/'assets/img/commerce'/name).read_bytes()
files['seller-ai.exe']=(b/'ai-work/windows/seller-ai.exe').read_bytes()
for f in (p/'models').glob('*.json'):files['models/'+f.name]=f.read_bytes()
for f in (p/'models').glob('*.txt'):files['models/'+f.name]=f.read_bytes()
for f in (p/'licenses').glob('SellerAI-*.txt'):files['licenses/'+f.name]=f.read_bytes()
model=p/'models/seller-qwen2.5-1.5b-q4_k_m.gguf'
assert hashlib.file_digest(model.open('rb'),'sha256').hexdigest()==json.loads((p/'models/model-info.json').read_text())['sha256']
for name in ['locales/en.json','tutorial.json']:files['data/'+name]=(p/'data'/name).read_bytes()
update=out/'Perekyp-V8-AI-Update.zip'
with zipfile.ZipFile(update,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in files.items():z.writestr('Perekyp/'+name,data)
 z.writestr('Perekyp/perekup.exe',files['Perekyp.exe'])
 z.write(model,'Perekyp/models/'+model.name,compress_type=zipfile.ZIP_DEFLATED,compresslevel=1)
full=out/'Perekup-Windows-x64-2026-10-26.zip'
with zipfile.ZipFile(base) as old,zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED) as z:
 for item in old.infolist():
  if item.is_dir():continue
  name=item.filename.split('/',1)[1]
  if name in files or name.lower() in ['perekup.exe','perekyp.exe']:continue
  assert '/saves/' not in item.filename;z.writestr('Perekyp/'+name,old.read(item))
 for name,data in files.items():z.writestr('Perekyp/'+name,data)
 z.write(model,'Perekyp/models/'+model.name,compress_type=zipfile.ZIP_DEFLATED,compresslevel=1)
paths=[f for f in sorted(p.rglob('*')) if f.is_file() and f.name not in ['files-sha256.json','seller-ai','seller-ai.exe'] and f.suffix!='.gguf' and not any(part.startswith('.') for part in f.relative_to(p).parts) and not (f.is_relative_to(p/'models') and f.suffix not in ['.json','.txt'])];(p/'files-sha256.json').write_text(json.dumps({str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in paths},indent=2))
source=out/'Perekup-Cpp-Source-Checkpoint.zip'
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
 for f in paths+[p/'files-sha256.json']:z.write(f,str(f.relative_to(p)))
for f in [update,full,source]:
 with zipfile.ZipFile(f) as z:assert z.testzip() is None
 print(f.name,f.stat().st_size,flush=True)
print('Unchanged rules and data:',len(checks),'DLL imports:',counts,flush=True)
