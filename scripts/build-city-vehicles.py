"""Compile foreground silhouettes as SVG geometry; source photographs are never edited.

Rebuild dependencies: Pillow, numpy, opencv-python-headless and onnxruntime.
Pass --model /path/to/u2netp.onnx (danielgatis/rembg v0.0.0 release).
Pass --sources a JSON list of key/src/optional region annotations.
The model is a rebuild tool, not a game dependency; the browser uses only the
compiled geometry and unchanged source images. Background plates use image_gen.
"""
import argparse,hashlib,json
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import cv2,numpy as np,onnxruntime as ort
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--model',required=True);parser.add_argument('--sources',required=True);args=parser.parse_args()
options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
session=ort.InferenceSession(args.model,sess_options=options,providers=['CPUExecutionProvider'])
sources=json.loads(Path(args.sources).read_text())
cache=json.loads((ROOT/'data/city-vehicle-masks.json').read_text()).get('photos',{}) if (ROOT/'data/city-vehicle-masks.json').exists() else {}
def annotate(item):
    source=ROOT/item['src'];im=Image.open(source).convert('RGB');width,height=im.size
    region=item.get('region') or [0,0,width,height];x,y,w,h=map(int,region)
    saved=cache.get(item['key']);digest=hashlib.sha256(source.read_bytes()).hexdigest()
    if saved and saved['sha256']==digest and saved['region']==region:return item['key'],saved
    roi=im.crop((x,y,x+w,y+h))
    pixels=np.asarray(roi.resize((320,320)),dtype=np.float32)/255
    pixels=(pixels-np.array([.485,.456,.406],np.float32))/np.array([.229,.224,.225],np.float32)
    prediction=session.run(None,{'input.1':pixels.transpose(2,0,1)[None]})[0][0,0]
    prediction=(prediction-prediction.min())/max(.0001,float(prediction.max()-prediction.min()))
    mask=(cv2.resize(prediction,(w,h))>.5).astype('uint8')*255
    contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    if not contours:raise ValueError('No foreground: '+item['key'])
    # Retain the main vehicle, excluding disconnected road texture or background objects.
    contour=max(contours,key=cv2.contourArea)
    contour=cv2.approxPolyDP(contour,.0011*cv2.arcLength(contour,True),True)
    area=float(cv2.contourArea(contour))/(w*h)
    points=contour[:,0,:]+np.array([x,y]);bbox=cv2.boundingRect(points)
    path='M'+'L'.join(str(int(p[0]))+','+str(int(p[1])) for p in points)+'Z'
    result={'src':item['src'],'width':width,'height':height,'region':region,'bbox':list(bbox),'path':path,'coverage':round(area,4),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
    return item['key'],result
results={}
with ThreadPoolExecutor(max_workers=3) as pool:
    futures=[pool.submit(annotate,item) for item in sources]
    for done,future in enumerate(as_completed(futures),1):
        key,value=future.result();results[key]=value
        if done%100==0:print('Annotated',done,'/',len(sources),flush=True)
results=dict(sorted(results.items()))
manifest={'version':1,'method':'U2NetP foreground analysis, polygon simplification; originals unchanged','modelSha256':hashlib.sha256(Path(args.model).read_bytes()).hexdigest(),'photos':results}
(ROOT/'data/city-vehicle-masks.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
runtime={k:{field:v[field] for field in ['src','width','height','bbox','path']} for k,v in results.items()}
(ROOT/'city-vehicle-masks.js').write_text("'use strict';\n// Generated foreground geometry; original image bytes are unchanged.\nvar CITY_VEHICLE_MASKS="+json.dumps(runtime,separators=(',',':'),ensure_ascii=False)+';\n')
(ROOT/'data/city-vehicle-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
low=[(key,value['coverage']) for key,value in results.items() if value['coverage']<.12 or value['coverage']>.8]
print('Saved',len(results),'foreground masks; unusual coverage:',low,flush=True)
