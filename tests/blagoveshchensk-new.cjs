'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),c=vm.createContext({});
for(const f of ['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','aldan-cars.js','blagoveshchensk-cars.js','city-market.js'])vm.runInContext(read(f),c);
const added=c.BLAGOVESHCHENSK_CARS.filter(x=>x.id<=6200050),old=c.CARS.filter(x=>!x.blagNew),city=c.CITIES.find(x=>x.id==='8f41253d-6e3b-48a9-842a-25ba894bd093');
const photos=JSON.parse(read('data/blagoveshchensk-photo-sources.json'));
assert.equal(photos.length,50);assert.equal(photos.filter(x=>x.season==='summer').length,48);assert.equal(photos.filter(x=>x.season==='winter').length,2);
for(const photo of photos){assert.ok(photo.prompt);assert.ok(added.some(x=>x.id===photo.id && x.img===photo.file));}
assert.equal(c.CARS.length,1037);assert.equal(old.length,887);assert.equal(added.length,50);assert.equal(c.CARS.filter(x=>x.cityId===city.id).length,166);
assert.equal(new Set(c.CARS.map(x=>x.id)).size,1037);
assert.equal(added.filter(x=>x.name.includes('Mark II')).length,14);assert.equal(added.filter(x=>x.name.includes('Laurel')).length,12);
for(const key of ['name','full','price','img'])assert.equal(new Set(added.map(x=>x[key])).size,50,key);
for(const car of added){assert.equal(car.cityId,city.id);assert.ok(car.story.repair>0);assert.ok(!car.expanded);assert.ok(old.every(x=>x.name!==car.name));assert.ok(car.full.includes('Благовещенск'));assert.ok(car.desc.length<=120);assert.ok(fs.statSync(path.join(root,car.img)).size>10000);if(car.nonRunning)assert.match(car.full,/НЕ НА ХОДУ/);}
vm.runInContext(`var garage=[],career={},transport={cityId:'${city.id}'},fixed=false;function carById(id){return CARS.find(x=>x.id===id);}function vehicleState(){return {cityId:transport.cityId};}function vehicleMoving(){return false;}function careerVehicle(){return {repaired:fixed};}`,c);
vm.runInContext(read('travel.js').match(/^function localDrivingCars\([^]*?^\}/m)[0],c);
const dead=added.find(x=>x.nonRunning),running=added.find(x=>!x.nonRunning);c.garage=[dead.id,running.id];assert.deepEqual(Array.from(c.localDrivingCars()),[running.id]);c.fixed=true;assert.deepEqual(Array.from(c.localDrivingCars()),[dead.id,running.id]);
console.log('PASS first 50 Blagoveshchensk listings, distinct identities, 26 Mark II/Laurel and non-running repair gate');
