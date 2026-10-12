const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const {createServer} = require('../ai/server.cjs');
let handler, requests=[];
const server=createServer({env:{OPENAI_API_KEY:'test-key',AI_DAILY_LIMIT:'200'},fetch:async(url,options)=>{
    const request=JSON.parse(options.body);requests.push(request);
    const content=await handler(request,options.signal);
    return Response.json({choices:[{message:{content}}]});
}});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
    const url='http://127.0.0.1:'+server.address().port;
    async function scenario(name,run){
        const context=await browser.newContext(), page=await context.newPage(), errors=[];
        page.on('pageerror',e=>errors.push(e.message));requests=[];
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{
            await page.goto(url,{waitUntil:'networkidle'});
            await page.waitForFunction(()=>AI_DIALOGUE.checked && AI_DIALOGUE.available);
            await run(page);assert.deepEqual(errors,[]);console.log('PASS '+name);
        }finally{await context.close();}
    }
    try{
        await scenario('seller answers with model, facts, personality and persisted history',async page=>{
            handler=async()=> 'Да, двигатель требует ремонта. Пробег — 197 000 км, на встрече всё покажу.';
            await page.evaluate(async()=>{openBuyChat(1);await handleMessage('Расскажи подробнее про двигатель и пробег');});
            assert.match(requests[0].messages[0].content,/продавец/);
            assert.match(requests[0].messages[0].content,/197 000/);
            assert.equal(requests[0].messages.at(-1).content,'Расскажи подробнее про двигатель и пробег');
            assert.equal(await page.evaluate(()=>chat.log.at(-1).source),'ai');
            assert.equal(await page.evaluate(()=>chat.stage),'talk');
            const log=await page.evaluate(()=>chat.log);
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));
            assert.deepEqual(await page.evaluate(()=>chat.log),log);
            await page.evaluate(async()=>{await handleMessage('А что уже обсуждали?');});
            assert.ok(requests.at(-1).messages.some(m=>m.content===log.at(-1).text));
        });
        await scenario('buyer stays buyer and knows offered exchange car',async page=>{
            handler=async()=> 'Свою машину готов предложить на обмен, давайте осмотрим обе.';
            await page.evaluate(async()=>{
                garage=[1];const ad={id:'ai-buyer',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:210000,maxBid:210000,listingPrice:210000,trade:{carId:4000003,value:110000}};
                openSellChat(1,ad);await handleMessage('Как смотрите на обмен?');
            });
            const prompt=requests[0].messages[0].content;
            assert.match(prompt,/покупатель/);assert.match(prompt,/94 000/);assert.match(prompt,/Анна/);
            assert.equal(await page.evaluate(()=>chat.log.at(-1).source),'ai');
            assert.deepEqual(await page.evaluate(()=>garage),[1]);
        });
        await scenario('waiting blocks repeated messages and scheduling; agreed price and money stay authoritative',async page=>{
            let release;handler=()=>new Promise(resolve=>{release=resolve;});
            await page.evaluate(()=>{openBuyChat(1);chat.npc.personality='kind';chat.npc.mood=100;chat.ask=90000;chat.referencePrice=90000;handleMessage('Скиньте 5 тысяч, пожалуйста');handleMessage('Согласен');});
            await page.waitForFunction(()=>chat.aiPending);
            assert.ok(await page.locator('#chatLog').textContent().then(t=>t.includes('печатает')));
            assert.ok(await page.locator('#meetBtn').isDisabled());
            await page.evaluate(()=>scheduleMeeting());assert.equal(await page.evaluate(()=>chat.stage),'schedule');
            while(!release) await new Promise(resolve=>setTimeout(resolve,10));
            assert.equal(requests.length,1);
            release('Хорошо, договорились на 85 000 ₽. Выберите удобное время встречи.');
            await page.waitForFunction(()=>!chat.aiPending);
            assert.equal(await page.evaluate(()=>chat.price),85000);
            assert.equal(await page.evaluate(()=>balance),100000);
            assert.deepEqual(await page.evaluate(()=>garage),[]);
            assert.ok(!await page.locator('#meetBtn').isDisabled());
            assert.equal(await page.evaluate(()=>chat.log.find(m=>m.source==='ai').text),'Хорошо, договорились на 85 000 ₽. Выберите удобное время встречи.');
        });
        await scenario('closing or changing chat cancels request and preserves fallback without leaking late response',async page=>{
            let aborted=false;handler=(r,signal)=>new Promise((resolve,reject)=>{
                signal.addEventListener('abort',()=>{aborted=true;reject(Error('abort'));},{once:true});
            });
            await page.evaluate(()=>{openBuyChat(1);handleMessage('Какой пробег?');});
            await page.waitForFunction(()=>chat.aiPending);
            await page.waitForTimeout(80);
            await page.evaluate(()=>{closeChat();openBuyChat(2);});
            await page.waitForTimeout(100);
            assert.equal(await page.evaluate(()=>chat.car.id),2);
            assert.ok(!await page.evaluate(()=>chat.aiPending));assert.ok(aborted);
            await page.evaluate(()=>{closeChat();openBuyChat(1);});
            assert.ok(!await page.evaluate(()=>chat.log.some(m=>m.aiWaiting)));
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/197 000 км/);
        });
        await scenario('reloading a pending reply never restores a permanent typing state',async page=>{
            handler=(r,signal)=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('abort')),{once:true}));
            await page.evaluate(()=>{openBuyChat(1);handleMessage('Какой пробег?');});
            await page.waitForFunction(()=>chat.aiPending);
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));
            assert.ok(!await page.evaluate(()=>chat.aiPending || chat.log.some(m=>m.aiWaiting)));
            assert.ok(!await page.locator('#sendBtn').isDisabled());
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/197 000 км/);
        });
        await scenario('provider failure or invented price falls back and allows another message',async page=>{
            handler=async()=>{throw Error('network failure');};
            await page.evaluate(async()=>{openBuyChat(1);await handleMessage('Какой пробег?');});
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/197 000 км/);
            assert.match(await page.locator('#aiStatus').textContent(),/временно недоступен/);
            assert.ok(!await page.locator('#sendBtn').isDisabled());
            handler=async()=> 'Могу отдать за 1 рубль.';
            await page.evaluate(async()=>{await handleMessage('Расскажите про документы');});
            assert.ok(!await page.evaluate(()=>chat.log.some(m=>m.text.includes('1 рубль'))));
            assert.equal(await page.evaluate(()=>chat.stage),'talk');
        });
        await scenario('client timeout releases typing and restores normal reply',async page=>{
            handler=(r,signal)=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('abort')),{once:true}));
            await page.evaluate(async()=>{
                var original=setTimeout;
                window.setTimeout=function(fn,ms){return original(fn,ms===22000 ? 100 : ms);};
                openBuyChat(1);await handleMessage('Какой пробег?');
                window.setTimeout=original;
            });
            assert.ok(!await page.evaluate(()=>chat.aiPending || chat.log.some(m=>m.aiWaiting)));
            assert.ok(!await page.locator('#sendBtn').isDisabled());
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/197 000 км/);
        });
        await scenario('static hosting and unconfigured service retain synchronous normal replies',async page=>{
            await page.route('**/api/ai-status',route=>route.fulfill({status:200,contentType:'application/json',body:'{"enabled":false}'}));
            await page.reload({waitUntil:'networkidle'});
            await page.evaluate(()=>{openBuyChat(1);handleMessage('Какой пробег?');});
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/197 000 км/);
            assert.match(await page.locator('#aiStatus').textContent(),/не подключён/);
            assert.equal(requests.length,0);
        });
        console.log('8 AI browser scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
