const {installEntryContinue}=require('./helpers/entry.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const fsSync=require('node:fs');
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
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fsSync.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
    let passed=0;
    async function scenario(name,run,viewport={width:1280,height:900}){
        const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        installEntryContinue(page);await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;});
        try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function delinquent(page,kind='micro',days=30){
        return page.evaluate(({kind,days})=>{
            Math.random=()=>0;
            if(kind==='credit'){requestCredit(50000,12);waitForBank();acceptCredit();}
            else takeMicro(10000);
            const loan=bankActive(kind);spend(balance,'Деньги потрачены');
            gameMs=loan.nextDueAt;tickPending();
            gameMs=loan.overdueAt+days*BANK_DAY;tickPending();
            Math.random=()=>.9;return loan.id;
        },{kind,days});
    }
    try{
        await scenario('30-day threshold is measured from unpaid deadline for both loan kinds',async page=>{
            const micro=await delinquent(page,'micro',29);
            assert.equal(await page.evaluate(()=>collectorPressureLevel()),0);
            await page.evaluate(id=>{gameMs=bank.loans.find(l=>l.id===id).overdueAt+30*BANK_DAY-1;tickPending();},micro);
            assert.equal(await page.evaluate(()=>collectorPressureLevel()),0);
            await page.evaluate(()=>{gameMs++;tickPending();});
            assert.equal(await page.evaluate(()=>collectorPressureLevel()),1);assert.ok(await page.evaluate(()=>bank.collectors.active));
            await page.evaluate(()=>{balance=100000;bank=freshBank();syncCollectors();});
            await delinquent(page,'credit',29);assert.equal(await page.evaluate(()=>collectorPressureLevel()),0);
            await page.evaluate(()=>{gameMs=bankActive('credit').overdueAt+30*BANK_DAY;tickPending();});
            assert.equal(await page.evaluate(()=>collectorPressureLevel()),1);
        });
        await scenario('performing long-term credit never triggers collectors merely because it is old',async page=>{
            await page.evaluate(()=>{Math.random=()=>0;requestCredit(50000,24);waitForBank();acceptCredit();gameMs+=200*BANK_DAY;tickPending();});
            assert.ok(await page.evaluate(()=>bankActive('credit')));assert.equal(await page.evaluate(()=>bankOverdue()),0);
            assert.equal(await page.evaluate(()=>collectorPressureLevel()),0);assert.ok(!await page.evaluate(()=>bank.collectors.active));
        });
        await scenario('incoming call is persistent, singular, and consumes its displayed time exactly once',async page=>{
            await delinquent(page);
            await page.evaluate(()=>{Math.random=()=>0;bank.collectors.nextEventAt=gameMs;tickPending();tickPending();});
            const before=await page.evaluate(()=>({gameMs,call:bank.collectors.call,next:bank.collectors.nextEventAt,calls:bank.collectors.log.filter(e=>e.kind==='call').length,balance,garage}));
            assert.equal(before.calls,1);assert.ok(await page.locator('#collectorOverlay').isVisible());
            await page.reload({waitUntil:'networkidle'});
            assert.deepEqual(await page.evaluate(()=>bank.collectors.call),before.call);
            assert.equal(await page.evaluate(()=>gameMs),before.gameMs);assert.equal(await page.evaluate(()=>bank.collectors.nextEventAt),before.next);
            await page.locator('#collectorHangup').click();
            assert.equal(await page.evaluate(()=>gameMs),before.gameMs+before.call.minutes*60000);
            assert.equal(await page.evaluate(()=>bank.collectors.call),null);assert.equal(await page.evaluate(()=>balance),before.balance);
            assert.deepEqual(await page.evaluate(()=>garage),before.garage);
            assert.equal(await page.evaluate(()=>dismissCollectorCall(false)),false);
        });
        await scenario('partial payment preserves age while clearing arrears ends pressure on an otherwise active credit',async page=>{
            await delinquent(page,'credit');
            const since=await page.evaluate(()=>bankActive('credit').overdueAt);
            await page.evaluate(()=>{changeBalance(100,'Доход','income');tickPending();});
            assert.equal(await page.evaluate(()=>bankActive('credit').overdueAt),since);assert.equal(await page.evaluate(()=>collectorPressureLevel()),1);
            await page.evaluate(()=>{const l=bankActive('credit');changeBalance(Math.ceil(overdueCents(l)/100),'Доход','income');tickPending();});
            assert.ok(await page.evaluate(()=>bankActive('credit')));assert.equal(await page.evaluate(()=>bankOverdue()),0);
            assert.equal(await page.evaluate(()=>collectorPressureLevel()),0);assert.ok(!await page.evaluate(()=>bank.collectors.active));
        });
        await scenario('repayment of microloan closes a pending call without collector money charges',async page=>{
            await delinquent(page);
            await page.evaluate(()=>{Math.random=()=>0;bank.collectors.nextEventAt=gameMs;tickPending();});
            assert.ok(await page.locator('#collectorOverlay').isVisible());
            await page.evaluate(()=>{changeBalance(loanDebt(bankActive('micro'))+1,'Продажа машины','sale');tickPending();});
            assert.equal(await page.evaluate(()=>bankActive('micro')),null);assert.ok(!await page.locator('#collectorOverlay').isVisible());
            assert.equal(await page.evaluate(()=>balance),1);assert.equal(await page.evaluate(()=>collectorBuyerMultiplier()),1);
            assert.equal(await page.evaluate(()=>bank.entries.filter(e=>e.kind==='repayment').length),1);
        });
        await scenario('pressure grows at 120 and 180 days and slows new buyer responses',async page=>{
            const base=await page.evaluate(()=>{Math.random=()=>.5;return nextBuyerDelay({price:100000,purchasePrice:100000});});
            await delinquent(page);
            for(const [days,level,factor] of [[30,1,1.5],[120,2,2],[180,3,3]]){
                const current=await page.evaluate(days=>{gameMs=bankActive('micro').overdueAt+days*BANK_DAY;tickBank();Math.random=()=>.5;return {level:collectorPressureLevel(),delay:nextBuyerDelay({price:100000,purchasePrice:100000})};},days);
                assert.equal(current.level,level);assert.ok(Math.abs(current.delay-base*factor)<2);
            }
        });
        await scenario('collector interference can remove a buyer conversation while preserving car, listing and money',async page=>{
            await delinquent(page);
            await page.evaluate(()=>{
                garage=[1];vehicleState(1);purchasePrices[1]=90000;postAd(1,100000);
                pending=pending.filter(p=>p.type!=='ad');const ad=makeBuyerOffer(listings[1]);pending.push(ad);openSellChat(1,ad);
                Math.random=()=>.8;bank.collectors.nextEventAt=gameMs;tickCollectors();
            });
            assert.equal(await page.evaluate(()=>pending.filter(p=>p.type==='ad').length),0);
            assert.ok(await page.evaluate(()=>chat.done));assert.deepEqual(await page.evaluate(()=>garage),[1]);
            assert.ok(await page.evaluate(()=>listings[1]));assert.equal(await page.evaluate(()=>balance),0);
            assert.ok(await page.evaluate(()=>bank.collectors.log.some(e=>e.kind==='buyer')));
        });
        await scenario('waiting for the other party is delayed only once and the delay survives reload',async page=>{
            await delinquent(page);
            const before=await page.evaluate(()=>{
                garage=[1];vehicleState(1);const ad={id:'collector-meet',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:100000,maxBid:100000,listingPrice:100000};
                openSellChat(1,ad);chat.price=100000;chat.stage='go';chat.meet={whenMs:gameMs,when:new Date(gameMs),label:fmtMeet(new Date(gameMs))};
                pending=[{id:ad.id,type:'meet',mode:'sell',carId:1,when:gameMs,npc:ad.npc,price:100000,noShow:false}];
                Math.random=()=>0;goToMeeting();const meeting=findPending(ad.id);
                const snapshot=JSON.parse(JSON.stringify(meeting.flow));collectorDelayMeeting(meeting,true);
                return {flow:meeting.flow,first:snapshot};
            });
            assert.ok(before.flow.collectorDelayed);assert.equal(before.flow.collectorDelayMinutes,15);assert.deepEqual(before.flow,before.first);
            await page.reload({waitUntil:'networkidle'});
            assert.deepEqual(await page.evaluate(()=>findPending('collector-meet').flow),before.flow);
            assert.equal(await page.evaluate(()=>chat.price),100000);assert.equal(await page.evaluate(()=>balance),0);
        });
        await scenario('large time jump produces a bounded event stream and a bank journal; reset clears collectors',async page=>{
            await delinquent(page);
            await page.evaluate(()=>{Math.random=()=>0;gameMs+=400*BANK_DAY;tickPending();});
            assert.ok(await page.evaluate(()=>bank.collectors.log.length<=3));
            assert.equal(await page.evaluate(()=>bank.collectors.log.filter(e=>e.kind==='call').length),1);
            await page.locator('#collectorOpenBank').click();assert.ok(await page.locator('#win-bank').isVisible());
            assert.match(await page.locator('.collector-panel').textContent(),/Постоянное давление/);
            page.once('dialog',d=>d.accept());await page.evaluate(()=>admReset());
            assert.ok(!await page.evaluate(()=>bank.collectors.active));assert.equal(await page.evaluate(()=>bank.collectors.log.length),0);
            assert.ok(!await page.locator('#collectorOverlay').isVisible());
        });
        await scenario('both overdue loan kinds keep pressure until all aged arrears are cleared',async page=>{
            await page.evaluate(()=>{
                Math.random=()=>0;requestCredit(50000,12);waitForBank();acceptCredit();takeMicro(10000);spend(balance,'Расход');
                gameMs=bankActive('credit').nextDueAt+30*BANK_DAY;tickPending();
            });
            assert.equal(await page.evaluate(()=>bank.collectors.loanIds.length),2);
            await page.evaluate(()=>{changeBalance(loanDebt(bankActive('micro')),'Доход','income');tickPending();});
            assert.equal(await page.evaluate(()=>bankActive('micro')),null);assert.ok(await page.evaluate(()=>bank.collectors.active));
            await page.evaluate(()=>{changeBalance(Math.ceil(overdueCents(bankActive('credit'))/100),'Доход','income');tickPending();});
            assert.ok(!await page.evaluate(()=>bank.collectors.active));
        });
        await scenario('collector call fits phone screen and Escape ends the call instead of abandoning a meeting',async page=>{
            await delinquent(page);
            await page.evaluate(()=>{
                garage=[1];vehicleState(1);const ad={id:'mobile-meet',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:100000,maxBid:100000,listingPrice:100000};
                openSellChat(1,ad);chat.price=100000;chat.stage='go';chat.meet={whenMs:gameMs,when:new Date(gameMs),label:fmtMeet(new Date(gameMs))};
                pending=[{id:ad.id,type:'meet',mode:'sell',carId:1,when:gameMs,npc:ad.npc,price:100000,noShow:false}];
                Math.random=()=>0;goToMeeting();bank.collectors.nextEventAt=gameMs;tickPending();
            });
            const box=await page.locator('.collector-call').boundingBox();assert.ok(box.x>=0 && box.x+box.width<=391 && box.y>=0 && box.y+box.height<=845);
            assert.ok(await page.locator('.collector-call').evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'collectorOpenBank');
            await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'collectorHangup');
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/collector-mobile.png'});
            await page.keyboard.press('Escape');assert.ok(!await page.locator('#collectorOverlay').isVisible());
            assert.ok(await page.evaluate(()=>findPending('mobile-meet')));assert.ok(await page.evaluate(()=>chat.met && !chat.done));
        },{width:390,height:844});
        console.log(passed+' collector scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
