const {signContract}=require('./helpers/contracts.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch(e){res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
    let passed=0,failed=0;
    async function scenario(name,run){
        const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;});
        try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}
        catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}
        finally{await context.close();}
    }
    async function buyMeeting(page,price=90000){
        await page.evaluate(price=>{openBuyChat(1);agreePrice(price);renderChat();scheduleMeeting();goToMeeting();gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();},price);
    }
    async function buyerChat(page){
        return page.evaluate(()=>{garage=[1];vehicleState(1);postAd(1,100000);const ad=makeBuyerOffer(listings[1]);pending.push(ad);openAdChat(ad.id);return ad.id;});
    }
    try{
        await scenario('purchase retires the exact listing immediately, on reload and after resale; reset restores the catalogue',async page=>{
            await buyMeeting(page);await page.locator('#evYes').click();await signContract(page);
            assert.equal(await page.locator('[data-info="1"]').count(),0);
            await page.evaluate(()=>{closeChat();openWin('market');marketLimit=CARS.length;showMarket();});
            assert.equal(await page.locator('[data-info="1"]').count(),0);
            assert.deepEqual(await page.evaluate(()=>garage),[1]);const cash=await page.evaluate(()=>balance);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.locator('[data-info="1"]').count(),0);assert.equal(await page.evaluate(()=>balance),cash);
            await page.evaluate(()=>{
                postAd(1,100000);const ad=makeBuyerOffer(listings[1]);pending.push(ad);openAdChat(ad.id);agreePrice(100000);renderChat();scheduleMeeting();goToMeeting();
                gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();agreeEvent();
            });
            await signContract(page);await page.evaluate(()=>{closeChat();showMarket();});
            assert.deepEqual(await page.evaluate(()=>garage),[]);assert.equal(await page.locator('[data-info="1"]').count(),0);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-info="1"]').count(),0);
            await page.evaluate(()=>{openBuyChat(1);});assert.equal(await page.evaluate(()=>chat),null);
            page.once('dialog',d=>d.accept());await page.evaluate(()=>admReset());assert.equal(await page.locator('[data-info="1"]').count(),1);
        });
        await scenario('old owned cars are removed from the market and a refused purchase stays available',async page=>{
            await buyMeeting(page);await page.locator('#evNo').click();await signContract(page);await page.evaluate(()=>{closeChat();showMarket();});
            assert.equal(await page.locator('[data-info="1"]').count(),1);
            await page.evaluate(()=>{garage=[1];save();localStorage.removeItem('retiredMarketCars');});
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-info="1"]').count(),0);assert.deepEqual(await page.evaluate(()=>garage),[1]);
        });
        await scenario('late arrival cannot bypass the four-hour meeting deadline between timer ticks',async page=>{
            await page.evaluate(()=>{openBuyChat(1);agreePrice(90000);renderChat();scheduleMeeting();gameMs=chat.meet.whenMs+MEET_GRACE-60000;testNow+=2000;goToMeeting();});
            assert.equal(await page.evaluate(()=>pending.some(p=>p.type==='meet')),false);
            assert.ok(await page.evaluate(()=>chat.done && !chat.met));assert.deepEqual(await page.evaluate(()=>garage),[]);assert.equal(await page.evaluate(()=>balance),100000);
        });
        await scenario('cancelled offers cannot schedule a new meeting through their old open conversation',async page=>{
            const id=await buyerChat(page);await page.evaluate(id=>{cancelAd(id);handleMessage('Согласен');scheduleMeeting();},id);
            assert.ok(await page.evaluate(()=>chat.done));assert.equal(await page.evaluate(()=>pending.some(p=>p.type==='meet')),false);
            assert.ok(await page.evaluate(()=>listings[1]));assert.deepEqual(await page.evaluate(()=>garage),[1]);
        });
        await scenario('a player already at a meeting can restore it after the arrival deadline',async page=>{
            await buyMeeting(page);
            const before=await page.evaluate(()=>{gameMs+=5*3600000;tickPending();save();return{pid:chat.pid,price:chat.price,stage:chat.stage,balance};});
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>chat.pid),before.pid);assert.equal(await page.evaluate(()=>chat.stage),before.stage);
            assert.equal(await page.evaluate(()=>chat.price),before.price);assert.equal(await page.evaluate(()=>balance),before.balance);
            assert.ok(await page.locator('#win-meeting').isVisible());assert.deepEqual(await page.evaluate(()=>garage),[]);
        });
        await scenario('editing or cancelling a listing invalidates an already open buyer quote',async page=>{
            await buyerChat(page);await page.evaluate(()=>{postAd(1,200000);handleMessage('Согласен');scheduleMeeting();});
            assert.ok(await page.evaluate(()=>chat.done));assert.equal(await page.evaluate(()=>pending.some(p=>p.type==='meet')),false);assert.equal(await page.evaluate(()=>listings[1].price),200000);
            await page.evaluate(()=>{closeChat();const ad=makeBuyerOffer(listings[1]);pending.push(ad);openAdChat(ad.id);});
            page.once('dialog',d=>d.accept());await page.evaluate(()=>{cancelListing(1);handleMessage('Согласен');scheduleMeeting();});
            assert.equal(await page.evaluate(()=>pending.some(p=>p.type==='meet')),false);assert.ok(await page.evaluate(()=>chat.done));assert.ok(!await page.evaluate(()=>listings[1]));
        });
        await scenario('a loan deadline is processed before confirming a purchase',async page=>{
            await page.evaluate(()=>{Math.random=()=>0;takeMicro(10000);Math.random=()=>.9;});await buyMeeting(page,100000);
            await page.evaluate(()=>{gameMs=bankActive('micro').nextDueAt;agreeEvent();});
            assert.equal(await page.evaluate(()=>bankActive('micro')),null);assert.deepEqual(await page.evaluate(()=>garage),[]);assert.equal(await page.evaluate(()=>balance),90000);
        });
        await scenario('saved deadlines and the saved game clock represent the same action',async page=>{
            const before=await page.evaluate(()=>{gameMs+=1234567;garage=[1];parkVehicle(1,cityNamed('Нижний Новгород').id);save();return{gameMs,savedAt:Number(localStorage.getItem('gameMs')),charge:vehicleState(1).nextChargeAt};});
            assert.equal(before.savedAt,before.gameMs);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>gameMs),before.gameMs);assert.equal(await page.evaluate(()=>vehicleState(1).nextChargeAt),before.charge);
        });
        await scenario('malformed optional saves and invalid records do not stop the game or discard valid cash and ownership',async page=>{
            await page.evaluate(()=>{
                localStorage.setItem('balance','654321');localStorage.setItem('garage','[1,1,999999999]');localStorage.setItem('garageLvl','99');localStorage.setItem('deals','-10');
                for(const key of ['notes','purchasePrices','iconPos','chats','sellerSessionMoods'])localStorage.setItem(key,'null');
                localStorage.setItem('pending','{}');localStorage.setItem('listings','{"1":null}');localStorage.setItem('transport','{"version":1,"cityId":"bad","shipments":{},"vehicles":null,"odometers":null}');
            });
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>balance),654321);assert.deepEqual(await page.evaluate(()=>garage),[1]);
            assert.equal(await page.evaluate(()=>garageLvl),0);assert.equal(await page.evaluate(()=>deals),0);await page.evaluate(()=>{openWin('bank');openWin('travel');openWin('garage');showDeals();});
            await page.evaluate(()=>{localStorage.setItem('garage','{broken');localStorage.setItem('notes','{broken');});
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>balance),654321);assert.deepEqual(await page.evaluate(()=>garage),[]);
        });
        await scenario('partial bank and collector records are repaired without resetting a valid debt',async page=>{
            await page.evaluate(()=>{takeMicro(10000);const b=JSON.parse(localStorage.getItem('bank'));b.entries.push(null);b.collectors={version:1};delete b.selection;localStorage.setItem('bank',JSON.stringify(b));});
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>bankActive('micro').amount),10000);await page.evaluate(()=>{openWin('bank');tickPending();});
        });
        await scenario('calculator handles zero division and only receives keys when it has focus',async page=>{
            await page.evaluate(()=>{openWin('calc');calcExpr='1/0';calcEval();});assert.equal(await page.locator('#calcVal').textContent(),'Ошибка');
            await page.evaluate(()=>{calcExpr='12';renderCalc();openWin('market');});await page.keyboard.press('3');assert.equal(await page.evaluate(()=>calcExpr),'12');
            await page.evaluate(()=>focusWin('calc'));await page.keyboard.press('3');assert.equal(await page.evaluate(()=>calcExpr),'123');
        });
        await scenario('money-free mode also permits exchange top-ups without making the balance negative',async page=>{
            await page.evaluate(()=>{garage=[1];vehicleState(1);balance=0;ADM.infMoney=true;const incoming=TRADE_CARS[0];openSellChat(1,{id:'free-exchange',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:100000,maxBid:100000,listingPrice:100000,trade:{carId:incoming.id,value:250000}});chat.price=100000;finishTrade(chat.price);});
            assert.equal(await page.evaluate(()=>garage[0]),await page.evaluate(()=>TRADE_CARS[0].id));assert.equal(await page.evaluate(()=>balance),0);
        });
        await scenario('large saved windows fit a narrow phone and purchased cards stay absent from the mobile market',async page=>{
            await page.evaluate(()=>{openWin('market');$('win-market').style.width='940px';$('win-market').style.height='660px';saveWindowState('market',$('win-market'));garage=[1];retireMarketCar(1);save();});
            await page.setViewportSize({width:320,height:640});await page.reload({waitUntil:'networkidle'});
            for(const id of ['market','bank','travel','garage','shop','help','calc','calendar','clock']){
                await page.evaluate(id=>openWin(id),id);
                const box=await page.locator('#win-'+id).boundingBox();assert.ok(box.x>=0 && box.x+box.width<=321,id+' fits the phone');
                assert.ok(box.y>=0 && box.y+box.height<=641,id+' fits the phone height');
            }
            await page.evaluate(()=>{openWin('market');showMarket();});assert.equal(await page.locator('[data-info="1"]').count(),0);
            assert.ok(await page.locator('#win-market .win-body').evaluate(el=>el.scrollWidth<=el.clientWidth),'market content fits the phone');
            assert.ok(await page.locator('.hero').evaluate(el=>el.scrollWidth<=el.clientWidth),'statistics fit the phone');
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/review-mobile.png'});
        });
        console.log(passed+' regression scenarios passed; '+failed+' failed');if(failed)process.exitCode=1;
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
