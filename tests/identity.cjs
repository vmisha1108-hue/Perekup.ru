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
        try{await page.goto(url,{waitUntil:'networkidle'});if(await page.locator('#welcomeOverlay.open').count()){await page.locator('#welcomeHelp').click();await page.locator('#identityOverlay.open').waitFor({state:'visible'});}assert.ok(await page.locator('#identityOverlay').isVisible());await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function draft(page,mode='buy'){
        await page.evaluate(mode=>{if(mode==='buy')openBuyChat(1);else{const ad={id:'identity-buyer',type:'ad',mode:'sell',carId:1,ready:true,npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:100000,maxBid:100000,listingPrice:100000};postAd(1,100000);pending.push(ad);openAdChat(ad.id);}agreePrice(mode==='buy'?90000:100000);renderChat();scheduleMeeting();gameMs=Math.max(gameMs,chat.meet.whenMs);lastRealMs=Date.now();goToMeeting();gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();agreeEvent();},mode);
    }
    try{
        await scenario('the first entry requires a nickname and four Latin letters, pauses time and cannot be skipped',async page=>{
            const before=await page.evaluate(()=>gameMs);await page.evaluate(()=>{testNow+=60000;tickGame();tickPending();});assert.equal(await page.evaluate(()=>gameMs),before);
            await page.locator('#identitySave').click();assert.match(await page.locator('#identityError').textContent(),/ник/);await page.locator('#identityNickname').fill('Перекуп_77');await page.locator('#identitySave').click();assert.match(await page.locator('#identityError').textContent(),/4 заглавные латинские/);
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
        await scenario('word signature fits a narrow Android phone, persists and appears in signed contracts',async page=>{
            assert.ok(await page.locator('.identity-card').evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.locator('#identityNickname').fill('Телефон_77');await page.locator('#identitySignature').fill('word');assert.equal(await page.locator('#identitySignature').inputValue(),'WORD');await page.locator('#identitySave').tap();
            assert.equal(await page.evaluate(()=>playerIdentity.signature),'WORD');await draft(page);assert.equal(await page.locator('#meetingContract .signature-word').textContent(),'WORD');await signContract(page);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>playerIdentity.signature),'WORD');assert.equal(await page.evaluate(()=>contractBook.records[0].buyer.signature),'WORD');
        },{width:320,height:640},undefined,{isMobile:true,hasTouch:true});
        await scenario('changing a legacy drawn signature keeps the signed purchase immutable',async page=>{
            await completeIdentity(page);await page.evaluate(()=>editPlayerIdentity(playerIdentity.nickname,[[[.1,.1],[.5,.6],[.8,.2]]]));
            await draft(page);await signContract(page);const signed=await page.evaluate(()=>JSON.stringify(contractBook.records[0]));assert.ok(await page.evaluate(()=>Array.isArray(contractBook.records[0].buyer.signature)));
            await page.evaluate(()=>editPlayerIdentity(playerIdentity.nickname,'NOVA'));assert.equal(await page.evaluate(()=>JSON.stringify(contractBook.records[0])),signed);await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>playerIdentity.signature),'NOVA');assert.equal(await page.evaluate(()=>JSON.stringify(contractBook.records[0])),signed);
        });
        console.log(passed+' identity scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
