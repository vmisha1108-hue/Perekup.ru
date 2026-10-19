const {completeIdentity}=require('./helpers/entry.cjs');
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
    async function scenario(name,run,options={}){
        const context=await browser.newContext({viewport:options.viewport||{width:1280,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(firstVisit=>{if(!firstVisit)localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;},!!options.firstVisit);
        if(!options.noPrompt)await page.route('**/entry-reset.js*',async route=>{const response=await route.fetch();const body=(await response.text()).replace('var ENTRY_RESET_PROMPT_ENABLED=false;','var ENTRY_RESET_PROMPT_ENABLED=true;');await route.fulfill({response,body});});
        try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});assert.equal(await page.locator('#entryResetOverlay').isVisible(),!options.noPrompt);if(options.noPrompt)await completeIdentity(page);await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function collectorFixture(page){
        await page.evaluate(()=>{Math.random=()=>0;takeMicro(10000);spend(balance,'Расход');gameMs=bankActive('micro').nextDueAt+90*BANK_DAY;tickPending();bank.collectors.nextEventAt=gameMs;tickPending();save();});
    }
    try{
        await scenario('default entry loads saved progress directly without prompting or resetting it',async page=>{
            assert.equal(await page.evaluate(()=>startupResetPending),false);
            await page.evaluate(()=>{garage=[1];purchasePrices[1]=95000;changeBalance(650000,'Доход','income');save();});
            await page.reload({waitUntil:'networkidle'});
            await page.locator('#entryResetOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>startupResetPending),false);
            assert.equal(await page.evaluate(()=>balance),750000);assert.deepEqual(await page.evaluate(()=>garage),[1]);assert.equal(await page.evaluate(()=>purchasePrices[1]),95000);
            await page.evaluate(()=>{testNow+=1000;tickGame();});assert.equal(await page.evaluate(()=>gameMs),await page.evaluate(()=>Number(localStorage.getItem('gameMs'))+60000));
        },{noPrompt:true});
        await scenario('every entry and reload offers an optional reset; continuing preserves cash and cars',async page=>{
            assert.equal(await page.evaluate(()=>document.activeElement.id),'entryContinue');await page.locator('#entryContinue').click();await completeIdentity(page);
            await page.evaluate(()=>{garage=[1];changeBalance(650000,'Доход','income');purchasePrices[1]=95000;save();});
            for(let i=0;i<2;i++){
                await page.reload({waitUntil:'networkidle'});assert.ok(await page.locator('#entryResetOverlay').isVisible());assert.equal(await page.evaluate(()=>balance),750000);assert.deepEqual(await page.evaluate(()=>garage),[1]);
                await page.locator('#entryContinue').click();await completeIdentity(page);assert.equal(await page.evaluate(()=>balance),750000);assert.equal(await page.evaluate(()=>purchasePrices[1]),95000);
            }
        });
        await scenario('the startup decision pauses the game clock and prevents loan debits while waiting',async page=>{
            await page.locator('#entryContinue').click();await completeIdentity(page);const before=await page.evaluate(()=>{Math.random=()=>0;takeMicro(10000);gameMs=bankActive('micro').nextDueAt-60000;save();return gameMs;});
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>{testNow+=300000;tickGame();tickPending();});
            assert.equal(await page.evaluate(()=>gameMs),before);assert.equal(await page.evaluate(()=>balance),110000);assert.equal(await page.evaluate(()=>bankActive('micro').paid),0);
            await page.locator('#entryContinue').click();await completeIdentity(page);assert.equal(await page.evaluate(()=>gameMs),before);await page.evaluate(()=>{testNow+=1000;tickGame();});
            assert.equal(await page.evaluate(()=>balance),90000);assert.equal(await page.evaluate(()=>bankActive('micro')),null);
        });
        await scenario('returning to a page restored from browser history offers the reset again',async page=>{
            await page.locator('#entryContinue').click();await completeIdentity(page);await page.evaluate(()=>{changeBalance(25000,'Доход','income');window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
            assert.ok(await page.locator('#entryResetOverlay').isVisible());await page.locator('#entryContinue').click();await completeIdentity(page);assert.equal(await page.evaluate(()=>balance),125000);
        });
        await scenario('explicit reset clears cars, debts, contracts, notes, collectors and the advanced game date',async page=>{
            await page.locator('#entryContinue').click();await completeIdentity(page);await page.evaluate(()=>{openBuyChat(1);agreePrice(90000);renderChat();scheduleMeeting();gameMs=Math.max(gameMs,chat.meet.whenMs);lastRealMs=Date.now();goToMeeting();gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();agreeEvent();});await signContract(page);
            assert.equal(await page.evaluate(()=>contractBook.records.length),1);await page.evaluate(()=>{closeChat();notes={'2030-01-16':'Заметка'};save();});await collectorFixture(page);
            await page.reload({waitUntil:'networkidle'});assert.ok(await page.locator('#collectorOverlay').isVisible());await page.locator('#entryReset').click();await completeIdentity(page);
            const data=await page.evaluate(()=>({balance,garage,deals,garageLvl,notes,pending,loans:bank.loans,docs:contractBook.records,retired:retiredMarketCars,city:transport.cityId,moscow:moscowCity.id,gameMs,now:Date.now(),collector:bank.collectors.active}));
            assert.equal(data.balance,100000);assert.deepEqual(data.garage,[]);assert.equal(data.deals,0);assert.equal(data.garageLvl,0);assert.deepEqual(data.notes,{});assert.deepEqual(data.pending,[]);assert.deepEqual(data.loans,[]);assert.deepEqual(data.docs,[]);assert.deepEqual(data.retired,[]);assert.equal(data.city,data.moscow);assert.equal(data.gameMs,data.now);assert.equal(data.collector,false);
            await page.locator('#collectorOverlay').waitFor({state:'hidden'});await page.locator('#entryResetOverlay').waitFor({state:'hidden'});
            await page.reload({waitUntil:'networkidle'});assert.ok(await page.locator('#entryResetOverlay').isVisible());assert.equal(await page.evaluate(()=>balance),100000);
        });
        await scenario('Escape continues safely and never hangs up a saved collector call underneath the entry dialog',async page=>{
            await page.locator('#entryContinue').click();await completeIdentity(page);await collectorFixture(page);const before=await page.evaluate(()=>({gameMs,call:bank.collectors.call}));
            await page.reload({waitUntil:'networkidle'});await page.keyboard.press('Escape');await page.locator('#entryResetOverlay').waitFor({state:'hidden'});assert.ok(await page.locator('#collectorOverlay').isVisible());
            assert.equal(await page.evaluate(()=>gameMs),before.gameMs);assert.deepEqual(await page.evaluate(()=>bank.collectors.call),before.call);assert.equal(await page.evaluate(()=>document.activeElement.id),'collectorHangup');
            await page.keyboard.press('Escape');await page.locator('#collectorOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>gameMs),before.gameMs+before.call.minutes*60000);
        });
        await scenario('the new-player help appears after the reset offer and is not repeated on later entries',async page=>{
            await page.locator('#welcomeOverlay').waitFor({state:'hidden'});await page.locator('#entryContinue').click();await completeIdentity(page);assert.ok(await page.locator('#welcomeOverlay').isVisible());await page.locator('#welcomeLater').click();
            await page.reload({waitUntil:'networkidle'});assert.ok(await page.locator('#entryResetOverlay').isVisible());await page.locator('#entryContinue').click();await completeIdentity(page);await page.locator('#welcomeOverlay').waitFor({state:'hidden'});
        },{firstVisit:true});
        await scenario('the entry dialog fits a phone, traps focus and defaults to keeping the save',async page=>{
            const box=await page.locator('.entry-reset-card').boundingBox();assert.ok(box.x>=0 && box.x+box.width<=321 && box.y>=0 && box.y+box.height<=641);
            assert.ok(await page.locator('.entry-reset-card').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'entryReset');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'entryContinue');
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/entry-reset-mobile.png'});await page.keyboard.press('Enter');await page.locator('#entryResetOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>balance),100000);
        },{viewport:{width:320,height:640}});
        console.log(passed+' entry reset scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
