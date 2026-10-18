'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),c=vm.createContext({});
for(const f of ['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','aldan-cars.js','blagoveshchensk-cars.js','city-market.js'])vm.runInContext(read(f),c);
const cars=c.BLAGOVESHCHENSK_CARS.filter(x=>x.blagBatch===3),old=c.CARS.filter(x=>x.blagBatch!==3),city='8f41253d-6e3b-48a9-842a-25ba894bd093';
assert.equal(c.CARS.length,1037);assert.equal(old.length,987);assert.equal(cars.length,50);assert.equal(c.CARS.filter(x=>x.cityId===city).length,166);assert.equal(new Set(c.CARS.map(x=>x.id)).size,1037);
assert.equal(cars.filter(x=>x.price<7000000).length,30);assert.equal(cars.filter(x=>x.price>=7000000 && x.price<=15000000).length,20);
// Seller mood and market movement must keep the initial luxury offers in budget.
for(const value of [0,0.999999]){const math=Object.create(Math);math.random=()=>value;const session=vm.createContext({CARS:JSON.parse(JSON.stringify(c.CARS)),Math:math,readSaved:()=>({}),localStorage:{setItem(){}}});vm.runInContext(read('market-pricing.js'),session);for(const car of session.CARS.filter(x=>x.blagBatch===3 && x.id>=6200131))assert.ok(car.price>=7000000 && car.price<=15000000,car.name+': '+car.price);}
for(const k of ['name','full','price','img'])assert.equal(new Set(cars.map(x=>x[k])).size,50,k);
const hashes=[];
for(const car of cars){assert.equal(car.cityId,city);assert.equal(car.nonRunning,false);assert.match(car.full,/Благовещенск/);assert.ok(!/семейный|класс выше|редкая/.test(car.name));assert.ok(old.every(x=>x.name!==car.name && x.img!==car.img));assert.ok(car.story.repair>0);assert.ok(['kind','neutral','evil'].includes(car.seller.personality));hashes.push(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,car.img))).digest('hex'));}
assert.equal(new Set(hashes).size,50);
const photos=JSON.parse(read('data/blagoveshchensk-premium-photo-sources.json'));
assert.equal(photos.length,50);assert.equal(photos.filter(x=>x.season==='summer').length,48);assert.equal(photos.filter(x=>x.season==='winter').length,2);
for(const p of photos){assert.ok(p.prompt.includes('embankment') || p.prompt.includes('EMBANKMENT'));assert.ok(cars.some(x=>x.id===p.id && x.img===p.file));}
const batches=JSON.parse(read('data/blagoveshchensk-batches.json'));assert.equal(batches.completedNewListings,150);assert.equal(batches.nextBatch,null);assert.equal(batches.continueAutomatically,false);
console.log('PASS third batch: 30 executive and 20 luxury cars at 7–15m, 50 waterfront photos, 1037 total; 150 additions complete');
