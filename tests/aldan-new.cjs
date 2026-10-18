'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),context=vm.createContext({});
for(const file of ['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','aldan-cars.js','blagoveshchensk-cars.js','city-market.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const added=context.ALDAN_CARS,original=context.CARS.filter(c=>!c.aldanNew && !c.blagNew),aldan=context.CITIES.find(c=>c.name==='Алдан');
assert.equal(added.length,50);assert.equal(original.length,837);assert.equal(context.CARS.length,1037);
assert.equal(new Set(context.CARS.map(c=>c.id)).size,1037);
for(const field of ['name','full','img','price'])assert.equal(new Set(added.map(c=>c[field])).size,50,'unique '+field);
assert.ok(new Set(added.map(c=>c.full.match(/Цвет — ([^.]+)/)[1])).size>=15);
for(const car of added){
 assert.equal(car.cityId,aldan.id);assert.ok(car.price>0 && car.marketPrice>0);assert.ok(!car.expanded);
 const model=car.name.replace(/, \d{4}$/,'').toLowerCase();assert.ok(original.every(other=>!other.name.toLowerCase().includes(model)),'model already listed: '+model);
 assert.ok(fs.statSync(path.join(root,car.img)).size>10000,'missing photo '+car.name);
 assert.ok(car.full.includes('Алдан')&&car.full.includes('Пробег'));assert.ok(car.desc.length<120);
}
console.log('PASS 50 unique Aldan models, prices, descriptions and individual local photos; 837 original listings retained');
