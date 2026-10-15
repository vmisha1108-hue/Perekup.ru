'use strict';

// Fixed stock: these vehicles never enter the private-seller catalogue.
var COMMERCE_OFFERS=[
    {id:'jp-rav4',kind:'import',base:29,country:'Япония',currency:'JPY',rate:.60,foreign:650000,delivery:120000,duty:260000,util:190000,days:18,steering:'Правый',seller:'Sakura Export',report:'Подтверждены пробег и документы. Есть окрасы двух элементов; днище без сквозной коррозии.'},
    {id:'kr-stinger',kind:'import',base:6,country:'Южная Корея',currency:'KRW',rate:.065,foreign:12800000,delivery:135000,duty:310000,util:260000,days:24,steering:'Левый',seller:'Seoul Auto Export',report:'Пробег подтверждён. На переднем бампере следы ремонта, силовые элементы без замечаний.'},
    {id:'cn-geely',kind:'import',base:44,country:'Китай',currency:'CNY',rate:13,foreign:14000,delivery:75000,duty:70000,util:80000,days:12,steering:'Левый',seller:'East Auto Export',report:'Документы проверены. Кузов имеет косметические окрасы, есть износ подвески.'},
    {id:'dealer-new-x7',kind:'dealer',base:12,newCar:true,price:20990000,seller:'АвтоПарк Москва',trim:'Новый · 3.0d AWD',report:'Новый автомобиль, предпродажная подготовка выполнена. При выдаче сверяются комплектация, VIN и документы.'},
    {id:'dealer-samara',kind:'dealer',base:1,price:130000,seller:'АвтоПарк Москва',trim:'С пробегом · 1.6 MT',report:'Возрастной автомобиль под восстановление. Продавец раскрывает недостатки двигателя и трансмиссии. Гарантии на эти узлы нет.'},
    {id:'dealer-polo',kind:'dealer',base:22,price:710000,seller:'АвтоПарк Москва',trim:'С пробегом · 1.6 AT',report:'Диагностика выполнена: критических неисправностей не выявлено. Предпродажный акт диагностики передаётся с машиной.'},
    {id:'dealer-stinger',kind:'dealer',base:7,price:3750000,seller:'АвтоПарк Москва',trim:'С пробегом · 2.0 AWD',report:'Проверены VIN, пробег и юридическая история. Предпродажный акт диагностики передаётся с машиной.'}
];
var COMMERCE_CARS=COMMERCE_OFFERS.map(function(offer,index){
    var source=CARS.find(function(c){return c.id===offer.base;});
    var car=Object.assign({},source,{id:700001+index,cityId:moscowCity.id,seller:{name:offer.seller,avatar:'👨‍💼',personality:'neutral'},commerceOffer:offer.id});
    if(offer.newCar)car.desc=car.desc.replace(/\d[\d\s]*\sкм/,'0 км');
    var color=/цвет(?:\s+кузова)?\s*[—:-]\s*([^.!]+)/i.exec(source.full || '');
    car.full=(color?'Цвет — '+color[1].trim()+'. ':'')+(offer.kind==='import'?'Импорт из страны: '+offer.country+'. Руль: '+offer.steering+'. ':'Автомобиль из наличия автосалона. ')+offer.report;
    offer.carId=car.id;return car;
});
// Retain the seven previous vehicles solely for old garages and signed orders.
COMMERCE_OFFERS.forEach(function(o){o.legacy=true;});
var expandedCommerce=buildCommerceStock();
COMMERCE_OFFERS=COMMERCE_OFFERS.concat(expandedCommerce.offers);
COMMERCE_CARS=COMMERCE_CARS.concat(expandedCommerce.cars);
var COMMERCE_OFFER_BY_ID=Object.create(null);COMMERCE_OFFERS.forEach(function(o){COMMERCE_OFFER_BY_ID[o.id]=o;});
var commerceCatalog={import:{brand:'all',query:'',page:0},dealer:{brand:'all',query:'',page:0}},commerceSearchTimers={};
var COMMERCE_PAGE_SIZE=24;
var commerceScreen={import:'catalog',dealer:'catalog'};
var commerce=null,commerceSelection={import:null,dealer:null},commerceMessages={import:'',dealer:''},commerceRenderKeys={},commerceIdentity=null,commerceFilters={import:'all',dealer:'all'};
var COMMERCE_DAY=86400000;
var COMMERCE_STAGE_LABELS={export:'Выкуплена · экспортный склад',shipping:'В пути до границы',customs:'Таможня · ожидает оплаты',clearance:'Оформление · проверка соответствия и ЭПТС',delivery:'Доставка в ваш город',ready:'Готова к приёмке',delivered:'Получена'};
function freshCommerce(){return {version:1,sequence:0,revision:0,orders:[],inspections:{},discounts:{},dialogues:{}};}
function commerceOffer(id){return COMMERCE_OFFER_BY_ID[id] || null;}
function commerceOrder(id){return commerce.orders.find(function(o){return o.id===id;}) || null;}
function commerceTaken(id){return commerce.orders.some(function(o){return o.offerId===id;});}
function saveCommerce(){if(commerce)writeSaved('commerce',commerce);}
function initCommerce(){
    commerce=readSaved('commerce',{});if(commerce.version!==1)commerce=freshCommerce();
    if(!Number.isSafeInteger(commerce.sequence) || commerce.sequence<0)commerce.sequence=0;
    if(!Number.isSafeInteger(commerce.revision))commerce.revision=0;
    if(!isRecord(commerce.inspections))commerce.inspections={};
    if(!isRecord(commerce.discounts))commerce.discounts={};
    if(!isRecord(commerce.dialogues))commerce.dialogues={};
    Object.keys(commerce.dialogues).forEach(function(key){
        var entries=commerce.dialogues[key];
        commerce.dialogues[key]=(Array.isArray(entries)?entries:[]).filter(function(entry){return isRecord(entry) && typeof entry.topic==='string' && typeof entry.stage==='string' && typeof entry.question==='string' && typeof entry.answer==='string';}).slice(-8);
    });
    commerce.orders=(Array.isArray(commerce.orders)?commerce.orders:[]).filter(function(o,index,all){
        return isRecord(o) && commerceOffer(o.offerId) && typeof o.id==='string' && CITY_BY_ID[o.cityId] && Number.isFinite(o.createdAt) &&
            ['export','shipping','customs','clearance','delivery','ready','delivered'].indexOf(o.stage)!==-1 &&
            Number.isSafeInteger(o.paid) && o.paid>0 && isRecord(o.costs) && Object.keys(o.costs).every(function(k){return Number.isSafeInteger(o.costs[k]) && o.costs[k]>=0;}) &&
            Number.isFinite(o.nextAt) && Number.isSafeInteger(o.shippingDays) && o.shippingDays>=0 && Number.isSafeInteger(commerceTotal(o.costs)) && o.paid<=commerceTotal(o.costs) && isRecord(o.buyer) && typeof o.buyer.fullName==='string' && validSignature(o.buyer.signature) && Number.isSafeInteger(o.costs.vehicle) && o.costs.vehicle>0 && (o.stage!=='delivered' || (isRecord(o.receipt) && isRecord(o.receipt.buyer) && isRecord(o.receipt.vehicle))) &&
            all.findIndex(function(x){return x && x.offerId===o.offerId;})===index;
    });
    commerce.orders.forEach(function(o){commerce.sequence=Math.max(commerce.sequence,Number(o.id.replace('supply-',''))||0);});
    ['import','dealer'].forEach(function(kind){
        commerceScreen[kind]=commerce.orders.some(function(o){return commerceOffer(o.offerId).kind===kind;})?'orders':'catalog';
        $('commerce-'+kind).addEventListener('click',commerceClick);
        $('commerce-'+kind).addEventListener('input',function(event){if(!event.target.matches('[data-commerce-search]'))return;var value=event.target.value;clearTimeout(commerceSearchTimers[kind]);commerceSearchTimers[kind]=setTimeout(function(){commerceCatalog[kind].query=value;commerceCatalog[kind].page=0;commerceSelection[kind]=null;renderCommerce(kind,true);var input=$('commerce-'+kind).querySelector('[data-commerce-search]');if(input){input.focus({preventScroll:true});input.setSelectionRange(value.length,value.length);}},180);});
        $('commerce-'+kind).addEventListener('change',function(event){if(event.target.matches('[data-commerce-extra]'))renderCommerce(kind,true);if(event.target.matches('[data-commerce-filter]')){commerceFilters[kind]=event.target.value;commerceScreen[kind]='catalog';commerceCatalog[kind].page=0;commerceSelection[kind]=null;renderCommerce(kind,true);}if(event.target.matches('[data-commerce-brand]')){commerceCatalog[kind].brand=event.target.value;commerceCatalog[kind].page=0;commerceSelection[kind]=null;renderCommerce(kind,true);}});
    });
    saveCommerce();
}
function commerceTotal(costs){return Object.keys(costs).reduce(function(sum,k){return sum+costs[k];},0);}
function commerceQuote(offer,options){
    options=options || {};
    if(offer.kind==='dealer'){var dealerPrice=Math.round(offer.price*(career && careerEvent().segment==='dealer'?careerEvent().factor:1));return {vehicle:dealerPrice-(commerce.discounts[offer.id]?Math.round(dealerPrice*.02):0),equipment:options.equipment?25000:0,inspection:0};}
    var vehicle=Math.round(offer.foreign*offer.rate*careerFx());
    return {vehicle:vehicle,transfer:Math.round(vehicle*.015),delivery:offer.delivery,duty:offer.duty,util:offer.util,documents:25000,broker:30000,inspection:commerce.inspections[offer.id]?8000:0};
}
var COMMERCE_COST_LABELS={vehicle:'Автомобиль',transfer:'Перевод и конвертация',delivery:'Международная и внутренняя доставка',duty:'Таможенные платежи',util:'Утилизационный сбор',documents:'Проверка соответствия и ЭПТС',broker:'Сопровождение посредника',inspection:'Предпокупочный осмотр',equipment:'Комплект зимних колёс',storage:'Хранение на таможне',preparation:'Диагностика и подготовка'};
function commerceCostsHtml(costs){return '<dl class="commerce-costs">'+Object.keys(costs).filter(function(k){return costs[k]>0;}).map(function(k){return '<div><dt>'+esc(COMMERCE_COST_LABELS[k] || k)+'</dt><dd>'+money(costs[k])+'</dd></div>';}).join('')+'</dl>';}
function commerceOptions(kind){var root=$('commerce-'+kind),extra=root.querySelector('[data-commerce-extra]');return {equipment:!!(extra && extra.checked)};}
function inspectCommerceOffer(id){
    advanceGameTime(Date.now());tickPending();
    var offer=commerceOffer(id);if(!offer || offer.legacy || offer.kind!=='import' || commerceTaken(id) || commerce.inspections[id])return false;
    if(!spend(8000,'Предпокупочный осмотр: '+carById(offer.carId).name))return false;
    commerce.inspections[id]={paidAt:gameMs};commerce.revision++;save();renderCommerce('import',true);return true;
}
function commerceBuyer(){return {fullName:playerIdentity.nickname,passport:contractBook.profile.passport,address:contractBook.profile.address,signature:JSON.parse(JSON.stringify(playerIdentity.signature))};}
function placeCommerceOrder(id,options,acknowledged){
    advanceGameTime(Date.now());tickPending();
    var offer=commerceOffer(id);if(!offer || offer.legacy || commerceTaken(id) || !hasPlayerIdentity() || acknowledged!==true || transport.trip)return false;
    if(offer.kind==='dealer' && transport.cityId!==moscowCity.id)return false;
    var costs=commerceQuote(offer,options),total=commerceTotal(costs),deposit=offer.kind==='import'?costs.vehicle+costs.transfer+costs.delivery:total;
    if(!canAfford(deposit))return false;
    if(!spend(deposit,(offer.kind==='import'?'Выкуп и доставка: ':'Оплата автосалону: ')+carById(offer.carId).name))return false;
    var buyer=commerceBuyer(),order={id:'supply-'+(++commerce.sequence),offerId:id,cityId:transport.cityId,createdAt:gameMs,exchangeRate:offer.rate?offer.rate*careerFx():null,costs:costs,paid:deposit+(offer.kind==='import'?costs.inspection:0),buyer:buyer,stage:offer.kind==='import'?'export':'ready',nextAt:gameMs+(offer.kind==='import'?2*COMMERCE_DAY:0),shippingDays:offer.days || 0};
    commerce.orders.unshift(order);commerce.dialogues[order.id]=(commerce.dialogues[id] || []).slice();commerce.revision++;
    var seller={fullName:offer.seller,passport:'Организация · игровой поставщик',address:offer.kind==='import'?offer.country:'г. Москва',signature:[[[.1,.7],[.25,.25],[.32,.7],[.6,.3],[.8,.6]]]};
    contractBook.records.unshift({version:1,id:'purchase-'+order.id,number:'ПОСТ-'+String(++contractBook.sequence).padStart(5,'0'),mode:'buy',channel:offer.kind,orderId:order.id,carId:offer.carId,city:playerCity().name,createdAt:gameMs,signedAt:gameMs,price:total,purchasePrice:total,vehicle:contractVehicle(carById(offer.carId)),seller:seller,buyer:buyer,costBreakdown:JSON.parse(JSON.stringify(costs)),paidAtSigning:order.paid,terms:offer.kind==='import'?'Стоимость валюты и доставки зафиксирована. Выкуп и перевозка оплачиваются при заказе, оформление — после прибытия на таможню. Три дня хранения бесплатны, далее 2 000 ₽ за начатый игровой день. Экспорт — 2 дня, перевозка — '+offer.days+' дней, оформление — 2 дня, доставка по России — 3 дня. Оформление выполняет посредник для последующей продажи автомобиля.':'Автомобиль из наличия. Передача выполняется после осмотра и подписания акта приёма-передачи. '+offer.report});
    contractBook.records=contractBook.records.slice(0,100);saveContracts();save();commerceSelection[offer.kind]=null;commerceScreen[offer.kind]='orders';commerceMessages[offer.kind]='';
    renderCommerce(offer.kind,true);renderDocuments();toast(offer.kind==='import'?'Машина выкуплена. Следите за поставкой в «Импорте».':'Договор подписан. Осмотрите автомобиль и подтвердите приёмку.');return true;
}
function commerceStorage(order){return order.stage==='customs'?Math.max(0,Math.ceil((gameMs-order.nextAt-3*COMMERCE_DAY)/COMMERCE_DAY))*2000:0;}
function payCommerceCustoms(id){
    advanceGameTime(Date.now());tickPending();
    var order=commerceOrder(id);if(!order || order.stage!=='customs')return false;
    var storage=commerceStorage(order),due=order.costs.duty+order.costs.util+order.costs.documents+order.costs.broker+storage;
    if(!spend(due,'Таможня и оформление: '+carById(commerceOffer(order.offerId).carId).name))return false;
    if(storage)order.costs.storage=storage;order.paid+=due;order.stage='clearance';order.nextAt=gameMs+2*COMMERCE_DAY;commerce.revision++;save();renderCommerce('import',true);return true;
}
function tickCommerce(){
    if(!commerce)return;var changed=false;
    commerce.orders.forEach(function(order){
        while(gameMs>=order.nextAt && ['export','shipping','clearance','delivery'].indexOf(order.stage)!==-1){
            if(order.stage==='export'){order.stage='shipping';order.nextAt+=order.shippingDays*COMMERCE_DAY;}
            else if(order.stage==='shipping'){order.stage='customs';toast('Поставка прибыла на таможню. Нужна оплата оформления.');}
            else if(order.stage==='clearance'){order.stage='delivery';order.nextAt+=3*COMMERCE_DAY;}
            else{order.stage='ready';toast('Импортная машина доставлена. Подтвердите приёмку.');}
            changed=true;
        }
    });
    if(changed){commerce.revision++;saveCommerce();}
    renderCommerce('import');renderCommerce('dealer');
}
function acceptCommerceCar(id,acknowledged){
    advanceGameTime(Date.now());tickPending();
    var order=commerceOrder(id);if(!order || order.stage!=='ready' || acknowledged!==true || transport.trip || transport.cityId!==order.cityId)return false;
    var offer=commerceOffer(order.offerId),car=carById(offer.carId);if(garage.indexOf(car.id)!==-1)return false;
    if(order.paid!==commerceTotal(order.costs))return false;
    garage.push(car.id);purchasePrices[car.id]=order.paid;careerStep('bought');retireMarketCar(car.id);parkVehicle(car.id,order.cityId);deals++;
    order.stage='delivered';order.acceptedAt=gameMs;order.receipt={buyer:commerceBuyer(),vehicle:contractVehicle(car),total:order.paid};commerce.revision++;
    save();updateStats();refreshList();renderDocuments();renderCommerce(offer.kind,true);toast('Автомобиль принят и добавлен в гараж.');return true;
}
function commerceAcquisition(id){return commerce && commerce.orders.find(function(o){return commerceOffer(o.offerId).carId===id && o.stage==='delivered';});}
function commerceDocumentHtml(record){
    var order=commerceOrder(record.orderId),imported=record.channel==='import';
    return '<article class="contract-paper"><h3>'+esc(record.number)+' · '+(imported?'Договор выкупа и поставки':'Договор покупки в автосалоне')+'</h3><p>'+esc(record.vehicle.name)+' · VIN '+esc(record.vehicle.vin)+'</p><p>Поставщик: '+esc(record.seller.fullName)+'. Покупатель: '+esc(record.buyer.fullName)+'. Место передачи: '+esc(record.city)+'.</p>'+commerceCostsHtml(record.costBreakdown)+'<p><b>Общая сумма: '+money(record.price)+'.</b> Оплачено к подписанию: '+money(record.paidAtSigning)+'.</p><p>'+esc(record.terms)+'</p><p>Покупатель: '+esc(record.buyer.fullName)+'</p>'+signatureHtml(record.buyer.signature,'Подпись покупателя')+'<p>Поставщик: '+esc(record.seller.fullName)+'</p>'+signatureHtml(record.seller.signature,'Подпись поставщика')+'</article>'+((order && ['delivery','ready','delivered'].indexOf(order.stage)!==-1 && imported)?'<section class="contract-signed"><h3>Оформление завершено</h3><p>Таможенный выпуск подтверждён посредником. Оформлены документы оценки соответствия и игровой ЭПТС: '+esc(record.vehicle.pts)+'. VIN '+esc(record.vehicle.vin)+'.</p></section>':'')+(order && order.stage==='delivered'?'<section class="contract-signed"><h3>Акт приёма-передачи</h3><p>'+esc(order.receipt.buyer.fullName)+' · '+fmtMeet(new Date(order.acceptedAt))+' · Себестоимость '+money(order.receipt.total)+'</p>'+signatureHtml(order.receipt.buyer.signature,'Подпись в акте')+'</section>':'');
}
// Conversations are saved separately from signed contracts. Questions never change the clock.
var COMMERCE_QUESTIONS={inspection:'Осмотреть автомобиль',drive:'Пройти тест-драйв',price:'Есть ли обязательные доплаты?',documents:'Проверить документы',route:'Как будет ехать машина?',payments:'Когда и за что платить?',status:'Где сейчас машина?',customs:'Что с оформлением?'};
function commerceTopics(offer,order){
    return order?(offer.kind==='import'?['status','documents','customs']:(order.stage==='ready'?['documents','inspection']:['documents'])):(offer.kind==='dealer'?['inspection','drive','documents','price']:['route','payments','documents']);
}
function commerceConversationHtml(offer,order){
    var target=order?order.id:offer.id,entries=commerce.dialogues[target] || [];
    return '<section class="commerce-conversation" aria-label="'+(offer.kind==='dealer'?'Общение с менеджером':'Общение с посредником')+'"><h4>'+(offer.kind==='dealer'?'Менеджер автосалона':'Ваш посредник')+' · '+esc(offer.seller)+'</h4><div class="commerce-conversation-log" role="log" aria-live="polite">'+(entries.length?entries.map(function(entry){return '<small>'+esc(COMMERCE_STAGE_LABELS[entry.stage] || 'До заказа')+'</small><div class="commerce-question"><b>Вы:</b> '+esc(entry.question)+'</div><p><b>'+esc(offer.seller)+':</b> '+esc(entry.answer)+'</p>';}).join(''):'<p>Выберите вопрос — '+(order?'ответим с учётом текущего этапа заказа.':'расскажем о машине и условиях до оплаты.')+'</p>')+'</div><div class="commerce-actions">'+commerceTopics(offer,order).map(function(topic){return '<button type="button" class="commerce-secondary" data-commerce-target="'+target+'" data-commerce-topic="'+topic+'">'+COMMERCE_QUESTIONS[topic]+'</button>';}).join('')+'</div></section>';
}
function askCommerceQuestion(kind,target,topic){
    var order=commerceOrder(target),offer=order?commerceOffer(order.offerId):commerceOffer(target);
    if(!offer || offer.kind!==kind || commerceTopics(offer,order).indexOf(topic)===-1 || (!order && commerceTaken(offer.id)))return false;
    var car=carById(offer.carId),stage=order?order.stage:'offer',answer='',atDealer=transport.cityId===moscowCity.id && !transport.trip;
    if((topic==='inspection' || topic==='drive') && !atDealer){commerceMessages[kind]='Менеджер: осмотр и тест-драйв доступны в Москве. Приезжайте в автосалон вне поездки.';renderCommerce(kind,true);return false;}
    if(topic==='inspection')answer='Открыли автомобиль для осмотра. VIN: '+contractVehicle(car).vin+'. '+offer.report+' Сверьте состояние с договором перед приёмкой.';
    if(topic==='drive')answer=offer.id==='dealer-samara'?'На пробной поездке заметны перебои двигателя и шум трансмиссии. Машина требует восстановления; учтите расходы на ремонт до покупки.':'Пробная поездка завершена: проверили разгон, торможение и переключения передач. '+offer.report+' Тест-драйв бесплатный и не обязывает к покупке.';
    if(topic==='price')answer='Обязательных доплат к расчёту нет. Зимние колёса за 25 000 ₽ — только по вашему выбору. Скидка 2% не зависит от кредита; повторно она не увеличивается.';
    if(topic==='route')answer='Сначала 2 игровых дня на выкуп и экспортный склад в стране '+offer.country+', затем '+offer.days+' дней до границы. После оплаты таможни — 2 дня на оформление и 3 дня на доставку в город, выбранный при заказе. Ускоренной доставки нет.';
    if(topic==='payments')answer='При подписании оплачиваются машина, перевод и доставка. После прибытия отдельно оплачиваются таможня, утильсбор, документы и услуги посредника. Осмотр за 8 000 ₽ необязателен. Первые 3 дня хранения бесплатны, далее 2 000 ₽ за начатый игровой день.';
    if(topic==='documents'){
        if(offer.kind==='dealer')answer='VIN '+contractVehicle(car).vin+'. Предоставим договор, документы на автомобиль и акт приёма-передачи. '+(offer.newCar?'Пробег нового автомобиля — 0 км.':'Машина с пробегом: '+car.desc+'.')+' Подписанные документы останутся в приложении «Документы».';
        else if(!order)answer='До оплаты можно заказать независимый осмотр. При выкупе оформим договор и экспортные документы на VIN '+contractVehicle(car).vin+'. ЭПТС будет оформлен после таможенного выпуска.';
        else answer={export:'Договор подписан, автомобиль выкуплен. Готовим экспортные документы и отправку со склада.',shipping:'Экспортные документы готовы, VIN сверили с договором. Пакет передан перевозчику; ЭПТС ещё не оформлен.',customs:'Автомобиль и экспортные документы на таможне. Ждём оплату, чтобы начать выпуск и оформить ЭПТС.',clearance:'Платежи получены. Проверяем соответствие и оформляем ЭПТС; документы ещё в работе.',delivery:'Таможенный выпуск завершён, ЭПТС оформлен. Документы приедут вместе с автомобилем.',ready:'Машина и документы готовы к выдаче. Сверьте VIN и подпишите акт приёма-передачи.',delivered:'Автомобиль передан вам. Договор, ЭПТС и подписанный акт доступны в «Документах».'}[stage];
    }
    if(topic==='status')answer={export:'Машина выкуплена и находится на экспортном складе. Перевозчик готовит отправку.',shipping:'Машина у перевозчика и следует до границы. Следующая отметка появится при прибытии на таможню.',customs:'Машина на таможне. Для продолжения нужна оплата оформления. Сейчас хранение составляет '+money(commerceStorage(order))+'.',clearance:'Идут таможенное оформление и проверка соответствия. После выпуска передадим машину перевозчику по России.',delivery:'Машина следует в '+CITY_BY_ID[order.cityId].name+'. Получить её можно будет после прибытия.',ready:'Машина прибыла в '+CITY_BY_ID[order.cityId].name+'. Приезжайте на осмотр и приёмку.',delivered:'Заказ завершён: вы подписали акт и получили автомобиль.'}[stage]+(['export','shipping','clearance','delivery'].indexOf(stage)!==-1?' Следующий этап ожидается '+fmtMeet(new Date(order.nextAt))+'. Ускорить перевозчика нельзя.':'');
    if(topic==='customs')answer=['export','shipping'].indexOf(stage)!==-1?'Оформление начнётся после прибытия на таможню и оплаты. Суммы уже зафиксированы в договоре.':stage==='customs'?'Ждём оплату '+money(order.costs.duty+order.costs.util+order.costs.documents+order.costs.broker+commerceStorage(order))+'. После оплаты на оформление понадобится 2 игровых дня.':stage==='clearance'?'Платежи приняты; выпуск и оформление ЭПТС ещё в работе. Повторно платить не нужно.':'Таможенное оформление завершено, документы готовы. Дополнительной оплаты таможни нет.';
    var entries=commerce.dialogues[target] || [];
    // Repeated questions refresh the answer (e.g. storage charges), without duplicating the log.
    entries=entries.filter(function(entry){return entry.topic!==topic || entry.stage!==stage;});
    entries.push({topic:topic,stage:stage,question:COMMERCE_QUESTIONS[topic],answer:answer});
    commerce.dialogues[target]=entries.slice(-8);commerceMessages[kind]='';commerce.revision++;saveCommerce();renderCommerce(kind,true);return true;
}
function commerceOrderHtml(order){
    var offer=commerceOffer(order.offerId),car=carById(offer.carId),labels=COMMERCE_STAGE_LABELS;
    var html='<article class="commerce-order"><div class="commerce-order-top"><div><b>'+esc(car.name)+'</b><p>'+'Заказ № '+esc(order.id.replace('supply-',''))+' · '+esc(CITY_BY_ID[order.cityId].name)+'</p></div><strong>'+labels[order.stage]+'</strong></div><p>Оплачено: <b>'+money(order.paid)+'</b> · Полная стоимость: '+money(commerceTotal(order.costs)+commerceStorage(order))+'</p>';
    if(['export','shipping','clearance','delivery'].indexOf(order.stage)!==-1)html+='<p data-commerce-eta="'+order.id+'">Следующий этап: '+fmtMeet(new Date(order.nextAt))+' · осталось около '+Math.max(1,Math.ceil((order.nextAt-gameMs)/3600000))+' игровых ч.</p><small>Доставка идёт по игровому времени. Пропуска этапов в приложении нет. Пока машина в пути, можно заниматься другими сделками.</small>';
    if(order.stage==='customs')html+=commerceCostsHtml({duty:order.costs.duty,util:order.costs.util,documents:order.costs.documents,broker:order.costs.broker,storage:commerceStorage(order)})+'<p>Договор, VIN и экспортные документы переданы посреднику. После оплаты он завершит выпуск и оформление ЭПТС. Хранение: 3 дня бесплатно, далее 2 000 ₽/день.</p><button data-commerce-customs="'+order.id+'">Оплатить оформление</button>';
    if(order.stage==='ready')html+='<p>Сверьте VIN '+esc(contractVehicle(car).vin)+', комплектацию и состояние. '+esc(offer.report)+'</p><p>ЭПТС и документы поставщика проверены при выдаче.</p><label class="commerce-check"><input type="checkbox" data-receipt="'+order.id+'"> Машину, VIN и документы проверил; подписываю акт приёма-передачи.</label>'+(transport.cityId===order.cityId && !transport.trip?'<button data-commerce-accept="'+order.id+'">Принять в гараж</button>':'<p>Для осмотра приезжайте в '+esc(CITY_BY_ID[order.cityId].name)+'.</p><button data-commerce-travel>Открыть переезд</button>');
    if(order.stage==='delivered')html+='<details><summary>Акт приёма-передачи · '+fmtMeet(new Date(order.acceptedAt))+'</summary><p>'+esc(order.receipt.buyer.fullName)+' · VIN '+esc(order.receipt.vehicle.vin)+' · Себестоимость '+money(order.receipt.total)+'</p>'+signatureHtml(order.receipt.buyer.signature,'Подпись в акте')+'</details>';
    html+=commerceConversationHtml(offer,order);
    return html+'<button class="commerce-secondary" data-commerce-document="purchase-'+order.id+'">Договор</button></article>';
}
function commerceCatalogHtml(kind){
    var state=commerceCatalog[kind],taken=new Set(commerce.orders.map(function(o){return o.offerId;}));
    var stock=COMMERCE_OFFERS.filter(function(o){return !o.legacy && o.kind===kind;});
    var brands=Array.from(new Set(stock.map(function(o){return o.brand;}))).sort(function(a,b){return a.localeCompare(b,'ru');});
    var query=state.query.trim().toLowerCase(),matches=stock.filter(function(o){var car=carById(o.carId);return !taken.has(o.id) && (state.brand==='all' || o.brand===state.brand) && (commerceFilters[kind]==='all' || o.country===commerceFilters[kind]) && (!query || (car.name+' '+car.desc+' '+o.trim).toLowerCase().indexOf(query)!==-1);});
    var pages=Math.max(1,Math.ceil(matches.length/COMMERCE_PAGE_SIZE));state.page=Math.max(0,Math.min(state.page,pages-1));
    return '<div class="commerce-catalog-controls"><input data-commerce-search type="search" placeholder="Модель или комплектация" aria-label="Поиск в каталоге" value="'+esc(state.query)+'"><select data-commerce-brand aria-label="Марка автомобиля"><option value="all">Все марки</option>'+brands.map(function(brand){return '<option'+(brand===state.brand?' selected':'')+'>'+esc(brand)+'</option>';}).join('')+'</select></div><p class="commerce-model-count">Найдено: '+matches.length+' · марок: '+brands.length+' · по '+COMMERCE_PAGE_SIZE+' на странице</p><div class="commerce-grid">'+matches.slice(state.page*COMMERCE_PAGE_SIZE,(state.page+1)*COMMERCE_PAGE_SIZE).map(function(o){var c=carById(o.carId),q=commerceQuote(o,{});return '<article class="commerce-stock"><div class="commerce-photo">'+carImg(c)+'</div><h3>'+esc(c.name)+'</h3><p>'+esc(o.trim)+' · '+esc(o.country || 'Новый · 0 км')+'</p><strong>'+money(commerceTotal(q))+'</strong><small>Полная стоимость без хранения'+(o.kind==='import'?(commerce.inspections[o.id]?' · оплаченный осмотр учтён':' и необязательного осмотра'):' и оборудования')+'</small><p class="commerce-photo-note">'+esc(c.photoCaption)+'</p><button data-commerce-select="'+o.id+'">Условия покупки</button></article>';}).join('')+'</div>'+(!matches.length?'<p>Нет автомобилей по выбранным условиям. Измените марку, страну или поиск.</p>':'')+'<div class="commerce-pagination"><button data-commerce-page="-1"'+(state.page===0?' disabled':'')+'>Назад</button><span>Страница '+(state.page+1)+' из '+pages+'</span><button data-commerce-page="1"'+(state.page+1>=pages?' disabled':'')+'>Далее</button></div><p class="commerce-catalog-credit">Цены, комплектации и наличие — игровые. Фотографии показывают модель; цвет и состояние экземпляра указаны в карточке. <a href="commerce-photo-credits.html" target="_blank" rel="noopener">Авторы фотографий</a></p>';
}
function renderCommerce(kind,force){
    if(!commerce || !openWindows[kind])return;
    if(commerceIdentity!==playerIdentity){commerceIdentity=playerIdentity;commerceRenderKeys={};}
    var root=$('commerce-'+kind),selected=commerceOffer(commerceSelection[kind]),options=commerceOptions(kind);
    var key=[commerceScreen[kind],JSON.stringify(commerceCatalog[kind]),career?career.cycle:0,commerce.revision,commerceSelection[kind],commerceFilters[kind],options.equipment,transport.cityId,!!transport.trip,playerIdentity?playerIdentity.nickname:'',commerce.orders.map(function(o){return commerceStorage(o)+':'+(['export','shipping','clearance','delivery'].indexOf(o.stage)!==-1?Math.ceil((o.nextAt-gameMs)/3600000):'');}).join(',')].join('|');
    if(!force && commerceRenderKeys[kind]===key)return;commerceRenderKeys[kind]=key;
    var orders=commerce.orders.filter(function(o){return commerceOffer(o.offerId).kind===kind;});
    var html='<header class="commerce-heading"><h2>'+ (kind==='import'?'Автомобили из-за границы':'Новые автомобили · Москва')+'</h2><p>'+(kind==='import'?'Выкуп, перевозка и оформление через посредника. Все сроки — игровые. Расчёт ввоза для перепродажи по игровым тарифам.':'Только новые автомобили из наличия: российские и представленные в России китайские марки. Дополнительное оборудование выбираете сами. Для покупки и приёмки нужно находиться в Москве.')+'</p></header>';
    if(commerceMessages[kind])html+='<p class="commerce-message" role="status">'+esc(commerceMessages[kind])+'</p>';
    var filterOptions=kind==='import'?[['all','Все страны'],['Япония','Япония'],['Южная Корея','Южная Корея'],['Китай','Китай'],['Германия','Германия'],['США','США']]:[['all','Только новые']];
    html+='<div class="commerce-tabs"><select data-commerce-filter aria-label="'+(kind==='import'?'Страна покупки':'Тип автомобиля')+'">'+filterOptions.map(function(f){return '<option value="'+esc(f[0])+'"'+(commerceFilters[kind]===f[0]?' selected':'')+'>'+f[1]+'</option>';}).join('')+'</select><button data-commerce-list="'+kind+'" aria-pressed="'+(commerceScreen[kind]==='catalog')+'">Каталог</button><button data-commerce-orders="'+kind+'" aria-pressed="'+(commerceScreen[kind]==='orders')+'">Мои '+(kind==='import'?'поставки':'покупки')+' · '+orders.length+'</button><button data-commerce-bank>Открыть банк</button></div>';
    if(commerceScreen[kind]==='orders')html+=orders.length?orders.map(commerceOrderHtml).join(''):'<p>Заказов пока нет. Выберите автомобиль в каталоге.</p>';
    else if(selected && !selected.legacy && !commerceTaken(selected.id)){
        var car=carById(selected.carId),costs=commerceQuote(selected,options),total=commerceTotal(costs),imported=kind==='import',deposit=imported?costs.vehicle+costs.transfer+costs.delivery:total;
        html+='<section class="commerce-detail"><div class="commerce-photo">'+carImg(car)+'</div><p class="commerce-photo-note">'+esc(car.photoCaption || '')+'</p><h3>'+esc(car.name)+'</h3><p>'+esc(car.desc)+'</p><p>'+(imported?esc(selected.country)+' · '+selected.foreign.toLocaleString('ru-RU')+' '+selected.currency+' · курс '+(selected.rate*careerFx()).toFixed(3)+' ₽ · руль '+selected.steering:esc(selected.trim))+'</p><p class="commerce-manager">'+esc(selected.seller)+': '+(imported?'Цена и курс фиксируются при подписании заказа.':'Цена окончательная; комплект колёс не обязателен. Скидка не требует кредита.')+'</p>';
        if(imported)html+='<p>'+(commerce.inspections[selected.id]?esc(selected.report):'Состояние заявлено продавцом. До выкупа можно заказать независимый осмотр.')+'</p>'+(!commerce.inspections[selected.id]?'<button data-commerce-inspect="'+selected.id+'">Заказать осмотр · 8 000 ₽</button>':'<p>Осмотр оплачен и включён в себестоимость; повторной оплаты нет.</p>');
        else html+='<p>'+esc(selected.report)+'</p><button data-commerce-discount="'+selected.id+'">Обсудить скидку</button><label class="commerce-check"><input type="checkbox" data-commerce-extra'+(options.equipment?' checked':'')+'> Комплект зимних колёс · 25 000 ₽</label>';
        html+=commerceConversationHtml(selected,null);
        html+=commerceCostsHtml(costs)+'<div class="commerce-total">Полная стоимость <b>'+money(total)+'</b></div><p>Ориентир рынка: '+money(car.marketPrice || car.price)+'. Разница до прочих расходов: '+money((car.marketPrice || car.price)-total)+'. Продажа по этой цене не гарантируется.</p>';
        html+='<details class="commerce-terms"><summary>Договор · '+esc(playerIdentity?playerIdentity.nickname:'Игрок')+'</summary><p>VIN '+esc(contractVehicle(car).vin)+'. Поставщик: '+esc(selected.seller)+'. Покупатель: '+esc(playerIdentity?playerIdentity.nickname:'Игрок')+'. Место получения: '+esc(playerCity().name)+'.</p><p>'+(imported?'При подписании: '+money(deposit)+'. Таможня и оформление: '+money(costs.duty+costs.util+costs.documents+costs.broker)+' после прибытия. На экспорт 2 дня, перевозка '+selected.days+' дней, оформление 2 дня, доставка по России 3 дня. Три дня хранения на таможне бесплатны, далее 2 000 ₽/день.':'Полная оплата: '+money(total)+'. Передача после проверки машины и подписания акта. '+esc(selected.report))+'</p><p>Выкуп и расходы после подписания заказа в этой версии не отменяются. Проверьте условия и запас денег до оплаты.</p>'+signatureHtml(playerIdentity?playerIdentity.signature:[],'Ваша подпись')+'</details><label class="commerce-check"><input type="checkbox" data-commerce-confirm> Условия прочитал; подписываю договор своей подписью и подтверждаю оплату.</label><button data-commerce-buy="'+selected.id+'">Подписать и оплатить '+money(deposit)+'</button></section>';
    }else html+=commerceCatalogHtml(kind);
    root.innerHTML=html;
    root.querySelectorAll('.commerce-conversation-log').forEach(function(log){log.scrollTop=log.scrollHeight;});
}
function commerceClick(event){
    var button=event.target.closest('button');if(!button)return;var kind=event.currentTarget.id.replace('commerce-',''),id,ok;
    function message(text){commerceMessages[kind]=text;renderCommerce(kind,true);}
    if(button.dataset.commerceSelect){commerceScreen[kind]='catalog';commerceSelection[kind]=button.dataset.commerceSelect;var extra=event.currentTarget.querySelector('[data-commerce-extra]');if(extra)extra.checked=false;commerceMessages[kind]='';renderCommerce(kind,true);}
    if(button.dataset.commerceList){commerceScreen[kind]='catalog';commerceSelection[kind]=null;renderCommerce(kind,true);}
    if(button.dataset.commerceOrders){commerceScreen[kind]='orders';commerceSelection[kind]=null;commerceMessages[kind]='';renderCommerce(kind,true);event.currentTarget.scrollTop=0;}
    if(button.dataset.commercePage){commerceCatalog[kind].page+=Number(button.dataset.commercePage);renderCommerce(kind,true);event.currentTarget.scrollTop=0;}
    if(button.hasAttribute('data-commerce-bank'))openWin('bank');
    if(button.hasAttribute('data-commerce-travel'))openWin('travel');
    if(button.dataset.commerceInspect){ok=inspectCommerceOffer(button.dataset.commerceInspect);if(!ok)message('Осмотр недоступен или не хватает денег.');}
    if(button.dataset.commerceDiscount && commerceOffer(button.dataset.commerceDiscount) && !commerceOffer(button.dataset.commerceDiscount).legacy){id=button.dataset.commerceDiscount;commerce.discounts[id]=true;commerce.revision++;saveCommerce();message('Менеджер: могу уступить 2% от цены автомобиля. Это наша окончательная скидка.');}
    if(button.dataset.commerceBuy){var ack=event.currentTarget.querySelector('[data-commerce-confirm]');ok=placeCommerceOrder(button.dataset.commerceBuy,commerceOptions(kind),!!(ack && ack.checked));if(!ok)message('Проверьте согласие с договором, баланс и местоположение. Во время поездки купить машину нельзя.');}
    if(button.dataset.commerceCustoms){if(!payCommerceCustoms(button.dataset.commerceCustoms))message('Не хватает денег на оформление. Поставка остаётся на таможне.');}
    if(button.dataset.commerceAccept){id=button.dataset.commerceAccept;var receipt=event.currentTarget.querySelector('[data-receipt="'+id+'"]');if(!acceptCommerceCar(id,!!(receipt && receipt.checked)))message('Для приёмки проверьте документы, подтвердите акт и приезжайте в город получения.');}
    if(button.dataset.commerceTopic){askCommerceQuestion(kind,button.dataset.commerceTarget,button.dataset.commerceTopic);}
    if(button.dataset.commerceDocument)openSignedContract(button.dataset.commerceDocument);
}
