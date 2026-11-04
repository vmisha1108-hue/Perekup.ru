'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(process.argv[2]),binary=path.resolve(process.argv[3]),catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/catalog.json')));
const clone=x=>JSON.parse(JSON.stringify(x));
function environment(random=[],previous={}){let i=0;const math=Object.create(Math);math.random=()=>random[i++]??.5;const c={Math:math,CARS:[],readSaved:()=>previous,writeSaved(){},localStorage:{setItem(){}},save(){}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'market-pricing.js'),'utf8'),c);i=0;vm.runInContext(fs.readFileSync(path.join(root,'market-risks.js'),'utf8'),c);return c;}
const cases=[],expected=[];
function add(input,answer){cases.push(input);expected.push(clone(answer));}
const c=environment();add({op:'estimate',cars:catalog.cars},catalog.cars.map(car=>c.estimateMarketPrice(car)));
for(const scalar of [0,.029999,.03,.049999,.05,.299999,.30,.5,.999999]){
 const random=Array(catalog.cars.length*5).fill(scalar),e=environment(random);
 add({op:'risks',cars:catalog.cars,random},catalog.cars.map(car=>e.rollMarketRisk(car)));
}
let previous={};for(const scalar of [0,.5,.999999]){
 const random=Array(1+catalog.cars.length*2).fill(scalar),e=environment(random,previous);e.CARS=clone(catalog.cars);e.initMarketSession();const moods=Object.fromEntries(e.CARS.map(car=>[car.id,car.seller.personality]));
 add({op:'session',cars:catalog.cars,previous,random},{cars:e.CARS,moods});previous=moods;
}
for(const balance of [0,2999,3000,6000])for(const scalar of [0,.5]){
 const e=environment(Array(5).fill(scalar)),car=clone(catalog.cars[0]);e.CARS=[car];e.marketRisks=e.freshMarketRisks();const risk=e.rollMarketRisk(car);e.marketRisks.vehicles[car.id]=clone(risk);let funds=balance;
 e.spend=n=>{if(n>funds)return false;funds-=n;return true;};const checks=[false,true,true,false],states=[];
 for(const pro of checks){const ok=e.checkMarketCar(car,pro);states.push(clone({ok,risk:e.marketRisks.vehicles[car.id],balance:funds}));}
 add({op:'inspect',risk,balance,checks},states);
}
const run=cp.spawnSync(binary,{input:cases.map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8',maxBuffer:100*1024*1024});assert.equal(run.status,0,String(run.error||run.stderr));const lines=run.stdout.trim().split('\n');assert.equal(lines.length,cases.length);
lines.forEach((s,i)=>{const a=JSON.parse(s);assert(a.ok,JSON.stringify(a));assert.deepEqual(a.result,expected[i],'scenario '+i+' '+cases[i].op);});
console.log(JSON.stringify({passed:true,scenarios:cases.length,catalogueCars:catalog.cars.length,estimates:catalog.cars.length,riskRolls:9*catalog.cars.length,sessionCarUpdates:3*catalog.cars.length,inspectionSteps:32,scope:'market valuation, session pricing, random risks, inspection; purchase/repair integration and UI excluded'},null,2));
