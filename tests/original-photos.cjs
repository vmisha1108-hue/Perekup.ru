const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{installEntryContinue}=require('./helpers/entry.cjs');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage(),errors=[];installEntryContinue(page);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');localStorage.setItem('musicSettings','{"enabled":false}');Math.random=()=>.9;});await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
 const photos=await page.evaluate(()=>CARS.filter(c=>!c.expanded).map(c=>({id:c.id,src:c.img,markup:carImg(c)})));
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const actual=photos.map(p=>({id:p.id,source:p.src,imageSha256:digest(fs.readFileSync(path.join(root,p.src))),renderSha256:digest(p.markup)}));
 assert.equal(actual.length,837);
 if(process.env.RECORD_ORIGINAL_PHOTOS)fs.writeFileSync(path.join(root,'data/original-photo-baseline.json'),JSON.stringify({basedOn:'a0cdcaa79bcb6023ad1c416f5076d3aecef80749',photos:actual},null,2)+'\n');
 const expected=JSON.parse(fs.readFileSync(path.join(root,'data/original-photo-baseline.json')));assert.deepEqual(actual,expected.photos);
 console.log('PASS all 837 original files and rendered photographs match the pre-city-background baseline');
 await page.evaluate(()=>{openWin('market');filters.city=cityNamed('Алдан').id;showMarket();});assert.equal(await page.locator('[data-city-backdrop],.city-vehicle-photo,#marketAllRussia,#marketShowAll').count(),0);
 assert.equal(await page.evaluate(()=>CARS.length),4200);assert.deepEqual(errors,[]);console.log('PASS 4200 listings retained, collage rendering removed, original local market layout preserved');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
