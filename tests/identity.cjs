const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {completeIdentity}=require('./helpers/entry.cjs');
const {signContract}=require('./helpers/contracts.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch(e){res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let passed=0;
    async function scenario(name,run,viewport={width:1280,height:900},seed,options={}){
        const context=await browser.newContext({viewport,...options}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;});if(seed)await page.addInitScript(seed);
        try{await page.goto(url,{waitUntil:'networkidle'});assert.ok(await page.locator('#identityOverlay').isVisible());await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function draft(page,mode='buy'){
        await page.evaluate(mode=>{if(mode==='buy')openBuyChat(1);else{const ad={id:'identity-buyer',type:'ad',mode:'sell',carId:1,ready:true,npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:100000,maxBid:100000,listingPrice:100000};postAd(1,100000);pending.push(ad);openAdChat(ad.id);}agreePrice(mode==='buy'?90000:100000);renderChat();scheduleMeeting();gameMs=Math.max(gameMs,chat.meet.whenMs);lastRealMs=Date.now();goToMeeting();gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();agreeEvent();},mode);
    }
    try{
        await scenario('the first entry requires a nickname and an actual drawing, pauses time and cannot be skipped',async page=>{
            const before=await page.evaluate(()=>gameMs);await page.evaluate(()=>{testNow+=60000;tickGame();tickPending();});assert.equal(await page.evaluate(()=>gameMs),before);
            await page.locator('#identitySave').click();assert.match(await page.locator('#identityError').textContent(),/ник/);await page.locator('#identityNickname').fill('Перекуп_77');await page.locator('#identitySave').click();assert.match(await page.locator('#identityError').textContent(),/Нарисуйте/);
            await page.keyboard.press('Escape');assert.ok(await page.locator('#identityOverlay').isVisible());assert.equal(await page.evaluate(()=>playerIdentity),null);
            await completeIdentity(page,'Перекуп_77');await page.locator('#identityOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>playerIdentity.nickname),'Перекуп_77');assert.ok(await page.evaluate(()=>validSignature(playerIdentity.signature)));
            await page.reload({waitUntil:'networkidle'});await page.locator('#identityOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>startupResetPending),false);
        });
        await scenario('nickname and signature are used for both buying and selling and retained in signed documents',async page=>{
            await completeIdentity(page,'Перекуп_77');const identity=await page.evaluate(()=>playerIdentity);
            await draft(page);assert.equal(await page.locator('#contract-fullName').inputValue(),'Перекуп_77');assert.ok(await page.locator('#contract-fullName').evaluate(el=>el.readOnly));assert.equal(await page.locator('#meetingContract .player-signature').count(),1);await signContract(page);
            assert.equal(await page.evaluate(()=>contractBook.records[0].buyer.fullName),'Перекуп_77');assert.deepEqual(await page.evaluate(()=>contractBook.records[0].buyer.signature),identity.signature);
            await page.evaluate(()=>closeChat());await draft(page,'sell');await signContract(page);assert.equal(await page.evaluate(()=>contractBook.records[0].seller.fullName),'Перекуп_77');assert.deepEqual(await page.evaluate(()=>contractBook.records[0].seller.signature),identity.signature);
            await page.locator('#meetingContractView').click();assert.equal(await page.locator('#documentsBody .player-signature').count(),1);await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>playerIdentity),identity);assert.equal(await page.evaluate(()=>contractBook.records.length),2);
        });
        await scenario('resetting game progress never erases or reopens the saved player identity',async page=>{
            await completeIdentity(page,'Водитель_9');const identity=await page.evaluate(()=>playerIdentity);page.once('dialog',d=>d.accept());await page.evaluate(()=>admReset());assert.deepEqual(await page.evaluate(()=>playerIdentity),identity);assert.equal(await page.evaluate(()=>contractBook.profile.fullName),'Водитель_9');
            await page.reload({waitUntil:'networkidle'});await page.locator('#identityOverlay').waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>playerIdentity),identity);
            await page.evaluate(()=>{document.getElementById('identityNickname').value='Другой';savePlayerIdentity();});assert.deepEqual(await page.evaluate(()=>playerIdentity),identity);
        });
        await scenario('returning players choose their identity without losing existing cash and ownership',async page=>{
            assert.equal(await page.evaluate(()=>balance),750000);assert.deepEqual(await page.evaluate(()=>garage),[1]);await completeIdentity(page,'СтарыйИгрок');assert.equal(await page.evaluate(()=>balance),750000);assert.deepEqual(await page.evaluate(()=>garage),[1]);
        },undefined,()=>{if(!localStorage.getItem('balance')){localStorage.setItem('balance','750000');localStorage.setItem('garage','[1]');}});
        await scenario('drawing can be cleared before saving and mouse strokes keep their shape on a narrow phone',async page=>{
            await page.locator('#identityNickname').fill('Мобила_77');const box=await page.locator('#identityCanvas').boundingBox();
            await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:10});await page.mouse.up();assert.ok(await page.evaluate(()=>identityStrokes.length>0));await page.locator('#identityClear').click();assert.deepEqual(await page.evaluate(()=>identityStrokes),[]);
            assert.match(await page.locator('.identity-note').textContent(),/Подпись не делайте сложной/);assert.ok(await page.locator('.identity-card').evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/identity-mobile.png'});await completeIdentity(page,'Мобила_77');await draft(page);const points=await page.locator('#meetingContract .player-signature polyline').getAttribute('points');await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#meetingContract .player-signature polyline').getAttribute('points'),points);
        },{width:320,height:640});
        await scenario('a touch pointer can draw and save the signature without scrolling the canvas',async page=>{
            await page.locator('#identityNickname').fill('Палец_77');await page.locator('#identityCanvas').evaluate(canvas=>{const r=canvas.getBoundingClientRect();for(const [type,x,y] of [['pointerdown',.2,.5],['pointermove',.4,.2],['pointermove',.6,.7],['pointerup',.6,.7]])canvas.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',isPrimary:true,bubbles:true,clientX:r.x+r.width*x,clientY:r.y+r.height*y}));});
            await page.locator('#identitySave').click();assert.equal(await page.evaluate(()=>playerIdentity.nickname),'Палец_77');
        },{width:390,height:844});
        await scenario('Android first entry accepts a real touch signature and the six dock apps fit and open',async page=>{
            assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),true);
            assert.equal(await page.locator('#identityNickname').evaluate(el=>el===document.activeElement),false);
            const card=await page.locator('.identity-card').boundingBox();assert.ok(card.x>=0 && card.y>=0 && card.x+card.width<=320 && card.y+card.height<=640);
            await page.locator('#identityNickname').fill('Телефон_77');
            const box=await page.locator('#identityCanvas').boundingBox(),session=await page.context().newCDPSession(page);
            await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.15,y:box.y+box.height*.5}]});
            for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.15+.6*i/12),y:box.y+box.height*(.5+Math.sin(i)*.2)}]});
            await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
            assert.ok(await page.evaluate(()=>validSignature(identityStrokes)),JSON.stringify(await page.evaluate(()=>({strokes:identityStrokes,pointer:identityPointer}))));
            await page.locator('#identitySave').tap();await page.locator('#identityOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>playerIdentity.nickname),'Телефон_77');
            const apps=['market','help','calc','calendar','clock','settings'];
            assert.deepEqual(await page.locator('#taskList button').evaluateAll(buttons=>buttons.map(b=>b.dataset.app)),apps);
            assert.equal(await page.locator('#taskList').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
            for(const app of apps){const button=page.locator('#taskList [data-app="'+app+'"]');await button.tap();assert.ok(await page.locator('#win-'+app).isVisible());await page.locator('#win-'+app+' [data-min]').tap();await button.tap();assert.ok(await page.locator('#win-'+app).isVisible());await page.locator('#win-'+app+' [data-close]').tap();}
            await page.locator('.desk-icon[data-app="bank"]').tap();assert.ok(await page.locator('#win-bank').isVisible());assert.equal(await page.locator('#taskList button').count(),6);
            await page.reload({waitUntil:'networkidle'});await page.locator('#identityOverlay').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>playerIdentity.nickname),'Телефон_77');
        },{width:320,height:640},undefined,{isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36'});
        console.log(passed+' identity scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
