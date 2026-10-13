const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {completeIdentity}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}
});
(async()=>{
    execFileSync('python3',['scripts/sync-help.py','--check'],{cwd:root});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;
    let passed=0;
    async function scenario(name,run,options={}){
        const context=await browser.newContext({viewport:{width:1280,height:900},...options}),page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function playing(page){await page.waitForFunction(()=>{const a=document.getElementById('backgroundMusic');return !a.paused && a.currentTime>0 && a.readyState>=2;});}
    try{
        await scenario('music is lazy, starts on a real gesture, loops and remembers manual silence across reload',async page=>{
            assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused && a.readyState===0 && a.preload==='none'));
            await page.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})));assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused));
            await completeIdentity(page);await playing(page);assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.loop && a.volume===.2));
            assert.equal(await page.locator('#musicToggle').getAttribute('aria-pressed'),'true');
            await page.waitForFunction(()=>Number.isFinite(document.getElementById('backgroundMusic').duration));
            await page.locator('#backgroundMusic').evaluate(a=>a.currentTime=a.duration-.15);
            await page.waitForFunction(()=>{const a=document.getElementById('backgroundMusic');return a.currentTime<2 && !a.paused;});
            await page.locator('#musicToggle').click();assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused));assert.equal(await page.locator('#musicToggle').getAttribute('aria-pressed'),'false');
            await page.reload({waitUntil:'networkidle'});await page.locator('#taskList [data-app="market"]').click();assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused && a.readyState===0));
            await page.locator('#musicToggle').click();await playing(page);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('musicSettings')).enabled),true);
        });
        await scenario('a blocked playback attempt is handled and the next gesture can start the music',async page=>{
            await page.evaluate(()=>{const a=document.getElementById('backgroundMusic'),play=a.play.bind(a);let attempts=0;a.play=function(){attempts++;return attempts===1?Promise.reject(new DOMException('Blocked','NotAllowedError')):play();};});
            await page.keyboard.press('Shift');assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused));
            await page.keyboard.press('Shift');await playing(page);
        });
        await scenario('backgrounding pauses playback and only enabled music resumes',async page=>{
            await completeIdentity(page);await playing(page);
            await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused));
            await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await playing(page);
            await page.locator('#musicToggle').click();await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new Event('pageshow'));});assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused));
        });
        await scenario('README and embedded guide have identical text and end with the requested credits',async page=>{
            await completeIdentity(page);await page.evaluate(()=>openWin('help'));
            const markdown=(await fs.readFile(path.join(root,'README.md'),'utf8')).replace(/^#{1,2} /gm,'').replace(/^\d+\. /gm,'').replace(/\s+/g,' ').trim();
            const guide=(await page.locator('#gameHelp').innerText()).replace(/\s+/g,' ').trim();assert.equal(guide,markdown);assert.ok(guide.endsWith('Создатель — Coltara. Музыка — Mevison.'));
            for(const section of ['Авторынок и торг','Встречи','Договоры и результат сделки','Продажа и обмен','Города, гараж и перевозка','Банк, кредиты и микрозаймы','Музыка и сохранение'])assert.ok(guide.includes(section));
        });
        await scenario('music toggle is reachable by touch and the guide fits a 320px phone',async page=>{
            await completeIdentity(page);await playing(page);await page.locator('#musicToggle').tap();assert.ok(await page.locator('#backgroundMusic').evaluate(a=>a.paused));
            const b=await page.locator('#musicToggle').boundingBox();assert.ok(b.x>=0 && b.x+b.width<=320);
            assert.ok(await page.locator('.topbar').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.locator('#musicToggle').tap();await playing(page);
            await page.evaluate(()=>{openWin('help');document.getElementById('toasts').innerHTML='';});assert.ok(await page.locator('#gameHelp').evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.locator('#win-help').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await page.screenshot({path:'/workspace/scratch/3151c7eebd10/music-help-mobile.png'});
        },{viewport:{width:320,height:640},isMobile:true,hasTouch:true});
        console.log(passed+' music and help scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
