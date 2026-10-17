const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{installEntryContinue}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'data/city-vehicle-masks.json')));
for(const source of Object.values(manifest.photos)){
 assert.ok(source.coverage>=.12&&source.coverage<=.8);assert.ok(/^M[\d,L]+Z$/.test(source.path));
 const bytes=fs.readFileSync(path.join(root,source.src));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);
 const [x,y,w,h]=source.bbox;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=source.width&&y+h<=source.height);
}
const atlas=JSON.parse(fs.readFileSync(path.join(root,'data/city-backdrop-generation.json')));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,atlas.asset))).digest('hex'),atlas.sha256);assert.equal(atlas.promptSpecification.tilesInRowMajorOrder.length,25);
console.log('PASS all foreground annotations and generated city backdrop match unchanged source hashes');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let passed=1;
async function scenario(name,run,viewport={width:1280,height:900}){const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];installEntryContinue(page);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('musicSettings','{"enabled":false}');Math.random=()=>.9;});try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}}
try{
 await scenario('every private-market car uses the correct one of 25 city backgrounds; Aldan and Yakutsk have snow',async page=>{
  const result=await page.evaluate(()=>({cars:CARS.length,scenes:Object.keys(CITY_SCENES).length,missing:CARS.filter(c=>!cityPhotoSource(c)||!CITY_SCENES[c.cityId]).length,mismatched:CARS.filter(c=>!cityVehiclePhoto(c).includes('data-photo-city="'+c.cityId+'"')).length,snow:CITY_SCENES[cityNamed('Алдан').id].snow&&CITY_SCENES[cityNamed('Якутск').id].snow}));
  assert.deepEqual(result,{cars:4200,scenes:25,missing:0,mismatched:0,snow:true});
 });
 await scenario('paint and framing distinguish repeated model listings, persist and do not charge the player',async page=>{
  const first=await page.evaluate(()=>{const before={balance,garage:garage.slice(),purchasePrices:{...purchasePrices}};const cars=CARS.filter(c=>c.expanded&&/Toyota Chaser/.test(c.name));return {before,after:{balance,garage:garage.slice(),purchasePrices:{...purchasePrices}},colors:[...new Set(cars.map(c=>c.catalogueColor))],variants:cars.map(c=>[c.id,cityVehiclePhoto(c).match(/data-photo-variant="(\d+)"/)[1],c.catalogueColor]),privateSourceCount:CARS.filter(c=>c.expanded&&c.catalogueColor).length};});
  assert.deepEqual(first.before,first.after);assert.ok(first.colors.length>=3);assert.ok(first.privateSourceCount>=250);assert.equal(new Set(first.variants.map(v=>v[1])).size,first.variants.length);
  await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>CARS.filter(c=>c.expanded&&/Toyota Chaser/.test(c.name)).map(c=>[c.id,cityVehiclePhoto(c).match(/data-photo-variant="(\d+)"/)[1],c.catalogueColor])),first.variants);
 });
 await scenario('owned cars follow their actual city without changing purchased identity, price or signed documents',async page=>{
  const result=await page.evaluate(()=>{const id=3000028;garage.push(id);purchasePrices[id]=1234567;parkVehicle(id,cityNamed('Алдан').id);const before=JSON.stringify(contractBook.records),car=carById(id),snow=cityVehiclePhoto(car);parkVehicle(id,moscowCity.id);const city=cityVehiclePhoto(car);save();return {snow:snow.includes('Алдан')&&snow.includes('снег'),city:city.includes('Москва'),cost:purchasePrices[id],docs:before===JSON.stringify(contractBook.records),owned:garage.includes(id)};});assert.deepEqual(result,{snow:true,city:true,cost:1234567,docs:true,owned:true});
 });
 await scenario('old market design has no national/show-all buttons and the winter photos fit every phone theme',async page=>{
  await page.evaluate(()=>{openWin('market');filters.city=cityNamed('Алдан').id;filters.radius='0';showMarket();});
  assert.equal(await page.locator('#marketAllRussia,#marketShowAll').count(),0);assert.ok(await page.locator('#content .city-vehicle-photo').count()>0);
  const scene=await page.locator('#content .city-vehicle-photo').first().getAttribute('aria-label');assert.match(scene,/Алдан.*снег/);
  for(const os of ['windows','macos','linux'])for(const theme of ['light','dark']){await page.evaluate(({os,theme})=>{changeAppearance('os',os);changeAppearance('theme',theme);},{os,theme});assert.ok(await page.locator('#win-market .win-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1));}
 },{width:390,height:844});
 console.log(passed+' city-photo scenarios passed');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
