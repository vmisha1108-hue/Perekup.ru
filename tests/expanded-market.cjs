const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http');
const {chromium}=require('playwright');
const {installEntryContinue,installExpandedFilters}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const catalogFiles=['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','city-market.js'];
function catalog(random=.5){const c=vm.createContext({Math:Object.assign(Object.create(Math),{random:()=>random})});for(const file of catalogFiles)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);return c;}
const data=catalog(),added=data.EXPANDED_CARS,old=data.CARS.filter(c=>!c.expanded);
assert.equal(data.CARS.length,4000);assert.equal(added.length,3163);assert.equal(old.length,837);
assert.equal(new Set(data.CARS.map(c=>c.id)).size,4000);
assert.equal(new Set(added.map(c=>c.name)).size,3163);assert.equal(new Set(added.map(c=>c.full)).size,3163);
const originalNames=new Set(old.map(c=>c.name)),originalIds=new Set(old.map(c=>c.id));
for(const car of added){
 assert.ok(!originalNames.has(car.name));assert.ok(!originalIds.has(car.id));
 assert.ok(Number.isSafeInteger(car.price)&&car.price>=10000&&car.price<=99000000);
 assert.ok(data.CITY_BY_ID[car.cityId]);assert.ok(car.desc.length<=120);
 const source=old.find(c=>c.id===car.sourceCarId);assert.ok(source);assert.equal(car.img,source.img);assert.ok(fs.existsSync(path.join(root,car.img)));
 assert.match(car.full,/Фото иллюстрирует модель/);assert.ok(car.full.includes('Комплектация игрового экземпляра:'));
 assert.ok(car.story.repair>=0&&Number.isSafeInteger(car.story.repair));
 if(car.story.repair)assert.ok(car.full.includes(car.story.repair.toLocaleString('ru-RU')));
}
assert.equal(new Set(added.map(c=>c.sourceCarId)).size,555);assert.equal(new Set(added.map(c=>c.condition)).size,8);assert.equal(new Set(added.map(c=>c.trim)).size,8);
assert.ok(added.filter(c=>c.legend).length>=150);assert.ok(added.filter(c=>c.rare).length>=200);
assert.ok(added.filter(c=>/BMW|Mercedes|Audi|Lexus|Porsche|Lamborghini|Ferrari|Jaguar|Cadillac|Infiniti|Supra|Chaser|Skyline|Silvia|RX-7|RX-8|NSX|Giulia/i.test(c.name)).length>=800);
for(const city of data.CITIES){const cars=data.CARS.filter(c=>c.cityId===city.id);assert.ok(cars.length>=130);assert.ok(cars.some(c=>c.price<=100000));assert.ok(cars.some(c=>c.price>=5000000));}
for(const [low,high,min] of [[10000,100000,500],[100000,300000,400],[300000,1000000,700],[1000000,3000000,500],[3000000,10000000,300],[10000000,30000000,50],[30000000,100000000,20]])assert.ok(added.filter(c=>c.price>=low&&c.price<high).length>=min);
assert.equal(Math.min(...data.CARS.map(c=>c.price)),10000);assert.equal(Math.max(...data.CARS.map(c=>c.price)),99000000);
assert.equal(JSON.stringify(catalog(.01).EXPANDED_CARS),JSON.stringify(catalog(.99).EXPANDED_CARS));
const lambda=data.CARS.find(c=>c.id===5000001);assert.match(lambda.name,/Lamborghini Diablo/);assert.equal(lambda.price,200000);assert.equal(lambda.story.repair,18500000);assert.match(lambda.full,/разобран|не на ходу/);
console.log('PASS 4,000 unique IDs, 3,163 distinct new listings, 555 source models, 25 stocked cities and all progression price bands');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'}).end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let passed=1;
 async function scenario(name,run,viewport={width:1280,height:900}){const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];installEntryContinue(page);installExpandedFilters(page);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('musicSettings','{"enabled":false}');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);console.log('PASS '+name);passed++;}finally{await context.close();}}
 try{
  await scenario('visible national scope and show-all controls expose all 4000 cards without opening advanced filters',async page=>{
   await page.evaluate(()=>{openWin('market');$('marketAdvanced').hidden=true;$('filterToggle').setAttribute('aria-expanded','false');});
   assert.ok(await page.locator('#marketAllRussia').isVisible());assert.ok(await page.locator('#fLocal').isVisible());
   await page.locator('#fSearch').fill('BMW');await page.locator('#marketAllRussia').click();
   assert.equal(await page.locator('#fSearch').inputValue(),'');assert.ok(!await page.locator('#marketAdvanced').isVisible());
   assert.match(await page.locator('#fCount').textContent(),/В каталоге: 4000.*Найдено: 4000.*Показано: 60/);
   assert.equal(await page.locator('#content .card').count(),60);
   await page.locator('#marketShowAll').click();assert.equal(await page.locator('#content .card').count(),4000);
   assert.equal(await page.locator('#content .card').evaluateAll(cards=>new Set(cards.map(c=>c.dataset.info)).size),4000);
   assert.match(await page.locator('#fCount').textContent(),/Показано: 4000/);assert.ok(!await page.locator('#marketShowAll').isVisible());
   assert.ok(await page.locator('#win-market .win-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await page.locator('#win-market .win-body').evaluate(el=>el.scrollTop=0);await page.locator('#fLocal').click();
   assert.equal(await page.locator('#content .card').count(),60);assert.equal(await page.evaluate(()=>filters.city),await page.evaluate(()=>playerCity().id));
   await page.locator('#marketAllRussia').click();await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openWin('market'));
   assert.equal(await page.locator('#fCity').inputValue(),'');assert.match(await page.locator('#fCount').textContent(),/Найдено: 4000/);
  },{width:390,height:844});
  await scenario('prices stay in range across session refreshes and market events, with affordable opening inventory',async page=>{
   const result=await page.evaluate(()=>{let valid=true;for(let i=0;i<20;i++){initMarketSession();career.cycle=i;applyCareerMarket();valid=valid&&CARS.every(c=>c.price>=10000&&c.price<=99000000);}return {valid,local:CARS.filter(c=>c.cityId===moscowCity.id&&c.price<=START_BALANCE).length,all:CARS.length};});assert.equal(result.valid,true);assert.ok(result.local>=10);assert.equal(result.all,4000);
  });
  await scenario('all-Russia pagination, rare searches and price filters show the expanded catalogue on a phone',async page=>{
   await page.evaluate(()=>openWin('market'));await page.locator('#fCity').fill('');assert.equal(await page.locator('#content .card').count(),60);assert.match(await page.locator('#fCount').textContent(),/4000/);await page.locator('#marketMore').click();assert.equal(await page.locator('#content .card').count(),120);
   await page.locator('#fSearch').fill('Lamborghini');assert.ok(await page.locator('#content [data-info="5000001"]').count());await page.locator('#content [data-info="5000001"]').click();assert.match(await page.locator('#carModalBody').textContent(),/18\s500\s000/);await page.evaluate(()=>closeCarInfo());
   await page.locator('#fSearch').fill('');await page.locator('#fMax').fill('100000');assert.ok(await page.evaluate(()=>visibleCars(availableMarketCars()).every(c=>c.price<=100000)));assert.ok(await page.locator('#content .card').count()>0);assert.ok(await page.locator('#win-market .win-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  },{width:390,height:844});
  await scenario('a new project buys once, persists its ID and diagnosis uses the disclosed repair bill',async page=>{
   const acquired=await page.evaluate(()=>{changeBalance(30000000,'Тест');openBuyChat(5000001);const price=chat.car.price;finishBuy(price);closeChat();return {price,garage:garage.slice(),cost:purchasePrices[5000001],cash:balance};});assert.ok(acquired.garage.includes(5000001));await page.reload({waitUntil:'networkidle'});
   const result=await page.evaluate(()=>{const car=carById(5000001),old=balance;const inspect=prepareCareerCar(car.id,false),repair=prepareCareerCar(car.id,true),second=prepareCareerCar(car.id,true);const value={inspect,repair,second,spent:old-balance,cost:purchasePrices[car.id],story:carStory(car),removed:!availableMarketCars().some(c=>c.id===car.id),cash:balance};openBuyChat(car.id);value.noDuplicate=chat===null;save();return value;});assert.equal(result.inspect,true);assert.equal(result.repair,true);assert.equal(result.second,false);assert.equal(result.spent,18501500);assert.equal(result.cost,acquired.cost+18501500);assert.equal(result.removed,true);assert.equal(result.noDuplicate,true);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>balance),result.cash);assert.equal(await page.evaluate(()=>purchasePrices[5000001]),result.cost);assert.equal(await page.evaluate(()=>career.vehicles[5000001].repaired),true);
  });
  await scenario('new seller dialogue reports the advertised condition and equipment instead of generic clean-car claims',async page=>{
   await page.evaluate(()=>{changeBalance(1000000,'Тест');openBuyChat(5000001);handleMessage('Расскажи о состоянии двигателя');});assert.match(await page.locator('#chatLog').textContent(),/разобран|трансмисс|не на ходу/);
   const before=await page.evaluate(()=>({id:chat.car.id,name:chat.car.name,full:chat.car.full}));await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(5000001));assert.deepEqual(await page.evaluate(()=>({id:chat.car.id,name:chat.car.name,full:chat.car.full})),before);
  });
  console.log(passed+' expanded-market scenarios passed');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
