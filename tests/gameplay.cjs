// Run with Node.js and Playwright installed: node tests/gameplay.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
        const data = await fs.readFile(filename);
        response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
        response.end(data);
    } catch { response.writeHead(404).end(); }
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    let executablePath = process.env.CHROMIUM_PATH;
    if (!executablePath) {
        try { await fs.access('/usr/bin/chromium'); executablePath = '/usr/bin/chromium'; } catch {}
    }
    const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
    let passed = 0;
    async function scenario(name, run, options = {}) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(options => {
            if(!options.firstVisit) localStorage.setItem('helpPromptSeen', '1');
            if(options.returningPlayer) localStorage.setItem('balance', '100000');
            window.testNow = new Date(2030, 0, 15, 12, 30, 15).getTime();
            Date.now = () => window.testNow;
            Math.random = () => 0.9;
        }, options);
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            await run(page);
            assert.deepEqual(errors, [], 'No browser errors');
            console.log('PASS ' + name);
            passed++;
        } finally { await context.close(); }
    }
    async function ownCar(page) {
        await page.evaluate(() => {
            garage = [1]; purchasePrices[1] = 95000; save(); openWin('market'); showGarage();
        });
    }
    async function advertise(page, price) {
        await ownCar(page);
        await page.locator('[data-sell="1"]').click();
        await page.locator('#salePrice').fill(String(price));
        await page.locator('#saleSubmit').click();
    }
    async function offer(page, random = 0.3) {
        return page.evaluate(random => {
            Math.random = () => random;
            listings[1].nextBuyerAt = gameMs;
            tickPending();
            return pending.filter(it => it.type === 'ad').at(-1).id;
        }, random);
    }
    try {
        await scenario('new game and reset start with 100000 and reload preserves progress', async page => {
            assert.equal(await page.evaluate(() => balance), 100000);
            assert.ok((await page.locator('#win-help').textContent()).includes('100 000 ₽'));
            await page.evaluate(() => { balance = 750000; deals = 4; garage = [1]; save(); });
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(() => balance), 750000);
            page.once('dialog', dialog => dialog.accept());
            await page.evaluate(() => admReset());
            assert.equal(await page.evaluate(() => balance), 100000);
            assert.deepEqual(await page.evaluate(() => garage), []);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(() => balance), 100000);
        });
        await scenario('legacy empty reset million is corrected once', async page => {
            await page.evaluate(() => { balance = 1000000; save(); localStorage.removeItem('startingBalanceVersion'); });
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(() => balance), 100000);
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(() => balance), 100000);
        });
        await scenario('earned million is preserved during starting-balance migration', async page => {
            await page.evaluate(() => { balance = 1000000; deals = 2; save(); localStorage.removeItem('startingBalanceVersion'); });
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(() => balance), 1000000);
            assert.equal(await page.evaluate(() => deals), 2);
        });
        await scenario('clock rates and focus transitions', async page => {
            const result = await page.evaluate(() => {
                const deltas = [], step = () => { const before = gameMs; testNow += 1000; tickGame(); deltas.push(gameMs - before); };
                step(); openWin('clock'); step(); openWin('market'); step();
                focusWin('clock'); const before = gameMs; testNow += 500; minimizeWin('clock'); deltas.push(gameMs - before); step();
                restoreWin('clock'); openCarInfo(1); step();
                return { deltas, clockText: $('clockBig').textContent, secondHand: !!$('sHand') };
            });
            assert.deepEqual(result.deltas, [60000, 120000, 60000, 60000, 60000, 60000]);
            assert.match(result.clockText, /^\d{2}:\d{2}$/);
            assert.equal(result.secondHand, false);
        });
        await scenario('actual purchase cost includes meeting surcharge', async page => {
            await page.evaluate(() => { openBuyChat(1); agreePrice(90000); renderChat(); });
            await page.evaluate(() => { Math.random = () => 0.4; testNow += 3000; tickGame(); });
            await page.locator('#meetBtn').click();
            assert.equal(await page.evaluate(() => chat.stage), 'go');
            await page.locator('#goBtn').click();
            const finalPrice = await page.evaluate(() => chat.price + chat.event.amount);
            await page.locator('#evYes').click();
            assert.equal(await page.evaluate(() => purchasePrices[1]), finalPrice);
            await page.reload({ waitUntil: 'networkidle' });
            assert.equal(await page.evaluate(() => purchaseCost(carById(1))), finalPrice);
        });
        await scenario('own listing price persists and buyer countdown is hidden', async page => {
            await advertise(page, 210000);
            assert.equal(await page.evaluate(() => listings[1].price), 210000);
            await page.evaluate(() => showDeals());
            assert.equal(await page.locator('[data-until]').count(), 0);
            assert.ok((await page.locator('#content').textContent()).includes('210'));
            await page.reload({ waitUntil: 'networkidle' });
            assert.equal(await page.evaluate(() => listings[1].price), 210000);
            assert.equal(await page.evaluate(() => listings[1].purchasePrice), 95000);
        });
        await scenario('different buyers offer more, less, or asking price', async page => {
            await advertise(page, 210000);
            await offer(page, 0.1); await offer(page, 0.3); await offer(page, 0.8);
            const bids = await page.evaluate(() => pending.filter(it => it.type === 'ad').map(it => it.bid));
            assert.ok(bids[0] > 210000); assert.equal(bids[1], 210000); assert.ok(bids[2] < 210000);
            const actors = await page.evaluate(() => pending.map(it => it.npc.name));
            assert.notEqual(actors[0], actors[1]); assert.notEqual(actors[1], actors[2]);
            await page.evaluate(() => showDeals());
            await page.locator('[data-dtab="in"]').click();
            assert.equal(await page.locator('[data-ad-open]').count(), 3);
        });
        await scenario('buyers keep independent conversations', async page => {
            await advertise(page, 210000);
            const first = await offer(page, 0.1), second = await offer(page, 0.8);
            await page.evaluate(first => openAdChat(first), first);
            const firstName = await page.locator('#npcName').textContent();
            await page.locator('#chatClose').click();
            await page.evaluate(second => openAdChat(second), second);
            assert.notEqual(await page.locator('#npcName').textContent(), firstName);
            await page.locator('#chatClose').click();
            await page.reload({ waitUntil: 'networkidle' });
            await page.evaluate(first => openAdChat(first), first);
            assert.equal(await page.locator('#npcName').textContent(), firstName);
        });
        await scenario('markup over 500000 reduces arrival frequency', async page => {
            const delays = await page.evaluate(() => {
                Math.random = () => 0.5;
                return [nextBuyerDelay({ price: 595000, purchasePrice: 95000 }), nextBuyerDelay({ price: 595001, purchasePrice: 95000 })];
            });
            assert.ok(delays[1] > delays[0] * 2);
        });
        await scenario('persisted buyer absence preserves car and resumes listing', async page => {
            await advertise(page, 210000);
            const id = await offer(page);
            await page.evaluate(id => { openAdChat(id); agreePrice(chat.bid); renderChat(); chat.busyUsed = true; Math.random = () => 0.01; }, id);
            await page.locator('#meetBtn').click();
            const pid = await page.evaluate(() => chat.pid);
            assert.equal(await page.evaluate(() => findPending(chat.pid).noShow), true);
            await page.locator('#chatClose').click();
            await page.reload({ waitUntil: 'networkidle' });
            await page.evaluate(pid => openMeetChat(pid), pid);
            assert.equal(await page.evaluate(() => chat.done), true);
            assert.equal(await page.evaluate(() => balance), 100000);
            assert.deepEqual(await page.evaluate(() => garage), [1]);
            assert.equal(await page.evaluate(() => deals), 0);
            assert.equal(await page.evaluate(() => pending.length), 0);
            assert.equal(await page.evaluate(() => listings[1].price), 210000);
            assert.ok((await page.locator('#meetingLog').textContent()).includes('не приехал'));
            await page.locator('#meetingFinish').click();
            await offer(page);
            assert.equal(await page.evaluate(() => pending.length), 1);
        });
        await scenario('booking pauses other offers and successful sale removes listing', async page => {
            await advertise(page, 210000);
            const id = await offer(page, 0.1); await offer(page, 0.8);
            await page.evaluate(id => { Math.random = () => 0.9; openAdChat(id); agreePrice(chat.bid); renderChat(); }, id);
            const price = await page.evaluate(() => chat.price);
            await page.locator('#meetBtn').click();
            assert.equal(await page.evaluate(() => pending.filter(it => it.type === 'ad').length), 0);
            await page.evaluate(() => { listings[1].nextBuyerAt = gameMs; tickPending(); });
            assert.equal(await page.evaluate(() => pending.length), 1);
            await page.locator('#goBtn').click();
            assert.deepEqual(await page.evaluate(() => garage), []);
            assert.equal(await page.evaluate(() => balance), 100000 + price);
            assert.equal(await page.evaluate(() => listings[1]), undefined);
            assert.equal(await page.evaluate(() => pending.length), 0);
        });
        await scenario('old ads and legacy purchase cost remain usable', async page => {
            await page.evaluate(() => {
                garage = [1]; pending = [{ id:'legacy', type:'ad', mode:'sell', carId:1, ready:true, readyAt:gameMs,
                    npc:{name:'Сергей', avatar:'👨', personality:'kind', mood:72} }]; save();
            });
            await page.reload({ waitUntil: 'networkidle' });
            assert.equal(await page.evaluate(() => listings[1].price), 90000);
            await page.evaluate(() => openAdChat('legacy'));
            assert.ok(Number.isFinite(await page.evaluate(() => chat.bid)));
        });
        await scenario('discount cannot turn a low-price sale negative', async page => {
            await advertise(page, 1);
            const id = await offer(page);
            await page.evaluate(id => { openAdChat(id); agreePrice(chat.bid); renderChat(); Math.random = () => 0.3; }, id);
            await page.locator('#meetBtn').click();
            await page.locator('#goBtn').click();
            assert.equal(await page.evaluate(() => balance), 100001);
            assert.deepEqual(await page.evaluate(() => garage), []);
        });
        await scenario('large-price bids remain safe integers', async page => {
            const result = await page.evaluate(() => {
                Math.random = () => 0.1;
                return makeBuyerOffer({ carId:1, price:Number.MAX_SAFE_INTEGER });
            });
            assert.ok(Number.isSafeInteger(result.bid));
            assert.ok(Number.isSafeInteger(result.maxBid));
        });
        await scenario('Deals separates listings from incoming and outgoing messages', async page => {
            await advertise(page, 210000);
            const first = await offer(page), second = await offer(page, 0.8);
            await page.evaluate(() => { openBuyChat(2); closeChat(); showDeals(); });
            assert.match(await page.locator('[data-dtab="ads"]').textContent(), /Объявления · 1/);
            assert.match(await page.locator('[data-dtab="in"]').textContent(), /Входящие · 2/);
            assert.match(await page.locator('[data-dtab="out"]').textContent(), /Исходящие · 1/);
            assert.equal(await page.locator('[data-sale-edit]').count(), 1);
            assert.equal(await page.locator('[data-ad-open]').count(), 0);
            await page.locator('[data-dtab="in"]').click();
            assert.equal(await page.locator('[data-ad-open]').count(), 2);
            assert.equal(await page.locator('[data-sale-edit]').count(), 0);
            await page.locator('[data-ad-open="' + first + '"]').click();
            assert.equal(await page.evaluate(() => chat.pid), first);
            await page.locator('#chatClose').click();
            await page.locator('[data-dtab="out"]').click();
            assert.equal(await page.locator('[data-chat-open]').count(), 1);
            await page.locator('[data-chat-open="2"]').click();
            assert.equal(await page.evaluate(() => chat.car.id), 2);
            await page.locator('#chatClose').click();
            await page.locator('[data-dtab="ads"]').click();
            await page.locator('.toast').evaluateAll(nodes => nodes.forEach(node => node.remove()));
            await page.evaluate(() => toastDeals('Проверка входящего сообщения'));
            await page.locator('.toast').click();
            assert.equal(await page.evaluate(() => dealsFilter), 'in');
            assert.equal(await page.locator('[data-ad-open="' + second + '"]').count(), 1);
        });
        await scenario('scheduled meeting remains a message thread and listing stays in Ads', async page => {
            await advertise(page, 210000);
            const id = await offer(page);
            await page.evaluate(id => { Math.random = () => 0.9; openAdChat(id); agreePrice(chat.bid); renderChat(); }, id);
            await page.locator('#meetBtn').click();
            await page.locator('#chatClose').click();
            await page.evaluate(() => showDeals());
            assert.match(await page.locator('[data-dtab="ads"]').textContent(), /· 1/);
            assert.match(await page.locator('[data-dtab="in"]').textContent(), /· 1/);
            assert.equal(await page.locator('[data-sale-edit]').isDisabled(), true);
            await page.locator('[data-dtab="in"]').click();
            await page.locator('[data-meet-chat]').click();
            assert.equal(await page.evaluate(() => chat.stage), 'go');
            assert.equal(await page.evaluate(() => chat.met), false);
            assert.equal(await page.evaluate(() => deals), 0);
            assert.equal(await page.evaluate(() => balance), 100000);
            await page.locator('#chatClose').click();
            assert.equal(await page.locator('[data-meet-go]').count(), 1);
        });
        await scenario('unanswered legacy ad does not count as an incoming message', async page => {
            await page.evaluate(() => {
                garage = [1]; pending = [{ id:'waiting', type:'ad', mode:'sell', carId:1, ready:false, readyAt:gameMs + 3600000,
                    npc:{name:'Сергей', avatar:'👨', personality:'kind', mood:72} }]; save();
            });
            await page.reload({ waitUntil: 'networkidle' });
            await page.evaluate(() => { openWin('market'); showDeals(); });
            assert.match(await page.locator('[data-dtab="ads"]').textContent(), /· 1/);
            assert.match(await page.locator('[data-dtab="in"]').textContent(), /· 0/);
            await page.locator('[data-dtab="in"]').click();
            assert.equal(await page.locator('#content .card').count(), 0);
            assert.ok((await page.locator('#content').textContent()).includes('Входящих сообщений пока нет'));
        });
        await scenario('three quiet hours or three random buyer messages are both possible', async page => {
            await advertise(page, 210000);
            await page.evaluate(() => { gameMs += 3 * 3600000; tickPending(); });
            assert.equal(await page.evaluate(() => pending.length), 0);
            await page.evaluate(() => { Math.random = () => 0.2; postAd(1, 210000); gameMs += 3 * 3600000; tickPending(); });
            assert.equal(await page.evaluate(() => pending.filter(it => it.type === 'ad').length), 3);
            const delays = await page.evaluate(() => {
                Math.random = () => 0.999;
                const long = nextBuyerDelay(listings[1]);
                Math.random = () => 0.01;
                return [long, nextBuyerDelay(listings[1])];
            });
            assert.ok(delays[0] > 10 * 3600000);
            assert.ok(delays[1] < 5 * 60000);
        });
        await scenario('sleep crosses midnight, receives night messages, and saves morning', async page => {
            await ownCar(page);
            const start = await page.evaluate(() => {
                gameMs = new Date(2030, 0, 15, 22, 0).getTime();
                Math.random = () => 0.2; postAd(1, 210000); openWin('clock'); return gameMs;
            });
            assert.equal(await page.locator('#sleepBtn').isDisabled(), false);
            await page.locator('#sleepBtn').click();
            const morning = new Date(2030, 0, 16, 9, 0).getTime();
            assert.equal(await page.evaluate(() => gameMs), morning);
            assert.equal(await page.locator('#sleepBtn').isDisabled(), true);
            const arrivals = await page.evaluate(() => pending.filter(it => it.type === 'ad').map(it => it.readyAt));
            assert.equal(arrivals.length, 3);
            assert.ok(arrivals.every(arrived => arrived > start && arrived < morning));
            assert.equal(await page.evaluate(() => currentGameSpeed), 120);
            await page.evaluate(() => showDeals());
            await page.locator('[data-dtab="in"]').click();
            assert.equal(await page.locator('[data-ad-open]').count(), 3);
            await page.reload({ waitUntil: 'networkidle' });
            assert.equal(await page.evaluate(() => gameMs), morning);
            assert.equal(await page.evaluate(() => pending.length), 3);
        });
        await scenario('sleep is unavailable by day and early-morning sleep ends the same day', async page => {
            await page.evaluate(() => openWin('clock'));
            assert.equal(await page.locator('#sleepBtn').isDisabled(), true);
            assert.equal(await page.evaluate(() => sleepUntilMorning()), false);
            await page.evaluate(() => { gameMs = new Date(2030, 0, 15, 8, 30).getTime(); renderGameTime(); });
            await page.locator('#sleepBtn').click();
            assert.equal(await page.evaluate(() => gameMs), new Date(2030, 0, 15, 9, 0).getTime());
            await page.evaluate(() => { gameMs = new Date(2030, 0, 15, 21, 59).getTime(); renderGameTime(); });
            assert.equal(await page.locator('#sleepBtn').isDisabled(), true);
        });
        await scenario('sleep still processes missed appointments', async page => {
            await ownCar(page);
            await page.evaluate(() => {
                gameMs = new Date(2030, 0, 15, 22).getTime();
                pending.push({id:'missed', type:'meet', mode:'buy', carId:2, price:281000, when:gameMs + 3600000, reached:false,
                    npc:{name:'Сергей', avatar:'👨', personality:'neutral', mood:50}});
                save(); openWin('clock');
            });
            await page.locator('#sleepBtn').click();
            assert.equal(await page.evaluate(() => findPending('missed')), null);
            assert.deepEqual(await page.evaluate(() => garage), [1]);
            assert.equal(await page.evaluate(() => balance), 100000);
        });
        await scenario('first visit suggests Help once and opens it', async page => {
            await page.locator('#welcomeOverlay').waitFor({state:'visible'});
            await page.locator('#welcomeHelp').click();
            assert.equal(await page.locator('#win-help').evaluate(el => el.classList.contains('open')), true);
            assert.ok((await page.locator('#win-help').textContent()).includes('22:00'));
            assert.ok((await page.locator('#win-help').textContent()).includes('три игровых часа'));
            await page.reload({ waitUntil: 'networkidle' });
            assert.equal(await page.locator('#welcomeOverlay').evaluate(el => el.classList.contains('open')), false);
        }, {firstVisit:true});
        await scenario('first visit may skip Help and existing players are not prompted', async page => {
            await page.locator('#welcomeLater').click();
            assert.equal(await page.locator('#welcomeOverlay').evaluate(el => el.classList.contains('open')), false);
            assert.equal(await page.locator('#win-help').evaluate(el => el.classList.contains('open')), false);
        }, {firstVisit:true});
        await scenario('existing saved game does not show first-visit prompt', async page => {
            assert.equal(await page.locator('#welcomeOverlay').evaluate(el => el.classList.contains('open')), false);
        }, {firstVisit:true, returningPlayer:true});
        await scenario('old buyer timing is migrated once without changing received messages', async page => {
            await ownCar(page);
            const next = await page.evaluate(() => {
                listings[1] = {carId:1, price:210000, purchasePrice:95000, nextBuyerAt:gameMs + 600000};
                pending.push(makeBuyerOffer(listings[1])); save(); return listings[1].nextBuyerAt;
            });
            await page.reload({ waitUntil:'networkidle' });
            const migrated = await page.evaluate(() => listings[1].nextBuyerAt);
            assert.ok(migrated > next);
            assert.equal(await page.evaluate(() => pending.length), 1);
            await page.reload({ waitUntil:'networkidle' });
            assert.equal(await page.evaluate(() => listings[1].nextBuyerAt), migrated);
        });
        console.log(`${passed} gameplay scenarios passed`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
