'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),c=vm.createContext({});
for(const f of ['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','aldan-cars.js','blagoveshchensk-cars.js','city-market.js'])vm.runInContext(read(f),c);
const cars=c.BLAGOVESHCHENSK_CARS.filter(x=>x.blagBatch===2),old=c.CARS.filter(x=>!x.blagBatch || x.blagBatch===3),city='8f41253d-6e3b-48a9-842a-25ba894bd093';
assert.equal(c.CARS.length,1037);assert.equal(old.length,987);assert.equal(cars.length,50);assert.equal(c.CARS.filter(x=>x.cityId===city).length,166);assert.equal(new Set(c.CARS.map(x=>x.id)).size,1037);
for(const k of ['name','full','price','img'])assert.equal(new Set(cars.map(x=>x[k])).size,50,k);
const hashes=[];
for(const car of cars){assert.equal(car.cityId,city);assert.equal(car.nonRunning,false);assert.match(car.desc,/на ходу/);assert.ok(!/Mark II|Laurel/.test(car.name));assert.ok(old.every(x=>x.name!==car.name && x.img!==car.img));assert.ok(['neutral','kind','evil'].includes(car.seller.personality));assert.ok(car.story.repair>0);hashes.push(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,car.img))).digest('hex'));}
assert.equal(new Set(hashes).size,50);
const photos=JSON.parse(read('data/blagoveshchensk-family-photo-sources.json'));
assert.equal(photos.length,50);assert.equal(photos.filter(x=>x.season==='summer').length,48);assert.equal(photos.filter(x=>x.season==='winter').length,2);
for(const p of photos){assert.ok(p.prompt);assert.ok(cars.some(x=>x.id===p.id && x.img===p.file));}
const batches=JSON.parse(read('data/blagoveshchensk-batches.json'));assert.equal(batches.completedNewListings,150);assert.equal(batches.nextId,6200151);assert.equal(batches.continueAutomatically,false);
console.log('PASS second batch: 50 unique running family cars, 48 summer/2 winter photos, 1037 total; all 150 additions complete');
