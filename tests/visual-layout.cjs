const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {installEntryContinue}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;
    let passed=0;
    async function scenario(name,run,options={}){
        const context=await browser.newContext({viewport:{width:1600,height:1000},...options}),page=await context.newPage(),errors=[];
        installEntryContinue(page);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('musicSettings','{"enabled":false}');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    try{
        await scenario('desktop market and conversation match the side-by-side reference composition in all themes',async page=>{
            await page.evaluate(()=>{openWin('market');openBuyChat(1);});
            for(const os of ['windows','macos','linux'])for(const theme of ['light','dark']){
                await page.evaluate(({os,theme})=>{changeAppearance('os',os);changeAppearance('theme',theme);arrangeConversationWindows();document.getElementById('toasts').innerHTML='';}, {os,theme});
                await page.locator('#win-chat').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
                const market=await page.locator('#win-market').boundingBox(),talk=await page.locator('#win-chat').boundingBox();assert.ok(market.x+market.width<=talk.x,'windows must not overlap');assert.ok(talk.x+talk.width<=1600);assert.ok(await page.locator('#win-market .win-body').evaluate(el=>el.scrollWidth<=el.clientWidth));
                const cards=await page.locator('#content .card').evaluateAll(els=>els.slice(0,3).map(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('.buy').getBoundingClientRect();return {y:r.y,bottom:b.bottom};}));assert.equal(new Set(cards.map(c=>Math.round(c.y))).size,1);assert.ok(cards.every(c=>c.bottom<market.y+market.height));
                assert.equal(await page.locator('.task-label').count(),6);assert.equal(await page.locator('#win-chat [data-max]').count(),1);
                await page.screenshot({path:'/workspace/scratch/3151c7eebd10/actual-'+os+'-'+theme+'.png'});
            }
            assert.equal(await page.evaluate(()=>balance),100000);assert.deepEqual(await page.evaluate(()=>garage),[]);
        });
        await scenario('filters, draggable conversation and maximize/minimize controls preserve the current quote',async page=>{
            await page.evaluate(()=>openWin('market'));await page.locator('#filterToggle').click();assert.ok(await page.locator('#marketAdvanced').isVisible());await page.locator('#fMin').fill('60000');await page.locator('#fMin').dispatchEvent('input');await page.locator('#filterToggle').click();assert.ok(await page.locator('#marketAdvanced').isHidden());
            await page.evaluate(()=>openBuyChat(1));const price=await page.evaluate(()=>chat.price);
            await page.locator('#win-chat').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const original=await page.locator('#win-chat').boundingBox();await page.locator('#win-chat [data-max]').click();const big=await page.locator('#win-chat').boundingBox();assert.ok(big.width>original.width);await page.locator('#win-chat [data-max]').click();const restored=await page.locator('#win-chat').boundingBox();assert.ok(Math.abs(restored.width-original.width)<2);
            const head=await page.locator('#win-chat .win-head').boundingBox();await page.mouse.move(head.x+130,head.y+20);await page.mouse.down();await page.mouse.move(head.x+100,head.y+40,{steps:4});await page.mouse.up();const dragged=await page.locator('#win-chat').boundingBox();assert.ok(dragged.x<original.x);
            await page.locator('#win-chat [data-min]').click();assert.ok(await page.locator('#win-chat').isHidden());await page.evaluate(()=>openBuyChat(1));assert.ok(await page.locator('#win-chat').isVisible());assert.equal(await page.evaluate(()=>chat.price),price);await page.locator('#chatClose').click();assert.ok(await page.locator('#overlay').isHidden());
        });
        await scenario('phone cards, dock labels and conversation remain usable without horizontal scrolling',async page=>{
            await page.locator('#taskList [data-app="market"]').tap();assert.ok(await page.locator('#taskList').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.locator('#filterToggle').tap();assert.ok(await page.locator('#marketAdvanced').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.locator('#filterToggle').tap();
            await page.evaluate(()=>openBuyChat(1));assert.ok(await page.locator('#win-chat').evaluate(el=>el.scrollWidth<=el.clientWidth));const b=await page.locator('#win-chat').boundingBox();assert.ok(b.x>=0 && b.x+b.width<=320 && b.y+b.height<=640);
            await page.locator('#msgInput').fill('Здравствуйте! Какой пробег?');await page.locator('#sendBtn').tap();assert.match(await page.locator('#chatLog').textContent(),/пробег|км/i);await page.screenshot({path:'/workspace/scratch/3151c7eebd10/actual-phone-chat.png'});
            await page.locator('#chatClose').tap();assert.ok(await page.locator('#win-market').isVisible());
        },{viewport:{width:320,height:640},isMobile:true,hasTouch:true});
        async function checkDockPaint(page){
            for(const os of ['windows','macos','linux'])for(const theme of ['light','dark']){
                await page.evaluate(({os,theme})=>{changeAppearance('os',os);changeAppearance('theme',theme);}, {os,theme});
                for(const app of ['market','settings']){
                    await page.evaluate(id=>openWin(id),app);
                    const button=page.locator('#taskList [data-app="'+app+'"]');
                    await page.keyboard.press('Tab');await button.focus();await button.hover();
                    await button.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
                    const clipped=await button.evaluate(el=>{
                        const list=el.parentElement,clip=list.getBoundingClientRect();
                        const left=clip.left+list.clientLeft,top=clip.top+list.clientTop,right=left+list.clientWidth,bottom=top+list.clientHeight;
                        return [el,el.querySelector('.task-icon'),el.querySelector('.task-label')].flatMap(item=>{
                            const r=item.getBoundingClientRect(),style=getComputedStyle(item);
                            const ring=style.outlineStyle==='none'?0:parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset);
                            return r.left-ring<left-.5 || r.right+ring>right+.5 || r.top-ring<top-.5 || r.bottom+ring>bottom+.5?[item.className]:[];
                        });
                    });
                    assert.deepEqual(clipped,[],os+' '+theme+' '+app+' hover and focus must stay inside the dock scrolling area');
                }
            }
        }
        await scenario('desktop dock preserves complete icons, labels and active/focus rings on hover in all themes',checkDockPaint);
        await scenario('narrow dock preserves complete first and last controls and their focus rings in all themes',checkDockPaint,{viewport:{width:320,height:640},isMobile:true,hasTouch:true});
        console.log(passed+' visual layout scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
