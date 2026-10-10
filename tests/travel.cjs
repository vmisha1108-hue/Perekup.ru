const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const server = http.createServer(async(req,res)=>{
    const file = path.resolve(root,'.' + (new URL(req.url,'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    try{ const data = await fs.readFile(file); res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)] || 'application/octet-stream'}).end(data); }
    catch{res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
    let passed=0;
    async function scenario(name,run,viewport={width:1280,height:900}){
        const context=await browser.newContext({viewport}), page=await context.newPage(), errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;});
        try{ await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name); }
        finally{await context.close();}
    }
    async function fixture(page,remote=false){
        await page.evaluate(remote=>{balance=4000000;garage=[1,2];purchasePrices={1:90000,2:80000};garage.forEach(vehicleState);if(remote) parkVehicle(1,cityNamed('Нижний Новгород').id);save();},remote);
    }
    async function arrival(page){ await page.locator('#arrivalClose').click(); }
    try{
        await scenario('new player starts in Moscow, garage one space, old ownership overflows to a free yard',async page=>{
            assert.deepEqual(await page.evaluate(()=>({city:playerCity().name,cap:currentGarage().cap,money:balance})),{city:'Москва',cap:1,money:100000});
            await page.evaluate(()=>{garage=[1,2,3];save();localStorage.removeItem('transport');});
            await page.reload({waitUntil:'networkidle'});
            assert.deepEqual(await page.evaluate(()=>garage.map(id=>vehicleState(id).place)),['garage','yard','yard']);
            assert.equal(await page.evaluate(()=>balance),100000);
            await page.evaluate(()=>openWin('garage'));
            assert.equal(await page.locator('.vehicle-card').count(),3);
            assert.ok((await page.locator('#garageBody').textContent()).includes('Гараж: 1 / 1'));
            await page.locator('[data-vehicle-info="2"]').click();
            assert.equal(await page.evaluate(()=>view),'market');
            assert.ok((await page.locator('#carModalBody').textContent()).includes('бесплатный двор'));
            await page.locator('#carClose').click();
            await page.evaluate(()=>{balance=1000000;buyGarage(1);});
            assert.equal(await page.evaluate(()=>homeOccupancy()),3);
        });
        await scenario('route prices and times scale, regional transfers are included, driving requires a local car',async page=>{
            const result=await page.evaluate(()=>{
                const near=routeOptions(cityNamed('Нижний Новгород').id), far=routeOptions(cityNamed('Владивосток').id), aldan=routeOptions(cityNamed('Алдан').id);
                return {near,far,aldan};
            });
            for(const list of [result.near,result.far,result.aldan]){assert.ok(list[1].price>list[0].price);assert.ok(list[1].duration<list[0].duration);assert.ok(!list.some(o=>o.mode==='drive'));}
            assert.ok(result.far[0].price>result.near[0].price && result.far[0].duration>result.near[0].duration);
            assert.ok(!result.far.some(o=>o.mode==='taxi'));
            assert.ok(result.aldan[1].note.includes('трансфер'));
            await fixture(page,true);
            assert.deepEqual(await page.evaluate(()=>localDrivingCars()),[2]);
            await page.evaluate(()=>{garage=[1];save();openWin('travel');});
            assert.equal(await page.locator('[data-depart="drive"]').count(),0);
        });
        await scenario('remote buy cannot happen through a filter or direct completion; player must travel',async page=>{
            await page.evaluate(()=>{
                const city=cityNamed('Нижний Новгород'),car=CARS.find(c=>c.cityId===city.id && c.price<100000);
                filters.city=city.id;openBuyChat(car.id);agreePrice(car.price);renderChat();
            });
            await page.locator('#meetBtn').click();await page.locator('#goBtn').click();
            assert.equal(await page.evaluate(()=>playerCity().name),'Москва');
            assert.equal(await page.evaluate(()=>chat.met),false);
            assert.ok(!await page.locator('#overlay').isVisible(),'Remote meeting button exposes the travel app');
            assert.equal(await page.evaluate(()=>findPending(chat.pid).flow),undefined);
            await page.evaluate(()=>finishBuy(chat.price));
            assert.equal(await page.evaluate(()=>garage.length),0);
            assert.equal(await page.evaluate(()=>balance),100000);
        });
        await scenario('train purchase and route survive reload without second payment and show arrival notice',async page=>{
            await page.evaluate(()=>openTravelTo(cityNamed('Нижний Новгород').id));
            const before=await page.evaluate(()=>({balance,quote:routeOptions(travelTarget)[0]}));
            await page.locator('[data-depart="train"]').click();
            assert.equal(await page.evaluate(()=>balance),before.balance-before.quote.price);
            assert.equal(await page.evaluate(()=>playerCity().name),'Москва');
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openWin('travel'));
            assert.equal(await page.evaluate(()=>balance),before.balance-before.quote.price);
            await page.locator('#travelBody [data-wait-transport]').click();
            assert.equal(await page.locator('#arrivalCity').textContent(),'Нижний Новгород');
            const at=await page.evaluate(()=>gameMs);
            await page.reload({waitUntil:'networkidle'});
            assert.ok(await page.locator('#arrivalOverlay').isVisible());
            assert.equal(await page.evaluate(()=>gameMs),at);
            await arrival(page);await page.reload({waitUntil:'networkidle'});
            assert.ok(!await page.locator('#arrivalOverlay').isVisible());
            assert.equal(await page.evaluate(()=>playerCity().name),'Нижний Новгород');
        });
        await scenario('buy after travelling parks in the purchase city and bills only after a full day',async page=>{
            await page.evaluate(()=>{balance=1000000;depart(cityNamed('Нижний Новгород').id,'train');waitForTransport();closeArrival();const c=CARS.filter(c=>c.cityId===transport.cityId).sort((a,b)=>a.price-b.price)[0];openBuyChat(c.id);agreePrice(c.price);renderChat();});
            const before=await page.evaluate(()=>({balance,price:chat.price}));
            await page.locator('#meetBtn').click();await page.locator('#goBtn').click();
            await page.evaluate(()=>{gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();});await page.locator('#evYes').click();
            const owned=await page.evaluate(()=>({id:garage[0],v:vehicleState(garage[0]),balance}));
            assert.equal(owned.v.place,'parking');assert.equal(owned.balance,before.balance-before.price);
            await page.evaluate(id=>{gameMs=vehicleState(id).nextChargeAt-1;tickPending();},owned.id);
            assert.equal(await page.evaluate(()=>balance),owned.balance);
            await page.evaluate(()=>{gameMs++;tickPending();});
            assert.equal(await page.evaluate(()=>balance),owned.balance-100);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>balance),owned.balance-100);
            assert.equal(await page.evaluate(()=>playerCity().name),'Нижний Новгород');
        });
        await scenario('driving moves only the selected car, adds road mileage once, and return parks in free Moscow yard',async page=>{
            await fixture(page);
            const before=await page.evaluate(()=>{openTravelTo(cityNamed('Нижний Новгород').id);return {km:carStats(carById(2)).km,quote:routeOptions(travelTarget).find(o=>o.mode==='drive')};});
            await page.locator('#travelCar').selectOption('2');await page.locator('[data-depart="drive"]').click();
            assert.equal(await page.evaluate(()=>vehicleState(2).place),'road');
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>{openWin('travel');waitForTransport();});await arrival(page);
            assert.equal(await page.evaluate(()=>carStats(carById(2)).km),before.km+before.quote.distance);
            assert.equal(await page.evaluate(()=>vehicleState(1).place),'garage');
            assert.equal(await page.evaluate(()=>vehicleState(2).place),'parking');
            const back=await page.evaluate(()=>{openTravelTo(moscowCity.id);return routeOptions(travelTarget).find(o=>o.mode==='drive');});
            await page.locator('[data-depart="drive"]').click();await page.evaluate(()=>waitForTransport());await arrival(page);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>carStats(carById(2)).km),before.km+before.quote.distance+back.distance);
            assert.equal(await page.evaluate(()=>vehicleState(2).place),'yard');
            assert.ok((await page.evaluate(()=>vehicleDesc(carById(2)))).includes((before.km+before.quote.distance+back.distance).toLocaleString('ru-RU')));
        });
        await scenario('public transport leaves local cars behind; departure is blocked during an inspection',async page=>{
            await fixture(page);
            await page.evaluate(()=>{depart(cityNamed('Нижний Новгород').id,'plane');waitForTransport();closeArrival();});
            assert.equal(await page.evaluate(()=>vehicleState(1).cityId),await page.evaluate(()=>moscowCity.id));
            assert.deepEqual(await page.evaluate(()=>localDrivingCars()),[]);
            assert.equal(await page.evaluate(()=>{openBuyChat(CARS.find(c=>c.cityId===transport.cityId).id);chat.met=true;return depart(moscowCity.id,'plane');}),false);
        });
        await scenario('remote carrier can be ordered from Moscow, suspends ads, stops parking and adds no mileage',async page=>{
            await fixture(page,true);
            const before=await page.evaluate(()=>{postAd(1,250000);openWin('garage');return {balance,km:carStats(carById(1)).km,quote:shippingQuote(1)};});
            await page.locator('[data-ship-vehicle="1"]').click();
            assert.equal(await page.evaluate(()=>vehicleState(1).place),'carrier');
            assert.equal(await page.evaluate(()=>balance),before.balance-before.quote.price);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>balance),before.balance-before.quote.price);
            await page.evaluate(()=>{listings[1].nextBuyerAt=gameMs;tickPending();});
            assert.equal(await page.evaluate(()=>pending.filter(it=>it.type==='ad').length),0);
            await page.evaluate(()=>{openWin('garage');waitForTransport();});
            assert.equal(await page.evaluate(()=>transport.shipments.length),0);
            assert.equal(await page.evaluate(()=>vehicleState(1).place),'yard');
            assert.equal(await page.evaluate(()=>balance),before.balance-before.quote.price);
            assert.equal(await page.evaluate(()=>carStats(carById(1)).km),before.km);
            assert.ok(await page.evaluate(()=>listings[1].nextBuyerAt>gameMs));
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>balance),before.balance-before.quote.price);
        });
        await scenario('insufficient parking cash becomes debt; transport settles it atomically',async page=>{
            await fixture(page,true);
            await page.evaluate(()=>{balance=50;gameMs=vehicleState(1).nextChargeAt+DAY_MS;tickPending();});
            assert.deepEqual(await page.evaluate(()=>({balance,debt:parkingDebt(1)})),{balance:0,debt:150});
            assert.equal(await page.evaluate(()=>shipVehicle(1)),false);
            assert.equal(await page.evaluate(()=>vehicleState(1).place),'parking');
            const q=await page.evaluate(()=>shippingQuote(1));
            await page.evaluate(q=>{balance=q.price+149;},q);
            assert.equal(await page.evaluate(()=>shipVehicle(1)),false);
            await page.evaluate(()=>{balance++;});
            assert.equal(await page.evaluate(()=>shipVehicle(1)),true);
            assert.deepEqual(await page.evaluate(()=>({balance,debt:parkingDebt(1)})),{balance:0,debt:0});
        });
        await scenario('sale and exchange use actual vehicle city and repay parking out of proceeds',async page=>{
            await fixture(page,true);
            await page.evaluate(()=>{balance=0;gameMs=vehicleState(1).nextChargeAt;tickPending();openSellChat(1);chat.price=200000;finishSell(chat.price);});
            assert.ok(await page.evaluate(()=>garage.includes(1)),'Remote sale was blocked');
            await page.evaluate(()=>{transport.cityId=cityNamed('Нижний Новгород').id;openSellChat(1);chat.price=200000;finishSell(chat.price);});
            assert.equal(await page.evaluate(()=>balance),199900);
            assert.ok(!await page.evaluate(()=>garage.includes(1)));
            await page.evaluate(()=>{parkVehicle(2,transport.cityId);openSellChat(2);chat.trade={carId:TRADE_CARS[0].id,value:100000};chat.price=100000;finishTrade(chat.price);});
            assert.equal(await page.evaluate(()=>vehicleState(garage[0]).place),'parking');
            assert.equal(await page.evaluate(()=>vehicleState(garage[0]).cityId),await page.evaluate(()=>transport.cityId));
        });
        await scenario('waiting processes incoming messages, missed meetings and parking for cars left behind',async page=>{
            await fixture(page,true);
            await page.evaluate(()=>{postAd(1,200000);listings[1].nextBuyerAt=gameMs+60000;openBuyChat(3);agreePrice(chat.ask);renderChat();});
            await page.locator('#meetBtn').click();
            const pid=await page.evaluate(()=>chat.pid);
            await page.evaluate(()=>{closeChat();depart(cityNamed('Владивосток').id,'train');waitForTransport();});
            assert.equal(await page.evaluate(id=>findPending(id),pid),null);
            assert.ok(await page.evaluate(()=>pending.some(it=>it.type==='ad' && it.carId===1)));
            assert.ok(await page.evaluate(()=>vehicleState(1).nextChargeAt>gameMs));
            assert.ok(await page.evaluate(()=>balance<4000000-routeOptions(moscowCity.id)[0].price-100));
            assert.equal(await page.evaluate(()=>playerCity().name),'Владивосток');
        });
        await scenario('mobile travel and garage stay inside the desktop and arrival remains usable',async page=>{
            await fixture(page,true);await page.evaluate(()=>openWin('garage'));
            const bounds=await page.locator('#win-garage').boundingBox();assert.ok(bounds.width<=390);
            assert.equal(await page.locator('.vehicle-card').count(),2);
            await page.evaluate(()=>openTravelTo(cityNamed('Нижний Новгород').id));
            await page.locator('[data-depart="train"]').click();await page.locator('#travelBody [data-wait-transport]').click();
            await arrival(page);assert.equal(await page.evaluate(()=>playerCity().name),'Нижний Новгород');
        },{width:390,height:844});
        await scenario('night sleep bills parking at its daily boundary and completes a carrier without adding mileage',async page=>{
            await fixture(page,true);
            const before=await page.evaluate(()=>{
                const nextMorning=new Date(gameMs);nextMorning.setDate(nextMorning.getDate()+1);nextMorning.setHours(7,0,0,0);
                parkVehicle(1,cityNamed('Нижний Новгород').id,nextMorning.getTime()-DAY_MS);
                gameMs=new Date(2030,0,15,23).getTime();return balance;
            });
            await page.evaluate(()=>sleepUntilMorning());
            assert.equal(await page.evaluate(()=>balance),before-100);
            await page.evaluate(()=>shipVehicle(1));
            const carrier=await page.evaluate(()=>({km:carStats(carById(1)).km,balance,arrival:transport.shipments[0].arrivesAt}));
            await page.evaluate(arrival=>{gameMs=arrival-2*3600000;sleepUntilMorning();},carrier.arrival);
            assert.equal(await page.evaluate(()=>transport.shipments.length),0);
            assert.equal(await page.evaluate(()=>balance),carrier.balance);
            assert.equal(await page.evaluate(()=>carStats(carById(1)).km),carrier.km);
        });
        await scenario('another Moscow purchase succeeds with a full home garage and stays in the free yard',async page=>{
            await fixture(page);await page.evaluate(()=>{openBuyChat(3);agreePrice(chat.ask);renderChat();});
            await page.locator('#meetBtn').click();await page.locator('#goBtn').click();
            await page.evaluate(()=>{gameMs=findPending(chat.pid).flow.inspectionUntil;tickPending();});await page.locator('#evYes').click();
            assert.ok(await page.evaluate(()=>garage.includes(3)));
            assert.equal(await page.evaluate(()=>vehicleState(3).place),'yard');
            const before=await page.evaluate(()=>balance);
            await page.evaluate(()=>{gameMs+=3*DAY_MS;tickPending();});
            assert.equal(await page.evaluate(()=>balance),before);
        });
        console.log(`${passed} travel/garage scenarios passed`);
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
