const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const fsSync=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream'}).end(data);}catch(e){res.writeHead(404).end();}
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fsSync.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
    let passed=0;
    async function scenario(name,run,viewport={width:1280,height:900},init){
        const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{localStorage.setItem('helpPromptSeen','1');window.testNow=new Date(2030,0,15,12).getTime();Date.now=()=>testNow;Math.random=()=>.9;});
        if(init)await page.addInitScript(init);
        try{await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}finally{await context.close();}
    }
    async function approved(page,amount=50000,months=12){
        await page.evaluate(({amount,months})=>{Math.random=()=>0;requestCredit(amount,months);waitForBank();acceptCredit();Math.random=()=>.9;},{amount,months});
    }
    try{
        await scenario('bank icon, exact amount choices, current balance and expense history',async page=>{
            assert.equal(await page.locator('.desk-icon[data-app="bank"]').count(),1);
            await page.evaluate(()=>openWin('bank'));
            assert.match(await page.locator('#bankBalance').textContent(),/100\s000/);
            assert.deepEqual(await page.locator('#bankCreditAmount option').evaluateAll(els=>els.map(e=>Number(e.value))),[50000,100000,500000,1000000,10000000,100000000]);
            await page.locator('[data-bank-tab="micro"]').click();
            assert.deepEqual(await page.locator('#bankMicroAmount option').evaluateAll(els=>els.map(e=>Number(e.value))),[10000,20000,30000,40000,50000,60000,70000,80000,90000,100000]);
            await page.evaluate(()=>{spend(2500,'Тестовая покупка');save();updateStats();});
            await page.selectOption('#bankHistoryFilter','expenses');
            assert.match(await page.locator('.bank-history-list').textContent(),/Тестовая покупка/);
            assert.equal(await page.locator('.bank-history-list li').count(),1);
            assert.equal(await page.evaluate(()=>bank.entries.reduce((s,e)=>s+e.amount,0)),97500);
        });
        await scenario('review duration and approval decision persist; money arrives exactly once after acceptance',async page=>{
            await page.evaluate(()=>{openWin('bank');Math.random=()=>0;requestCredit(50000,12);});
            const before=await page.evaluate(()=>({app:bank.application,balance}));
            assert.equal(before.app.status,'review');assert.equal(before.app.decisionAt-before.app.submittedAt,15*60000);assert.equal(before.balance,100000);
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>openWin('bank'));
            assert.deepEqual(await page.evaluate(()=>bank.application),before.app);
            await page.locator('[data-bank-wait]').click();assert.equal(await page.evaluate(()=>bank.application.status),'approved');
            assert.equal(await page.evaluate(()=>balance),100000);
            await page.locator('[data-bank-accept]').click();
            assert.equal(await page.evaluate(()=>balance),150000);assert.equal(await page.evaluate(()=>bank.loans.length),1);
            await page.evaluate(()=>acceptCredit());assert.equal(await page.evaluate(()=>balance),150000);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>balance),150000);
            assert.equal(await page.evaluate(()=>bank.entries.filter(e=>e.kind==='credit').length),1);
        });
        await scenario('refusal is random, does not credit money, and has a six-hour retry delay',async page=>{
            await page.evaluate(()=>{Math.random=()=>.999;requestCredit(100000000,36);});
            const a=await page.evaluate(()=>bank.application);assert.equal(a.decisionAt-a.submittedAt,180*60000);
            await page.evaluate(()=>waitForBank());assert.equal(await page.evaluate(()=>bank.application.status),'declined');assert.equal(await page.evaluate(()=>balance),100000);
            assert.equal(await page.evaluate(()=>requestCredit(50000,12)),false);
            await page.evaluate(()=>{gameMs=bank.nextApplicationAt;Math.random=()=>0;});assert.equal(await page.evaluate(()=>requestCredit(50000,6)),true);
        });
        await scenario('all credit terms amortize completely and the displayed total equals all scheduled debits',async page=>{
            const results=await page.evaluate(()=>{
                const results=[];
                for(const amount of CREDIT_AMOUNTS) for(const months of CREDIT_TERMS){
                    balance=300000000;bank=freshBank();bankRecord(balance,'Начальный баланс','opening');
                    Math.random=()=>0;requestCredit(amount,months);waitForBank();acceptCredit();
                    const l=bankActive('credit');gameMs=l.createdAt+months*BANK_MONTH;tickBank();
                    results.push({amount,months,status:l.status,paid:l.paid,total:l.plannedTotal,debt:loanDebt(l),balance,ledger:bank.entries.reduce((s,e)=>s+e.amount,0)});
                }
                return results;
            });
            assert.equal(results.length,24);
            for(const r of results){assert.equal(r.status,'repaid',JSON.stringify(r));assert.equal(r.paid,r.total,JSON.stringify(r));assert.equal(r.debt,0);assert.ok(r.total>r.amount);assert.equal(r.ledger,r.balance);}
        });
        await scenario('early repayment charges only elapsed bank interest, and partial payments reduce principal',async page=>{
            await approved(page);
            const first=await page.evaluate(()=>{
                const l=bankActive('credit');gameMs=l.createdAt+10*BANK_DAY;tickBank();
                const expected=Math.ceil(50000+50000*l.apr/100*10/365-1e-8),before=balance;
                const id=l.id;payBankLoan(id,10000,false);const principal=l.principalCents/100;
                payBankLoan(id,null,true);return{expected,paid:before-balance,principal,status:l.status};
            });
            assert.equal(first.paid,first.expected);assert.ok(first.principal<50000);assert.equal(first.status,'repaid');
            await approved(page,100000,6);
            const immediate=await page.evaluate(()=>{const l=bankActive('credit'),before=balance;payBankLoan(l.id,null,true);return before-balance;});
            assert.equal(immediate,100000);
        });
        await scenario('microloan is immediate, quote survives reload, pays back 2–3 times and remains expensive when repaid early',async page=>{
            await page.evaluate(()=>{openWin('bank');bankTab='micro';renderBank(true);});
            await page.selectOption('#bankMicroAmount','100000');const q=await page.evaluate(()=>bank.microQuote);
            assert.ok(q.total>=200000&&q.total<=300000);
            await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>{openWin('bank');bankTab='micro';renderBank(true);});
            assert.deepEqual(await page.evaluate(()=>bank.microQuote),q);
            await page.locator('[data-bank-micro]').click();assert.equal(await page.evaluate(()=>balance),200000);
            assert.equal(await page.evaluate(()=>takeMicro(100000)),false);
            await page.evaluate(()=>{changeBalance(200000,'Пополнение','income');save();});
            const paid=await page.evaluate(()=>{const l=bankActive('micro'),before=balance;payBankLoan(l.id,null,true);return{paid:before-balance,status:l.status};});
            assert.equal(paid.paid,q.total);assert.equal(paid.status,'repaid');
        });
        await scenario('insufficient scheduled funds become overdue, penalties cap, and new income settles arrears',async page=>{
            await approved(page);
            const state=await page.evaluate(()=>{
                const l=bankActive('credit');changeBalance(10-balance,'Остальные деньги потрачены','expense');
                gameMs=l.nextDueAt;tickBank();const first={balance,arrears:l.arrearsCents,missed:bank.missedPayments};
                gameMs+=400*BANK_DAY;tickBank();const fee=l.feeTotalCents;
                const denied=requestCredit(100000,12);changeBalance(100000,'Доход от продажи','sale');tickBank();
                return {first,fee,cap:l.amount*100*.1,denied,status:l.status,balance,overdue:bankOverdue()};
            });
            assert.equal(state.first.balance,0);assert.ok(state.first.arrears>0);assert.ok(state.first.missed>0);
            assert.ok(state.fee<=state.cap+.001);assert.equal(state.denied,false);assert.equal(state.status,'repaid');assert.equal(state.overdue,0);assert.ok(state.balance>=0);
        });
        await scenario('payments are processed chronologically across both loan kinds',async page=>{
            const state=await page.evaluate(()=>{
                Math.random=()=>0;requestCredit(50000,6);waitForBank();acceptCredit();takeMicro(10000);
                const credit=bankActive('credit'),micro=bankActive('micro');changeBalance(micro.plannedTotal-balance,'Остаток','adjustment');
                gameMs=credit.nextDueAt;tickBank();
                return {micro:micro.status,creditArrears:credit.arrearsCents,balance,entries:bank.entries.filter(e=>e.kind==='repayment').map(e=>({when:e.when,label:e.label}))};
            });
            assert.equal(state.micro,'repaid');assert.ok(state.creditArrears>0);assert.equal(state.balance,0);assert.match(state.entries.at(-1).label,/микрозайм/);
        });
        await scenario('sleep crosses a loan deadline, reload never repeats a debit and reset clears debt/history',async page=>{
            await approved(page,50000,6);
            await page.evaluate(()=>{
                const l=bankActive('credit');l.nextDueAt=l.createdAt+BANK_MONTH+11*3600000;
                gameMs=l.nextDueAt-3600000;tickBank();openWin('clock');
            });
            await page.locator('#sleepBtn').click();
            const before=await page.evaluate(()=>({balance,count:bank.entries.filter(e=>e.kind==='repayment').length,debt:loanDebt(bankActive('credit'))}));
            assert.equal(before.count,1);
            await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>balance),before.balance);
            assert.equal(await page.evaluate(()=>bank.entries.filter(e=>e.kind==='repayment').length),1);
            page.once('dialog',d=>d.accept());await page.evaluate(()=>admReset());
            assert.equal(await page.evaluate(()=>balance),100000);assert.equal(await page.evaluate(()=>bank.loans.length),0);assert.equal(await page.evaluate(()=>bank.entries.length),1);
        });
        await scenario('purchases, sales, exchanges, garage, parking and travel have real ledger descriptions',async page=>{
            const data=await page.evaluate(()=>{
                changeBalance(5000000,'Пополнение для сделок','income');openBuyChat(1);finishBuy(90000);closeChat();
                const ad={id:'bank-sale',npc:{name:'Анна',avatar:'👩',personality:'kind',mood:80},bid:110000,maxBid:120000,listingPrice:110000};openSellChat(1,ad);finishSell(110000);closeChat();
                buyGarage(1);depart(cityNamed('Нижний Новгород').id,'train');waitForTransport();closeArrival();
                garage.push(2);parkVehicle(2,transport.cityId);purchasePrices[2]=80000;save();gameMs+=BANK_DAY;tickPending();shipVehicle(2);waitForTransport();
                return{labels:bank.entries.map(e=>e.label),balance,ledger:bank.entries.reduce((s,e)=>s+e.amount,0)};
            });
            for(const term of ['Покупка автомобиля','Продажа автомобиля','Расширение гаража','Переезд','Парковка','Автовоз'])assert.ok(data.labels.some(label=>label.includes(term)),term);
            assert.equal(data.ledger,data.balance);
        });
        await scenario('bank balance and lending controls fit mobile and do not erase a payment being typed',async page=>{
            await approved(page);await page.evaluate(()=>openWin('bank'));
            const l=await page.evaluate(()=>bankActive('credit').id);
            await page.locator('#bankPay-'+l).fill('1234');await page.evaluate(()=>{gameMs+=60000;tickBank();});
            assert.equal(await page.locator('#bankPay-'+l).inputValue(),'1234');
            const before=await page.evaluate(()=>balance);
            await page.locator('[data-bank-pay="'+l+'"]').click();
            assert.equal(await page.evaluate(()=>balance),before-1234);
            const rect=await page.locator('#win-bank').boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=392);
            assert.ok(await page.locator('#bankBody').evaluate(el=>el.scrollWidth<=el.clientWidth));
            await page.screenshot({path:'/workspace/scratch/3151c7eebd10/bank-mobile.png'});
        },{width:390,height:844});
        await scenario('old saved cash is preserved with an honest opening entry; zero offline time adds no interest',async page=>{
            assert.equal(await page.evaluate(()=>balance),750000);
            assert.equal(await page.evaluate(()=>bank.entries.length),1);assert.equal(await page.evaluate(()=>bank.entries[0].amount),750000);
            await approved(page);const before=await page.evaluate(()=>{tickBank();save();saveGameTime();return {gameMs,loan:bankActive('credit'),balance};});
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>gameMs),before.gameMs);assert.equal(await page.evaluate(()=>balance),before.balance);
            assert.equal(await page.evaluate(()=>bankActive('credit').interestCents),before.loan.interestCents);
        },undefined,()=>{if(!localStorage.getItem('bank'))localStorage.setItem('balance','750000');localStorage.setItem('startingBalanceVersion','1');});
        await scenario('an outstanding loan prevents legacy million migration from deleting borrowed money',async page=>{
            await approved(page,1000000,12);
            await page.evaluate(()=>{spend(100000,'Покупка');save();localStorage.removeItem('startingBalanceVersion');});
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(()=>balance),1000000);assert.equal(await page.evaluate(()=>bankActive('credit').amount),1000000);
        });
        console.log(passed+' bank scenarios passed');
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
