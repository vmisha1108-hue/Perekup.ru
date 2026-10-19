const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{installEntryContinue}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const server=require('./helpers/static-server.cjs').createStaticServer(root);
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage(),errors=[];installEntryContinue(page);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('musicSettings','{"enabled":false}');Math.random=()=>.9;});await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
 const photos=await page.evaluate(()=>CARS.filter(c=>!c.expanded && !c.aldanNew && !c.blagNew).map(c=>({id:c.id,src:c.img,city:CITY_BY_ID[c.cityId].name,markup:carImg(c)})));
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const actual=photos.map(p=>({id:p.id,source:p.src,imageSha256:digest(fs.readFileSync(path.join(root,p.src))),renderSha256:digest(p.markup)}));
 assert.equal(actual.length,837);
 if(process.env.RECORD_ORIGINAL_PHOTOS)fs.writeFileSync(path.join(root,'data/original-photo-baseline.json'),JSON.stringify({basedOn:'a0cdcaa79bcb6023ad1c416f5076d3aecef80749',photos:actual},null,2)+'\n');
 const expected=JSON.parse(fs.readFileSync(path.join(root,'data/original-photo-baseline.json')));
 const winter=JSON.parse(fs.readFileSync(path.join(root,'data/aldan-winter-photos.json'))).photos;
 for(const photo of actual){const baseline=expected.photos.find(p=>p.id===photo.id),rendered=photos.find(p=>p.id===photo.id);assert.ok(baseline);assert.equal(photo.source,baseline.source);assert.equal(photo.imageSha256,baseline.imageSha256);if(rendered.city==='Алдан')assert.ok(rendered.markup.includes(winter[photo.source] || photo.source));else assert.equal(photo.renderSha256,baseline.renderSha256);}
 console.log('PASS 837 source files remain unchanged; Aldan uses its winter photos; other cities retain baseline rendering');
 await page.evaluate(()=>{openWin('market');filters.city=cityNamed('Алдан').id;showMarket();});assert.equal(await page.locator('[data-city-backdrop],.city-vehicle-photo,#marketAllRussia,#marketShowAll').count(),0);
 assert.equal(await page.evaluate(()=>CARS.length),1037);assert.deepEqual(errors,[]);console.log('PASS 1037 listings retained, collage rendering removed, original local market layout preserved');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
