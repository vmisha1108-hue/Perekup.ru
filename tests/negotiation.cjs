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
        await scenario('offering a million for a 600k car preserves that exact price through the contract and payment',async page=>{
            await seller(page);await page.locator('#msgInput').fill('Предлагаю миллион');await page.locator('#sendBtn').click();
            assert.equal(await page.evaluate(()=>chat.price),1000000);assert.match(await page.locator('#dealRow').textContent(),/1\s000\s000/);
            await page.locator('#meetBtn').click();await reachMeetingTime(page);await page.locator('#goBtn').click();await page.evaluate(()=>{gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();agreeEvent();});await signContract(page);
            assert.equal(await page.evaluate(()=>purchasePrices[1]),1000000);assert.equal(await page.evaluate(()=>balance),200000);assert.equal(await page.evaluate(()=>contractBook.records[0].price),1000000);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>purchasePrices[1]),1000000);
        });
        await scenario('an unaffordable higher offer is not silently replaced with the asking price',async page=>{
            await seller(page);await page.evaluate(()=>{balance=650000;handleMessage('Моя цена 1 000 000 ₽');});assert.equal(await page.evaluate(()=>chat.stage),'talk');assert.equal(await page.evaluate(()=>chat.price),null);assert.match(await page.locator('#chatLog').textContent(),/не хватает денег/);
            assert.deepEqual(await page.evaluate(()=>['Предлагаю миллион','Моя цена один миллион','Предлагаю 1 млн','Не беру за миллион','Не беру за миллион, предлагаю 600к','Пробег миллион'].map(t=>analyze(t).offer)),[1000000,1000000,1000000,null,600000,null]);
        });
        await scenario('a rejected appointment remains busy after repeats, reload and migration of an old conversation',async page=>{
            await seller(page);await page.evaluate(()=>{agreePrice(600000);renderChat();Math.random=()=>.01;});await page.locator('#meetTime').selectOption('13:00');await page.locator('#meetBtn').click();assert.equal(await page.evaluate(()=>chat.stage),'schedule');assert.equal(await page.evaluate(()=>pending.length),0);
            const busy=await page.evaluate(()=>chat.busyTimes[0]);await page.evaluate(()=>{Math.random=()=>.99;});await page.locator('#meetBtn').click();assert.equal(await page.evaluate(()=>chat.stage),'schedule');assert.match(await page.locator('#chatLog').textContent(),/уже говорил.*занят/);
            await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('chats'));delete saved['buy:1'].busyTimes;localStorage.setItem('chats',JSON.stringify(saved));});await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));assert.deepEqual(await page.evaluate(()=>chat.busyTimes),[busy]);
            await page.locator('#meetTime').selectOption('13:00');await page.locator('#meetBtn').click();assert.equal(await page.evaluate(()=>pending.length),0);await page.locator('#meetTime').selectOption('13:30');await page.locator('#meetBtn').click();assert.equal(await page.evaluate(()=>chat.stage),'go');assert.equal(await page.evaluate(()=>new Date(chat.meet.whenMs).getMinutes()),30);
        });
        for(const mode of ['buy','sell'])await scenario(mode+' counterpart can miss the appointment; the saved outcome never rerolls or transfers assets',async page=>{
            if(mode==='buy')await seller(page);
            else await page.evaluate(()=>{garage=[1];purchasePrices[1]=90000;postAd(1,600000);const ad={id:'absence',type:'ad',mode:'sell',carId:1,ready:true,npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:600000,maxBid:600000,listingPrice:600000};pending.push(ad);openAdChat(ad.id);});
            await page.evaluate(()=>{agreePrice(600000);renderChat();chat.busyUsed=true;Math.random=()=>.15;});await page.locator('#meetBtn').click();const id=await page.evaluate(()=>chat.pid),before=await page.evaluate(()=>({balance,garage}));assert.equal(await page.evaluate(()=>findPending(chat.pid).noShow),true);
            await page.locator('#chatClose').click();await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(id=>findPending(id).noShow,id),true);await page.evaluate(id=>{gameMs=findPending(id).when;openMeetChat(id);},id);await page.evaluate(()=>{gameMs=findPending(chat.pid).flow.arrivalAt;tickPending();});
            assert.equal(await page.evaluate(()=>chat.meetingOutcome),'no-show');assert.deepEqual(await page.evaluate(()=>({balance,garage})),before);assert.equal(await page.evaluate(()=>pending.length),0);assert.equal(await page.evaluate(()=>contractBook.records.length),0);
            assert.match(await page.locator('#meetingStatus').textContent(),mode==='buy'?/Продавец не приехал/:/Клиент не приехал/);if(mode==='buy')assert.ok(await page.evaluate(()=>availableMarketCars().some(car=>car.id===1)));else assert.ok(await page.evaluate(()=>!!listings[1]));
        });
        await scenario('common discounts and rare 30k/50k concessions are chosen once, respect mood and survive reload',async page=>{
            for(const [random,discount] of [[.9,20000],[.1,30000],[.01,50000]]){
                await seller(page,random);assert.equal(await page.evaluate(()=>chat.discountBudget),discount);const limit=await page.evaluate(()=>sellerLimit());assert.equal(limit,600000-discount);await page.evaluate(()=>{Math.random=()=>.8;});await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));assert.equal(await page.evaluate(()=>sellerLimit()),limit);
                await page.evaluate(discount=>handleMessage('Скиньте '+discount+' рублей, пожалуйста'),discount);assert.equal(await page.evaluate(()=>chat.price),600000-discount);await page.evaluate(()=>{chat.done=true;renderChat();closeChat();});
            }
        });
        await scenario('inspection discounts can reach 30k/50k, ordinary requests start at 10k and cheap cars remain positive',async page=>{
            const result=await page.evaluate(()=>{
                garage=[1];const ad={id:'cuts',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:600000,maxBid:600000,listingPrice:600000};openSellChat(1,ad);chat.price=600000;
                function event(random){const values=[.4,.4,random,.9];Math.random=()=>values.length?values.shift():.9;return rollEvent();}
                const amounts=[event(.9).amount,event(.1).amount,event(.01).amount];chat.price=5000;const cheap=event(.01);return {amounts,cheap:cheap.amount,remaining:chat.price-cheap.amount};
            });assert.deepEqual(result.amounts,[20000,30000,50000]);assert.ok(result.cheap<5000 && result.remaining>0);
        });
        console.log(passed+' negotiation and appointment scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
