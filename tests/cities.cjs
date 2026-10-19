const {installEntryContinue,installExpandedFilters}=require('./helpers/entry.cjs');
const {signContract,reachMeetingTime}=require('./helpers/contracts.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const data = {};
for(const file of ['cars.js', 'cities.js', 'regional-cars.js', 'custom-cars.js', 'expanded-cars.js', 'aldan-cars.js','blagoveshchensk-cars.js','city-market.js']){
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), data);
}
assert.equal(data.CITIES.length, 25);
assert.equal(Object.keys(data.CITY_BY_LABEL).length, 25);
assert.equal(data.CARS.length, 1037);
assert.equal(data.CUSTOM_CARS.length, 69);
assert.ok(data.CARS.every(car => car.fictional && typeof car.full === 'string' && car.full.length > 0));
const generatedPhotos = JSON.parse(fs.readFileSync(path.join(root, 'data/fictional-photo-sources.json'))).photos;
assert.equal(generatedPhotos.length, 768);
assert.equal(new Set(generatedPhotos.map(photo => photo.id)).size, 768);
assert.equal(new Set(generatedPhotos.map(photo => photo.img)).size, 768);
for(const photo of generatedPhotos){
    const car = data.CARS.find(car => car.id === photo.id);
    assert.ok(car && car.img === photo.img, 'New illustration matches its car ID');
    assert.ok(photo.size[0] >= 300 && photo.size[1] >= 300);
}
assert.equal(new Set(data.CARS.map(car => car.id)).size, data.CARS.length);
const targets = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog-cities.json')));
const sources = JSON.parse(fs.readFileSync(path.join(root, 'data/regional-sources.json'))).cars;
assert.equal(sources.length, 600);
assert.equal(data.REGIONAL_CARS.length, 660);
for(const city of targets){
    const real = sources.filter(car => car.cityId === city.id);
    assert.equal(real.length, 30, city.name);
    assert.ok(new Set(real.map(car => car.brand)).size >= 8, city.name + ' brand variety');
    assert.ok(real.every(car => car.city === city.name && car.price >= 10000 && car.price <= 10000000));
    for(const previous of real){
        const current = data.CARS.find(car => car.id === previous.id);
        assert.equal(current.name, previous.name);
        assert.equal(current.price, previous.price);
        assert.equal(current.cityId, previous.cityId);
    }
    assert.equal(data.REGIONAL_CARS.filter(car => car.cityId === city.id && car.legend).length, 3);
}
for(const car of data.CARS){
    if(car.cityId) assert.ok(data.CITY_BY_ID[car.cityId]);
    assert.ok(car.desc.length <= 120);
    assert.ok(Number.isSafeInteger(car.price) && car.price > 0);
    assert.ok(fs.existsSync(path.join(root, car.img)), car.img);
}
const moscow = data.cityNamed('Москва'), spb = data.cityNamed('Санкт-Петербург'), nn = data.cityNamed('Нижний Новгород');
assert.ok(data.distanceBetweenCities(moscow, spb) > 600 && data.distanceBetweenCities(moscow, spb) < 700);
assert.ok(data.distanceBetweenCities(moscow, nn) > 350 && data.distanceBetweenCities(moscow, nn) < 450);
assert.equal(data.locationMatches({cityId: spb.id}, moscow.id, '500'), false);
assert.equal(data.locationMatches({cityId: spb.id}, moscow.id, '1000'), true);
const duplicate = data.CITIES.filter(city => city.name === 'Благовещенск');
assert.equal(duplicate.length, 1);
assert.equal(duplicate[0].region, 'Амурская область');
assert.equal(data.cityFromLabel('благовещенск').id, duplicate[0].id);
assert.equal(data.cityFromLabel('Алдан · Республика Саха (Якутия)').name, 'Алдан');
assert.ok(data.CITIES.every(city => data.CARS.some(car => car.cityId === city.id)));
async function decodedPhotoWidth(page){
    return page.locator('#carModalImg').evaluate(async root=>{
        const element=root.querySelector('[data-vehicle-source]') || root.querySelector('img,image');if(!element)throw new Error('Missing model illustration');
        const photo=new Image();photo.src=element.tagName.toLowerCase()==='img'?element.src:element.getAttribute('href');
        await photo.decode();return photo.naturalWidth;
    });
}
const original = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'cities.js'), 'utf8'), original);
const removedCity = original.CITIES.find(city => !data.CITY_BY_ID[city.id]);
assert.ok(removedCity);
assert.equal(data.cityFromLabel(removedCity.name), null);
const newCityCounts = Object.fromEntries(['Благовещенск','Алдан','Магдагачи','Черкесск'].map(name=>[name,data.CARS.filter(car=>car.cityId===data.cityNamed(name).id).length]));
for(const [name, count] of Object.entries(newCityCounts)){
    assert.equal(data.CARS.filter(car => car.cityId === data.cityNamed(name).id).length, count, name);
}
const magdagachi = data.cityNamed('Магдагачи'), aldan = data.cityNamed('Алдан');
assert.ok(data.distanceBetweenCities(magdagachi, aldan) > 500 && data.distanceBetweenCities(magdagachi, aldan) < 1000);
assert.equal(data.locationMatches({cityId:aldan.id}, magdagachi.id, '500'), false);
assert.equal(data.locationMatches({cityId:aldan.id}, magdagachi.id, '1000'), true);
assert.equal(data.locationMatches({}, moscow.id, 'all'), false);
console.log('PASS fictional catalogue: 1037 cars, 768 replacement illustrations, preserved regional models/prices, 25 populated places');

const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png'};
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if(!file.startsWith(root + path.sep)){ res.writeHead(403).end(); return; }
    try{
        const bytes = fs.readFileSync(file);
        res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/json'}).end(bytes);
    }
    catch{ res.writeHead(404).end(); }
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
    try{
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        installEntryContinue(page);
        installExpandedFilters(page);await page.addInitScript(() => { localStorage.setItem('helpPromptSeen','1'); Math.random = () => .9; });
        const url = 'http://127.0.0.1:' + server.address().port;
        await page.goto(url, {waitUntil:'networkidle'});
        await page.evaluate(() => openWin('market'));
        assert.equal(await page.locator('#fCity').inputValue(), 'Москва');
        await page.locator('#fCity').fill('');
        assert.equal(await page.locator('#content .card').count(), 60);
        assert.equal(await page.locator('#cityOptions option').count(), 25);
        assert.ok(await page.locator('#fRadius').isDisabled());
        await page.locator('#marketMore').click();
        assert.equal(await page.locator('#content .card').count(), 120);
        console.log('PASS pagination: 60 then 120 cards');

        for(const city of targets){
            await page.locator('#fCity').fill(city.name);
            await page.locator('#fRadius').selectOption('0');
            const expected = data.CARS.filter(car=>car.cityId===city.id).length;
            assert.equal(await page.locator('#content .card').count(), Math.min(60,expected), city.name);
            assert.equal(await page.locator('#marketMore').isVisible(),expected>60);
            const first = data.REGIONAL_CARS.find(car => car.cityId === city.id && !car.legend);
            await page.evaluate(id => openCarInfo(id), first.id);
            assert.ok(await decodedPhotoWidth(page)>0);
            assert.ok((await page.locator('#carModalBody').textContent()).includes(city.name));
            await page.evaluate(() => closeCarInfo());
        }
        console.log('PASS all 20 existing city markets and photographs, including additions in Krasnodar and Khabarovsk');

        for(const [name, count] of Object.entries(newCityCounts)){
            await page.locator('#fCity').fill(name);
            await page.locator('#fRadius').selectOption('0');
            assert.equal(await page.locator('#content .card').count(), Math.min(60,count), name);
            assert.ok((await page.locator('#fCity').inputValue()).includes(name));
        }
        for(const car of data.CUSTOM_CARS){
            await page.evaluate(id => openCarInfo(id), car.id);
            assert.ok(await decodedPhotoWidth(page)>=500);
            const text = await page.locator('#carModalBody').textContent();
            assert.ok(text.includes(car.name) && text.includes(car.seller.name) && text.includes(car.full), car.name);
            assert.ok(text.includes('Игровое объявление'));
            await page.evaluate(() => closeCarInfo());
        }
        await page.locator('#fCity').fill('Магдагачи');
        await page.locator('#fRadius').selectOption('500');
        assert.ok(await page.evaluate(() => !visibleCars(CARS).some(car => carCity(car).name === 'Алдан')));
        await page.locator('#fRadius').selectOption('1000');
        assert.ok(await page.evaluate(() => visibleCars(CARS).some(car => carCity(car).name === 'Алдан')));
        console.log('PASS new city markets, all 69 photographs/descriptions/sellers and Magdagachi radius');

        await page.locator('#fCity').fill('Москва');
        await page.locator('#fRadius').selectOption('0');
        assert.equal(await page.locator('#content .card').count(), 60);
        await page.locator('#marketMore').click();
        const moscowCount=data.CARS.filter(car=>car.cityId===moscow.id).length;
        assert.equal(await page.locator('#content .card').count(), Math.min(120,moscowCount));
        await page.locator('#fRadius').selectOption('500');
        await page.locator('#fSort').selectOption('distance_asc');
        await page.locator('#marketMore').click();
        await page.evaluate(()=>{marketLimit=visibleCars(availableMarketCars()).length;showMarket();});
        const near = await page.evaluate(() => Array.from(document.querySelectorAll('#content [data-info]')).map(el => { const car = carById(+el.dataset.info); return {city:carCity(car).name, distance:distanceFromCity(car,filters.city)}; }));
        assert.ok(near.some(car => car.city === 'Нижний Новгород'));
        assert.ok(near.every(car => car.city !== 'Санкт-Петербург' && car.distance <= 500));
        assert.ok(near.every((car, i) => !i || car.distance >= near[i-1].distance));
        await page.locator('#fRadius').selectOption('1000');
        assert.ok(await page.evaluate(() => visibleCars(CARS).some(car => carCity(car).name === 'Санкт-Петербург')));
        await page.reload({waitUntil:'networkidle'});
        await page.evaluate(() => openWin('market'));
        assert.equal(await page.locator('#fCity').inputValue(), 'Москва');
        assert.equal(await page.locator('#fRadius').inputValue(), '1000');
        await page.locator('#fCity').fill('Такого города нет');
        await page.locator('#fCity').blur();
        assert.equal(await page.locator('#fCity').inputValue(), 'Москва');
        console.log('PASS radius, distance ordering, saved location and invalid city input');

        await page.locator('#fReset').click();
        assert.equal(await page.locator('#fCity').inputValue(), 'Москва');
        assert.ok(!await page.locator('#fRadius').isDisabled());
        const city = targets.find(c => c.name === 'Новосибирск');
        const car = await page.evaluate(id => CARS.find(c => c.cityId === id && !c.legend && c.price <= 100000), city.id);
        assert.ok(car, 'An affordable fictional car in Novosibirsk');
        await page.locator('#fCity').fill(city.name);
        // This catalogue test starts the player here; journey constraints are covered by travel.cjs.
        await page.evaluate(id => { transport.cityId = id; save(); }, city.id);
        await page.locator('#content [data-buy="' + car.id + '"]').click();
        assert.equal(await page.evaluate(() => chat && chat.car.id), car.id);
        await page.evaluate(() => { agreePrice(chat.car.price); renderChat(); });
        await page.locator('#meetBtn').click();
        await reachMeetingTime(page);await page.locator('#goBtn').click();
        await page.evaluate(() => { gameMs = findPending(chat.pid).flow.inspectionUntil; tickPending(); });
        await page.locator('#evYes').click();await signContract(page);
        assert.ok(await page.evaluate(id => garage.includes(id), car.id));
        assert.equal(await page.evaluate(() => balance), 100000 - car.price);
        await page.reload({waitUntil:'networkidle'});
        await page.evaluate(() => { openWin('market'); showGarage(); });
        assert.equal(await page.locator('#content .card').count(), 1);
        assert.ok(await page.evaluate(id => garage.includes(id), car.id));
        await page.evaluate(() => { filters.city = cityNamed('Якутск').id; showGarage(); });
        assert.equal(await page.locator('#content .card').count(), 1);
        assert.deepEqual(errors, []);
        console.log('PASS regional purchase, persistence, and garage unaffected by market city filter');

        const fresh = await browser.newPage();
        fresh.on('pageerror', error => errors.push(error.message));
        installEntryContinue(fresh);installExpandedFilters(fresh);await fresh.addInitScript(id => {
            localStorage.setItem('helpPromptSeen', '1');
            if(!localStorage.getItem('marketLocation')) localStorage.setItem('marketLocation', JSON.stringify({city:id,radius:'500'}));
            Math.random = () => .9;
        }, removedCity.id);
        await fresh.goto(url, {waitUntil:'networkidle'});
        await fresh.evaluate(() => openWin('market'));
        assert.equal(await fresh.locator('#fCity').inputValue(), 'Москва');
        assert.ok(!await fresh.locator('#fRadius').isDisabled());
        // A returning visit refreshes seller moods and asking prices. Select the current affordable offer.
        await fresh.reload({waitUntil:'networkidle'});
        await fresh.evaluate(() => openWin('market'));
        const starter = await fresh.evaluate(id => CUSTOM_CARS.find(car => car.cityId === id && car.price <= 100000), aldan.id);
        assert.ok(starter, 'An affordable current offer in Aldan');
        await fresh.evaluate(id => { transport.cityId = id; save(); }, aldan.id);
        await fresh.locator('#fCity').fill('Алдан');
        await fresh.locator('#fRadius').selectOption('0');
        await fresh.locator('#content [data-buy="' + starter.id + '"]').click();
        assert.equal(await fresh.evaluate(() => chat.car.seller.name), starter.seller.name);
        await fresh.evaluate(() => { agreePrice(chat.car.price); renderChat(); });
        await fresh.locator('#meetBtn').click();
        await reachMeetingTime(fresh);await fresh.locator('#goBtn').click();
        await fresh.evaluate(() => { gameMs = findPending(chat.pid).flow.inspectionUntil; tickPending(); });
        await fresh.locator('#evYes').click();await signContract(fresh);
        assert.equal(await fresh.evaluate(() => balance), 100000 - starter.price);
        await fresh.reload({waitUntil:'networkidle'});
        assert.ok(await fresh.evaluate(id => garage.includes(id), starter.id));
        assert.equal(await fresh.evaluate(() => filters.city), aldan.id);
        assert.deepEqual(errors, []);
        console.log('PASS removed-city save migration and buying/persisting a new Aldan car');
    }finally{ await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
