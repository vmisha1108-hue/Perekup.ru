const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {installEntryContinue}=require('./helpers/entry.cjs');
const {signContract,reachMeetingTime}=require('./helpers/contracts.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;let passed=0;
    async function scenario(name,run){
        const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(error.message));installEntryContinue(page);
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function seller(page,random=.9){await page.evaluate(random=>{balance=1200000;carById(1).price=600000;carById(1).seller.personality='kind';Math.random=()=>random;openBuyChat(1);chat.npc.mood=100;saveChat();save();},random);}
    try{
        await scenario('AI is opt-in, limited to one seller, and cannot change the price',async page=>{
            let calls=0;
            await page.route('https://openrouter.ai/api/v1/chat/completions',async route=>{
                calls++;const request=route.request().postDataJSON();assert.equal(request.model,'openrouter/free');
                await route.fulfill({json:{choices:[{message:{content:'Привет! Да, машина пока в продаже. Что интересует?'}}]}});
            });
            await seller(page);await page.evaluate(()=>handleMessage('Привет'));assert.equal(calls,0);
            await page.evaluate(()=>{document.getElementById('aiSellerKey').value='test-key';document.getElementById('aiSellerForm').requestSubmit();handleMessage('Ещё продаёшь?');});
            await page.waitForFunction(()=>document.getElementById('aiSellerStatus').textContent.includes('Последний ответ: ИИ'));
            assert.equal(calls,1);assert.equal(await page.evaluate(()=>chat.log.at(-1).text),'Привет! Да, машина пока в продаже. Что интересует?');
            assert.equal(await page.evaluate(()=>chat.price),null);
            assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('test-key')),false);
            await page.evaluate(()=>handleMessage('Предлагаю миллион'));assert.equal(await page.evaluate(()=>chat.price),1000000);assert.equal(calls,1);
            await page.evaluate(()=>{closeChat();openBuyChat(2);handleMessage('Привет');});assert.equal(calls,1);
        });
        await scenario('API errors keep the scripted reply and a disconnected request cannot overwrite chat',async page=>{
            await page.route('https://openrouter.ai/api/v1/chat/completions',route=>route.fulfill({status:429,json:{error:{message:'quota'}}}));
            await seller(page);await page.evaluate(()=>{document.getElementById('aiSellerKey').value='test-key';document.getElementById('aiSellerForm').requestSubmit();handleMessage('Привет');});
            await page.waitForFunction(()=>document.getElementById('aiSellerStatus').textContent.includes('ИИ недоступен'));
            assert.ok(await page.evaluate(()=>chat.log.at(-1).text.length>0));
            await page.unroute('https://openrouter.ai/api/v1/chat/completions');
            let finish;const gate=new Promise(resolve=>finish=resolve);
            await page.route('https://openrouter.ai/api/v1/chat/completions',async route=>{await gate;await route.fulfill({json:{choices:[{message:{content:'Поздний ответ'}}]}});});
            await Promise.all([page.waitForRequest('https://openrouter.ai/api/v1/chat/completions'),page.evaluate(()=>handleMessage('Как дела?'))]);
            const old=await page.evaluate(()=>{document.getElementById('aiSellerDisconnect').click();return chat.log.at(-1).text;});finish();
            await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>chat.log.at(-1).text),old);
        });
        console.log('Passed '+passed+' AI seller scenarios');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
