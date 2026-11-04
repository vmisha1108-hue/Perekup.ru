'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(process.argv[2],'snake.js'),'utf8'),binary=path.resolve(process.argv[3]);
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0);let i=source.indexOf('{',start),depth=0;for(;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&!--depth)return source.slice(start,i+1);}throw Error(name);}
const declaration=source.split('\n').find(l=>l.trim().startsWith('var size='));
const functions=['placeFood','reset','pause','end','step','frame','resume','turn'].map(extract).join('\n');
let seed=37;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const inputs=[];for(let s=0;s<80;s++){
 const cmds=[{op:'resume',time:0},{op:'frame',time:130},{op:'turn',x:-1,y:0},{op:'turn',x:0,y:-1},{op:'turn',x:-1,y:0},{op:'turn',x:0,y:1}];
 let time=130;for(let i=0;i<80;i++){
  if(i%17===0)cmds.push({op:'pause'},{op:'resume',time});
  if(i%29===0)cmds.push({op:'start',time});
  const dir=[[1,0],[0,1],[-1,0],[0,-1]][Math.floor(random()*4)];cmds.push({op:'turn',x:dir[0],y:dir[1]});time+=Math.floor(random()*700);cmds.push({op:'frame',time,visible:i%31!==0});
 }
 inputs.push({best:s%5,random:[.52,...Array.from({length:100},()=>random())],commands:cmds});
}
const run=cp.spawnSync(binary,{input:inputs.map(i=>JSON.stringify(i)).join('\n')+'\n',encoding:'utf8',maxBuffer:40*1024*1024});assert.equal(run.status,0,String(run.error||run.stderr));const results=run.stdout.trim().split('\n');assert.equal(results.length,inputs.length);
let steps=0,growth=0,ended=0;
inputs.forEach((input,index)=>{
 let n=0;const math=Object.create(Math);math.random=()=>input.random[n++]??.5;const element={focus(){}};
 const c={Math:math,readSaved:()=>input.best,writeSaved(){},$:()=>element,draw(){},cancelAnimationFrame(){},requestAnimationFrame:()=>1,performance:{now:()=>c.now},canvas:element,currentVisible:true,visible:()=>c.currentVisible};
 vm.createContext(c);vm.runInContext(declaration+'\n'+functions+'\nreset();',c);
 const expected=[];for(const cmd of input.commands){c.now=cmd.time||0;
  if(cmd.op==='start'){c.pause();c.reset();c.resume();}else if(cmd.op==='resume')c.resume();else if(cmd.op==='pause')c.pause();else if(cmd.op==='turn')c.turn(cmd.x,cmd.y);else if(cmd.op==='frame'){c.currentVisible=cmd.visible!==false;c.frame(cmd.time);}
  const s=JSON.parse(vm.runInContext('JSON.stringify({body,food,direction,nextTurns,score,best,playing,ended,last,carry})',c));expected.push(s);if(s.score)growth++;if(s.ended)ended++;
 }
 const actual=JSON.parse(results[index]);assert(actual.ok,results[index]);assert.deepEqual(actual.result,expected,'snake scenario '+index);steps+=expected.length;
});assert(growth>0&&ended>0);
console.log(JSON.stringify({passed:true,scenarios:inputs.length,steps,statesAfterEating:growth,statesAfterGameOver:ended,scope:'snake rules, frame timing, turn queue, pause/resume and score; rendering excluded'},null,2));
