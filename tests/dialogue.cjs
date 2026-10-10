const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const storage = new Map();
const state = {Math:Object.create(Math), localStorage:{getItem:key=>storage.get(key), setItem:(key,value)=>storage.set(key,value)}};
state.Math.random = () => .9;
for(const file of ['cars.js','cities.js','regional-cars.js','custom-cars.js','city-market.js']) vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),state);
const original = new Map(state.CARS.map(c=>[c.id,c.price]));
vm.runInNewContext(fs.readFileSync(path.join(root,'market-pricing.js'),'utf8'),state);
for(let i=0;i<30;i++){
    state.initMarketSession();
    for(const car of state.CARS){
        assert.equal(car.basePrice,original.get(car.id),'Purchase fallback must not compound');
        assert.ok(Math.abs(car.marketPrice / car.referenceMarketPrice - 1)<.05,'Market benchmark stays stable through repeated refreshes');
    }
}
console.log('PASS 30 market refreshes preserve original prices and stable valuations');
const server = http.createServer((request,response)=>{
    const pathname = new URL(request.url,'http://localhost').pathname;
    const file = path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
    try{
        const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'}[path.extname(file)];
        const contents = fs.readFileSync(file);
        response.writeHead(200,{'Content-Type':mime||'application/octet-stream'}).end(contents);
    }catch(e){response.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url='http://127.0.0.1:'+server.address().port;
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
    let passed=0;
    async function scenario(name,run){
        const context=await browser.newContext();const page=await context.newPage();const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    try{
        await scenario('technical numbers and negative agreement never accept a price',async page=>{
            await page.evaluate(()=>openBuyChat(1));
            for(const [message,expected] of [['Привет! Какой пробег, 200 тысяч?',/197 000 км/],['Двигатель 1.6 или 1.8?',/1.6 л/],['Какого года, 2006?',/2006/],['Документы и ПТС в порядке?',/VIN/],['Не согласен',/уговаривать|не подходит/],['Давай обсудим осмотр',/осмотр|встреч/]]){
                const reply=await page.evaluate(message=>{handleMessage(message);return{stage:chat.stage,offer:analyze(message).offer,last:chat.log.at(-1).text};},message);
                assert.equal(reply.stage,'talk');assert.equal(reply.offer,null);assert.match(reply.last,expected);
            }
            await page.evaluate(()=>handleMessage('Какой пробег?'));
            assert.ok((await page.locator('#chatLog').textContent()).includes('197 000 км'));
            await page.evaluate(()=>handleMessage('Что с двигателем?'));
            assert.ok(await page.evaluate(()=>/ремонт|диагност/.test(chat.log.at(-1).text)),'Declared repair remains visible in replies');
        });
        await scenario('money formats, specific discounts and additions are interpreted as negotiation',async page=>{
            const parsed=await page.evaluate(()=>['Моя цена: 90 000 ₽','Отдадите за 90к?','Предлагаю 90 тыс.','Готов дать 1,2 млн','150000'].map(t=>analyze(t).offer));
            assert.deepEqual(parsed,[90000,90000,90000,1200000,150000]);
            await page.evaluate(()=>{openBuyChat(1);chat.npc.personality='kind';chat.npc.mood=100;chat.ask=90000;chat.referencePrice=90000;handleMessage('Скиньте 5 тысяч, пожалуйста');});
            assert.equal(await page.evaluate(()=>chat.price),85000);
            await page.evaluate(()=>{closeChat();garage=[2];const ad={id:'money',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:300000,maxBid:330000,listingPrice:350000};openSellChat(2,ad);handleMessage('Добавьте 10 тысяч');});
            assert.equal(await page.evaluate(()=>chat.price),310000);
        });
        await scenario('replies answer politely, vary at fixed randomness and persist across reload',async page=>{
            await page.evaluate(()=>{openBuyChat(1);chat.npc.personality='kind';chat.npc.mood=70;handleMessage('Спасибо, какой пробег?');});
            assert.ok(await page.evaluate(()=>chat.log.at(-1).text.includes('197 000 км')));
            const replies=await page.evaluate(()=>{const results=[];for(let i=0;i<3;i++){handleMessage('Машина ещё продаётся?');results.push(chat.log.at(-1).text);}return results;});
            assert.notEqual(replies[0],replies[1]);assert.ok(replies.every(reply=>reply.includes('актуально')||reply.includes('договорились')));
            const before=await page.evaluate(()=>{handleMessage('Пожалуйста, расскажите про ремонт');return{log:chat.log,npc:chat.npc};});
            assert.ok(before.log.at(-1).text.includes('ремонт'));
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openBuyChat(1));
            assert.deepEqual(await page.evaluate(()=>chat.log),before.log);assert.deepEqual(await page.evaluate(()=>chat.npc),before.npc);
            const mood=await page.evaluate(()=>chat.npc.mood);await page.evaluate(()=>handleMessage('Ты жадный!'));
            assert.ok(await page.evaluate(()=>chat.npc.mood)<mood);
            assert.ok(await page.evaluate(()=>/грубости|оскорблять/.test(chat.log.at(-1).text)));
        });
        await scenario('exchange questions explain the offered car and both directions of top-up',async page=>{
            await page.evaluate(()=>{garage=[1];const ad={id:'trade',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:210000,maxBid:210000,listingPrice:210000,trade:{carId:4000003,value:110000}};openSellChat(1,ad);handleMessage('Что предлагаете на обмен?');});
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/100\s000/);
            await page.evaluate(()=>handleMessage('Какой пробег?'));
            assert.ok(await page.evaluate(()=>chat.log.at(-1).text.includes('94 000 км')));
            await page.evaluate(()=>{chat.trade.value=230000;handleMessage('Какая доплата?');});
            assert.match(await page.evaluate(()=>chat.log.at(-1).text),/Ваша доплата: 20\s000/);
        });
        await scenario('sleep refreshes prices and moods, keeps quotes, buyer offers and player advertisements',async page=>{
            const before=await page.evaluate(()=>{
                balance=500000;garage=[2];purchasePrices[2]=281000;
                postAd(2,400000);listings[2].nextBuyerAt=gameMs+72*3600000;
                const ad=makeBuyerOffer(listings[2]);pending.push(ad);
                openBuyChat(1);agreePrice(100000);renderChat();
                $('meetDate').value='2030-01-17';$('meetTime').value='12:00';meetingTimeEdited=true;scheduleMeeting();
                const meeting=findPending(chat.pid), quote={ask:chat.ask,npc:chat.npc,reference:chat.referencePrice};closeChat();
                gameMs=new Date(2030,0,15,22).getTime();openWin('clock');
                return{moods:CARS.map(c=>c.seller.personality),prices:CARS.map(c=>c.price),bases:CARS.map(c=>c.basePrice),meeting,quote,ad};
            });
            await page.locator('#sleepBtn').click();
            const after=await page.evaluate(()=>({moods:CARS.map(c=>c.seller.personality),prices:CARS.map(c=>c.price),bases:CARS.map(c=>c.basePrice),pending,listing:listings[2]}));
            assert.ok(after.moods.every((mood,i)=>mood!==before.moods[i]));assert.notDeepEqual(after.prices,before.prices);assert.deepEqual(after.bases,before.bases);
            assert.equal(after.listing.price,400000);assert.equal(after.listing.purchasePrice,281000);
            assert.deepEqual(after.pending.find(it=>it.id===before.meeting.id),before.meeting);
            assert.deepEqual(after.pending.find(it=>it.id===before.ad.id),before.ad);
            await page.evaluate(id=>openMeetChat(id),before.meeting.id);
            assert.equal(await page.evaluate(()=>chat.price),100000);assert.deepEqual(await page.evaluate(()=>chat.npc.personality),before.quote.npc.personality);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(id=>findPending(id).price,before.meeting.id),100000);
            assert.equal(await page.evaluate(()=>listings[2].price),400000);
        });
        await scenario('daytime sleep does not refresh the market and morning cards use new prices',async page=>{
            const before=await page.evaluate(()=>CARS.map(c=>({price:c.price,mood:c.seller.personality})));
            assert.equal(await page.evaluate(()=>sleepUntilMorning()),false);
            assert.deepEqual(await page.evaluate(()=>CARS.map(c=>({price:c.price,mood:c.seller.personality}))),before);
            await page.evaluate(()=>{gameMs=new Date(2030,0,15,23).getTime();openWin('market');openCarInfo(1);sleepUntilMorning();});
            assert.ok((await page.locator('#carModalBody .car-price').textContent()).includes(await page.evaluate(()=>Math.round(CARS[0].price).toLocaleString('ru-RU'))));
            await page.evaluate(()=>closeCarInfo());
            const actual=await page.locator('[data-info="1"] .price').textContent();
            assert.ok(actual.includes(await page.evaluate(()=>CARS[0].price.toLocaleString('ru-RU'))));
        });
        console.log(`${passed} dialogue/sleep scenarios passed`);
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
