'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(process.argv[2]),binary=path.resolve(process.argv[3]),data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/catalog.json')));
const c={CARS:[],CITIES:JSON.parse(JSON.stringify(data.cities)),CUSTOM_CITIES:[],REGIONAL_CARS:[],CUSTOM_CARS:[]};
c.CARS=c.CITIES.map((city,i)=>({id:i+1,cityId:city.id}));vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'city-market.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(root,'travel.js'),'utf8'),c);
c.localDrivingCars=()=>c.hasDrive?[1]:[];c.vehicleState=()=>({cityId:c.fromCity});c.vehicleMoving=()=>c.moving;
const routes=[],expected=[];
for(const from of data.cities)for(const to of data.cities)for(const drive of [false,true]){
 routes.push({from,to,drive,moving:!drive});c.transport={cityId:from.id};c.fromCity=from.id;c.moscowCity=to;c.moving=!drive;c.hasDrive=drive;
 expected.push(JSON.parse(JSON.stringify({routes:c.routeOptions(to.id),shipping:c.shippingQuote(1),direct:c.distanceBetweenCities(from,to),road:c.roadDistance(from,to)})));
}
const run=cp.spawnSync(binary,{input:JSON.stringify({routes})+'\n',encoding:'utf8',maxBuffer:20*1024*1024});assert.equal(run.status,0,String(run.error||run.stderr));const output=JSON.parse(run.stdout);assert(output.ok,run.stdout);
for(let i=0;i<expected.length;i++){
 const actual=output.result[i],wanted=expected[i];assert(Math.abs(actual.direct-wanted.direct)<1e-8,'distance '+i);delete actual.direct;delete wanted.direct;assert.deepEqual(actual,wanted,'route '+i);
}
console.log(JSON.stringify({passed:true,cityPairs:data.cities.length**2,scenarios:routes.length,scope:'route and shipment quotes only; departure, arrival, parking and UI excluded'},null,2));
