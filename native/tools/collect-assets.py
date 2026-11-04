from pathlib import Path
import json,re,shutil,hashlib
from PIL import Image
project=Path(__file__).resolve().parents[1]
workspace=project.parents[1]
roots=[workspace/x for x in ['perekup-test-fixes','perekup-os-design','perekup-buttons','perekup']]
paths=set()
def walk(value):
 if isinstance(value,dict):
  for key,item in value.items():
   if key=='img' and isinstance(item,str) and item: paths.add(item)
   else: walk(item)
 elif isinstance(value,list):
  for item in value:walk(item)
for file in (project/'data').glob('*.json'):walk(json.loads(file.read_text()))
source=(project/'tests/original-game/script.js').read_text()
winter=json.loads(re.search(r'var ALDAN_WINTER_PHOTOS=(\{.*?\});',source).group(1))
catalog=json.loads((project/'data/catalog.json').read_text());cities={c['id']:c['name'] for c in catalog['cities']}
overrides={str(c['id']):winter[c['img']] for c in catalog['cars'] if cities[c['cityId']]=='Алдан' and c['img'] in winter}
paths.update(overrides.values());manifest=[]
for name in sorted(paths):
 relative=Path(name)
 if relative.is_absolute() or '..' in relative.parts:raise ValueError(name)
 candidates=[r/relative for r in roots if (r/relative).is_file()]
 if not candidates:raise FileNotFoundError(name)
 src=candidates[0]
 with Image.open(src) as img:img.verify()
 dest=project/'assets'/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
 manifest.append({'path':name,'source':str(src.relative_to(workspace)),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(project/'data/photo-overrides.json').write_text(json.dumps(overrides,ensure_ascii=False,indent=2))
(project/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Validated and copied {len(manifest)} images; {len(overrides)} Aldan winter overrides')
