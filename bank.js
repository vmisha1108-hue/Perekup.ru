'use strict';

var bank = null, bankTab = 'credit', bankHistoryFilter = 'all', bankHistoryLimit = 20, bankRenderKey = '';
var CREDIT_AMOUNTS = [50000,100000,500000,1000000,10000000,100000000];
var CREDIT_TERMS = [6,12,24,36];
var MICRO_AMOUNTS = Array.from({length:10},function(_,i){return (i+1)*10000;});
var BANK_DAY = 86400000, BANK_MONTH = 30*BANK_DAY;

function freshBank(){
    return {version:1, sequence:0, revision:0, knownBalance:balance, entries:[], loans:[], application:null,
        nextApplicationAt:0, repaidCredits:0, missedPayments:0,
        selection:{amount:50000,months:12,microAmount:10000}, microQuote:null};
}
function bankHasProgress(){
    try{
        var stored=JSON.parse(localStorage.getItem('bank') || 'null');
        return !!(stored && ((stored.loans && stored.loans.length) || stored.application ||
            (stored.entries && stored.entries.some(function(e){return e.kind!=='opening' && e.kind!=='adjustment';}))));
    }catch(e){return false;}
}
function initBank(){
    bank=readSaved('bank',{});
    if(bank.version!==1){
        bank=freshBank();
        bankRecord(balance,localStorage.getItem('balance')===null ? 'Стартовый баланс' : 'Баланс при открытии банка','opening');
    }
    bank.entries=(Array.isArray(bank.entries)?bank.entries:[]).filter(function(e){return isRecord(e) && Number.isSafeInteger(e.amount) && Number.isSafeInteger(e.balance) && Number.isFinite(e.when) && typeof e.label==='string';});
    bank.loans=(Array.isArray(bank.loans)?bank.loans:[]).filter(function(l){
        return isRecord(l) && typeof l.id==='string' && ['credit','micro'].indexOf(l.kind)!==-1 && ['active','repaid'].indexOf(l.status)!==-1 &&
            Number.isSafeInteger(l.amount) && l.amount>0 && Number.isFinite(l.principalCents) && l.principalCents>=0 && Number.isFinite(l.accruedAt) &&
            (l.nextDueAt===null || Number.isFinite(l.nextDueAt)) &&
            (l.kind!=='credit' || (CREDIT_TERMS.indexOf(l.months)!==-1 && Number.isFinite(l.apr) && l.apr>0 && Number.isSafeInteger(l.installment) && l.installment>0));
    });
    bank.loans.forEach(function(l){
        ['interestCents','feesCents','feeTotalCents','arrearsCents','paid','period'].forEach(function(key){if(!Number.isFinite(l[key]) || l[key]<0)l[key]=0;});
        if(!Number.isFinite(l.overdueAt))l.overdueAt=null;
    });
    ['sequence','revision','nextApplicationAt','repaidCredits','missedPayments'].forEach(function(key){if(!Number.isSafeInteger(bank[key]) || bank[key]<0)bank[key]=0;});
    // Номера записей продолжаются даже при неполном старом сохранении.
    bank.entries.forEach(function(e){if(Number.isSafeInteger(e.id))bank.sequence=Math.max(bank.sequence,e.id);});
    bank.loans.forEach(function(l){var seq=Number(l.id.replace(/^l/,''));if(Number.isSafeInteger(seq))bank.sequence=Math.max(bank.sequence,seq);});
    if(!Number.isSafeInteger(bank.knownBalance))bank.knownBalance=balance;
    var app=bank.application,q=app && app.quote;
    if(!isRecord(app) || ['review','approved','declined'].indexOf(app.status)===-1 || !isRecord(q) ||
        CREDIT_AMOUNTS.indexOf(q.amount)===-1 || CREDIT_TERMS.indexOf(q.months)===-1 || !Number.isFinite(q.apr) || q.apr<=0 ||
        !Number.isSafeInteger(q.installment) || q.installment<1 || !Number.isSafeInteger(q.total) || q.total<q.amount || !Number.isFinite(app.decisionAt))bank.application=null;
    else {var appSeq=Number(typeof app.id==='string'?app.id.replace(/^a/,''):NaN);if(Number.isSafeInteger(appSeq))bank.sequence=Math.max(bank.sequence,appSeq);}
    if(!isRecord(bank.selection))bank.selection={amount:50000,months:12,microAmount:10000};
    var micro=bank.microQuote;
    if(!isRecord(micro) || MICRO_AMOUNTS.indexOf(micro.amount)===-1 || !Number.isFinite(micro.multiplier) || micro.multiplier<2 || micro.multiplier>3 ||
        micro.total!==Math.round(micro.amount*micro.multiplier) || micro.days!==14)bank.microQuote=null;
    if(CREDIT_AMOUNTS.indexOf(bank.selection.amount)===-1) bank.selection.amount=50000;
    if(CREDIT_TERMS.indexOf(bank.selection.months)===-1) bank.selection.months=12;
    if(MICRO_AMOUNTS.indexOf(bank.selection.microAmount)===-1) bank.selection.microAmount=10000;
    syncBankBalance(); saveBank(); bindBank();
}
function saveBank(){if(bank) writeSaved('bank',bank);}
function bankRecord(amount,label,kind,when){
    if(!bank || !Number.isSafeInteger(amount) || (!amount && kind!=='opening')) return;
    bank.entries.unshift({id:++bank.sequence,amount:amount,label:label || 'Операция по счёту',kind:kind || (amount<0?'expense':'income'),
        when:when==null?gameMs:when,balance:balance});
    bank.entries=bank.entries.slice(0,500);bank.knownBalance=balance;bank.revision++;saveBank();
}
function syncBankBalance(){
    if(bank && bank.knownBalance!==balance) bankRecord(balance-bank.knownBalance,'Корректировка баланса','adjustment');
}
function changeBalance(amount,label,kind,when){
    if(!Number.isSafeInteger(amount) || !Number.isSafeInteger(balance+amount) || balance+amount<0) return false;
    syncBankBalance();balance+=amount;bankRecord(amount,label,kind,when);
    localStorage.setItem('balance',String(balance));return true;
}
function bankActive(kind){return bank ? bank.loans.find(function(l){return l.kind===kind && l.status==='active';}) || null : null;}
function loanDebtCents(loan){return Math.max(0,loan.principalCents+(loan.interestCents || 0)+(loan.feesCents || 0));}
function loanDebt(loan){return Math.max(0,Math.ceil((loanDebtCents(loan)-0.000001)/100));}
function overdueCents(loan){
    if(loan.status!=='active' || !(loan.arrearsCents>0)) return 0;
    if(loan.kind==='micro' || loan.nextDueAt===null) return loanDebtCents(loan);
    return Math.min(loanDebtCents(loan),loan.arrearsCents+(loan.feesCents || 0));
}
function bankOverdue(){return bank ? bank.loans.reduce(function(s,l){return s+Math.ceil(overdueCents(l)/100);},0) : 0;}
function creditQuote(amount,months){
    if(CREDIT_AMOUNTS.indexOf(amount)===-1 || CREDIT_TERMS.indexOf(months)===-1) return null;
    var apr=20+(amount>=10000000?4:amount>=500000?2:0)+(bankActive('micro')?4:0)+Math.min(4,(bank?bank.missedPayments:0));
    apr=Math.max(18,apr-Math.min(2,(bank?bank.repaidCredits:0)));
    var rate=apr/100*30/365;
    var installment=Math.ceil(amount*rate/(1-Math.pow(1+rate,-months)));
    var remaining=amount,total=0;
    for(var i=0;i<months;i++){
        var due=remaining*(1+rate),payment=i===months-1 ? Math.ceil(due-0.000001) : Math.min(installment,Math.ceil(due-0.000001));
        total+=payment;remaining=Math.max(0,due-payment);
    }
    return {amount:amount,months:months,apr:apr,installment:installment,total:total,overpayment:total-amount};
}
function creditChance(amount){
    var base=amount===50000?.75:amount===100000?.65:amount===500000?.40:amount===1000000?.25:amount===10000000?.08:.03;
    var assets=balance+garage.reduce(function(sum,id){var c=carById(id);return sum+(c?(c.marketPrice || c.price):0);},0);
    var debts=bank.loans.reduce(function(sum,l){return sum+(l.status==='active'?loanDebt(l):0);},0);
    return clamp(base+Math.min(.25,Math.max(0,assets-debts)/amount*.1)+Math.min(.12,bank.repaidCredits*.03)-Math.min(.30,bank.missedPayments*.05),.02,.95);
}
function requestCredit(amount,months){
    advanceGameTime(Date.now());tickPending();
    var quote=creditQuote(amount,months);
    if(!quote || bankActive('credit') || bankOverdue() || gameMs<bank.nextApplicationAt || (bank.application && ['review','approved'].indexOf(bank.application.status)!==-1)) return false;
    var delay=rnd(15,180)*60000,approved=Math.random()<creditChance(amount);
    bank.application={id:'a'+(++bank.sequence),quote:quote,status:'review',submittedAt:gameMs,decisionAt:gameMs+delay,approved:approved};
    bank.revision++;saveBank();saveGameTime();renderBank(true);toast('🏦 Заявка отправлена. Банк сообщит о решении.');return true;
}
function acceptCredit(){
    advanceGameTime(Date.now());tickPending();
    var app=bank.application;
    if(!app || app.status!=='approved' || bankActive('credit') || bankOverdue() || !Number.isSafeInteger(balance+app.quote.amount)) return false;
    var q=app.quote;
    bank.loans.push({id:'l'+(++bank.sequence),kind:'credit',status:'active',amount:q.amount,principalCents:q.amount*100,
        interestCents:0,feesCents:0,feeTotalCents:0,arrearsCents:0,createdAt:gameMs,accruedAt:gameMs,
        nextDueAt:gameMs+BANK_MONTH,months:q.months,apr:q.apr,installment:q.installment,plannedTotal:q.total,period:0,paid:0,overdueAt:null});
    bank.application=null;bank.revision++;
    changeBalance(q.amount,'Выдача банковского кредита','credit');save();saveGameTime();updateStats();renderBank(true);return true;
}
function microQuote(amount){
    if(MICRO_AMOUNTS.indexOf(amount)===-1) return null;
    if(!bank.microQuote || bank.microQuote.amount!==amount){
        var multiplier=rnd(200,300)/100;
        bank.microQuote={amount:amount,multiplier:multiplier,total:Math.round(amount*multiplier),days:14};saveBank();
    }
    return bank.microQuote;
}
function takeMicro(amount){
    advanceGameTime(Date.now());tickPending();
    if(bankActive('micro') || MICRO_AMOUNTS.indexOf(amount)===-1 || !Number.isSafeInteger(balance+amount)) return false;
    var q=microQuote(amount);
    bank.loans.push({id:'l'+(++bank.sequence),kind:'micro',status:'active',amount:amount,principalCents:q.total*100,
        interestCents:0,feesCents:0,feeTotalCents:0,arrearsCents:0,createdAt:gameMs,accruedAt:gameMs,
        nextDueAt:gameMs+q.days*BANK_DAY,dueAt:gameMs+q.days*BANK_DAY,multiplier:q.multiplier,plannedTotal:q.total,paid:0,dueProcessed:false,overdueAt:null});
    bank.revision++;changeBalance(amount,'Микрозайм: мгновенная выдача','micro');save();saveGameTime();updateStats();renderBank(true);return true;
}
function accrueLoan(loan,until){
    if(loan.status!=='active' || until<=loan.accruedAt) return;
    var elapsed=until-loan.accruedAt;
    if(loan.kind==='credit') loan.interestCents+=loan.principalCents*loan.apr/100*elapsed/(365*BANK_DAY);
    if(loan.arrearsCents>0){
        var cap=loan.amount*100*.10, room=Math.max(0,cap-loan.feeTotalCents);
        var fee=Math.min(room,loan.arrearsCents*.001*elapsed/BANK_DAY);
        loan.feesCents+=fee;loan.feeTotalCents+=fee;
    }
    loan.accruedAt=until;
}
function payLoanAmount(loan,amount,when,automatic){
    if(loan.status!=='active' || !Number.isSafeInteger(amount) || amount<=0 || amount>balance) return false;
    amount=Math.min(amount,loanDebt(loan));if(!amount) return false;
    var feeBefore=loan.feesCents, cents=amount*100;
    var part=Math.min(cents,loan.feesCents);loan.feesCents-=part;cents-=part;
    part=Math.min(cents,loan.interestCents);loan.interestCents-=part;cents-=part;
    loan.principalCents=Math.max(0,loan.principalCents-cents);
    loan.arrearsCents=Math.max(0,loan.arrearsCents-Math.max(0,amount*100-feeBefore));loan.paid+=amount;
    changeBalance(-amount,(automatic?'Автоплатёж: ':'Погашение: ')+(loan.kind==='credit'?'банковский кредит':'микрозайм'),'repayment',when);
    if(loanDebtCents(loan)<.000001){
        loan.status='repaid';loan.closedAt=when;loan.arrearsCents=0;loan.overdueAt=null;
        if(loan.kind==='credit') bank.repaidCredits++;
        toast('🏦 '+(loan.kind==='credit'?'Кредит':'Микрозайм')+' полностью погашен.');
    }else if(!loan.arrearsCents) loan.overdueAt=null;
    bank.revision++;return true;
}
function collectOverdue(loan,when){
    var due=Math.ceil((overdueCents(loan)-.000001)/100);
    if(due>0 && balance>0) return payLoanAmount(loan,Math.min(balance,due),when,true);
    return false;
}
function tickBank(){
    if(!bank) return;
    syncBankBalance();var changed=false,app=bank.application;
    if(app && app.status==='review' && gameMs>=app.decisionAt){
        app.status=app.approved?'approved':'declined';
        if(!app.approved) bank.nextApplicationAt=app.decisionAt+6*3600000;
        bank.revision++;changed=true;
        toast(app.approved?'🏦 Кредит одобрен. Откройте Банк, чтобы получить деньги.':'🏦 Банк отказал в кредите. Повторная заявка через 6 игровых часов.',function(){openWin('bank');});
    }
    // Обрабатываем сроки всех долгов по порядку, в том числе при сне и перемотке.
    var events=0;
    while(events++<100){
        var next=bank.loans.filter(function(l){return l.status==='active' && l.nextDueAt!==null && l.nextDueAt<=gameMs && (l.kind==='credit' || !l.dueProcessed);})
            .sort(function(a,b){return a.nextDueAt-b.nextDueAt;})[0];
        if(!next) break;
        var at=next.nextDueAt;
        bank.loans.forEach(function(l){accrueLoan(l,at);});
        if(next.kind==='credit'){
            next.period++;
            next.arrearsCents=Math.min(next.principalCents+next.interestCents,next.period>=next.months ? next.principalCents+next.interestCents : next.arrearsCents+next.installment*100);
            next.nextDueAt=next.period>=next.months ? null : at+BANK_MONTH;
        }else{next.arrearsCents=next.principalCents;next.dueProcessed=true;}
        collectOverdue(next,at);
        if(next.status==='active' && next.arrearsCents>0){
            if(!next.overdueAt) next.overdueAt=at;
            bank.missedPayments++;
            toast('🏦 Не хватило денег на платёж. Просрочка: '+money(Math.ceil(overdueCents(next)/100))+'.');
        }
        changed=true;bank.revision++;
    }
    bank.loans.forEach(function(l){accrueLoan(l,gameMs);});
    bank.loans.filter(function(l){return overdueCents(l)>0;}).sort(function(a,b){return (a.overdueAt || a.dueAt)-(b.overdueAt || b.dueAt);}).forEach(function(l){if(collectOverdue(l,gameMs)) changed=true;});
    syncCollectors();
    if(changed){save();saveGameTime();updateStats();}renderBank();
}
function payBankLoan(id,amount,full){
    var original=bank.loans.find(function(l){return l.id===id && l.status==='active';});
    advanceGameTime(Date.now());tickPending();
    var loan=bank.loans.find(function(l){return l.id===id && l.status==='active';});
    if(!loan) return !!(original && original.status==='repaid');
    if(full) amount=loanDebt(loan);
    if(!Number.isSafeInteger(amount) || amount<=0 || amount>balance){toast('Не хватает денег на такой платёж.');return false;}
    if(!payLoanAmount(loan,amount,gameMs,false)) return false;
    syncCollectors();
    save();saveGameTime();updateStats();renderBank(true);return true;
}
function waitForBank(){
    advanceGameTime(Date.now());tickPending();
    if(!bank.application || bank.application.status!=='review' || (chat && chat.met && !chat.done)) return false;
    var until=bank.application.decisionAt;
    while(gameMs<until){gameMs=Math.min(until,gameMs+15*60000);tickPending();}
    lastRealMs=Date.now();saveGameTime();save();renderGameTime();renderBank(true);return true;
}
function bankSelectOptions(values,current){return values.map(function(value){return '<option value="'+value+'"'+(value===current?' selected':'')+'>'+money(value)+'</option>';}).join('');}
function bankSummaryRows(rows){return '<dl class="bank-terms">'+rows.map(function(row){return '<div><dt>'+row[0]+'</dt><dd>'+row[1]+'</dd></div>';}).join('')+'</dl>';}
function creditForm(){
    var active=bankActive('credit'),app=bank.application,q=creditQuote(bank.selection.amount,bank.selection.months);
    var html='<h3>Банковский кредит</h3><p class="bank-muted">Банк рассматривает заявку от 15 минут до 3 игровых часов. Одобрение зависит от суммы, имущества, долгов и случайного решения.</p>';
    if(app && (app.status==='review' || app.status==='approved')){
        html+='<div class="bank-request '+app.status+'"><b>'+(app.status==='review'?'⏳ Заявка рассматривается':'✓ Кредит одобрен')+'</b><p>'+money(app.quote.amount)+' · '+app.quote.apr+'% годовых · '+app.quote.months+' мес.</p>';
        html+=bankSummaryRows([['Ежемесячный платёж',money(app.quote.installment)],['Всего по графику',money(app.quote.total)],['Переплата',money(app.quote.overpayment)]]);
        html+=app.status==='review'?'<p>Осталось: <span data-bank-review>'+fmtDur(app.decisionAt-gameMs)+'</span></p><button data-bank-wait'+(chat && chat.met && !chat.done?' disabled':'')+'>Дождаться решения</button>'
            :'<button data-bank-accept'+(bankOverdue() || active?' disabled':'')+'>Получить '+money(app.quote.amount)+'</button>';
        html+='<button class="bank-secondary" data-bank-cancel>Отменить заявку</button></div>';return html;
    }
    if(app && app.status==='declined') html+='<p class="bank-warning">В кредите отказано.'+(gameMs<bank.nextApplicationAt?' Новая заявка после '+fmtMeet(new Date(bank.nextApplicationAt))+'.':' Можно отправить новую заявку.')+'</p>';
    html+='<div class="bank-form-grid"><label>Сумма<select id="bankCreditAmount">'+bankSelectOptions(CREDIT_AMOUNTS,bank.selection.amount)+'</select></label><label>Срок<select id="bankCreditTerm">'+CREDIT_TERMS.map(function(m){return '<option value="'+m+'"'+(m===bank.selection.months?' selected':'')+'>'+m+' месяцев</option>';}).join('')+'</select></label></div>';
    html+=bankSummaryRows([['Ставка',q.apr+'% годовых'],['Платёж каждые 30 дней',money(q.installment)],['Всего по графику',money(q.total)],['Переплата',money(q.overpayment)]]);
    html+='<button data-bank-request'+(active || bankOverdue() || gameMs<bank.nextApplicationAt?' disabled':'')+'>Отправить заявку</button>';
    if(active) html+='<p class="bank-muted">Сначала погасите действующий банковский кредит.</p>';
    else if(bankOverdue()) html+='<p class="bank-warning">Для нового кредита нужно погасить просрочку.</p>';
    return html;
}
function microForm(){
    var q=microQuote(bank.selection.microAmount),active=bankActive('micro');
    return '<h3>Микрозайм без ожидания</h3><p class="bank-muted">Деньги поступят сразу. Условия ниже фиксируются до оформления: повторное открытие окна их не меняет.</p><label>Сумма<select id="bankMicroAmount">'+bankSelectOptions(MICRO_AMOUNTS,bank.selection.microAmount)+'</select></label>'+
        bankSummaryRows([['Вы получите',money(q.amount)],['Срок','14 игровых дней'],['Возврат',q.multiplier.toFixed(2).replace('.',',')+' × сумма'],['Переплата',money(q.total-q.amount)+' ('+Math.round((q.multiplier-1)*100)+'%)'],['Всего вернуть',money(q.total)]])+
        '<p class="bank-warning">При досрочном погашении сумма возврата остаётся '+money(q.total)+'.</p><button data-bank-micro'+(active?' disabled':'')+'>Получить '+money(q.amount)+' · вернуть '+money(q.total)+'</button>'+(active?'<p class="bank-muted">Одновременно доступен один микрозайм.</p>':'');
}
function loanCard(loan){
    var debt=loanDebt(loan),late=Math.ceil(overdueCents(loan)/100);
    var rows=[['Получено',money(loan.amount)],['Уже внесено',money(loan.paid)],['Полностью погасить сегодня','<span data-bank-debt="'+loan.id+'">'+money(debt)+'</span>']];
    if(loan.kind==='credit') rows.push(['Ставка',loan.apr+'% годовых'],['Ежемесячный платёж',money(loan.installment)],['Следующий платёж',loan.nextDueAt===null?'Срок закончился':fmtMeet(new Date(loan.nextDueAt))]);
    else rows.push(['Сумма возврата',money(loan.plannedTotal)],['Вернуть до',fmtMeet(new Date(loan.dueAt))]);
    if(late) rows.push(['Просрочено','<span class="bank-warning" data-bank-arrears="'+loan.id+'">'+money(late)+'</span>']);
    return '<article class="bank-loan '+(late?'overdue':'')+'"><h3>'+(loan.kind==='credit'?'🏦 Действующий кредит':'⚡ Действующий микрозайм')+'</h3>'+bankSummaryRows(rows)+
        '<div class="bank-payment"><input id="bankPay-'+loan.id+'" type="number" min="1" step="1" placeholder="Сумма платежа, ₽" aria-label="Сумма платежа"><button data-bank-pay="'+loan.id+'">Внести</button></div>'+
        '<button class="bank-secondary" data-bank-full="'+loan.id+'"'+(balance<debt?' disabled':'')+'>Погасить полностью</button></article>';
}
function renderBank(force){
    if(!bank || !document.getElementById('bankBody')) return;
    var win=document.getElementById('win-bank');if(!win.classList.contains('open')) return;
    var key=bank.revision+':'+balance+':'+bankTab+':'+bankHistoryFilter+':'+bankHistoryLimit+':'+(gameMs>=bank.nextApplicationAt);
    if(force || key!==bankRenderKey){
        bankRenderKey=key;var values={};document.querySelectorAll('#bankBody input').forEach(function(el){values[el.id]=el.value;});
        var focused=document.activeElement && document.activeElement.id;
        var loans=bank.loans.filter(function(l){return l.status==='active';});
        var entries=bank.entries.filter(function(e){return bankHistoryFilter==='all' || (bankHistoryFilter==='expenses'?e.amount<0:e.amount>0);});
        document.getElementById('bankBody').innerHTML='<div class="bank-balance-card"><span>Доступно на счёте</span><strong id="bankBalance">'+money(balance)+'</strong><div id="bankOverdue"></div></div>'+
            collectorBankPanel()+(loans.length?'<div class="bank-loans">'+loans.map(loanCard).join('')+'</div>':'')+
            '<div class="bank-tabs"><button data-bank-tab="credit" class="'+(bankTab==='credit'?'active':'')+'">🏦 Кредит</button><button data-bank-tab="micro" class="'+(bankTab==='micro'?'active':'')+'">⚡ Микрозайм</button></div><section class="bank-products">'+(bankTab==='credit'?creditForm():microForm())+'</section>'+
            '<p class="bank-muted bank-rules">Платежи списываются автоматически в срок. При нехватке денег остаток становится просрочкой; новые поступления идут на её погашение. Пеня — 0,1% просроченной суммы за игровой день, максимум 10% полученной суммы. После 90 дней непрерывной просрочки подключаются коллекторы: звонки, помехи переговорам и задержки встреч. Месяц — 30 игровых дней. Пока игра закрыта, время не идёт.</p>'+
            '<section class="bank-history"><div class="bank-history-head"><h3>История операций</h3><select id="bankHistoryFilter" aria-label="Фильтр истории"><option value="all"'+(bankHistoryFilter==='all'?' selected':'')+'>Все операции</option><option value="expenses"'+(bankHistoryFilter==='expenses'?' selected':'')+'>Расходы</option><option value="income"'+(bankHistoryFilter==='income'?' selected':'')+'>Поступления</option></select></div>'+
            (!entries.length?'<p class="bank-muted">Операций пока нет.</p>':'<ol class="bank-history-list">'+entries.slice(0,bankHistoryLimit).map(function(e){return '<li><div><b>'+esc(e.label)+'</b><small>'+fmtMeet(new Date(e.when))+' · Остаток '+money(e.balance)+'</small></div><strong class="'+(e.amount<0?'expense':'income')+'">'+(e.amount>0?'+':'')+money(e.amount)+'</strong></li>';}).join('')+'</ol>')+
            (entries.length>bankHistoryLimit?'<button class="bank-secondary" data-bank-history-more>Показать ещё 20</button>':'')+'</section>';
        Object.keys(values).forEach(function(id){var el=document.getElementById(id);if(el)el.value=values[id];});
        if(focused && document.getElementById(focused)) document.getElementById(focused).focus();
    }
    document.getElementById('bankBalance').textContent=money(balance);
    document.getElementById('bankOverdue').textContent=bankOverdue()?'Просрочка: '+money(bankOverdue()):'Деньги доступны для покупок и поездок';
    document.querySelectorAll('[data-bank-review]').forEach(function(el){if(bank.application)el.textContent=fmtDur(bank.application.decisionAt-gameMs);});
    bank.loans.forEach(function(l){
        var el=document.querySelector('[data-bank-debt="'+l.id+'"]');if(el)el.textContent=money(loanDebt(l));
        el=document.querySelector('[data-bank-arrears="'+l.id+'"]');if(el)el.textContent=money(Math.ceil(overdueCents(l)/100));
        el=document.querySelector('[data-bank-full="'+l.id+'"]');if(el)el.disabled=balance<loanDebt(l);
    });
}
function bindBank(){
    document.getElementById('bankBody').addEventListener('change',function(event){
        var id=event.target.id,value=Number(event.target.value);
        if(['bankCreditAmount','bankCreditTerm','bankMicroAmount','bankHistoryFilter'].indexOf(id)===-1) return;
        if(id==='bankCreditAmount' && CREDIT_AMOUNTS.indexOf(value)!==-1) bank.selection.amount=value;
        if(id==='bankCreditTerm' && CREDIT_TERMS.indexOf(value)!==-1) bank.selection.months=value;
        if(id==='bankMicroAmount' && MICRO_AMOUNTS.indexOf(value)!==-1){bank.selection.microAmount=value;microQuote(value);}
        if(id==='bankHistoryFilter'){bankHistoryFilter=event.target.value;bankHistoryLimit=20;}
        saveBank();renderBank(true);
    });
    document.getElementById('bankBody').addEventListener('click',function(event){
        var btn=event.target.closest('button');if(!btn || btn.disabled) return;
        if(btn.dataset.bankTab){bankTab=btn.dataset.bankTab;renderBank(true);}
        if(btn.hasAttribute('data-bank-request')) requestCredit(bank.selection.amount,bank.selection.months);
        if(btn.hasAttribute('data-bank-wait')) waitForBank();
        if(btn.hasAttribute('data-bank-accept')) acceptCredit();
        if(btn.hasAttribute('data-bank-cancel')){bank.application=null;bank.revision++;saveBank();renderBank(true);}
        if(btn.hasAttribute('data-bank-micro')) takeMicro(bank.selection.microAmount);
        if(btn.dataset.bankPay) payBankLoan(btn.dataset.bankPay,Number(document.getElementById('bankPay-'+btn.dataset.bankPay).value),false);
        if(btn.dataset.bankFull) payBankLoan(btn.dataset.bankFull,null,true);
        if(btn.hasAttribute('data-bank-history-more')){bankHistoryLimit+=20;renderBank(true);}
    });
}
