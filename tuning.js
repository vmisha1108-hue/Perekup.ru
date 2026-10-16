'use strict';

// Only reviewed, model-specific photos can receive visual modifications.
var TUNING_RULES=[
 ['mark-x90',/Toyota Mark II.*1994/i],['chaser-x100',/Toyota Chaser/i],['supra-a80',/Toyota Supra/i],['skyline-r34',/Skyline.*R34/i],
 ['rx7-fd',/Mazda RX-7/i],['silvia-s15',/Silvia.*(?:S15|2000)/i],['evo-vi',/Evolution VI(?:,|\s)/i],['m3-e30',/BMW M3 E30/i],
 ['bmw-e60',/BMW 5 Series, 2008/i],['mercedes-w212',/Mercedes-Benz (?:E-Класс, 201[45]|E 350, 2014)/i],['mercedes-w210',/Mercedes.*W210/i],['mercedes-w205',/Mercedes.*W205/i],
 ['lexus-isf',/Lexus IS F/i],['silvia-s14',/Nissan Silvia, 1995/i],['nsx',/Honda NSX/i],['evo-ix',/Evolution IX/i],
 ['911-gt3',/Porsche 911 GT3/i],['cls-c219',/Mercedes.*CLS 63/i],['caldina',/Toyota Caldina GT-T/i],['chiron',/Bugatti Chiron/i],
 ['laurel',/Nissan Laurel/i],['rx8',/Mazda RX-8/i],['m3-g80',/BMW M3 Competition/i],['bmw-g20',/BMW (?:330i, 2020|3 серии 318i VII)/i],
 ['g63',/Mercedes-AMG G 63/i],['x6m',/BMW X6 M Competition/i],['impreza',/Subaru Impreza.*2006/i],['legacy-b4',/Subaru Legacy B4/i]
];
var VEHICLE_COLORS=[
 {id:'silver',name:'Серебристый',hex:'#aeb8c5',tone:[1,1,1,0]},
 {id:'white',name:'Белый',hex:'#f2f3f0',tone:[1.18,1.19,1.17,.08]},
 {id:'black',name:'Чёрный',hex:'#202630',tone:[.27,.30,.36,.015]},
 {id:'blue',name:'Синий',hex:'#245ca4',tone:[.16,.43,.88,.01]},
 {id:'red',name:'Красный',hex:'#b5323b',tone:[.88,.12,.17,.015]},
 {id:'green',name:'Зелёный',hex:'#246351',tone:[.12,.48,.34,.015]}
];
var TUNING_PARTS={
 color:{name:'Цвет кузова',hours:12,options:VEHICLE_COLORS.map(function(c){return {id:c.id,name:c.name,price:45000};})},
 tint:{name:'Тонировка',hours:2,options:[{id:'stock',name:'Заводские стёкла',price:3000},{id:'light',name:'Лёгкая',price:7000},{id:'dark',name:'Тёмная',price:10000}]},
 wheels:{name:'Диски',hours:4,options:[{id:'stock',name:'Заводские',price:10000},{id:'sport',name:'Спортивные · графит',price:35000},{id:'bronze',name:'Литые · бронза',price:45000}]},
 audio:{name:'Музыка в салоне',hours:3,options:[{id:'stock',name:'Заводская',price:4000},{id:'comfort',name:'Компонентная акустика',price:18000},{id:'premium',name:'Акустика и усилитель',price:42000}]}
};
var tuningSelection=null,tuningDraft=null,tuningBefore=false,vehiclePhotoSequence=0;
function vehicleColor(key){return VEHICLE_COLORS.find(function(c){return c.id===key;}) || null;}
function tuningModel(car){var rule=car && TUNING_RULES.find(function(r){return r[1].test(car.name);});return rule?rule[0]:car && car.visualModel && /^(?:BMW|Mercedes)/.test(car.name)?car.visualModel:null;}
function vehicleVisual(car){
 var key=car && car.visualModel || tuningModel(car);
 return key && typeof VEHICLE_VISUALS!=='undefined'?VEHICLE_VISUALS[key] || null:null;
}
function supportsTuning(car){return !!(car && !/^(?:Лада|Lada|ВАЗ|VAZ|УАЗ|ЗИЛ|ГАЗ|Волга|Москвич|Жигули|ЗАЗ)/i.test(car.name) && tuningModel(car) && vehicleVisual(car));}
function colorFromDescription(car){
 var text=(car.full || '').toLowerCase();
 if(/бел[ыао]/.test(text))return 'white';if(/ч[её]рн/.test(text))return 'black';if(/красн/.test(text))return 'red';if(/син[иья]/.test(text))return 'blue';if(/зел[её]н/.test(text))return 'green';return 'silver';
}
function importOrderForCar(car){return commerce && car.commerceOffer?commerce.orders.find(function(o){return o.offerId===car.commerceOffer;}):null;}
function factoryVehicleColor(car){
 var order=importOrderForCar(car),offer=car.commerceOffer && commerceOffer(car.commerceOffer);
 if(order)return vehicleColor(order.factoryColor)?order.factoryColor:colorFromDescription(car);
 if(offer && offer.kind==='import' && !offer.legacy)return commerce && vehicleColor(commerce.colors[offer.id])?commerce.colors[offer.id]:'silver';
 return colorFromDescription(car);
}
function stockVehicleAppearance(car){return {color:factoryVehicleColor(car),tint:'stock',wheels:'stock',audio:'stock'};}
function validTuningAppearance(value){return isRecord(value) && Object.keys(TUNING_PARTS).every(function(k){return TUNING_PARTS[k].options.some(function(o){return o.id===value[k];});});}
function vehicleAppearance(car){var state=career && career.vehicles[car.id],acquired=garage.indexOf(car.id)!==-1 || retiredMarketCars.indexOf(car.id)!==-1;return Object.assign(stockVehicleAppearance(car),acquired && state && validTuningAppearance(state.appearance)?state.appearance:{});}
function vehicleInWorkshop(id){return !!(career && career.vehicles[id] && career.vehicles[id].tuningJob);}
function initTuning(){
 Object.keys(career.vehicles).forEach(function(id){
  var state=career.vehicles[id],car=carById(Number(id)),job=state.tuningJob;
  if(!supportsTuning(car) || !validTuningAppearance(state.appearance))delete state.appearance;
  if(!Number.isSafeInteger(state.tuningPaid) || state.tuningPaid<0)state.tuningPaid=0;
  if(job && (!supportsTuning(car) || garage.indexOf(car.id)===-1 || !validTuningAppearance(job.target) || !Number.isSafeInteger(job.paid) || job.paid<=0 || !Number.isFinite(job.startedAt) || !Number.isFinite(job.finishesAt) || job.finishesAt<=job.startedAt))delete state.tuningJob;
 });
 tuningSelection=null;tuningDraft=null;tuningBefore=false;tickTuning();saveCareer();
 $('garageBody').addEventListener('click',function(event){
  var b=event.target.closest('button');if(!b || b.disabled)return;
  if(b.dataset.garageTuning){tuningSelection=Number(b.dataset.garageTuning);tuningDraft=null;setGarageTab('tuning');}
  if(b.dataset.tuningView){tuningBefore=b.dataset.tuningView==='before';renderGarageApp();}
  if(b.hasAttribute('data-tuning-reset')){tuningDraft=vehicleAppearance(carById(tuningSelection));tuningBefore=false;renderGarageApp();}
  if(b.hasAttribute('data-tuning-install'))startTuning(tuningSelection,tuningDraft);
 });
 $('garageBody').addEventListener('change',function(event){
  if(event.target.matches('[data-tuning-car]')){tuningSelection=Number(event.target.value);tuningDraft=null;tuningBefore=false;renderGarageApp();}
  if(event.target.matches('[data-tuning-part]')){tuningDraft[event.target.dataset.tuningPart]=event.target.value;tuningBefore=false;renderGarageApp();}
 });
}
function tuningQuote(car,target){
 if(!supportsTuning(car) || !validTuningAppearance(target))return null;
 var current=vehicleAppearance(car),items=[],factor=Math.max(.75,Math.min(3,(car.basePrice || car.price)/2000000));
 Object.keys(TUNING_PARTS).forEach(function(k){if(current[k]===target[k])return;var group=TUNING_PARTS[k],option=group.options.find(function(o){return o.id===target[k];});items.push({part:k,label:group.name+' — '+option.name,price:Math.round(option.price*factor/500)*500,hours:group.hours});});
 return {items:items,total:items.reduce(function(n,i){return n+i.price;},0),hours:items.reduce(function(n,i){return n+i.hours;},0)};
}
function tuningReason(car){
 if(!car || garage.indexOf(car.id)===-1 || !supportsTuning(car))return 'Для этой модели визуальный тюнинг пока не подготовлен.';
 if(marketGameOver())return 'Игра завершена.';
 if(vehicleInWorkshop(car.id))return 'Машина уже в мастерской.';
 return garageRepairReason(car.id).replace(/ремонт/g,'тюнинг');
}
function startTuning(id,target){
 advanceGameTime(Date.now());tickPending();var car=carById(id),reason=tuningReason(car),quote=car && tuningQuote(car,target);
 if(reason || !quote || !quote.items.length || !Number.isSafeInteger(purchaseCost(car)+quote.total) || !canAfford(quote.total)){toast(reason || 'Выберите изменения и проверьте баланс.');return false;}
 var cost=purchaseCost(car);if(!spend(quote.total,'Тюнинг: '+car.name))return false;
 var state=careerVehicle(car);state.tuningPaid=(state.tuningPaid || 0)+quote.total;state.tuningJob={target:Object.assign({},target),paid:quote.total,startedAt:gameMs,finishesAt:gameMs+quote.hours*3600000};
 purchasePrices[id]=cost+quote.total;
 endOfferChat(id,'Машина отправлена на тюнинг. Объявление снято, переговоры завершены.');removeSaleOffers(id);delete listings[id];
 career.revision++;tuningDraft=null;save();updateStats();refreshList();renderGarageApp();toast('Работы оплачены. Машина останется в мастерской до указанного времени.');return true;
}
function tickTuning(){
 if(!career)return;var changed=false;
 Object.keys(career.vehicles).forEach(function(id){var state=career.vehicles[id],job=state.tuningJob;if(job && gameMs>=job.finishesAt){state.appearance=Object.assign({},job.target);delete state.tuningJob;changed=true;toast('Тюнинг завершён: '+carById(Number(id)).name+'.');}});
 if(changed){career.revision++;saveCareer();tuningDraft=null;renderGarageApp();if(view!=='market')refreshList();}
 else if(garageTab==='tuning' && openWindows.garage){var eta=$('garageBody').querySelector('[data-tuning-eta]');if(eta){var state=career.vehicles[Number(eta.dataset.tuningEta)];if(state && state.tuningJob)eta.textContent=fmtDur(Math.max(0,state.tuningJob.finishesAt-gameMs));}}
}
function tuningSummary(car){
 var a=vehicleAppearance(car);if(!vehicleVisual(car))return '';
 return 'Цвет: '+vehicleColor(a.color).name.toLowerCase()+'. '+['tint','wheels','audio'].map(function(k){return TUNING_PARTS[k].name+': '+TUNING_PARTS[k].options.find(function(o){return o.id===a[k];}).name.toLowerCase();}).join(' · ');
}
function tuningActiveValue(car){
 var state=career && career.vehicles[car.id];if(!state || !state.appearance)return 0;
 var stock=stockVehicleAppearance(car),a=vehicleAppearance(car),factor=Math.max(.75,Math.min(3,(car.basePrice || car.price)/2000000));
 return Object.keys(TUNING_PARTS).reduce(function(n,k){return n+(a[k]!==stock[k]?TUNING_PARTS[k].options.find(function(o){return o.id===a[k];}).price*factor:0);},0);
}
function tuningBuyerEffect(car,buyer){
 var value=tuningActiveValue(car);if(!value)return {amount:0,text:''};
 var taste=(hashStr('tuning-buyer:'+buyer.name+':'+car.id)>>>0)%3;
 return {amount:Math.round(Math.min(value,(car.basePrice || car.price)*.25)*[.45,0,-.15][taste]/500)*500,text:['Мне нравятся эти доработки, готов немного доплатить.','Доработки вижу, но для меня они почти не влияют на цену.','Я ищу заводское состояние, доработки для меня скорее повод поторговаться.'][taste]};
}
function garageTuningHtml(){
 var cars=garage.map(carById).filter(supportsTuning);
 if(!cars.length)return '<div class="empty">Тюнинг доступен для подготовленных JDM-моделей, легендарных иномарок, BMW и Mercedes. Купите такую машину: например, Mark II, Chaser, Supra, Skyline, RX-7 или M3 E30. Российские марки не поддерживаются.</div>';
 if(!cars.some(function(c){return c.id===tuningSelection;})){tuningSelection=cars[0].id;tuningDraft=null;tuningBefore=false;}
 var car=carById(tuningSelection),state=careerVehicle(car),job=state.tuningJob,reason=tuningReason(car);
 if(!tuningDraft || !validTuningAppearance(tuningDraft))tuningDraft=vehicleAppearance(car);
 var quote=tuningQuote(car,tuningDraft),shown=tuningBefore?stockVehicleAppearance(car):job?job.target:tuningDraft;
 var html='<div class="tuning-heading"><div><p class="tuning-kicker">Мастерская · индивидуальный стиль</p><h3>Тюнинг</h3></div><label>Ваш автомобиль<select data-tuning-car>'+cars.map(function(c){return '<option value="'+c.id+'"'+(c.id===car.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select></label></div><div class="tuning-layout"><section class="tuning-preview"><div class="tuning-photo">'+carImg(car,shown)+'</div><div class="tuning-view"><button data-tuning-view="before" aria-pressed="'+tuningBefore+'">Заводской вид</button><button data-tuning-view="after" aria-pressed="'+!tuningBefore+'">'+(job?'После установки':'Предпросмотр')+'</button></div><p>'+esc(car.name)+'</p><small>Москва · иллюстрация модели. Местонахождение машины: '+esc(locationText(car.id))+'.</small><p class="tuning-caption">Меняются кузов, стёкла и диски. Музыка устанавливается в салоне и снаружи не видна.</p></section><section class="tuning-controls">';
 if(job)return html+'<div class="tuning-job" role="status"><h4>Машина в мастерской</h4><p>Работы оплачены: '+money(job.paid)+'.</p><p>Готовность: '+fmtMeet(new Date(job.finishesAt))+'</p><b>Осталось <span data-tuning-eta="'+car.id+'">'+fmtDur(job.finishesAt-gameMs)+'</span></b><p>Продажа, встречи и перевозка будут доступны после окончания работ. Можно заниматься другими машинами.</p></div></section></div>';
 html+=Object.keys(TUNING_PARTS).map(function(k){return '<label>'+TUNING_PARTS[k].name+'<select data-tuning-part="'+k+'"'+(reason?' disabled':'')+'>'+TUNING_PARTS[k].options.map(function(o){return '<option value="'+o.id+'"'+(tuningDraft[k]===o.id?' selected':'')+'>'+esc(o.name)+'</option>';}).join('')+'</select></label>';}).join('');
 html+='<div class="tuning-quote">'+(quote.items.length?'<ul>'+quote.items.map(function(i){return '<li><span>'+esc(i.label)+'</span><b>'+money(i.price)+'</b></li>';}).join('')+'</ul>':'<p>Выберите доработки. Предпросмотр бесплатный.</p>')+'<p class="tuning-total">К оплате <b>'+money(quote.total)+'</b></p><p>Срок: '+quote.hours+' игровых ч. · Себестоимость после работ: '+money(purchaseCost(car)+quote.total)+'</p></div>';
 html+='<p class="tuning-note">Оплата включает детали и установку. Старые детали не продаются обратно. Начало работ снимет объявление с продажи. Покупатели оценивают доработки по-разному: вернуть все вложения при продаже не гарантируется.</p>'+(reason?'<p class="tuning-warning" role="status">'+esc(reason)+'</p>':'')+(!canAfford(quote.total)?'<p class="tuning-warning">Не хватает денег на выбранные работы.</p>':'')+'<button data-tuning-install'+(reason || !quote.items.length || !canAfford(quote.total)?' disabled':'')+'>Оплатить и установить · '+money(quote.total)+'</button><button class="tuning-secondary" data-tuning-reset>Отменить предпросмотр</button></section></div>';
 return html;
}

// Clip and recolour only reviewed body panels; glass, road, chrome and lamps stay untouched.
function photoToneFilter(id,tone){var t=tone,w=[.2126,.7152,.0722],rows=t.slice(0,3).map(function(v){return w.map(function(c){return (v*c).toFixed(5);}).join(' ')+' 0 '+t[3];});return '<filter id="'+id+'" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="'+rows.join(' ')+' 0 0 0 1 0"/></filter>';}
function photoPolygon(points){return '<polygon points="'+points.map(function(p){return p.join(',');}).join(' ')+'"/>';}
function vehicleAppearancePhoto(car,override){
 var art=vehicleVisual(car);if(!art || (!override && !car.visualModel && garage.indexOf(car.id)===-1))return '';
 var a=override || vehicleAppearance(car),color=vehicleColor(a.color) || vehicleColor('silver'),uid='vp'+(++vehiclePhotoSequence),r=art.region,ratio=1000*r[3]/r[2];
 var image='<svg width="1000" height="'+ratio+'" viewBox="'+r.join(' ')+'" overflow="hidden"><image href="'+esc(art.src)+'" width="'+art.width+'" height="'+art.height+'"/></svg>';
 var holes=art.glass.concat(art.exclude || []);var defs='<defs><mask id="'+uid+'body" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="'+ratio+'"><g fill="white">'+art.body.map(photoPolygon).join('')+'</g><g fill="black">'+holes.map(photoPolygon).join('')+'</g></mask><clipPath id="'+uid+'glass">'+art.glass.map(photoPolygon).join('')+'</clipPath>'+photoToneFilter(uid+'paint',color.tone)+'</defs>';
 var layers=color.id==='silver'?'':'<g mask="url(#'+uid+'body)" filter="url(#'+uid+'paint)">'+image+'</g>';
 if(a.tint!=='stock')layers+='<g clip-path="url(#'+uid+'glass)" fill="#080f19" opacity="'+(a.tint==='dark'?.72:.35)+'"><rect width="1000" height="'+ratio+'"/></g>';
 if(a.wheels!=='stock')art.wheels.forEach(function(w){var bronze=a.wheels==='bronze',spokes=bronze?6:10;layers+='<g transform="translate('+w[0]+' '+w[1]+') scale('+w[2]+' '+w[3]+')"><ellipse rx="1" ry="1" fill="#111822" stroke="#8c939b" stroke-width=".06"/><ellipse rx=".87" ry=".87" fill="#1e232a" stroke="'+(bronze?'#b59b69':'#737c87')+'" stroke-width=".09"/>';for(var i=0;i<spokes;i++)layers+='<path d="M-.09 -.12 L-.045 -.82 L.045 -.82 L.09 -.12 Z" transform="rotate('+i*360/spokes+')" fill="'+(bronze?'#aa8b50':'#5e6a79')+'" stroke="'+(bronze?'#dbc192':'#9da8b6')+'" stroke-width=".025"/>';layers+='<ellipse rx=".19" ry=".19" fill="'+(bronze?'#a38c61':'#8b939e')+'"/><ellipse rx=".08" ry=".08" fill="#353b43"/></g>';});
 return '<span class="car-visual urban-photo-wrap"><svg class="car-photo-frame urban-model-photo" viewBox="0 0 1000 '+ratio+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(car.name+' · '+color.name+' · Москва')+'">'+defs+image+layers+'</svg></span>';
}
function importColorPicker(offer){
 var car=carById(offer.carId),color=factoryVehicleColor(car);
 return '<fieldset class="import-colors"><legend>Заводской цвет · без доплаты</legend><p>Машина приедет в стоке. Выберите цвет до подписания заказа.</p><div>'+VEHICLE_COLORS.map(function(c){return '<label title="'+c.name+'"><input type="radio" name="import-color" data-import-color="'+offer.id+'" value="'+c.id+'"'+(c.id===color?' checked':'')+'><span style="--swatch:'+c.hex+'"></span>'+c.name+'</label>';}).join('')+'</div></fieldset>';
}
