const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{installEntryContinue}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..'),server=http.createServer(async(req,res)=>{
 const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 const data=vm.createContext({});for(const name of ['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','city-market.js'])vm.runInContext(await fs.readFile(path.join(root,name),'utf8'),data);
 assert.equal(data.CARS.length,837);for(const car of data.CARS)assert.ok((await fs.stat(path.join(root,car.img))).size>0,car.name+' has a local image');
 const manifest=JSON.parse(await fs.readFile(path.join(root,'data/market-photo-crops.json'),'utf8'));
 assert.equal(manifest.auditedVehicles,837);assert.equal(manifest.photos.length,87);
 for(const photo of manifest.photos){assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root,photo.img))).digest('hex'),photo.sha256);const [x,y,w,h]=photo.region;assert.ok(x>=0 && y>=0 && w>0 && h>0 && x+w<=photo.width && y+h<=photo.height);}
 for(const id of [28,29,30]){const crop=manifest.photos.find(p=>p.img==='img/fictional/'+id+'.jpg');assert.ok(crop && crop.region[1]+crop.region[3]<389,'Remove the divider and neighbouring frame from '+id);}
 console.log('PASS all 837 listings have model illustrations and all 87 reviewed corrections match their original files');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;let passed=1;
 async function scenario(name,run){const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];installEntryContinue(page);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('musicSettings','{"enabled":false}');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}}
 async function checkGrid(page){
  const result=await page.locator('#content').evaluate(root=>{
   const cards=Array.from(root.querySelectorAll('.card')),rows=new Map(),errors=[];
   cards.forEach(card=>{
    const box=card.getBoundingClientRect(),photo=card.querySelector('.car-img').getBoundingClientRect(),title=card.querySelector('.name').getBoundingClientRect(),price=card.querySelector('.price').getBoundingClientRect(),button=card.querySelector('.buy').getBoundingClientRect(),key=Math.round(box.top),id=card.dataset.info;
    if(!rows.has(key))rows.set(key,[]);rows.get(key).push({id,photo:photo.height,title:title.top,price:price.bottom,button:button.bottom});
    if(card.scrollWidth>card.clientWidth+1 || photo.width<1 || photo.height<1 || button.bottom>box.bottom+1)errors.push(id);
   });
   rows.forEach(row=>{for(const key of ['photo','title','price','button'])if(Math.max(...row.map(c=>c[key]))-Math.min(...row.map(c=>c[key]))>1)errors.push(row.map(c=>c.id).join(',')+':'+key);});
   return {count:cards.length,overflow:root.scrollWidth>root.clientWidth+1,errors};
  });
  assert.equal(result.count,837);assert.equal(result.overflow,false);assert.deepEqual(result.errors,[]);
 }
 try{
  await scenario('every market card aligns photos, names, prices and actions in all desktop and phone themes',async page=>{
   await page.evaluate(()=>{openWin('market');filters={q:'',sort:'default',min:'',max:'',mood:'all',afford:false,city:'',radius:'all'};marketLimit=837;showMarket();});
   for(const width of [1280,320]){await page.setViewportSize({width,height:width===320?640:900});for(const os of ['windows','macos','linux'])for(const theme of ['light','dark']){await page.evaluate(({os,theme})=>{changeAppearance('os',os);changeAppearance('theme',theme);},{os,theme});await page.mouse.move(0,0);await checkGrid(page);}}
   await page.setViewportSize({width:3200,height:700});await page.evaluate(()=>{Object.assign(document.getElementById('win-market').style,{width:'2800px',height:'450px',left:'0',top:'0'});});await checkGrid(page);
  });
  await scenario('reviewed frames remove neighbouring photos in the market and detailed view without changing game data',async page=>{
   const before=await page.evaluate(()=>({balance,garage,purchasePrices,deals}));
   for(const width of [1280,320]){
    await page.setViewportSize({width,height:width===320?640:900});await page.evaluate(()=>{changeAppearance('os','windows');changeAppearance('theme','light');openWin('market');const original=visibleCars;visibleCars=()=>[28,29,30].map(carById);showMarket();visibleCars=original;});
    assert.equal(await page.locator('#content .market-photo-frame').count(),3);await page.locator('#win-market').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await page.screenshot({path:'/workspace/scratch/3151c7eebd10/fixed-market-grid-'+width+'.png'});
   }
   await page.evaluate(()=>openCarInfo(28));assert.equal(await page.locator('#carModalImg .market-photo-frame').count(),1);assert.deepEqual(await page.evaluate(()=>({balance,garage,purchasePrices,deals})),before);
  });
  console.log(passed+' market image/grid scenarios passed');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
