'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {createStaticServer}=require('./helpers/static-server.cjs');
(async()=>{
    const server=createStaticServer(path.resolve(__dirname,'..'));
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    try{
        const missing=await fetch(base+'/__missing_test_asset__');assert.equal(missing.status,404);await missing.text();
        const page=await fetch(base+'/');assert.equal(page.status,200);assert.equal(page.headers.get('content-type'),'text/html');const html=await page.text();assert.match(html,/<title>Perekup\.ru<\/title>/);assert.match(html,/<link rel="icon"/);
        const image=await fetch(base+'/img/aldan-winter/3000028-s8.jpg');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.ok((await image.arrayBuffer()).byteLength>1000);
        console.log('PASS missing asset returns 404, next page and winter image still load without duplicate headers');
    }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
