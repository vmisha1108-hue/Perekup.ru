'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
fs.mkdirSync(out,{recursive:true});
const context={};vm.createContext(context);
const files=['cars.js','cities.js','regional-cars.js','custom-cars.js','expanded-cars.js','aldan-cars.js','blagoveshchensk-cars.js','city-market.js','trade-cars.js','commerce-models.js'];
const hashes={};for(const name of files){const source=fs.readFileSync(path.join(root,name),'utf8');vm.runInContext(source,context,{filename:name,timeout:10000});hashes[name]=crypto.createHash('sha256').update(source).digest('hex');}
const output={format:1,cars:context.CARS,cities:context.CITIES,commerceModels:context.COMMERCE_MODELS,tradeCars:context.TRADE_CARS};
if(!Array.isArray(output.cars)||!Array.isArray(output.cities))throw Error('invalid catalogue');
if(new Set(output.cars.map(c=>c.id)).size!==output.cars.length)throw Error('duplicate car IDs');
const missing=[];for(const car of output.cars)if(!fs.existsSync(path.join(root,car.img)))missing.push({id:car.id,img:car.img});
if(missing.length)throw Error(JSON.stringify(missing));
fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify(output));
fs.writeFileSync(path.join(out,'catalog-origin.json'),JSON.stringify({hashes,counts:{cars:output.cars.length,cities:output.cities.length,commerceModels:output.commerceModels?.length,tradeCars:output.tradeCars?.length},missingPhotos:missing},null,2));
console.log(fs.readFileSync(path.join(out,'catalog-origin.json'),'utf8'));
