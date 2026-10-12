const {installEntryContinue}=require('./helpers/entry.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {signContract}=require('./helpers/contracts.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch(e){res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let passed=0;
    async function scenario(name,run,viewport={width:1280,height:900}){
        const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
        installEntryContinue(page);await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;});
        try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function meeting(page,mode='buy',price=90000,eventRandom=.9){
        await page.evaluate(({mode,price,eventRandom})=>{
            if(mode==='buy'){openBuyChat(1);agreePrice(price);}
            else{garage=[1];vehicleState(1);postAd(1,price);const ad={id:'contract-buyer',type:'ad',mode:'sell',carId:1,ready:true,npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:price,maxBid:price,listingPrice:price};pending.push(ad);openAdChat(ad.id);agreePrice(price);}
            renderChat();scheduleMeeting();gameMs=Math.max(gameMs,chat.meet.whenMs);lastRealMs=Date.now();goToMeeting();gameMs=findPending(chat.pid).flow.inspectionUntil;Math.random=()=>eventRandom;tickPending();
        },{mode,price,eventRandom});
    }
    async function draft(page,mode='buy',price=90000,eventRandom=.9){await meeting(page,mode,price,eventRandom);await page.locator('#evYes').click();assert.equal(await page.evaluate(()=>chat.stage),'contract');}
    async function ready(page){await page.locator('#contractAutofill').click();await page.locator('#contractConfirm').check();}
    try{
        await scenario('buying requires a completed contract and records the correct parties, vehicle and money once',async page=>{
            await draft(page);assert.equal(await page.evaluate(()=>balance),100000);assert.deepEqual(await page.evaluate(()=>garage),[]);assert.equal(await page.evaluate(()=>contractBook.records.length),0);
            assert.equal(await page.evaluate(()=>currentContract().price),90000);await signContract(page);
            assert.deepEqual(await page.evaluate(()=>garage),[1]);assert.equal(await page.evaluate(()=>balance),10000);
            const d=await page.evaluate(()=>contractBook.records[0]);assert.equal(d.price,90000);assert.equal(d.mode,'buy');assert.equal(d.buyer.fullName,'Иванов Алексей Сергеевич');assert.notEqual(d.seller.fullName,d.buyer.fullName);assert.match(d.vehicle.vin,/^[A-HJ-NPR-Z0-9]{17}$/);
            assert.equal(await page.evaluate(()=>signContract()),false);assert.equal(await page.evaluate(()=>contractBook.records.length),1);assert.equal(await page.evaluate(()=>balance),10000);
            await page.locator('#meetingContractView').click();assert.ok(await page.locator('#win-documents').isVisible());assert.match(await page.locator('#documentsBody').textContent(),/Подписан обеими сторонами/);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>contractBook.records.length),1);assert.equal(await page.evaluate(()=>balance),10000);
            await page.evaluate(()=>openWin('documents'));await page.locator('[data-document]').click();assert.match(await page.locator('#documentsBody').textContent(),/90\s*000/);
        });
        await scenario('selling keeps ownership until signature and assigns the player as seller at the final discounted price',async page=>{
            await draft(page,'sell',100000,.4);const final=await page.evaluate(()=>currentContract().price);assert.ok(final<100000);
            assert.deepEqual(await page.evaluate(()=>garage),[1]);assert.equal(await page.evaluate(()=>balance),100000);await signContract(page);
            assert.deepEqual(await page.evaluate(()=>garage),[]);assert.equal(await page.evaluate(()=>balance),100000+final);
            const d=await page.evaluate(()=>contractBook.records[0]);assert.equal(d.seller.fullName,'Иванов Алексей Сергеевич');assert.match(d.buyer.fullName,/Анна/);assert.equal(d.price,final);assert.equal(d.mode,'sell');assert.ok(!await page.evaluate(()=>listings[1]));
        });
        await scenario('purchase expense and sale profit use the actual prices, persist and appear on the right',async page=>{
            await draft(page);await signContract(page);
            assert.equal(await page.evaluate(()=>contractBook.records[0].purchasePrice),90000);
            await page.evaluate(()=>closeChat());await draft(page,'sell',100000);await signContract(page);
            assert.equal(await page.evaluate(()=>purchasePrices[1]),undefined);
            assert.equal(await page.evaluate(()=>contractBook.records[0].purchasePrice),90000);
            await page.evaluate(()=>{selectedContractId=null;openWin('documents');});
            const cards=page.locator('.document-card');assert.equal(await cards.count(),2);
            assert.match(await cards.nth(0).locator('.document-result').textContent(),/Выручка100\s*000\s*₽Прибыль\+10\s*000\s*₽/);
            assert.match(await cards.nth(1).locator('.document-result').textContent(),/Потрачено90\s*000/);
            assert.equal(await cards.nth(1).locator('.document-profit').count(),0);
            await page.locator('#win-documents').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
            const left=await cards.nth(0).locator('.document-info').boundingBox(),right=await cards.nth(0).locator('.document-result').boundingBox();assert.ok(right.x>=left.x+left.width);
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/dkp-results-desktop.png'});
            await cards.nth(0).click();assert.match(await page.locator('.contract-result').textContent(),/Куплено за 90\s*000/);assert.match(await page.locator('.contract-result').textContent(),/без других расходов/);
            await page.evaluate(()=>{contractBook.records=contractBook.records.filter(d=>d.mode==='sell');saveContracts();});
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>contractBook.records[0].purchasePrice),90000);
            await page.evaluate(()=>openWin('documents'));assert.match(await page.locator('.document-profit').textContent(),/Прибыль\+10\s*000/);
        });
        await scenario('sale loss, break-even and unknown cost are distinct and use the final inspection price',async page=>{
            await page.evaluate(()=>{purchasePrices[1]=120000;save();});await draft(page,'sell',100000,.4);
            const final=await page.evaluate(()=>currentContract().price);await signContract(page);
            await page.evaluate(()=>{selectedContractId=null;openWin('documents');});
            assert.match(await page.locator('.document-profit').textContent(),/Убыток−/);assert.ok(await page.locator('.document-profit.negative').count());
            assert.equal(await page.locator('.document-profit strong').textContent(),await page.evaluate(price=>'−'+money(120000-price),final));
            await page.evaluate(()=>{const original=contractBook.records[0];contractBook.records=[Object.assign({},original,{id:'even',price:120000}),Object.assign({},original,{id:'unknown',purchasePrice:null}),original];renderDocuments();});
            assert.match(await page.locator('[data-document="even"] .document-profit').textContent(),/Без прибыли0\s*₽/);
            assert.match(await page.locator('[data-document="unknown"]').textContent(),/Цена покупки неизвестна/);assert.equal(await page.locator('[data-document="unknown"] .document-profit').count(),0);
        });
        await scenario('older contracts recover cost only from the preceding purchase and keep it when the archive is trimmed',async page=>{
            await draft(page);await signContract(page);
            await page.evaluate(()=>{
                const original=contractBook.records[0];
                contractBook.records=[{id:'sale',mode:'sell',price:688000},{id:'buy',mode:'buy',price:616500},{id:'older-sale',mode:'sell',price:701000}].map((data,i)=>{const record=Object.assign({},original,data,{signedAt:original.signedAt-i*1000});delete record.purchasePrice;return record;});saveContracts();
            });
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>contractBook.records[0].purchasePrice),616500);assert.equal(await page.evaluate(()=>contractBook.records[2].purchasePrice),null);
            await page.evaluate(()=>{contractBook.records=contractBook.records.slice(0,1);saveContracts();});await page.reload({waitUntil:'networkidle'});
            await page.evaluate(()=>openWin('documents'));assert.match(await page.locator('.document-profit').textContent(),/Прибыль\+71\s*500/);
        });
        await scenario('financial summaries stay to the right without horizontal scrolling on a narrow phone',async page=>{
            await page.evaluate(()=>{purchasePrices[1]=120000;save();});await draft(page,'sell',100000);await signContract(page);
            await page.evaluate(()=>{selectedContractId=null;openWin('documents');});
            await page.locator('#win-documents').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
            const card=page.locator('.document-card'),left=await card.locator('.document-info').boundingBox(),right=await card.locator('.document-result').boundingBox();assert.ok(right.x>=left.x+left.width);
            assert.ok(await page.locator('#documentsBody').evaluate(el=>el.scrollWidth<=el.clientWidth));assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/dkp-results-mobile.png'});
            await card.click();assert.ok(await page.locator('#documentsBody').evaluate(el=>el.scrollWidth<=el.clientWidth));assert.match(await page.locator('.contract-result').textContent(),/Убыток−20\s*000/);
        },{width:320,height:640});
        await scenario('blank or incorrect fields show specific help and cannot transfer anything',async page=>{
            await draft(page);await page.locator('#contractSign').click();assert.match(await page.locator('#contractErrors').textContent(),/паспорте|адрес/);assert.equal(await page.evaluate(()=>contractBook.records.length),0);
            await ready(page);await page.locator('#contract-vin').fill('BADVIN');await page.locator('#contractSign').click();assert.match(await page.locator('#contractErrors').textContent(),/VIN не совпадает/);
            assert.equal(await page.locator('#contract-vin').getAttribute('aria-invalid'),'true');assert.deepEqual(await page.evaluate(()=>garage),[]);assert.equal(await page.evaluate(()=>balance),100000);
            await ready(page);await page.locator('#contractConfirm').uncheck();await page.locator('#contractSign').click();assert.match(await page.locator('#contractErrors').textContent(),/Подтвердите/);
            await page.locator('#contractConfirm').check();await page.locator('#contractSign').click();assert.equal(await page.evaluate(()=>contractBook.records.length),1);
        });
        await scenario('nickname and drawn signature stay fixed while editable passport data become the profile for later paperwork',async page=>{
            await draft(page);await ready(page);assert.ok(await page.locator('#contract-fullName').evaluate(el=>el.readOnly));assert.equal(await page.locator('#contract-signature').count(),0);
            await page.locator('#contract-passport').fill('1234 567890');await page.locator('#contract-address').fill('г. Москва, ул. Новая, д. 20');
            await page.locator('#contractSign').click();assert.equal(await page.evaluate(()=>contractBook.records[0].buyer.fullName),await page.evaluate(()=>playerIdentity.nickname));assert.equal(await page.evaluate(()=>contractBook.profile.passport),'1234 567890');
            assert.deepEqual(await page.evaluate(()=>contractBook.records[0].buyer.signature),await page.evaluate(()=>playerIdentity.signature));
        });
        await scenario('an unsigned partly filled draft and its fixed price survive reload and a long wait',async page=>{
            await draft(page,'buy',90000,.4);await ready(page);await page.locator('#contract-address').fill('г. Москва, ул. Сохранённая, д. 3');
            const before=await page.evaluate(()=>{gameMs+=5*3600000;tickPending();save();return JSON.parse(JSON.stringify(currentContract()));});
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>chat.stage),'contract');assert.deepEqual(await page.evaluate(()=>currentContract()),before);assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.deepEqual(await page.evaluate(()=>garage),[]);
            assert.equal(await page.locator('#contract-address').inputValue(),'г. Москва, ул. Сохранённая, д. 3');await page.locator('#contractSign').click();assert.equal(await page.evaluate(()=>contractBook.records[0].price),before.price);
        });
        await scenario('refusing a surcharge can lead to a contract at the original price',async page=>{
            await meeting(page,'buy',90000,.4);await page.evaluate(()=>Math.random=()=>.9);await page.locator('#evNo').click();assert.equal(await page.evaluate(()=>chat.stage),'contract');assert.equal(await page.evaluate(()=>currentContract().price),90000);await signContract(page);assert.equal(await page.evaluate(()=>balance),10000);
        });
        await scenario('cancelling signing or leaving the meeting transfers neither money nor vehicle',async page=>{
            await draft(page,'sell',100000);await ready(page);page.once('dialog',d=>d.accept());await page.locator('#contractCancel').click();assert.deepEqual(await page.evaluate(()=>garage),[1]);assert.equal(await page.evaluate(()=>balance),100000);assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.ok(await page.evaluate(()=>listings[1]));
            await page.evaluate(()=>{closeChat();garage=[];delete listings[1];save();});await draft(page);await ready(page);await page.locator('#win-meeting [data-close]').click();assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.equal(await page.evaluate(()=>pending.some(p=>p.type==='meet')),false);assert.deepEqual(await page.evaluate(()=>garage),[]);
        });
        await scenario('bank payments are checked again on signing and a funded draft can be signed later',async page=>{
            await page.evaluate(()=>{Math.random=()=>0;takeMicro(10000);Math.random=()=>.9;});await draft(page,'buy',100000);await ready(page);
            await page.evaluate(()=>gameMs=bankActive('micro').nextDueAt);await page.locator('#contractSign').click();assert.equal(await page.evaluate(()=>bankActive('micro')),null);assert.equal(await page.evaluate(()=>balance),90000);assert.deepEqual(await page.evaluate(()=>garage),[]);assert.match(await page.locator('#contractErrors').textContent(),/Не хватает денег/);assert.equal(await page.evaluate(()=>contractBook.records.length),0);
            await page.evaluate(()=>changeBalance(20000,'Доход','income'));await page.locator('#contractSign').click();assert.deepEqual(await page.evaluate(()=>garage),[1]);assert.equal(await page.evaluate(()=>balance),10000);assert.equal(await page.evaluate(()=>contractBook.records.length),1);
        });
        await scenario('reset clears the archive, player profile and unfinished documents',async page=>{
            await draft(page);await signContract(page);page.once('dialog',d=>d.accept());await page.evaluate(()=>admReset());assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.equal(await page.evaluate(()=>contractBook.sequence),0);assert.equal(await page.evaluate(()=>balance),100000);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.equal(await page.evaluate(()=>pending.length),0);
        });
        await scenario('a damaged draft returns to confirmation without completing a deal',async page=>{
            await draft(page);await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('pending'));delete p[0].contract.fields;localStorage.setItem('pending',JSON.stringify(p));});
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>chat.stage),'event');assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.deepEqual(await page.evaluate(()=>garage),[]);
            await page.locator('#evYes').click();await signContract(page);assert.deepEqual(await page.evaluate(()=>garage),[1]);
        });
        await scenario('contract fields, help, signatures and archive are usable on a narrow phone',async page=>{
            await draft(page);await ready(page);const form=page.locator('#meetingContract');assert.ok(await form.evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.locator('#contract-vin').scrollIntoViewIfNeeded();await page.evaluate(()=>$('toasts').innerHTML='');await page.screenshot({path:'/workspace/scratch/3151c7eebd10/contract-mobile.png'});
            await page.locator('#contractSign').click();await page.locator('#meetingContractView').click();assert.ok(await page.locator('#documentsBody').evaluate(el=>el.scrollWidth<=el.clientWidth));
            const positions=await page.locator('.desk-icon').evaluateAll(els=>els.map(el=>el.style.left+':'+el.style.top));assert.equal(new Set(positions).size,positions.length);
            const boxes=await page.locator('.desk-icon').evaluateAll(els=>els.map(el=>({x:el.offsetLeft,y:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight})));
            for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y,'desktop icons must not overlap');}
        },{width:320,height:640});
        console.log(passed+' contract scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
