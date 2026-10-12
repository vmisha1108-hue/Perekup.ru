const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {installEntryContinue}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),url='http://127.0.0.1:'+server.address().port;
    let passed=0;
    async function scenario(name,run){
        const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(error.message));installEntryContinue(page);
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');Date.now=()=>new Date(2030,0,15,12).getTime();Math.random=()=>.9;});
        try{await page.goto(url,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    function closeTo(actual,expected){assert.ok(Math.abs(actual-expected)<1.5,actual+' differs from '+expected);}
    try{
        await scenario('unchanged saves avoid writes while changed or externally cleared sections persist immediately',async page=>{
            const result=await page.evaluate(()=>{
                save();const before=JSON.stringify({...localStorage}),original=Storage.prototype.setItem;let writes=0;
                Storage.prototype.setItem=function(...args){writes++;return original.apply(this,args);};
                try{for(let i=0;i<50;i++)save();}finally{Storage.prototype.setItem=original;}
                const unchanged=before===JSON.stringify({...localStorage});localStorage.removeItem('pending');save();
                balance+=500;save();bank.microQuote={amount:10000,multiplier:2,total:20000,days:14};saveBank();
                return {writes,unchanged,pending:JSON.parse(localStorage.getItem('pending')),cash:Number(localStorage.getItem('balance')),bankCash:JSON.parse(localStorage.getItem('bank')).knownBalance,quote:JSON.parse(localStorage.getItem('bank')).microQuote};
            });
            assert.equal(result.writes,0);assert.equal(result.unchanged,true);assert.deepEqual(result.pending,[]);assert.equal(result.cash,100500);assert.equal(result.bankCash,100500);assert.equal(result.quote.total,20000);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>balance),100500);
        });
        await scenario('indexed catalogue preserves object identity, strict IDs and current market exclusions',async page=>{
            assert.ok(await page.evaluate(()=>CARS.concat(TRADE_CARS).every(car=>carById(car.id)===car)));
            assert.deepEqual(await page.evaluate(()=>[carById('1'),carById(-1),carById(null)]),[null,null,null]);
            const result=await page.evaluate(()=>{const car=CARS[0];car.price+=500;const reference=carById(car.id)===car;garage=[1];retiredMarketCars=[2];const removed=availableMarketCars().every(c=>c.id!==1 && c.id!==2);garage=[];retiredMarketCars=[];return {reference,removed,restored:availableMarketCars().some(c=>c.id===1) && availableMarketCars().some(c=>c.id===2)};});
            assert.deepEqual(result,{reference:true,removed:true,restored:true});
        });
        await scenario('dock buttons and keyboard focus survive updates and open, minimize and restore live windows',async page=>{
            await page.evaluate(()=>{window.savedDockButton=$('taskList').querySelector('[data-app="clock"]');savedDockButton.focus();for(let i=0;i<50;i++)renderTaskbar();});
            assert.ok(await page.evaluate(()=>savedDockButton===$('taskList').querySelector('[data-app="clock"]') && document.activeElement===savedDockButton));
            await page.keyboard.press('Enter');assert.ok(await page.locator('#win-clock').isVisible());assert.equal(await page.evaluate(()=>currentGameSpeed),120);
            await page.keyboard.press('Enter');await page.locator('#win-clock').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>currentGameSpeed),60);
            await page.keyboard.press('Enter');assert.ok(await page.locator('#win-clock').isVisible());await page.locator('#win-clock [data-close]').click();await page.locator('#win-clock').waitFor({state:'hidden'});assert.equal(await page.locator('#taskList button').count(),5);
        });
        await scenario('one window gesture handler drags without jumps, resizes all eight borders and persists geometry',async page=>{
            async function place(){await page.evaluate(()=>{openWin('market');const win=$('win-market');Object.assign(win.style,{left:'220px',top:'130px',width:'620px',height:'430px'});});await page.locator('#win-market').evaluate(win=>Promise.all(win.getAnimations().map(animation=>animation.finished)));return page.locator('#win-market').boundingBox();}
            let before=await place();await page.mouse.move(before.x+120,before.y+20);await page.mouse.down();await page.mouse.move(before.x+155,before.y+45,{steps:5});await page.mouse.up();let after=await page.locator('#win-market').boundingBox();closeTo(after.x,before.x+35);closeTo(after.y,before.y+25);
            for(const direction of ['n','s','e','w','ne','nw','se','sw']){
                // Кликаем по видимой границе, вне скругления углов и полосы прокрутки.
                before=await place();const corner=direction.length===2,edge=corner?7:2;
                const x=before.x+(direction.includes('w')?edge:direction.includes('e')?before.width-edge:before.width/2),y=before.y+(direction.includes('n')?edge:direction.includes('s')?before.height-edge:26);
                const dx=direction.includes('w')?-25:direction.includes('e')?25:0,dy=direction.includes('n')?-25:direction.includes('s')?25:0;
                await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up();after=await page.locator('#win-market').boundingBox();
                closeTo(after.width,before.width+(dx?25:0));closeTo(after.height,before.height+(dy?25:0));closeTo(after.x,before.x+(direction.includes('w')?-25:0));closeTo(after.y,before.y+(direction.includes('n')?-25:0));
            }
            const saved=await page.evaluate(()=>getWindowState('market'));await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openWin('market'));await page.locator('#win-market').evaluate(win=>Promise.all(win.getAnimations().map(animation=>animation.finished)));after=await page.locator('#win-market').boundingBox();closeTo(after.width,saved.width);closeTo(after.height,saved.height);
            before=await place();await page.mouse.move(before.x+100,before.y+20);await page.mouse.down();await page.mouse.move(1500,1200,{steps:5});await page.mouse.up();
            assert.ok(await page.locator('#win-market').evaluate(win=>{const w=win.getBoundingClientRect(),d=$('deskArea').getBoundingClientRect();return w.left>=d.left && w.top>=d.top && w.right<=d.right+1 && w.bottom<=d.bottom+1;}));
        });
        console.log(passed+' optimization scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
