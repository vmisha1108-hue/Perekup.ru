const fs=require('fs'),vm=require('vm'),cp=require('child_process');
const source=fs.readFileSync(__dirname+'/original-game/script.js','utf8');
const buyers=source.slice(source.indexOf('var BUYERS ='),source.indexOf('var GARAGES ='));
const offer=source.slice(source.indexOf('function makeBuyerOffer('),source.indexOf('function removeSaleOffers('));
let seed=123456789;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const cases=[];const expected=[];
for(let i=0;i<1200;i++) {
 const price=[1,100000,15000000,Number.MAX_SAFE_INTEGER][i%4];
 const q={car:{id:1,price},listing:{carId:1,price,purchasePrice:price*.8},draws:Array.from({length:8},rng),effect:{amount:[0,500,-500][i%3],text:'tuning'},trades:[{id:2,marketPrice:price},{id:3,marketPrice:price*.3},{id:4,marketPrice:price*1.6},{id:5,marketPrice:price*2}],state:{garage:i%5===0?[1,2]:[1],pending:i%7===0?[{trade:{carId:3}}]:[]}};
 if(i%2)q.listing.lastBuyerName=['Сергей','Анна','Игорь','Марина','Гоша','Ринат','Павел','Люба'][i%8];
 let pos=0;const math=Object.create(Math);math.random=()=>q.draws[pos++];
 const ctx={Math:math,BUYERS:null,garage:q.state.garage,pending:q.state.pending,TRADE_CARS:q.trades,gameMs:999,
 carById:()=>q.car,tuningBuyerEffect:()=>q.effect,newPid:()=> 'offer',clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
 vm.createContext(ctx);vm.runInContext(buyers+'\nfunction pick(a){return a[Math.floor(Math.random()*a.length)];}\nfunction rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}\n'+offer,ctx);
 const listing=structuredClone(q.listing);const result=ctx.makeBuyerOffer(listing,1234);expected.push({offer:result,listing,drawCount:pos});cases.push(q);
}
const run=cp.spawnSync(process.argv[2]||'/tmp/perekup-buyers-test',['--parity'],{input:cases.map(q=>JSON.stringify(q)).join('\n')+'\n',encoding:'utf8',maxBuffer:10*1024*1024});
if(run.status!==0)throw Error(run.stderr||'native process failed');
const actual=run.stdout.trim().split('\n').map(JSON.parse);require('assert').strictEqual(actual.length,expected.length);
actual.forEach((a,i)=>require('assert').deepStrictEqual(a,JSON.parse(JSON.stringify(expected[i])),`case ${i}`));
console.log(`PASS: ${actual.length} original/native buyer offers, prices, trades, moods and random draw order`);
