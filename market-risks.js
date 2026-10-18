'use strict';

// Only private-market purchases use these risks; old owned cars are not rerolled.
var marketRisks=null;
var MARKET_FAULTS=[
    {name:'Падение компрессии в двигателе',symptom:'После передачи машина начала троить, загорелась ошибка двигателя.',factor:.13,min:18000},
    {name:'Внутренний износ коробки передач',symptom:'После передачи появились рывки и пробуксовка коробки передач.',factor:.11,min:15000},
    {name:'Потеря давления масла',symptom:'После прогрева загорелась лампа давления масла.',factor:.08,min:12000},
    {name:'Утечка в системе охлаждения',symptom:'После передачи двигатель начал перегреваться из-за скрытой утечки.',factor:.045,min:7000},
    {name:'Неисправность топливной системы',symptom:'После передачи двигатель начал глохнуть под нагрузкой.',factor:.06,min:9000},
    {name:'Скрытая неисправность блока управления',symptom:'После передачи проявились перебои в работе электроники двигателя.',factor:.07,min:10000}
];
function freshMarketRisks(){return {version:1,vehicles:{},seizures:[],notice:null};}
function saveMarketRisks(){if(marketRisks)writeSaved('marketRisks',marketRisks);}
function marketGameOver(){return !!(marketRisks && marketRisks.seizures.length>=5);}
function privateMarketCar(car){return !!car && (CARS.indexOf(car)!==-1 || car.expanded===true);}
function rollMarketRisk(car){
    var stolen=Math.random()<.03,defect=Math.random()<.30,type=Math.floor(Math.random()*MARKET_FAULTS.length),fault=MARKET_FAULTS[type];
    return {stolen:stolen,defect:defect,type:type,repairCost:Math.max(fault.min,Math.min(350000,Math.round((car.basePrice || car.price)*fault.factor/500)*500)),
        manualFound:Math.random()<.05,pickerFound:Math.random()<.30,manualChecked:false,pickerChecked:false,pickerPaid:0,purchased:false,discovered:false,repaired:false};
}
function marketRiskFor(car,create){
    if(!marketRisks || !privateMarketCar(car))return null;
    if(!marketRisks.vehicles[car.id] && create){marketRisks.vehicles[car.id]=rollMarketRisk(car);saveMarketRisks();}
    return marketRisks.vehicles[car.id] || null;
}
function marketFaultText(risk){return MARKET_FAULTS[risk.type].name+' · ремонт '+money(risk.repairCost);}
function checkMarketCar(car,professional){
    var risk=marketRiskFor(car,true);if(!risk || risk.purchased)return false;
    var key=professional?'pickerChecked':'manualChecked';if(risk[key])return false;
    if(professional){if(!spend(3000,'Автоподбор перед покупкой: '+car.name))return false;risk.pickerPaid=3000;}
    risk[key]=true;
    if(risk.defect && (professional?risk.pickerFound:risk.manualFound))risk.discovered=true;
    save();return true;
}
function marketPicker(){
    if(marketGameOver())return false;advanceGameTime(Date.now());tickPending();
    if(marketGameOver() || !chat || chat.done || !chat.met || chat.trade || chat.mode!=='buy' || ['inspection','event','contract'].indexOf(chat.stage)===-1 || !meetingHere('buy',chat.car.id))return false;
    if(!checkMarketCar(chat.car,true))return false;
    var risk=marketRiskFor(chat.car);
    sysSay(risk.defect && risk.pickerFound?'🔧 Автоподбор: обнаружена скрытая поломка. '+marketFaultText(risk)+'.':'Автоподбор завершён. Специалист не обнаружил скрытой поломки; это не гарантия исправности.');
    updateStats();renderChat();return true;
}
function renderMarketInspection(){
    var box=$('marketInspection');if(!box)return;
    var eligible=chat && chat.met && !chat.done && !chat.trade && chat.mode==='buy' && privateMarketCar(chat.car) && ['inspection','event','contract'].indexOf(chat.stage)!==-1;
    box.hidden=!eligible;if(!eligible)return;
    var risk=marketRiskFor(chat.car),found=risk && risk.discovered;
    box.innerHTML='<b>Проверка скрытых поломок</b><p>Поломка встречается у 30% машин авторынка. Если она есть, ваш осмотр обнаружит её с шансом 5%, автоподбор — 30%. Повторная проверка не меняет результат.</p>'+
        (risk && risk.manualChecked?'<p>Ваш осмотр: '+(risk.defect && risk.manualFound?'обнаружена поломка.':'скрытая поломка не обнаружена. Это не гарантия исправности.')+'</p>':'')+
        (found?'<p class="market-fault">'+esc(marketFaultText(risk))+'. Можно отказаться от покупки до подписания договора.</p>':'')+
        (risk && risk.pickerChecked?'<p>Автоподбор оплачен: 3 000 ₽. '+(risk.defect && risk.pickerFound?'Специалист обнаружил поломку.':'Специалист не обнаружил скрытой поломки. Гарантии нет.')+'</p>':'<button id="marketPicker" type="button"'+(!canAfford(3000)?' disabled':'')+'>Заказать автоподбор · 3 000 ₽</button>');
}
function applyMarketPurchase(car,price){
    var risk=marketRiskFor(car,true);if(!risk || risk.purchased)return '';
    risk.purchased=true;
    if(risk.pickerPaid){purchasePrices[car.id]+=risk.pickerPaid;careerVehicle(car).repairPaid+=risk.pickerPaid;}
    if(risk.stolen){
        garage=garage.filter(function(id){return id!==car.id;});removeVehicle(car.id);delete purchasePrices[car.id];delete listings[car.id];
        marketRisks.seizures.push({carId:car.id,when:gameMs,loss:price+risk.pickerPaid});marketRisks.notice=car.id;
        saveMarketRisks();setTimeout(showMarketRiskNotice,0);
        return ' 🚓 Машина оказалась в угоне. Полиция немедленно изъяла её без возврата денег. Случаев: '+marketRisks.seizures.length+' / 5.';
    }
    if(risk.defect){risk.discovered=true;saveMarketRisks();return ' 🔧 '+MARKET_FAULTS[risk.type].symptom+' '+marketFaultText(risk)+'. Ремонт доступен в гараже.';}
    saveMarketRisks();return '';
}
function unrepairedMarketFault(car){var risk=marketRiskFor(car);return risk && risk.purchased && risk.defect && risk.discovered && !risk.repaired?risk:null;}
function marketConditionHtml(car){
    var risk=marketRiskFor(car);if(!risk || !risk.purchased || !risk.defect)return '';
    return '<section class="vehicle-condition market-hidden-fault"><b>Скрытая механическая поломка</b><p>'+esc(risk.repaired?MARKET_FAULTS[risk.type].name+' — устранена.':marketFaultText(risk))+'.</p>'+(!risk.repaired?'<button data-market-repair="'+car.id+'">Оплатить ремонт · '+money(risk.repairCost)+'</button>':'')+'</section>';
}
function repairMarketFault(id){
    if(marketGameOver())return false;advanceGameTime(Date.now());tickPending();
    var car=carById(id),risk=car && unrepairedMarketFault(car),v=vehicleState(id);
    if(!risk || garage.indexOf(id)===-1 || !v || v.cityId!==transport.cityId || transport.trip || vehicleMoving(id) || carHasMeeting(id) || !spend(risk.repairCost,'Ремонт скрытой поломки: '+car.name))return false;
    risk.repaired=true;purchasePrices[id]=purchaseCost(car)+risk.repairCost;careerVehicle(car).repairPaid+=risk.repairCost;career.revision++;
    save();renderGarageApp();renderBusiness(true);updateStats();return true;
}
function showMarketRiskNotice(){
    var ended=marketGameOver(),box=$('marketRiskOverlay');if(!box)return;
    var seizure=marketRisks.seizures.find(function(s){return s.carId===marketRisks.notice;});
    box.classList.toggle('open',ended || !!seizure);
    if(!ended && !seizure)return;
    $('marketRiskTitle').textContent=ended?'Игра окончена':'Полиция изъяла автомобиль';
    $('marketRiskText').textContent=(seizure?carById(seizure.carId).name+' оказался в угоне. Машину немедленно забрала полиция. Потеряно '+money(seizure.loss)+'. ':'')+'Куплено угнанных машин: '+marketRisks.seizures.length+' / 5. '+(ended?'После пятого случая продолжать эту игру нельзя. Можно сохранить копию и начать заново.':'Деньги не возвращаются. После пятого такого случая игра заканчивается.');
    $('marketRiskContinue').hidden=ended;$('marketRiskRestart').hidden=!ended;$('marketRiskExport').hidden=!ended;
    document.body.classList.toggle('market-game-over',ended);
    Array.from(document.body.children).forEach(function(el){if(el!==box && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName))el.inert=ended;});
    (ended?$('marketRiskRestart'):$('marketRiskContinue')).focus();
}
function initMarketRisks(){
    var saved=readSaved('marketRisks',{});marketRisks=saved.version===1?saved:freshMarketRisks();
    if(!isRecord(marketRisks.vehicles))marketRisks.vehicles={};
    Object.keys(marketRisks.vehicles).forEach(function(id){var r=marketRisks.vehicles[id];if(!privateMarketCar(carById(Number(id))) || !isRecord(r) || !Number.isInteger(r.type) || !MARKET_FAULTS[r.type] || !Number.isSafeInteger(r.repairCost) || r.repairCost<1 || r.repairCost>350000 || [0,3000].indexOf(r.pickerPaid)===-1 || ['stolen','defect','manualFound','pickerFound','manualChecked','pickerChecked','purchased','discovered','repaired'].some(function(k){return typeof r[k]!=='boolean';}))delete marketRisks.vehicles[id];});
    var seen=new Set();marketRisks.seizures=(Array.isArray(marketRisks.seizures)?marketRisks.seizures:[]).filter(function(s){if(!isRecord(s) || !privateMarketCar(carById(s.carId)) || !Number.isFinite(s.when) || !Number.isSafeInteger(s.loss) || s.loss<1 || seen.has(s.carId))return false;seen.add(s.carId);return true;}).slice(0,5);
    saveMarketRisks();
    document.addEventListener('keydown',function(e){
        var box=$('marketRiskOverlay');if(!box.classList.contains('open'))return;
        if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return;}
        if(e.key==='Tab'){var buttons=Array.from(box.querySelectorAll('button')).filter(function(b){return !b.hidden;}),index=buttons.indexOf(document.activeElement);if(e.shiftKey && index<=0){e.preventDefault();buttons[buttons.length-1].focus();}else if(!e.shiftKey && (index<0 || index===buttons.length-1)){e.preventDefault();buttons[0].focus();}}
    },true);
    document.addEventListener('click',function(e){var button=e.target.closest('button');if(!button)return;if(button.id==='marketPicker')marketPicker();if(button.hasAttribute('data-market-repair') && !repairMarketFault(Number(button.dataset.marketRepair)))toast('Проверьте баланс, местоположение машины и назначенные встречи.');});
    ['click','keydown','pointerdown','input','change','submit'].forEach(function(type){document.addEventListener(type,function(e){if(marketGameOver() && !$('marketRiskOverlay').contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);});
    $('marketRiskContinue').addEventListener('click',function(){marketRisks.notice=null;saveMarketRisks();$('marketRiskOverlay').classList.remove('open');updateGameSpeed();});
    $('marketRiskRestart').addEventListener('click',function(){if(!confirm('Начать новую игру? Текущий прогресс будет сброшен. Ник и подпись сохранятся.'))return;resetGameProgress(true);updateStats();showMarket();renderGarageApp();updateGameSpeed();});
    $('marketRiskExport').addEventListener('click',function(){var url=URL.createObjectURL(new Blob([JSON.stringify(gameBackup(),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='perekup-game-over.json';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);});
}
function resetMarketRisks(){marketRisks=freshMarketRisks();saveMarketRisks();$('marketRiskOverlay').classList.remove('open');document.body.classList.remove('market-game-over');Array.from(document.body.children).forEach(function(el){el.inert=false;});}
