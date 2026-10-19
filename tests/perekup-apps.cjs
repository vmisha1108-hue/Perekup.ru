'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{createStaticServer}=require('./helpers/static-server.cjs'),{installEntryContinue}=require('./helpers/entry.cjs');
const server=createStaticServer(path.resolve(__dirname,'..'));
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [1440,390,320]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];installEntryContinue(page);page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('perekupOSLayout','1');localStorage.setItem('iconPos',JSON.stringify({market:{x:20,y:20},calc:{x:20,y:20},calendar:{x:20,y:20},clock:{x:20,y:20}}));});
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
   await page.evaluate(()=>{closeWelcome();document.getElementById('marketRiskOverlay').classList.remove('open');});
   assert.deepEqual(await page.locator('#taskList button').evaluateAll(nodes=>nodes.map(node=>node.dataset.app)),['market','garage','calendar','calc','clock','settings']);
   for(const id of ['calendar','calc','clock'])assert.ok(await page.locator('.desk-icon[data-app="'+id+'"]').isVisible());
   const boxes=await page.locator('.desk-icon:visible').evaluateAll(nodes=>nodes.map(node=>({x:node.offsetLeft,y:node.offsetTop,w:node.offsetWidth,h:node.offsetHeight})));
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'visible shortcuts overlap at '+width);}
   const before=await page.evaluate(()=>JSON.stringify({balance,garage,pending,playerIdentity}));
   for(const theme of ['light','dark']){
    await page.evaluate(theme=>changeAppearance('theme',theme),theme);
    for(const id of ['market','garage','calendar','calc','clock','settings','bank','travel','shop','help','documents','business','import','dealer']){
     await page.evaluate(id=>{document.querySelectorAll('.window.open').forEach(win=>{if(win.id!=='win-chat')closeWin(win.id.slice(4));});openWin(id);},id);
     const win=page.locator('#win-'+id);await win.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
     assert.ok(await win.isVisible(),id+' opens');
     const overflow=await win.locator('.win-body').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false,id+' '+theme+' overflows at '+width);
     if(['calc','clock','market'].indexOf(id)===-1)assert.equal(await win.locator('.os-app-side').count(),1);
     if(id==='calc'){for(const key of ['C','2','+','3','='])await page.locator('[data-calc="'+key+'"]').click();assert.equal(await page.locator('#calcVal').textContent(),'5');}
     if(process.env.OS_SCREENSHOT_DIR && theme==='light' && ['bank','calc','calendar','garage','clock','settings'].includes(id))await page.screenshot({path:path.join(process.env.OS_SCREENSHOT_DIR,id+'-'+width+'.png')});
    }
   }
   await page.locator('.os-launcher').click();assert.ok(await page.locator('.os-app-menu').isVisible());await page.locator('[data-launch-app="calendar"]').click();assert.ok(await page.locator('#win-calendar').isVisible());assert.ok(await page.locator('.os-app-menu').isHidden());
   assert.equal(await page.evaluate(()=>JSON.stringify({balance,garage,pending,playerIdentity})),before);
   assert.deepEqual(errors,[]);console.log('PASS all apps, shortcuts, dock, launcher, calculator and both themes at '+width+'px');await context.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
