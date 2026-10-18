'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
// Exact captions from the ten supplied screenshots. Session prices can change.
const expected=new Map([
 [1300002805,'Audi S8 · Аудиопакет · На каждый день, 2019'],
 [1300002611,'Mitsubishi Lancer Evolution IX MR · Пакет Sport · Ухоженный, 2006'],
 [1300001809,'ЗАЗ-968М · Комфорт · Ухоженный, 1989'],
 [1000015423,'Ferrari F40 · Заводской стиль · После простоя, 1990'],
 [1300003731,'Lexus LX 570 · Заводской стиль · Проект под ремонт, 2016'],
 [1000015638,'Porsche Cayenne GTS без фары · Туринг-пакет · После ДТП, 2008'],
 [1300003239,'Toyota Land Cruiser 200 · Заводской стиль · После ДТП, 2016'],
 [1300002558,'Honda NSX Type S · Кожаный салон · Для ценителя, 2022'],
 [1300002847,'Audi S8 · Заводской стиль · После обслуживания, 2019'],
 [1000015443,'Ferrari F40 · Пакет Sport · После обслуживания, 1990']
]);
const c=vm.createContext({});
for(const f of ['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','aldan-cars.js','city-market.js'])vm.runInContext(read(f),c);
const script=read('script.js'),contracts=read('contracts.js');
function loadFunction(name,source=script){const match=source.match(new RegExp('^function '+name+'\\([^]*?^\\}','m'));assert.ok(match,name);vm.runInContext(match[0],c);}
vm.runInContext('var CAR_BY_ID=Object.fromEntries(CARS.concat(EXPANDED_CARS).map(c=>[c.id,c]));var garage=[],retiredMarketCars=[],chat=null,chatStore={},pending=[],listings={};',c);
vm.runInContext(script.match(/var WITHDRAWN_ALDAN_AD_IDS=new Set\(\[[^]*?\]\);/)[0],c);
for(const name of ['carById','isWithdrawnAldanAd','isRetiredMarketCar','availableMarketCars','restoreChat','openBuyChat','finishBuy','dealItems'])loadFunction(name);
const original=JSON.stringify(c.CARS),aldan=c.CITIES.find(x=>x.name==='Алдан').id;
assert.equal(c.CARS.length,887);
for(const [id,name] of expected){assert.equal(c.carById(id).name,name);assert.equal(c.carById(id).cityId,aldan);}
const active=new Set(c.availableMarketCars().map(x=>x.id));
assert.deepEqual(Array.from(c.CARS.filter(x=>!active.has(x.id)),x=>x.id).sort(),[]);
assert.equal(c.availableMarketCars().filter(x=>x.cityId===aldan).length,71);
assert.ok(c.CARS.filter(x=>x.cityId!==aldan).every(x=>active.has(x.id)));
for(const id of expected.keys())assert.ok(active.has(c.carById(id).sourceCarId),'original model remains available');
assert.equal(JSON.stringify(c.CARS),original,'catalogue and saved identities are untouched');
console.log('PASS exactly ten screenshot ads withdrawn; 887 original ads and original model records retained');
vm.runInContext(`var messages=[];function marketGameOver(){return false;}function careerStep(){}function canOpenChat(){return true;}function guardDealLocation(){return true;}function canAfford(){return true;}function sysSay(s){messages.push(s);}function restoreBusyTimes(){return [];}function pendingFor(id){return pending.find(x=>x.carId===id);}`,c);
for(const id of expected.keys()){
 c.garage=[];c.retiredMarketCars=[];c.chat=null;c.openBuyChat(id);assert.equal(c.chat,null,'direct buy blocked');
 assert.equal(c.restoreChat({mode:'buy',carId:id}),null,'old buy conversation blocked');
 c.chat={car:c.carById(id)};c.finishBuy(10000);assert.equal(c.chat.done,true);assert.equal(c.garage.length,0);
 c.garage=[id];c.retiredMarketCars=[id];
 assert.equal(c.carById(id).name,expected.get(id),'saved ownership remains resolvable');
 assert.equal(c.restoreChat({mode:'sell',carId:id,log:[],ask:10000}).mode,'sell','owned car remains sellable');
}
c.garage=[];c.retiredMarketCars=[];
assert.equal(c.availableMarketCars().length,887,'clearing saved progress does not restore withdrawn ads');
c.chatStore=Object.fromEntries([...expected.keys()].map(id=>['buy:'+id,{mode:'buy',carId:id}]));
c.pending=[...expected.keys()].map(id=>({type:'meet',mode:'buy',carId:id}));
assert.equal(c.dealItems().length,0,'saved buy ads do not remain in deals');
c.pending.push({type:'meet',mode:'sell',carId:1300002805});
assert.equal(c.dealItems().length,1,'selling an already owned car remains available');
console.log('PASS withdrawn ads cannot be reopened or bought; saved garage and selling remain supported');
loadFunction('signContract',contracts);
vm.runInContext(`var contractSigning=false,gameMs=0,contractProblems=[];function advanceGameTime(){}function tickPending(){}function contractErrors(){return [];}function meetingHere(){return true;}function currentContract(){return {carId:chat.car.id,price:chat.price};}function displayContractErrors(errors){contractProblems=errors;}`,c);
c.chat={mode:'buy',car:c.carById(1300002805),stage:'contract',price:10000};
assert.equal(c.signContract(),false);assert.match(c.contractProblems[0].text,/снято с рынка/);
console.log('PASS an existing unsigned purchase contract cannot bypass withdrawal');
