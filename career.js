'use strict';

var career=null,careerTab='overview',careerRenderKey='',careerNotice='';
var CAREER_LEVELS=[
    {name:'Частный перекуп',sales:0,profit:0,reputation:0,price:0,places:0},
    {name:'Своя площадка',sales:3,profit:50000,reputation:50,price:150000,places:2},
    {name:'Автобизнес',sales:10,profit:300000,reputation:60,price:600000,places:5},
    {name:'Свой автосалон',sales:25,profit:1000000,reputation:75,price:2000000,places:10}
];
var CAREER_EVENTS=[
    {title:'Спокойный рынок',text:'Особых изменений нет. Подбирайте машины и выполняйте заказы.',segment:'none',factor:1,fx:1},
    {title:'Сезон поездок за город',text:'Спрос на кроссоверы и внедорожники вырос. Их рыночная оценка выше на 8%, отклики приходят быстрее.',segment:'suv',factor:1.08,fx:1},
    {title:'Курс валют вырос',text:'Новые заказы импорта обходятся на 7% дороже по валютной части. Подписанные поставки сохраняют прежний расчёт.',segment:'none',factor:1,fx:1.07},
    {title:'Покупатели ищут недорогие машины',text:'Рыночная оценка машин до 300 тысяч выросла на 10%, спрос на них выше.',segment:'budget',factor:1.10,fx:1},
    {title:'Больше электромобилей в продаже',text:'Рыночная оценка электромобилей снизилась на 8%. Новые валютные расчёты импорта дешевле на 4%.',segment:'electric',factor:.92,fx:.96},
    {title:'Сезонная распродажа',text:'Новые автомобили в салоне дешевле на 3%. Скидка менеджера применяется к этой цене; старые договоры не пересчитываются.',segment:'dealer',factor:.97,fx:1}
];
function freshCareer(){return {version:1,level:0,sales:0,profit:0,reputation:50,assistant:false,startedAt:gameMs,cycle:0,sequence:0,orders:[],clients:{},vehicles:{},complaints:[],news:[],tutorial:{},revision:0};}
function saveCareer(){if(career)writeSaved('career',career);}
function initCareer(){
    career=readSaved('career',{});
    if(career.version!==1){
        career=freshCareer();
        contractBook.records.filter(function(r){return r.mode==='sell';}).forEach(function(r){career.sales++;if(Number.isSafeInteger(r.purchasePrice))career.profit+=r.price-r.purchasePrice;});
        if(garage.length || deals)career.tutorial.bought=true;
    }
    ['level','sales','sequence','revision'].forEach(function(k){if(!Number.isSafeInteger(career[k]) || career[k]<0)career[k]=0;});
    career.level=Math.min(3,career.level);if(!Number.isSafeInteger(career.profit))career.profit=0;
    career.reputation=Number.isFinite(career.reputation)?clamp(Math.round(career.reputation),0,100):50;
    career.assistant=career.assistant===true;
    if(!Number.isFinite(career.startedAt) || career.startedAt>gameMs)career.startedAt=gameMs;
    if(!Number.isSafeInteger(career.cycle) || career.cycle<0)career.cycle=0;
    ['clients','vehicles','tutorial'].forEach(function(k){if(!isRecord(career[k]))career[k]={};});
    Object.keys(career.vehicles).forEach(function(id){var v=career.vehicles[id];if(!carById(Number(id)) || !isRecord(v) || !Number.isSafeInteger(v.repairPaid) || v.repairPaid<0)delete career.vehicles[id];});
    career.orders=(Array.isArray(career.orders)?career.orders:[]).filter(function(o){return isRecord(o) && typeof o.id==='string' && typeof o.client==='string' && ['available','active','completed','expired','cancelled'].indexOf(o.status)!==-1 && Number.isFinite(o.deadline) && Number.isSafeInteger(o.budget) && o.budget>0 && Number.isSafeInteger(o.fee) && o.fee>0 && o.fee<o.budget && typeof o.type==='string';}).slice(-30);
    career.complaints=(Array.isArray(career.complaints)?career.complaints:[]).filter(function(c){return isRecord(c) && typeof c.id==='string' && typeof c.text==='string' && Number.isSafeInteger(c.amount) && c.amount>0;}).slice(-20);
    career.news=(Array.isArray(career.news)?career.news:[]).filter(function(n){return isRecord(n) && typeof n.title==='string' && typeof n.text==='string' && Number.isFinite(n.when);}).slice(-12);
    CARS.forEach(function(c){c.careerSessionPrice=c.price;c.careerSessionMarket=c.marketPrice;});
    generateCareerOrders();rebalanceHome();saveTransport();applyCareerMarket();saveCareer();
    $('businessBody').addEventListener('click',careerClick);
}
function careerEvent(){return CAREER_EVENTS[career?career.cycle%CAREER_EVENTS.length:0];}
function careerSegment(car,event){
    if(event.segment==='budget')return (car.basePrice || car.price)<=300000;
    if(event.segment==='electric')return /электро/i.test(car.desc);
    if(event.segment==='suv')return /кроссовер|внедорожник/.test(car.body || '') || /RAV4|Duster|Land Cruiser|Tiguan|Sportage|CR-V|Forester|Outlander|Haval|Chery Tiggo|CX-|X5|X7|X-Trail|Патриот/i.test(car.name);
    return false;
}
function applyCareerMarket(){
    var event=careerEvent();CARS.forEach(function(car){var factor=careerSegment(car,event)?event.factor:1;car.price=Math.round(car.careerSessionPrice*factor/500)*500;car.marketPrice=Math.round(car.careerSessionMarket*factor/500)*500;});
}
function careerFx(){return career?careerEvent().fx:1;}
function careerBuyerFactor(car){
    if(!career)return 1;var factor=career.reputation>=75?.85:career.reputation<35?1.3:1;
    if(career.assistant)factor*=.75;
    if(car && careerSegment(car,careerEvent()) && careerEvent().factor>1)factor*=.8;
    return factor;
}
function careerStep(step){if(career && !career.tutorial[step]){career.tutorial[step]=true;career.revision++;saveCareer();}}
function careerVehicle(car){
    var id=car.id;if(!career.vehicles[id])career.vehicles[id]={inspected:false,repaired:false,repairPaid:0};return career.vehicles[id];
}
function carStory(car){
    if(car.newCar)return {title:'Новый автомобиль',text:'Предпродажная подготовка выполнена. Проверьте выбранную комплектацию и VIN при выдаче.',defect:'',repair:0};
    var seed=hashStr('car-history:'+car.id)>>>0,cheap=(car.basePrice || car.price)<=100000;
    var stories=[['Продажа перед переездом','Владелец переезжает и освобождает парковочное место. Быстрая сделка ему удобнее долгой переписки.'],['Семейный автомобиль','Машиной пользовались каждый день. На осмотре стоит проверить ходовую и следы бытовых повреждений.'],['После долгой стоянки','Автомобиль некоторое время стоял без движения. Проверьте жидкости, аккумулятор и тормоза.'],['Бережный владелец','Владелец готов рассказать об обслуживании. Сверьте его рассказ с состоянием машины.'],['Редкая комплектация','Автомобиль может заинтересовать ценителя марки. Подбор покупателя потребует терпения.'],['Рабочая лошадка','У машины заметные следы повседневной эксплуатации. Низкая цена требует внимательного осмотра.']];
    var story=stories[seed%stories.length],defect=cheap?'Потёртости кузова; нужны расходники и обслуживание подвески.':seed%5===0?'Износ тормозов и подвески: требуется обслуживание.':'';
    return {title:story[0],text:story[1],defect:defect,repair:defect?Math.max(6000,Math.min(90000,Math.round((car.basePrice || car.price)*.07/500)*500)):0};
}
function prepareCareerCar(id,repair){
    advanceGameTime(Date.now());tickPending();
    var car=carById(id),v=vehicleState(id);if(!career || !car || garage.indexOf(id)===-1 || !v || v.cityId!==transport.cityId || transport.trip || vehicleMoving(id) || carHasMeeting(id))return false;
    var state=careerVehicle(car),story=carStory(car),price=repair?story.repair:1500;
    if(repair?(!state.inspected || state.repaired || !price):state.inspected)return false;
    if(!spend(price,(repair?'Подготовка к продаже: ':'Диагностика: ')+car.name))return false;
    if(repair){state.repaired=true;state.repairPaid+=price;}else{state.inspected=true;state.repairPaid+=price;}
    purchasePrices[id]=purchaseCost(car)+price;
    career.revision++;save();renderGarageApp();renderBusiness(true);return true;
}
function careerConditionHtml(car){
    var state=careerVehicle(car),story=carStory(car);
    return '<section class="vehicle-condition"><b>'+esc(story.title)+'</b><p>'+esc(state.repaired?'Подготовка выполнена, выявленные недостатки устранены.':state.inspected?story.defect || 'Диагностика не выявила требующих ремонта недостатков.':'Состояние можно уточнить диагностикой.')+'</p>'+(state.inspected?(!state.repaired && story.repair?'<button data-career-repair="'+car.id+'">Подготовить · '+money(story.repair)+'</button>':''):'<button data-career-inspect="'+car.id+'">Диагностика · 1 500 ₽</button>')+'</section>'+marketConditionHtml(car);
}
function careerRecordSale(car,price,cost,disclosed){
    if(!career)return;
    var state=careerVehicle(car),story=carStory(car),mechanical=unrepairedMarketFault(car);
    var knownWear=(state.inspected || /проект|ремонт|восстанов/i.test(car.desc+' '+car.full)) && story.defect && !state.repaired;
    var hidden=disclosed===false && (mechanical || knownWear);
    career.sales++;career.profit+=price-cost;career.reputation=clamp(career.reputation+(hidden?-10:3),0,100);
    if(hidden){var amount=Math.min((knownWear?story.repair:0)+(mechanical?mechanical.repairCost:0),Math.max(1000,Math.round(price*.1)));career.complaints.push({id:'claim-'+(++career.sequence),text:'Покупатель '+car.name+' обнаружил известные вам недостатки, не указанные в объявлении.',amount:amount,paid:false});toast('Покупатель оставил претензию. Репутация снижена; подробности в «Бизнесе».');}
    careerStep('sold');career.revision++;saveCareer();
}
function upgradeCareer(){
    advanceGameTime(Date.now());tickPending();var next=CAREER_LEVELS[career.level+1];
    if(!next || career.sales<next.sales || career.profit<next.profit || career.reputation<next.reputation || !spend(next.price,'Развитие бизнеса: '+next.name))return false;
    career.level++;generateCareerOrders();career.revision++;rebalanceHome();save();renderBusiness(true);renderGarageApp();updateStats();toast(career.level===3?'Вы открыли свой автосалон! Свободная игра продолжается.':'Открыто: '+next.name);return true;
}
function hireCareerAssistant(){
    advanceGameTime(Date.now());tickPending();
    if(career.level<2 || career.assistant || !spend(30000,'Подборщик: договор на сопровождение бизнеса'))return false;
    career.assistant=true;career.revision++;save();renderBusiness(true);return true;
}
function settleCareerComplaint(id){
    advanceGameTime(Date.now());tickPending();var claim=career.complaints.find(function(c){return c.id===id;});
    if(!claim || claim.paid || !spend(claim.amount,'Урегулирование претензии покупателя'))return false;
    claim.paid=true;career.profit-=claim.amount;career.reputation=clamp(career.reputation+4,0,100);career.revision++;save();renderBusiness(true);return true;
}
function generateCareerOrders(){
    if(career.orders.some(function(o){return o.batch===career.cycle && (o.level || 0)===career.level;}))return;
    var templates=[{type:'project',title:'Первый автомобиль под восстановление',budget:140000,fee:18000,days:10},
        {type:'budget',title:'Недорогая машина на каждый день',budget:450000,fee:30000,days:12},
        {type:'family',title:'Семейный автомобиль',budget:2500000,fee:80000,days:18},
        {type:'import',title:'Иномарка под заказ из-за границы',budget:6500000,fee:160000,days:55},
        {type:'model',title:'Нужна конкретно Audi A6',brand:'Audi',model:'A6',budget:3500000,fee:100000,days:21}];
    var pool=career.level?templates:templates.slice(0,2);
    var people=['Анна','Сергей','Марина','Павел','Ирина','Андрей'];
    for(var i=0;i<3;i++){
        var t=pool[(career.cycle+i)%pool.length],client=people[(career.cycle*3+i)%people.length],repeat=career.clients[client] || 0;
        var fee=Math.round(t.fee*(career.level===3?1.2:1))+(repeat?Math.round(t.fee*.1):0)+(career.reputation>=75?Math.round(t.fee*.1):0);
        career.orders.push({id:'client-'+(++career.sequence),batch:career.cycle,level:career.level,type:t.type,brand:t.brand || '',model:t.model || '',title:t.title,client:client,repeat:repeat>0,budget:t.budget,fee:fee,deadline:gameMs+t.days*DAY_MS,status:'available',cityId:transport.cityId});
    }
    career.orders=career.orders.filter(function(o){return o.status==='active' || o.batch>=career.cycle-4;}).slice(-30);
    career.revision++;
}
function acceptCareerOrder(id){
    advanceGameTime(Date.now());tickPending();var order=career.orders.find(function(o){return o.id===id;});
    if(!order || order.status!=='available' || gameMs>=order.deadline || career.orders.filter(function(o){return o.status==='active';}).length>=2)return false;
    order.status='active';careerStep('order');career.revision++;save();renderBusiness(true);return true;
}
function cancelCareerOrder(id){
    var order=career.orders.find(function(o){return o.id===id;});if(!order || order.status!=='active')return false;
    order.status='cancelled';career.reputation=clamp(career.reputation-3,0,100);career.revision++;save();renderBusiness(true);return true;
}
function careerCarMatches(order,car){
    if(purchaseCost(car)+order.fee>order.budget)return false;
    if(order.type==='import' && !commerceAcquisition(car.id))return false;
    if(order.type==='import' && commerceOffer(car.commerceOffer).kind!=='import')return false;
    if(order.type==='model' && (car.name.toLowerCase().indexOf((order.brand+' '+order.model).toLowerCase())!==0 || !/^(?:$|[ ,])/u.test(car.name.slice((order.brand+' '+order.model).length))))return false;
    if(order.type==='family' && !careerSegment(car,{segment:'suv'}))return false;
    var state=careerVehicle(car),story=carStory(car);
    return order.type==='project' || car.newCar || (state.inspected && (!story.defect || state.repaired) && !unrepairedMarketFault(car));
}
function fulfillCareerOrder(id,carId,acknowledged){
    advanceGameTime(Date.now());tickPending();
    var order=career.orders.find(function(o){return o.id===id;}),car=carById(carId),v=vehicleState(carId);
    if(!order || order.status!=='active' || gameMs>=order.deadline || !car || acknowledged!==true || !hasPlayerIdentity() || garage.indexOf(carId)===-1 || !v || transport.trip || v.cityId!==transport.cityId || transport.cityId!==order.cityId || vehicleMoving(carId) || carHasMeeting(carId) || !careerCarMatches(order,car))return false;
    var cost=purchaseCost(car),price=cost+order.fee;if(!Number.isSafeInteger(balance+price) || balance+price<parkingDebt(carId))return false;
    var buyer=contractOtherParty({name:order.client},CITY_BY_ID[order.cityId]),seller=commerceBuyer(),acquisition=commerceAcquisition(carId);
    buyer.signature=[[[.12,.7],[.25,.3],[.35,.65],[.55,.25],[.8,.55]]];
    if(!changeBalance(price,'Заказ клиента '+order.client+': '+car.name,'sale'))return false;
    payParkingDebt(carId);retireMarketCar(carId);removeSaleOffers(carId);delete listings[carId];garage=garage.filter(function(x){return x!==carId;});removeVehicle(carId);delete purchasePrices[carId];deals++;
    var record={version:1,id:'client-sale-'+order.id,number:'ЗАК-'+String(++contractBook.sequence).padStart(5,'0'),mode:'sell',channel:'client',carId:carId,city:CITY_BY_ID[order.cityId].name,createdAt:gameMs,signedAt:gameMs,price:price,purchasePrice:cost,vehicle:contractVehicle(car),seller:seller,buyer:buyer};
    if(acquisition){record.costIncludesExpenses=true;record.costBreakdown=JSON.parse(JSON.stringify(acquisition.costs));}
    addPreparationToContract(record,carId,cost);
    contractBook.records.unshift(record);contractBook.records=contractBook.records.slice(0,100);saveContracts();
    order.status='completed';order.carId=carId;order.completedAt=gameMs;order.price=price;career.clients[order.client]=(career.clients[order.client] || 0)+1;
    careerRecordSale(car,price,cost,true);career.reputation=clamp(career.reputation+2,0,100);career.revision++;save();updateStats();refreshList();renderBusiness(true);renderDocuments();toast('Заказ выполнен. Прибыль по машине: '+money(order.fee)+'. Договор сохранён.');return true;
}
function tickCareer(){
    if(!career)return;var changed=false,cycle=Math.max(0,Math.floor((gameMs-career.startedAt)/(5*DAY_MS)));
    career.orders.forEach(function(o){if((o.status==='active' || o.status==='available') && gameMs>=o.deadline){if(o.status==='active')career.reputation=clamp(career.reputation-3,0,100);o.status='expired';changed=true;}});
    if(cycle!==career.cycle){career.cycle=cycle;var event=careerEvent();career.news.push({title:event.title,text:event.text,when:gameMs});career.news=career.news.slice(-12);generateCareerOrders();applyCareerMarket();toast('Новости рынка: '+event.title+'. Подробности в «Бизнесе».');changed=true;}
    if(changed){career.revision++;saveCareer();if(view==='market')refreshList();}
    renderBusiness();
}
function careerOrderHtml(order){
    var status={available:'Доступен',active:'В работе',completed:'Выполнен',expired:'Срок истёк',cancelled:'Отменён'},cars=garage.map(carById).filter(function(c){return careerCarMatches(order,c);});
    var html='<article class="business-card"><small>'+esc(order.client)+(order.repeat?' · постоянный клиент':'')+' · '+status[order.status]+'</small><h3>'+esc(order.title)+'</h3><p>Бюджет с вознаграждением: <b>'+money(order.budget)+'</b><br>Ваша прибыль по машине: <b>'+money(order.fee)+'</b><br>До '+fmtMeet(new Date(order.deadline))+' · '+esc(CITY_BY_ID[order.cityId]?CITY_BY_ID[order.cityId].name:'Москва')+'</p><p>'+(order.type==='project'?'Клиент согласен на машину под восстановление.':order.type==='family'?'Нужен кроссовер или внедорожник, новый либо после диагностики и необходимого ремонта.':order.type==='import'?'Нужна полученная через импорт машина, новая либо после диагностики и необходимого ремонта.':order.type==='model'?'Нужна именно '+esc(order.brand+' '+order.model)+', новая либо после диагностики и необходимого ремонта.':'Нужна новая либо диагностированная машина без неустранённых выявленных недостатков.')+' Себестоимость должна укладываться в бюджет за вычетом вознаграждения.</p>';
    if(order.status==='available')html+='<button data-client-accept="'+order.id+'">Взять заказ</button>';
    if(order.status==='active')html+='<label>Подходящий автомобиль<select data-client-car="'+order.id+'"><option value="">Выберите машину</option>'+cars.map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+' · себестоимость '+money(purchaseCost(c))+'</option>';}).join('')+'</select></label><label class="business-check"><input type="checkbox" data-client-sign="'+order.id+'"> Проверил VIN и состояние; подписываю ДКП своей сохранённой подписью. Клиент оплачивает себестоимость и указанное вознаграждение.</label><button data-client-deliver="'+order.id+'">Подписать ДКП и передать</button><button class="business-secondary" data-client-cancel="'+order.id+'">Отменить · −3 репутации</button><small>Передача в городе заказа, вне поездки и назначенной встречи.</small>';
    if(order.status==='completed')html+='<button data-client-document="client-sale-'+order.id+'">Открыть ДКП</button>';
    return html+'</article>';
}
function renderBusiness(force){
    if(!career || !openWindows.business)return;
    var key=[career.revision,careerTab,balance,garage.join(','),transport.cityId,!!transport.trip].join('|');if(!force && careerRenderKey===key)return;careerRenderKey=key;
    var level=CAREER_LEVELS[career.level],next=CAREER_LEVELS[career.level+1],html='<header><p class="business-eyebrow">Ваш путь в автобизнесе</p><h2>'+level.name+'</h2><p>Цель прохождения — открыть свой автосалон. После этого можно продолжать свободную игру.</p></header><div class="business-stats"><div><small>Репутация</small><b>'+career.reputation+' / 100</b></div><div><small>Продаж</small><b>'+career.sales+'</b></div><div><small>Результат продаж</small><b>'+money(career.profit)+'</b></div></div><nav class="business-tabs">'+[['overview','Развитие'],['orders','Заказы клиентов'],['news','Новости рынка']].map(function(t){return '<button data-career-tab="'+t[0]+'" aria-pressed="'+(careerTab===t[0])+'">'+t[1]+'</button>';}).join('')+'</nav>';
    if(careerNotice)html+='<p role="status" class="business-notice">'+esc(careerNotice)+'</p>';
    if(careerTab==='overview'){
        html+='<section class="business-card"><h3>Риски авторынка</h3><p>При покупке: 3% на угон с немедленным изъятием машины, 30% на скрытую механическую поломку. После пяти покупок угнанных машин игра заканчивается.</p><p>Изъятий: '+(marketRisks?marketRisks.seizures.length:0)+' / 5 · Убытки от изъятий: '+money(marketRisks?marketRisks.seizures.reduce(function(sum,s){return sum+s.loss;},0):0)+'.</p></section>';
        html+='<section class="business-card"><h3>'+(next?'Следующая цель: '+next.name:'Вы открыли свой автосалон!')+'</h3>'+(next?'<p>Продаж: '+career.sales+' / '+next.sales+'<br>Результат продаж: '+money(career.profit)+' / '+money(next.profit)+'<br>Репутация: '+career.reputation+' / '+next.reputation+'<br>Инвестиция: '+money(next.price)+'</p><p>После открытия: '+next.places+' дополнительных мест в московском гараже.</p><button data-career-upgrade>Открыть бизнес</button>':'<p>Основная цель достигнута. Новые заказы и события продолжают появляться; развивайте репутацию и собирайте автопарк.</p>')+'<small>Результат — сумма прибыли и убытков по продажам с учётом себестоимости и урегулированных претензий. Кредиты, гаражи и прочие расходы бизнеса сюда не входят.</small></section>';
        if(career.level===3)html+='<section class="business-card"><h3>Витрина вашего салона</h3><p>Машин на продаже: '+Object.keys(listings).length+'. Новые клиентские заказы приносят на 20% больше вознаграждения.</p><ul>'+Object.keys(listings).slice(0,8).map(function(id){return '<li>'+esc(carById(Number(id)).name)+' · '+money(listings[id].price)+'</li>';}).join('')+'</ul><button data-career-open="garage">Подготовить и выставить автомобиль</button></section>';
        html+='<section class="business-card"><h3>Помощник по подбору</h3><p>После уровня «Автобизнес» можно заключить договор с подборщиком за 30 000 ₽. Он ускоряет появление откликов на 25%. Покупки и подписи остаются за вами.</p>'+(career.assistant?'<b>Помощник работает</b>':'<button data-career-hire'+(career.level<2?' disabled':'')+'>Нанять · 30 000 ₽</button>')+'</section>';
        html+='<section class="business-card"><h3>Первая сделка</h3><ol class="business-tutorial">'+[['viewed','Откройте карточку машины и изучите историю.'],['talked','Напишите продавцу и согласуйте цену и встречу.'],['bought','Приезжайте и подпишите договор покупки.'],['listed','В гараже выставьте машину на продажу, указав известные недостатки.'],['sold','Договоритесь с покупателем и подпишите ДКП продажи.']].map(function(s){return '<li'+(career.tutorial[s[0]]?' class="complete"':'')+'>'+s[1]+(career.tutorial[s[0]]?' ✓':'')+'</li>';}).join('')+'</ol><button data-career-open="market">Открыть авторынок</button><button class="business-secondary" data-career-open="garage">Открыть гараж</button></section>';
        html+=career.complaints.filter(function(c){return !c.paid;}).map(function(c){return '<section class="business-card"><h3>Претензия покупателя</h3><p>'+esc(c.text)+'</p><button data-career-claim="'+c.id+'">Урегулировать · '+money(c.amount)+' · +4 репутации</button></section>';}).join('');
    }else if(careerTab==='orders')html+='<p>Одновременно можно вести два заказа. Новые заявки появляются каждые пять игровых дней. За просрочку взятого заказа −3 репутации; пропущенные невзятые заявки её не снижают.</p>'+career.orders.slice().reverse().map(careerOrderHtml).join('');
    else html+='<section class="business-card"><h3>'+careerEvent().title+'</h3><p>'+careerEvent().text+'</p><p>Следующее изменение: '+fmtMeet(new Date(career.startedAt+(career.cycle+1)*5*DAY_MS))+'</p></section>'+career.news.slice().reverse().map(function(n){return '<article class="business-card"><small>'+fmtMeet(new Date(n.when))+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.text)+'</p></article>';}).join('');
    $('businessBody').innerHTML=html;
}
function careerClick(event){
    var b=event.target.closest('button');if(!b)return;var d=b.dataset,ok=true;
    if(d.careerTab){careerTab=d.careerTab;careerNotice='';renderBusiness(true);}
    if(d.careerOpen)openWin(d.careerOpen);
    if(b.hasAttribute('data-career-upgrade'))ok=upgradeCareer();
    if(b.hasAttribute('data-career-hire'))ok=hireCareerAssistant();
    if(d.careerClaim)ok=settleCareerComplaint(d.careerClaim);
    if(d.clientAccept)ok=acceptCareerOrder(d.clientAccept);
    if(d.clientCancel && confirm('Отменить взятый заказ? Репутация снизится на 3.'))ok=cancelCareerOrder(d.clientCancel);
    if(d.clientDeliver){var select=$('businessBody').querySelector('[data-client-car="'+d.clientDeliver+'"]'),ack=$('businessBody').querySelector('[data-client-sign="'+d.clientDeliver+'"]');ok=fulfillCareerOrder(d.clientDeliver,Number(select.value),ack.checked);}
    if(d.clientDocument)openSignedContract(d.clientDocument);
    if(!ok){careerNotice='Действие пока недоступно. Проверьте требования, срок, баланс, состояние машины и город передачи.';renderBusiness(true);}
}
