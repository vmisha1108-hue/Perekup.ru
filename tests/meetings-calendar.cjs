const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {installEntryContinue,installExpandedFilters}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
    const url='http://127.0.0.1:'+server.address().port;let passed=0;
    async function scenario(name,run){
        const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(error.message));installEntryContinue(page);
        installExpandedFilters(page);
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12,14).getTime();Date.now=()=>testNow;Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);console.log('PASS '+name);passed++;}finally{await context.close();}
    }
    async function agree(page,id=1){await page.evaluate(id=>{balance=1000000;openBuyChat(id);agreePrice(chat.car.price);renderChat();},id);}
    try{
        await scenario('meeting slots are half-hour intervals, reject injected off-slot times and roll over midnight',async page=>{
            await agree(page);assert.equal(await page.locator('#meetTime').inputValue(),'12:30');assert.equal(await page.locator('#meetTime option').count(),48);
            await page.evaluate(()=>{$('meetTime').add(new Option('12:17','12:17'));$('meetTime').value='12:17';meetingTimeEdited=true;scheduleMeeting();});
            assert.equal(await page.evaluate(()=>pending.filter(it=>it.type==='meet').length),0);
            await page.locator('#meetTime').selectOption('12:30');await page.locator('#meetBtn').click();
            assert.equal(await page.evaluate(()=>new Date(chat.meet.whenMs).getMinutes()),30);assert.equal(await page.evaluate(()=>new Date(chat.meet.whenMs).getSeconds()),0);
            await page.evaluate(()=>closeChat());await page.evaluate(()=>{gameMs=new Date(2030,0,15,23,45).getTime();lastRealMs=Date.now();});await agree(page,2);
            assert.equal(await page.locator('#meetDate').inputValue(),'2030-01-16');assert.equal(await page.locator('#meetTime').inputValue(),'00:00');
            await page.locator('#meetBtn').click();assert.equal(await page.evaluate(()=>chat.meet.whenMs),await page.evaluate(()=>new Date(2030,0,16).getTime()));
        });
        await scenario('calendar shows saved meetings in order, day details are read-only and cancellations disappear',async page=>{
            await agree(page,1);await page.locator('#meetTime').selectOption('14:00');await page.locator('#meetBtn').click();const later=await page.evaluate(()=>chat.pid);await page.evaluate(()=>closeChat());
            await agree(page,2);await page.locator('#meetTime').selectOption('13:00');await page.locator('#meetBtn').click();const earlier=await page.evaluate(()=>chat.pid);await page.evaluate(()=>{closeChat();notes={'2030-01-15':'Старая личная заметка'};save();openWin('calendar');});
            assert.deepEqual(await page.locator('#calUpcoming [data-calendar-meeting]').evaluateAll(elements=>elements.map(el=>el.dataset.calendarMeeting)),[earlier,later]);
            assert.match(await page.locator('#calUpcoming').textContent(),/Москва/);assert.ok(await page.locator('[data-day="2030-01-15"]').evaluate(el=>el.classList.contains('has')));
            const dialogs=[];page.on('dialog',dialog=>{dialogs.push(dialog.type());dialog.dismiss();});
            await page.locator('[data-day="2030-01-15"]').click();assert.equal(await page.locator('#calNote [data-calendar-meeting]').count(),2);assert.ok(!(await page.locator('#calNote').textContent()).includes('Старая личная заметка'));
            await page.locator('[data-day="2030-01-16"]').click();assert.match(await page.locator('#calNote').textContent(),/встреч нет/);assert.deepEqual(dialogs,[]);
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openWin('calendar'));assert.equal(await page.locator('#calUpcoming [data-calendar-meeting]').count(),2);
            await page.locator('#calUpcoming [data-calendar-meeting="'+earlier+'"]').click();assert.equal(await page.evaluate(()=>chat.pid),earlier);assert.ok(await page.locator('#overlay').isVisible());
            await page.evaluate(()=>{closeChat();window.confirm=()=>true;});await page.evaluate(id=>cancelMeet(id),earlier);
            assert.equal(await page.locator('#calUpcoming [data-calendar-meeting]').count(),1);assert.equal(await page.locator('#calUpcoming [data-calendar-meeting]').getAttribute('data-calendar-meeting'),later);
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/calendar-meetings-mobile.png'});
        });
        await scenario('market starts locally, permits other cities and suggests the new city after arrival',async page=>{
            await page.evaluate(()=>openWin('market'));assert.equal(await page.locator('#fCity').inputValue(),'Москва');
            assert.ok(await page.evaluate(()=>Array.from(document.querySelectorAll('#content [data-info]')).every(el=>carCity(carById(+el.dataset.info)).id===playerCity().id)));
            await page.locator('#fCity').fill('Алдан');await page.locator('#fRadius').selectOption('0');assert.match(await page.locator('#content').textContent(),/Audi S8/);
            const image=page.locator('[data-info="3000028"] img');assert.match(await image.getAttribute('src'),/3000028-s8\.jpg/);await image.scrollIntoViewIfNeeded();await image.evaluate(el=>el.decode());assert.ok(await image.evaluate(el=>el.complete && el.naturalWidth===768));
            await page.locator('#fLocal').click();assert.equal(await page.locator('#fCity').inputValue(),'Москва');
            await page.evaluate(()=>{const to=cityNamed('Алдан').id;transport.trip={from:transport.cityId,to,label:'Поезд',arrivesAt:gameMs};tickTransport();closeArrival();});
            assert.match(await page.locator('#fCity').inputValue(),/^Алдан/);assert.match(await page.locator('#fLocal').textContent(),/Алдан/);
            await page.locator('#fCity').fill('Благовещенск');await page.reload({waitUntil:'networkidle'});assert.match(await page.locator('#fCity').inputValue(),/^Благовещенск/);
            await page.evaluate(()=>openWin('market'));await page.locator('#fLocal').click();assert.match(await page.locator('#fCity').inputValue(),/^Алдан/);
        });
        console.log(passed+' calendar and meeting scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
