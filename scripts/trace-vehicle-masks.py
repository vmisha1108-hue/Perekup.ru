"""Trace imagegen's registered RGB annotation textures into native SVG geometry.

Red = paint, green = glass, blue = rims. This never edits vehicle photographs.
Needs Pillow, NumPy and OpenCV only when rebuilding reviewed annotations.
"""
import json,hashlib
from pathlib import Path
import cv2,numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'data/vehicle-visuals.json';manifest=json.loads(p.read_text())
cache={}
for key,photo in manifest['photos'].items():
 maskfile=photo['src'].replace('img/urban/','img/urban/masks/').replace('.webp','.png')
 if not (ROOT/maskfile).exists():continue
 if maskfile not in cache:
  mask=np.array(Image.open(ROOT/maskfile).convert('RGB'))
  original=np.array(Image.open(ROOT/photo['src']).convert('RGB'))
  cache[maskfile]=(mask,original)
  manifest['sources'][maskfile]=hashlib.sha256((ROOT/maskfile).read_bytes()).hexdigest()
 mask,original=cache[maskfile];x,y,w,h=photo['region'];mh,mw=mask.shape[:2]
 sx=mw/photo['width'];sy=mh/photo['height'];mx,my,mr,mb=round(x*sx),round(y*sy),round((x+w)*sx),round((y+h)*sy)
 patch=mask[my:mb,mx:mr]
 # Coordinate registration is metadata, not a photographic edit. Fit the traced
 # silhouette to strong edges of the original cell, then review every model.
 source=original[y:y+h,x:x+w];gray=cv2.cvtColor(source,cv2.COLOR_RGB2GRAY)
 edges=cv2.Canny(cv2.GaussianBlur(gray,(3,3),0),60,140)
 distance=cv2.distanceTransform(255-edges,cv2.DIST_L2,3)
 combined=(patch.max(2)>150).astype('uint8')*255
 contours,_=cv2.findContours(combined,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 boundary=np.concatenate([c[:,0,:] for c in contours if cv2.contourArea(c)>20],axis=0).astype(float)
 boundary[:,0]/=sx;boundary[:,1]/=sy
 best=(float('inf'),0,0,1)
 centre=np.array([w/2,h*.65])
 for scale in [.98,1,1.02]:
  points=(boundary-centre)*scale+centre
  for dx in range(-7,8):
   for dy in range(-7,8):
    xx=np.clip(np.rint(points[:,0]+dx).astype(int),0,w-1);yy=np.clip(np.rint(points[:,1]+dy).astype(int),0,h-1)
    score=float(np.minimum(distance[yy,xx],6).mean())+.012*(abs(dx)+abs(dy))+.5*abs(scale-1)
    if score<best[0]:best=(score,dx,dy,scale)
 _,dx,dy,scale=best
 def trace(channel):
  selected=((patch[:,:,channel]>150)&(np.delete(patch,channel,axis=2).max(2)<120)).astype('uint8')*255
  if channel==0:selected=cv2.morphologyEx(selected,cv2.MORPH_CLOSE,np.ones((3,3),dtype='uint8'))
  cs,tree=cv2.findContours(selected,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
  outer=[];holes=[]
  if tree is None:return [],[]
  for i,c in enumerate(cs):
   if cv2.contourArea(c)<5:continue
   c=cv2.approxPolyDP(c,.8,True)[:,0,:].astype(float)
   if len(c)<3:continue
   c[:,0]/=sx;c[:,1]/=sy;c=(c-centre)*scale+centre+[dx,dy]
   c[:,0]=np.clip(c[:,0],0,w);c[:,1]=np.clip(c[:,1],0,h)
   points=np.round(c*1000/w,2).tolist()
   (outer if tree[0][i][3]<0 else holes).append(points)
  return outer,holes
 photo['body'],photo['exclude']=trace(0);photo['glass'],_=trace(1)
 blue=((patch[:,:,2]>150)&(patch[:,:,0]<120)&(patch[:,:,1]<120)).astype('uint8')*255
 count,labels,stats,centroids=cv2.connectedComponentsWithStats(blue)
 parts=sorted([s for s in stats[1:] if s[4]>10],key=lambda s:s[4],reverse=True)[:2]
 if len(parts)==2:
  rims=[]
  for px,py,pw,ph,_ in parts:
   centrept=(np.array([(px+pw/2)/sx,(py+ph/2)/sy])-centre)*scale+centre+[dx,dy]
   rims.append([round(centrept[0]*1000/w,2),round(centrept[1]*1000/w,2),round(pw/sx*scale*500/w,2),round(ph/sy*scale*500/w,2)])
  photo['wheels']=sorted(rims,key=lambda p:p[0])
 photo['maskSource']=maskfile;photo['maskAlignment']={'dx':dx,'dy':dy,'scale':scale}
 if not photo['body'] or not photo['glass']:raise ValueError('Missing segmentation for '+key)
p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Traced',sum('maskSource' in p for p in manifest['photos'].values()),'model masks')
