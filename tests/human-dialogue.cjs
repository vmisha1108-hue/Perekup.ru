const {installEntryContinue}=require('./helpers/entry.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const server = http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)) return res.writeHead(403).end();
    try{
        const data=await fs.readFile(file);
        res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)] || 'application/octet-stream'}).end(data);
    }catch(e){res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (fsSync.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
    let passed=0;
    async function scenario(name,run){
        const context=await browser.newContext(),page=await context.newPage(),errors=[],apiRequests=[];
        page.on('pageerror',e=>errors.push(e.message));
        page.on('request',r=>{if(r.url().includes('/api/') || !r.url().startsWith('http://127.0.0.1:')) apiRequests.push(r.url());});
        installEntryContinue(page);await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{
            await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
            await run(page);assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);passed++;console.log('PASS '+name);
        }finally{await context.close();}
    }
    async function seller(page,personality='kind'){
        await page.evaluate(personality=>{openBuyChat(1);chat.npc.personality=personality;chat.npc.mood=100;},personality);
    }
    async function reply(page,text){return page.evaluate(text=>{handleMessage(text);return {text:chat.log.at(-1).text,mood:chat.npc.mood,done:chat.done,stage:chat.stage,price:chat.price,memory:chat.npc.conversation};},text);}
    try{
        await scenario('insult with an acceptable price is refused; repeated insults end the conversation',async page=>{
            await seller(page);
            const price=await page.evaluate(()=>chat.ask);
            const first=await reply(page,'Ты идиот, согласен на '+price+' рублей');
            assert.equal(first.stage,'talk');assert.equal(first.price,null);assert.equal(first.done,false);assert.match(first.text,/оскорб|груб/);
            assert.ok(first.mood<100);
            await reply(page,'Ты дебил');const third=await reply(page,'Ты жмот');assert.ok(third.done);
            assert.equal(await page.evaluate(()=>balance),100000);assert.deepEqual(await page.evaluate(()=>garage),[]);
        });
        await scenario('buyer refuses personal abuse without selling the owned vehicle',async page=>{
            await page.evaluate(()=>{garage=[1];vehicleState(1);openSellChat(1,{id:'social-one',npc:{name:'Анна',avatar:'👩',personality:'evil',mood:100},bid:50000,maxBid:60000,listingPrice:90000});});
            const first=await reply(page,'Ты мудак, бери за 50000');assert.equal(first.stage,'talk');assert.match(first.text,/оскорб|груб/);
            const second=await reply(page,'Заткнись');assert.ok(second.done);
            assert.deepEqual(await page.evaluate(()=>garage),[1]);assert.equal(await page.evaluate(()=>balance),100000);
        });
        await scenario('genuine apology restores some mood but neither apology nor compliments can be farmed',async page=>{
            await seller(page);
            const insult=await reply(page,'Ты идиот');
            const apology=await reply(page,'Извини за то, что назвал тебя идиотом');
            assert.equal(apology.memory.warnings,1);assert.match(apology.text,/извин|спасибо/i);
            assert.ok(apology.mood>insult.mood && apology.mood<100);
            const repeat=await reply(page,'Прости, я погорячился');assert.ok(repeat.mood<=apology.mood);
            const praise=await reply(page,'Отличная машина');const praiseAgain=await reply(page,'Очень красивая машина');assert.equal(praiseAgain.mood,praise.mood);
            const mixed=await reply(page,'Извини, но ты всё равно дебил');assert.equal(mixed.memory.warnings,2);assert.ok(mixed.mood<praiseAgain.mood);
        });
        await scenario('car frustration, legitimate caution, threats and pressure have distinct reactions',async page=>{
            await seller(page);
            const frustration=await reply(page,'Бля, машина выглядит как говно');assert.equal(frustration.memory.warnings,0);assert.equal(frustration.done,false);assert.match(frustration.text,/раздраж|расстро/);
            const caution=await reply(page,'Точно без обмана?');assert.equal(caution.memory.warnings,0);assert.match(caution.text,/провер|сверим/);
            const pressure=await reply(page,'Быстрее отвечай, решай сейчас');assert.match(pressure.text,/давлен|тороп|подгон|спокойно/);assert.ok(pressure.mood<caution.mood);
            const threat=await reply(page,'Я тебя найду и побью');assert.ok(threat.done);
            assert.equal(await page.evaluate(()=>balance),100000);
        });
        await scenario('technical facts can be asked together and a short follow-up remembers the topic after reload',async page=>{
            await seller(page);
            const several=await reply(page,'Какой пробег, что с двигателем и документы в порядке?');
            assert.match(several.text,/197 000/);assert.match(several.text,/1\.6|двигател|ремонт/);assert.match(several.text,/VIN|документ/);assert.equal(several.stage,'talk');
            await reply(page,'Что с двигателем?');
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));
            const detail=await reply(page,'Расскажи подробнее');assert.equal(detail.memory.lastTopic,'engine');assert.match(detail.text,/подробнее/);assert.match(detail.text,/двигател|ремонт/);
            assert.equal(detail.price,null);
        });
        await scenario('buyer asks about seller car and accepts mileage answer without treating it as money',async page=>{
            await page.evaluate(()=>{garage=[1];openSellChat(1,{id:'mileage-buyer',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:50000,maxBid:60000,listingPrice:90000});});
            const initial=await reply(page,'У меня пробег 200 тысяч, не скручен');assert.match(initial.text,/понял по пробегу/i);assert.equal(initial.price,null);
            const question=await reply(page,'Что тебя интересует по пробегу?');assert.match(question.text,/какой.*пробег/i);
            const answer=await reply(page,'200 000');assert.match(answer.text,/понял по пробегу/i);assert.equal(answer.stage,'talk');assert.equal(answer.price,null);
            await reply(page,'Что с документами хочешь узнать?');const yes=await reply(page,'Да');assert.match(yes.text,/документ|VIN/);assert.equal(yes.stage,'talk');
            const offer=await reply(page,'Хочу за неё 55 000 ₽');assert.equal(offer.price,55000);assert.equal(offer.stage,'schedule');
        });
        await scenario('warnings survive reload, belong to one thread, and forgiveness does not change negotiated prices',async page=>{
            await seller(page);
            await reply(page,'Ты жадный');const before=await page.evaluate(()=>chat.npc.conversation);
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));
            assert.deepEqual(await page.evaluate(()=>chat.npc.conversation),before);
            const apology=await reply(page,'Прости, сорвался');assert.equal(apology.memory.warnings,1);
            await page.evaluate(()=>{closeChat();openBuyChat(2);});
            assert.equal(await page.evaluate(()=>dialogueMemory().warnings),0);
            await page.evaluate(()=>{closeChat();openBuyChat(1);});
            assert.equal(await page.evaluate(()=>dialogueMemory().warnings),1);
            assert.equal(await page.evaluate(()=>chat.price),null);
        });
        await scenario('repeated identical low bids do not keep lowering price and technical proposals are not monetary offers',async page=>{
            await seller(page);await page.evaluate(()=>{chat.ask=90000;chat.referencePrice=90000;});
            await reply(page,'Моя цена 40 000 ₽');await reply(page,'Моя цена 40 000 ₽');
            const before=await page.evaluate(()=>chat.ask);const third=await reply(page,'Моя цена 40 000 ₽');
            assert.equal(await page.evaluate(()=>chat.ask),before);assert.equal(third.stage,'talk');assert.match(third.text,/повтор|обсуждали|помню/);
            const technical=await reply(page,'Предлагаю проверить двигатель 1.6');assert.equal(technical.stage,'talk');assert.equal(technical.price,null);
        });
        await scenario('both characters can react to humour and goodbye without agreeing a deal',async page=>{
            await seller(page,'neutral');const joke=await reply(page,'Да я шучу, ахаха');assert.match(joke.text,/шут|улыб/);assert.equal(joke.stage,'talk');
            const bye=await reply(page,'Пока');assert.match(bye.text,/свидания|предложени/);assert.equal(bye.stage,'talk');
            assert.equal(await page.locator('#aiStatus').count(),0);
        });
        await scenario('negative price statements never agree a deal; a later affirmative clause uses its own amount',async page=>{
            await seller(page);await page.evaluate(()=>{chat.ask=90000;chat.referencePrice=90000;});
            for(const message of ['Не беру за 90000 рублей','Не готов дать 90 тысяч','Не согласен на 90000']){
                const state=await reply(page,message);assert.equal(state.price,null);assert.equal(state.stage,'talk');
            }
            const parsed=await page.evaluate(()=>analyze('Не беру за 90000, предлагаю 85 тысяч').offer);assert.equal(parsed,85000);
            const deal=await reply(page,'Извини, я согласен');assert.equal(deal.stage,'schedule');assert.equal(deal.price,90000);
            assert.match(await page.locator('#chatLog').textContent(),/все хорошо|ничего страшного/i);
        });
        console.log(passed+' human dialogue scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
