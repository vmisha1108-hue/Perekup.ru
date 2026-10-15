"""Fetch reusable Wikimedia Commons model photos and retain licensing metadata.
Run only when refreshing the curated stock, never from the game itself.
"""
import concurrent.futures,html,json,re,time,urllib.request,urllib.parse
from pathlib import Path
from PIL import Image
MODELS=Path('commerce-models.json')
HEADERS={'User-Agent':'PerekupGameAssets/1.0 (educational browser game; Commons photo attribution retained)'}
ALIASES={'uaz-profi':'UAZ Profi','moskvich-3':'Moskvich 3','moskvich-6':'Moskvich 6','evolute-i-pro':'Evolute i-Pro','lada-niva-travel':'Lada Niva Travel','forthing-t5-evo':'Forthing T5 Evo','tenet-t7':'Tenet T7','dfsk-500':'Fengon 500','sollers-st6':'Sollers ST6'}
def request(url):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=25) as response:return response.read()
  except Exception:
   if attempt==2:raise
   time.sleep(1+attempt)
def clean(value):return html.unescape(re.sub('<[^>]+>','',value or '')).strip()
def fetch(model):
 dest=Path('img/commerce')/(model['key']+'.webp');meta=dest.with_suffix('.json')
 if dest.exists() and meta.exists():return model['key'],'cached'
 term=model.get('photoQuery',ALIASES.get(model['key'],model['brand']+' '+model['model']))
 params={'action':'query','generator':'search','gsrsearch':'file: '+term+' -interior -dashboard -logo -steering','gsrnamespace':6,'gsrlimit':20,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':640,'format':'json'}
 if model.get('photoFile'):
  params={k:v for k,v in params.items() if k not in ['generator','gsrsearch','gsrnamespace','gsrlimit']};params['titles']=model['photoFile']
 data=json.loads(request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)))
 candidates=[]
 for page in data.get('query',{}).get('pages',{}).values():
  title=page['title'].lower();
  if not model.get('photoFile') and model.get('photoMatch') and not re.search(model['photoMatch'],title,re.I):continue
  info=(page.get('imageinfo') or [{}])[0];ext=info.get('extmetadata',{})
  if not any(title.endswith(x) for x in ['.jpg','.jpeg','.png','.webp']):continue
  if any(x in title for x in ['interior','logo','badge','engine','dashboard','rear seat','headlight','taillight','wheel','crash','toy ','1-43','miniature']):continue
  score=10+sum(4 for x in ['front','фронт','перед','three-quarter'] if x in title)-sum(4 for x in ['rear','back','зад'] if x in title)
  if model['brand'].lower() in title:score+=3
  candidates.append((score,page,info))
 if not candidates:return model['key'],'NO PHOTO'
 _,page,info=max(candidates,key=lambda v:v[0]);url=info.get('thumburl',info.get('url'))
 try:raw=request(url)
 except Exception:
  url=info['url'];raw=request(url)
 import io
 im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((448,336));im.save(dest,'WEBP',quality=70)
 ext=info.get('extmetadata',{})
 meta.write_text(json.dumps({'model':term,'file':page['title'],'source':'https://commons.wikimedia.org/wiki/'+urllib.parse.quote(page['title'].replace(' ','_')),'image':url,'author':clean(ext.get('Artist',{}).get('value','')),'license':clean(ext.get('LicenseShortName',{}).get('value','')),'licenseUrl':ext.get('LicenseUrl',{}).get('value','')},ensure_ascii=False,indent=2)+'\n')
 return model['key'],'ok'
def task(m):
 try:return fetch(m)
 except Exception as e:return m['key'],str(e)[:110]
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for key,status in pool.map(task,json.loads(MODELS.read_text())):print(key,status,flush=True)
