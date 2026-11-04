'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(process.argv[2]),binary=path.resolve(process.argv[3]);
const source=fs.readFileSync(path.join(root,'bank.js'),'utf8'),scenarios=[];
for(const amount of [50000,100000,500000,1000000,10000000,100000000])for(const months of [6,12,24,36])for(const random of [0,.45,.99999])scenarios.push({name:`credit-${amount}-${months}-${random}`,random:[random,random],commands:[{op:'quote',amount,months},{op:'chance',amount},{op:'request',amount,months},{op:'tick',now:10800000},{op:'accept'},...Array.from({length:months+1},(_,i)=>({op:'tick',now:10800000+(i+1)*30*86400000}))]});
for(let amount=10000;amount<=100000;amount+=10000)for(const random of [0,.5,.99999])for(const balance of [0,10000,100000])scenarios.push({name:`micro-${amount}-${random}-${balance}`,balance,random:[random],commands:[{op:'microQuote',amount},{op:'microQuote',amount},{op:'micro',amount},{op:'micro',amount},{op:'pay',amount:1000},{op:'tick',now:14*86400000},{op:'tick',now:180*86400000},{op:'balance',value:300000},{op:'tick',now:181*86400000}]});
for(const r of [0,.9])scenarios.push({name:`overlap-${r}`,random:[0,r,.3],commands:[{op:'request',amount:500000,months:36},{op:'tick',now:10800000},{op:'accept'},{op:'micro',amount:100000},{op:'tick',now:10*86400000},{op:'balance',value:0},{op:'tick',now:370*86400000},{op:'balance',value:400000},{op:'tick',now:371*86400000},{op:'balance',value:10000000},{op:'tick',now:1200*86400000}]});
scenarios.push({name:'invalid',commands:[{op:'quote',amount:1,months:12},{op:'request',amount:50000,months:1},{op:'micro',amount:-10000},{op:'micro',amount:10001},{op:'accept'}]});
function reference(input){
 let index=0;const samples=input.random||[.5],math=Object.create(Math);math.random=()=>samples[index++]??.5;
 const c={Math:math,balance:input.balance??100000,gameMs:input.now??0,garage:[],marketGameOver:()=>false,advanceGameTime(){},tickPending(){},syncCollectors(){},save(){},saveGameTime(){},updateStats(){},writeSaved(){},toast(){},localStorage:{setItem(){}},document:{getElementById:()=>null},money:String,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),carById:()=>null};
 c.rnd=(a,b)=>a+Math.floor(math.random()*(b-a+1));vm.createContext(c);vm.runInContext(source,c);c.bank=c.freshBank();c.renderBank=()=>{};
 const out=[];for(const x of input.commands){let result=null;
  if(x.op==='quote')result=c.creditQuote(x.amount,x.months);else if(x.op==='chance')result=c.creditChance(x.amount);else if(x.op==='request')result=c.requestCredit(x.amount,x.months);else if(x.op==='accept')result=c.acceptCredit();else if(x.op==='microQuote')result=c.microQuote(x.amount);else if(x.op==='micro')result=c.takeMicro(x.amount);else if(x.op==='tick'){c.gameMs=x.now;c.tickBank();}else if(x.op==='balance')c.balance=x.value;else if(x.op==='pay')result=c.payLoanAmount(c.bank.loans[x.index||0],x.amount,c.gameMs,false);
  out.push(JSON.parse(JSON.stringify({result,balance:c.balance,bank:c.bank})));
 }return out;
}
function compare(a,e,p){if(typeof e==='number'){assert.equal(typeof a,'number',p);if(Number.isInteger(e))assert.equal(a,e,p);else assert(Math.abs(a-e)<=Math.max(1e-7,Math.abs(e)*1e-12),p+': '+a+' != '+e);}else if(e&&typeof e==='object'){assert.deepEqual(Object.keys(a).sort(),Object.keys(e).sort(),p);for(const k of Object.keys(e))compare(a[k],e[k],p+'.'+k);}else assert.equal(a,e,p);}
const run=cp.spawnSync(binary,{input:scenarios.map(s=>JSON.stringify(s)).join('\n')+'\n',encoding:'utf8',maxBuffer:100*1024*1024});assert.equal(run.status,0,run.stderr);const lines=run.stdout.trim().split('\n');assert.equal(lines.length,scenarios.length);
let steps=0;scenarios.forEach((s,i)=>{const r=JSON.parse(lines[i]);assert(r.ok,JSON.stringify(r));const expected=reference(s);compare(r.steps,expected,s.name);steps+=expected.length;});
console.log(JSON.stringify({passed:true,scenarios:scenarios.length,steps,scope:'bank domain comparisons only; UI, loading and collectors not covered'},null,2));
