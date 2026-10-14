const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {installEntryContinue}=require('./helpers/entry.cjs');
const {signContract}=require('./helpers/contracts.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;
    let passed=0;
    async function scenario(name,run,options={}){
        const context=await browser.newContext({viewport:{width:1280,height:900},...options}),page=await context.newPage(),errors=[];
        installEntryContinue(page);page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function draft(page,mode='buy'){
        await page.evaluate(mode=>{
            closeWin('settings');
            if(mode==='buy'){openBuyChat(1);agreePrice(90000);}
            else{postAd(1,100000);pending.push({id:'settings-sale',type:'ad',mode:'sell',carId:1,ready:true,npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:100000,maxBid:100000,listingPrice:100000});openAdChat('settings-sale');agreePrice(100000);}
            renderChat();scheduleMeeting();gameMs=chat.meet.whenMs;lastRealMs=Date.now();goToMeeting();gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();agreeEvent();
        },mode);
    }
    async function draw(page){
        const box=await page.locator('#settingsSignatureCanvas').boundingBox();await page.mouse.move(box.x+box.width*.1,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.6,{steps:12});await page.mouse.up();
    }
    try{
        await scenario('all six themes switch live, preserve open windows and gameplay, and load their own wallpapers',async page=>{
            await page.locator('#taskList [data-app="settings"]').click();
            assert.deepEqual(await page.locator('[name="settingsOS"]').evaluateAll(els=>els.map(el=>el.value)),['windows','macos','linux']);
            const before=await page.evaluate(()=>JSON.stringify({balance,garage,pending,gameMs,contractBook,playerIdentity}));
            const pictures=new Set();
            for(const os of ['windows','macos','linux']){
                await page.locator('[name="settingsOS"][value="'+os+'"]').check();
                for(const theme of ['light','dark']){
                    await page.locator('[name="settingsTheme"][value="'+theme+'"]').check();
                    assert.equal(await page.locator('html').getAttribute('data-os'),os);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
                    assert.ok(await page.locator('#win-settings').isVisible());
                    const image=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--wallpaper-image'));pictures.add(image);
                    assert.equal((await page.request.get(new URL(/"([^\"]+)"/.exec(image)[1],url).href)).status(),200);
                    await page.evaluate(()=>openWin('bank'));
                    const contrast=await page.locator('#bankCreditAmount').evaluate(el=>{
                        const s=getComputedStyle(el);
                        function luminance(color){const c=color.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
                        const a=luminance(s.color),b=luminance(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
                    });assert.ok(contrast>=4.5,os+' '+theme+' bank field must remain readable');await page.evaluate(()=>closeWin('bank'));
                    await page.evaluate(()=>{openWin('market');document.getElementById('toasts').innerHTML='';});
                    await page.locator('#win-market').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
                    await page.screenshot({path:'/workspace/scratch/3151c7eebd10/theme-'+os+'-'+theme+'.png'});await page.evaluate(()=>closeWin('market'));
                }
            }
            assert.equal(pictures.size,3);assert.equal(await page.evaluate(()=>JSON.stringify({balance,garage,pending,gameMs,contractBook,playerIdentity})),before);
            assert.equal(await page.locator('#taskList button').count(),6);
        });
        await scenario('theme and wallpaper are remembered separately for each OS and survive reload',async page=>{
            await page.evaluate(()=>openWin('settings'));
            await page.locator('[name="settingsTheme"][value="dark"]').check();await page.locator('[name="settingsWallpaper"][value="aurora"]').check();
            await page.locator('[name="settingsOS"][value="macos"]').check();await page.locator('[name="settingsWallpaper"][value="dawn"]').check();
            await page.locator('[name="settingsOS"][value="windows"]').check();assert.ok(await page.locator('[name="settingsTheme"][value="dark"]').isChecked());assert.ok(await page.locator('[name="settingsWallpaper"][value="aurora"]').isChecked());
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('html').getAttribute('data-wallpaper'),'aurora');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
            await page.evaluate(()=>openWin('settings'));await page.locator('[name="settingsOS"][value="macos"]').check();assert.ok(await page.locator('[name="settingsTheme"][value="light"]').isChecked());assert.ok(await page.locator('[name="settingsWallpaper"][value="dawn"]').isChecked());
        });
        await scenario('nickname and signature edits update an open draft while signed documents remain immutable',async page=>{
            await draft(page);await signContract(page);const signed=await page.evaluate(()=>JSON.stringify(contractBook.records[0]));
            await page.evaluate(()=>closeChat());await draft(page,'sell');await page.locator('#contractAutofill').click();await page.locator('#contractConfirm').check();
            await page.evaluate(()=>openWin('settings'));await page.locator('#settingsNickname').fill('НовыйПерекуп');await page.locator('#settingsNicknameForm button').click();
            assert.equal(await page.locator('#contract-fullName').inputValue(),'НовыйПерекуп');assert.equal(await page.locator('#contractConfirm').isChecked(),false);assert.equal(await page.evaluate(()=>JSON.stringify(contractBook.records[0])),signed);
            await page.locator('#settingsEditSignature').click();await draw(page);await page.locator('#settingsSaveSignature').click();
            assert.ok(await page.locator('#settingsSignatureEditor').isHidden());assert.equal(await page.evaluate(()=>JSON.stringify(contractBook.records[0])),signed);const identity=await page.evaluate(()=>playerIdentity);
            await page.evaluate(()=>closeWin('settings'));await signContract(page);assert.equal(await page.evaluate(()=>contractBook.records[0].seller.fullName),'НовыйПерекуп');assert.deepEqual(await page.evaluate(()=>contractBook.records[0].seller.signature),identity.signature);
            await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>playerIdentity),identity);assert.equal(await page.evaluate(()=>JSON.stringify(contractBook.records[1])),signed);
        });
        await scenario('invalid edits and cancelled signature drawings preserve the current identity',async page=>{
            await page.evaluate(()=>openWin('settings'));const before=await page.evaluate(()=>playerIdentity);
            await page.locator('#settingsNickname').fill('x');await page.locator('#settingsNicknameForm button').click();assert.match(await page.locator('#settingsNicknameError').textContent(),/2 до 32/);
            await page.locator('#settingsEditSignature').click();await page.locator('#settingsSaveSignature').click();assert.match(await page.locator('#settingsSignatureError').textContent(),/Нарисуйте/);
            await draw(page);await page.locator('#settingsCancelSignature').click();assert.deepEqual(await page.evaluate(()=>playerIdentity),before);await page.locator('#settingsEditSignature').click();assert.deepEqual(await page.evaluate(()=>settingsStrokes),[]);
        });
        await scenario('reset requires confirmation, clears progress and preserves identity, appearance and music preferences',async page=>{
            await draft(page);await signContract(page);await page.evaluate(()=>{closeChat();openWin('settings');changeAppearance('os','linux');changeAppearance('wallpaper','orbit');localStorage.setItem('musicSettings','{"enabled":false}');});
            const identity=await page.evaluate(()=>playerIdentity),style=await page.evaluate(()=>appearance);
            page.once('dialog',d=>d.dismiss());await page.locator('#settingsReset').click();assert.equal(await page.evaluate(()=>garage.length),1);
            page.once('dialog',d=>d.accept());await page.locator('#settingsReset').click();assert.equal(await page.evaluate(()=>balance),100000);assert.deepEqual(await page.evaluate(()=>garage),[]);assert.deepEqual(await page.evaluate(()=>pending),[]);assert.equal(await page.evaluate(()=>contractBook.records.length),0);assert.equal(await page.evaluate(()=>contractBook.sequence),0);
            await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>playerIdentity),identity);assert.deepEqual(await page.evaluate(()=>appearance),style);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('musicSettings')).enabled),false);assert.ok(await page.locator('#identityOverlay').isHidden());
        });
        await scenario('malformed appearance settings fall back safely without resetting game progress',async page=>{
            await page.evaluate(()=>{balance=654321;save();localStorage.setItem('appearance','{"os":"__proto__","themes":{"windows":"bad"},"wallpapers":{"windows":"../../bad"}}');});await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.locator('html').getAttribute('data-os'),'windows');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.equal(await page.locator('html').getAttribute('data-wallpaper'),'ribbons');assert.equal(await page.evaluate(()=>balance),654321);
        });
        await scenario('all styles and six dock controls fit a narrow phone and signature drawing supports touch',async page=>{
            await page.locator('#taskList [data-app="settings"]').tap();
            for(const os of ['windows','macos','linux']){await page.locator('[name="settingsOS"][value="'+os+'"]').check();assert.ok(await page.locator('#taskList').evaluate(el=>el.scrollWidth<=el.clientWidth));assert.ok(await page.locator('.settings-body').evaluate(el=>el.scrollWidth<=el.clientWidth));}
            const boxes=await page.locator('.desk-icon').evaluateAll(els=>els.map(el=>({x:el.offsetLeft,y:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight})));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y);}
            await page.locator('#settingsEditSignature').tap();await page.locator('#settingsSignatureCanvas').scrollIntoViewIfNeeded();
            const b=await page.locator('#settingsSignatureCanvas').boundingBox(),session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width*.1,y:b.y+b.height*.3}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*(.1+.7*i/8),y:b.y+b.height*(.3+.3*i/8)}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
            await page.locator('#settingsSaveSignature').tap();assert.ok(await page.locator('#settingsSignatureEditor').isHidden());assert.ok(await page.evaluate(()=>validSignature(playerIdentity.signature)));
            await page.evaluate(()=>{document.getElementById('toasts').innerHTML='';document.querySelector('.settings-body').scrollTop=0;});await page.locator('#win-settings').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await page.screenshot({path:'/workspace/scratch/3151c7eebd10/settings-mobile.png'});
        },{viewport:{width:320,height:640},isMobile:true,hasTouch:true});
        console.log(passed+' settings scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
