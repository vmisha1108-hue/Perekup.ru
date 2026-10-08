const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const data = {};
for(const file of ['cars.js', 'cities.js', 'regional-cars.js', 'city-market.js']){
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), data);
}
assert.equal(data.CITIES.length, 1117);
assert.equal(Object.keys(data.CITY_BY_LABEL).length, 1117);
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
    assert.equal(data.REGIONAL_CARS.filter(car => car.cityId === city.id && car.legend).length, 3);
}
for(const car of data.REGIONAL_CARS){
    assert.ok(data.CITY_BY_ID[car.cityId]);
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
assert.equal(duplicate.length, 2);
assert.notEqual(duplicate[0].label, duplicate[1].label);
assert.equal(data.locationMatches({cityId: duplicate[0].id}, duplicate[1].id, '0'), false);
assert.equal(data.locationMatches({}, moscow.id, 'all'), false);
console.log('PASS catalogue and geography: 20 × 30 real cars, 20 × 3 legends, 1117 city choices and known distances');

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
        await page.addInitScript(() => { localStorage.setItem('helpPromptSeen','1'); Math.random = () => .9; });
        const url = 'http://127.0.0.1:' + server.address().port;
        await page.goto(url, {waitUntil:'networkidle'});
        await page.evaluate(() => openWin('market'));
        assert.equal(await page.locator('#content .card').count(), 60);
        assert.equal(await page.locator('#cityOptions option').count(), 1117);
        assert.ok(await page.locator('#fRadius').isDisabled());
        await page.locator('#marketMore').click();
        assert.equal(await page.locator('#content .card').count(), 120);
        console.log('PASS pagination: 60 then 120 cards');

        for(const city of targets){
            await page.locator('#fCity').fill(city.name);
            await page.locator('#fRadius').selectOption('0');
            assert.equal(await page.locator('#content .card').count(), 33, city.name);
            assert.ok(!(await page.locator('#marketMore').isVisible()));
            const first = data.REGIONAL_CARS.find(car => car.cityId === city.id && !car.legend);
            await page.evaluate(id => openCarInfo(id), first.id);
            await page.waitForFunction(() => { const img = document.querySelector('#carModalImg img'); return img && img.complete && img.naturalWidth > 0; });
            assert.ok((await page.locator('#carModalBody').textContent()).includes(city.name));
            await page.evaluate(() => closeCarInfo());
        }
        console.log('PASS all 20 city markets: 33 cards and working local photographs');

        await page.locator('#fCity').fill('Москва');
        assert.equal(await page.locator('#content .card').count(), 40);
        await page.locator('#fRadius').selectOption('500');
        await page.locator('#fSort').selectOption('distance_asc');
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
        assert.equal(await page.locator('#fCity').inputValue(), '');
        assert.ok(await page.locator('#fRadius').isDisabled());
        const city = targets.find(c => c.name === 'Новосибирск');
        const car = data.REGIONAL_CARS.find(c => c.cityId === city.id && !c.legend && c.price <= 100000);
        assert.ok(car, 'An affordable real car in Novosibirsk');
        await page.locator('#fCity').fill(city.name);
        await page.locator('#content [data-buy="' + car.id + '"]').click();
        assert.equal(await page.evaluate(() => chat && chat.car.id), car.id);
        await page.evaluate(() => { agreePrice(chat.car.price); renderChat(); });
        await page.locator('#meetBtn').click();
        await page.locator('#goBtn').click();
        await page.evaluate(() => { gameMs = findPending(chat.pid).flow.inspectionUntil; tickPending(); });
        await page.locator('#evYes').click();
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
    }finally{ await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
