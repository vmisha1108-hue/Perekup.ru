'use strict';

function defaultContractProfile(){return {fullName:'Иванов Алексей Сергеевич',passport:'4501 123456',address:'г. Москва, ул. Игровая, д. 7, кв. 12'};}
var contractBook=readSaved('contracts',{}),contractSigning=false,selectedContractId=null;
if(contractBook.version!==1)contractBook={version:1,sequence:0,profile:defaultContractProfile(),records:[]};
if(!Number.isSafeInteger(contractBook.sequence) || contractBook.sequence<0)contractBook.sequence=0;
if(!isRecord(contractBook.profile) || ['fullName','passport','address'].some(function(key){return typeof contractBook.profile[key]!=='string';}))contractBook.profile=defaultContractProfile();
contractBook.records=(Array.isArray(contractBook.records)?contractBook.records:[]).filter(function(d){return isRecord(d) && d.version===1 && typeof d.id==='string' && isRecord(d.seller) && isRecord(d.buyer) && isRecord(d.vehicle) && Number.isSafeInteger(d.price) && d.price>0 && Number.isFinite(d.signedAt);}).slice(0,100);
function saveContracts(){localStorage.setItem('contracts',JSON.stringify(contractBook));}
function resetContracts(){contractBook={version:1,sequence:0,profile:defaultContractProfile(),records:[]};selectedContractId=null;saveContracts();renderDocuments();}
function contractVehicle(car){
    var seed=hashStr('vehicle-documents:'+car.id)>>>0,alphabet='ABCDEFGHJKLMNPRSTUVWXYZ0123456789',vin='XGM';
    for(var i=0;i<14;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;vin+=alphabet[seed%alphabet.length];}
    var serial=String(100000+car.id%900000),region=car.cityId===moscowCity.id?'77':String(10+car.id%89);
    var color=/цвет\s*[—:-]\s*([^.!\n]+)/i.exec(car.full || '');
    return {name:car.name,year:carStats(car).year,color:color?color[1].trim():['белый','серебристый','чёрный','синий'][car.id%4],
        vin:vin,plate:'А'+String(100+car.id%900)+'МР '+region,pts:region+' ТА '+serial,sts:region+' 01 '+serial,description:vehicleDesc(car)};
}
function contractOtherParty(npc,city){
    var female=/Анна|Марина|Люба|Светлана|Ольга|Елена|Наталья|Ирина|Юлия|Татьяна/.test(npc.name);
    var first=String(npc.name).split(/\s+/)[0];
    if(!/^[А-ЯЁ][а-яё]{2,}$/.test(first))first=female?'Анна':'Сергей';
    var n=hashStr('party:'+npc.name)>>>0;
    return {fullName:(female?'Соколова':'Соколов')+' '+first+' '+(female?'Александровна':'Александрович'),
        passport:String(1000+n%9000)+' '+String(100000+n%900000),address:'г. '+city.name+', ул. Автомобильная, д. '+(1+n%70)};
}
function currentContract(){
    var meeting=chat && !chat.done && chat.pid?findPending(chat.pid):null;
    return meeting && meeting.contract && meeting.contract.version===1?meeting.contract:null;
}
function repairContractDraft(meeting){
    var d=meeting.contract;
    if(!isRecord(d) || d.version!==1 || typeof d.id!=='string' || typeof d.number!=='string' || d.mode!==meeting.mode || d.carId!==meeting.carId || d.price!==meeting.price || !isRecord(d.vehicle) || !isRecord(d.other) || !isRecord(d.fields) ||
        ['name','vin','plate','pts','sts','description'].some(function(key){return typeof d.vehicle[key]!=='string' || !d.vehicle[key];}) ||
        !/^[A-HJ-NPR-Z0-9]{17}$/.test(d.vehicle.vin) || ['fullName','passport','address'].some(function(key){return typeof d.other[key]!=='string' || !d.other[key];})){
        delete meeting.contract;meeting.flow.stage='event';meeting.flow.event={sign:0,amount:0,confirmation:true,prompt:'Осмотр завершён. Согласованная цена: '+money(meeting.price)+'.',yesLabel:'Перейти к договору'};return;
    }
    ['fullName','passport','address','vin','plate','pts','sts','signature'].forEach(function(key){if(typeof d.fields[key]!=='string')d.fields[key]='';});
    d.acknowledged=!!d.acknowledged;
}
function beginContract(){
    if(!chat || chat.done || !chat.met)return false;
    if(chat.trade){completeDeal();return true;}
    var meeting=findPending(chat.pid);if(!meeting || !meeting.flow)return false;
    if(!meeting.contract){
        var city=meetingCity(chat.mode,chat.car.id);
        meeting.contract={version:1,id:'dkp-'+meeting.id,number:'ДКП-'+String(++contractBook.sequence).padStart(5,'0'),mode:chat.mode,
            carId:chat.car.id,price:chat.price,cityId:city.id,city:city.name,createdAt:gameMs,other:contractOtherParty(chat.npc,city),vehicle:contractVehicle(chat.car),
            fields:{fullName:'',passport:'',address:'',vin:'',plate:'',pts:'',sts:'',signature:''},acknowledged:false};
        sysSay('Цена согласована. Теперь заполните и подпишите договор купли-продажи. Деньги и машина пока остаются у владельцев.');
    }
    meeting.price=meeting.contract.price;meeting.flow.stage='contract';meeting.flow.event=null;
    chat.stage='contract';chat.price=meeting.contract.price;chat.event=null;
    saveContracts();save();renderChat();return true;
}
function requestDealCompletion(){if(chat.trade)completeDeal();else beginContract();}
function contractField(key,label,hint,placeholder,draft){
    var upper=['vin','plate','pts','sts'].indexOf(key)!==-1;
    return '<label class="contract-field" for="contract-'+key+'">'+label+'<input id="contract-'+key+'" data-contract-field="'+key+'" value="'+esc(draft.fields[key] || '')+'" placeholder="'+esc(placeholder || '')+'" maxlength="'+(key==='address'?200:upper?24:80)+'" autocomplete="off" spellcheck="false"'+(key==='passport'?' inputmode="numeric"':'')+' aria-describedby="contract-hint-'+key+'"><small id="contract-hint-'+key+'">'+hint+'</small></label>';
}
function contractPartyHtml(title,party){return '<section class="contract-party"><h4>'+title+'</h4><p><b>'+esc(party.fullName)+'</b></p><p>Паспорт: '+esc(party.passport)+'</p><p>Адрес: '+esc(party.address)+'</p></section>';}
function renderContractPreview(draft){
    var f=draft.fields,player={fullName:f.fullName || 'ФИО не заполнено',passport:f.passport || 'не заполнен',address:f.address || 'не заполнен'};
    var seller=draft.mode==='buy'?draft.other:player,buyer=draft.mode==='buy'?player:draft.other;
    return '<article class="contract-paper"><h3>Договор купли-продажи автомобиля</h3><p class="contract-paper-meta">'+esc(draft.number)+' · '+esc(draft.city)+' · '+fmtMeet(new Date(draft.createdAt))+'</p>'+
        '<div class="contract-parties">'+contractPartyHtml('Продавец',seller)+contractPartyHtml('Покупатель',buyer)+'</div>'+
        '<p><b>1.</b> Продавец передаёт покупателю автомобиль <b>'+esc(draft.vehicle.name)+'</b>, цвет '+esc(draft.vehicle.color)+'. VIN: <b>'+esc(f.vin || 'не заполнен')+'</b>; госномер: '+esc(f.plate || 'не заполнен')+'. ПТС: '+esc(f.pts || 'не заполнен')+'; СТС: '+esc(f.sts || 'не заполнен')+'.</p>'+
        '<p><b>2.</b> Цена автомобиля: <b>'+money(draft.price)+'</b>. Это итоговая согласованная сумма с учётом торга на осмотре.</p>'+
        '<p><b>3.</b> Стороны осмотрели автомобиль, сверили игровые документы и согласовали его состояние: '+esc(draft.vehicle.description)+'. Ключи, автомобиль и деньги передаются при подписании.</p>'+
        '<p><b>4.</b> Договор составлен в двух экземплярах — по одному для каждой стороны.</p></article>';
}
function renderContractForm(force){
    var draft=currentContract(),body=$('meetingContract');if(!body)return;
    body.hidden=!draft || chat.stage!=='contract';if(body.hidden)return;
    if(force || body.dataset.contractId!==draft.id){
        body.dataset.contractId=draft.id;
        body.innerHTML='<div class="contract-heading"><span>Шаг 4 · Документы</span><h3>Заполните договор</h3><p>Используйте данные персонажа из игрового паспорта. Данные настоящих документов здесь не нужны.</p></div>'+
            '<div class="contract-help"><b>Помощь с заполнением</b><p>Кнопка перенесёт данные вашего игрового паспорта и машины. Затем проверьте договор и подтвердите подпись.</p><button type="button" id="contractAutofill">Заполнить по игровым документам</button><details><summary>Посмотреть игровые документы</summary>'+contractPartyHtml('Ваш игровой паспорт',contractBook.profile)+
            '<dl class="contract-docs">'+[['Автомобиль',draft.vehicle.name],['VIN',draft.vehicle.vin],['Госномер',draft.vehicle.plate],['ПТС',draft.vehicle.pts],['СТС',draft.vehicle.sts]].map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd></div>';}).join('')+'</dl></details></div>'+
            '<form id="contractForm" novalidate><fieldset><legend>1. Ваши данные · '+(draft.mode==='buy'?'покупатель':'продавец')+'</legend><div class="contract-fields">'+
            contractField('fullName','Фамилия, имя и отчество','Полностью, как в игровом паспорте.','Иванов Иван Иванович',draft)+
            contractField('passport','Серия и номер паспорта','Четыре цифры серии и шесть цифр номера.','4501 123456',draft)+
            contractField('address','Адрес регистрации','Город, улица, дом и квартира персонажа.','г. Москва, ул. Игровая, д. 7, кв. 12',draft)+'</div></fieldset>'+
            '<fieldset><legend>2. Данные автомобиля</legend><p class="contract-muted">'+esc(draft.vehicle.name)+' · '+esc(draft.vehicle.color)+'. Сверьте поля с документами выше.</p><div class="contract-fields">'+
            contractField('vin','VIN автомобиля','17 латинских букв и цифр. Символы I, O и Q не используются.','VIN из игровых документов',draft)+
            contractField('plate','Государственный номер','Перепишите номер без изменения букв и цифр.','Номер из игровых документов',draft)+
            contractField('pts','Серия и номер ПТС','Паспорт транспортного средства — документ на машину.','ПТС из игровых документов',draft)+
            contractField('sts','Серия и номер СТС','Свидетельство о регистрации автомобиля.','СТС из игровых документов',draft)+'</div></fieldset>'+
            '<div id="contractPreview">'+renderContractPreview(draft)+'</div><fieldset><legend>3. Подпись</legend>'+contractField('signature','Ваша подпись — полное ФИО','Должна совпадать с ФИО, указанным в договоре.','Введите своё игровое ФИО',draft)+
            '<label class="contract-confirm"><input type="checkbox" id="contractConfirm"'+(draft.acknowledged?' checked':'')+'>Я проверил данные и согласен с передачей автомобиля и суммы '+money(draft.price)+'.</label><p class="contract-muted">'+(draft.mode==='buy'?'Продавец':'Покупатель')+' '+esc(draft.other.fullName)+' подпишет договор вместе с вами.</p></fieldset>'+
            '<div class="contract-errors" id="contractErrors" role="alert" hidden></div><p id="contractFunds" class="contract-muted"></p><div class="contract-actions"><button type="submit" id="contractSign">Подписать и '+(draft.mode==='buy'?'купить':'продать')+' за '+money(draft.price)+'</button><button type="button" id="contractCancel">Отказаться от сделки</button></div><p class="contract-muted">Черновик сохраняется автоматически. Можно свернуть окно встречи. Закрытие встречи отменяет сделку.</p></form>';
    }
    $('contractFunds').textContent='Доступно на счёте: '+money(balance)+(chat.mode==='sell' && parkingDebt(chat.car.id)?' · Долг за парковку: '+money(parkingDebt(chat.car.id)):'');
}
function fillContractAssist(){
    var draft=currentContract();if(!draft || chat.stage!=='contract')return false;
    ['fullName','passport','address'].forEach(function(key){draft.fields[key]=contractBook.profile[key];});
    ['vin','plate','pts','sts'].forEach(function(key){draft.fields[key]=draft.vehicle[key];});
    draft.fields.signature=draft.fields.fullName;draft.acknowledged=false;
    save();renderContractForm(true);return true;
}
function contractNormal(value){return String(value || '').trim().replace(/\s+/g,' ');}
function contractCode(value){return contractNormal(value).toUpperCase().replace(/\s+/g,'');}
function contractErrors(draft){
    var f=draft.fields,errors=[];
    if(!/^[А-ЯЁA-Zа-яёa-z][А-ЯЁA-Zа-яёa-z\s'-]{4,79}$/.test(contractNormal(f.fullName)) || contractNormal(f.fullName).split(' ').length<2)errors.push({field:'fullName',text:'Укажите полное имя персонажа: фамилию, имя и отчество, как в игровом паспорте.'});
    if(!/^\d{10}$/.test(contractNormal(f.passport).replace(/\s+/g,'')))errors.push({field:'passport',text:'В паспорте нужны 4 цифры серии и 6 цифр номера. Например: 4501 123456.'});
    if(contractNormal(f.address).length<8)errors.push({field:'address',text:'Допишите адрес регистрации персонажа: город, улицу и дом.'});
    ['vin','plate','pts','sts'].forEach(function(key){if(contractCode(f[key])!==contractCode(draft.vehicle[key]))errors.push({field:key,text:({vin:'VIN',plate:'Госномер',pts:'ПТС',sts:'СТС'})[key]+' не совпадает с игровыми документами автомобиля. Сверьте поле или воспользуйтесь помощью.'});});
    if(contractNormal(f.signature).toLowerCase()!==contractNormal(f.fullName).toLowerCase() || !contractNormal(f.signature))errors.push({field:'signature',text:'Для подписи введите то же полное ФИО, что указано в договоре.'});
    if(!draft.acknowledged)errors.push({field:'confirm',text:'Подтвердите, что проверили данные и согласны с условиями сделки.'});
    return errors;
}
function displayContractErrors(errors){
    var box=$('contractErrors');box.hidden=!errors.length;box.innerHTML=errors.length?'<b>Нужно исправить:</b><ul>'+errors.map(function(e){return '<li>'+esc(e.text)+'</li>';}).join('')+'</ul>':'';
    document.querySelectorAll('[data-contract-field]').forEach(function(el){el.removeAttribute('aria-invalid');});
    $('contractConfirm').removeAttribute('aria-invalid');
    errors.forEach(function(e){var el=$(e.field==='confirm'?'contractConfirm':'contract-'+e.field);if(el)el.setAttribute('aria-invalid','true');});
    if(errors.length){box.scrollIntoView({block:'nearest'});var first=$(errors[0].field==='confirm'?'contractConfirm':'contract-'+errors[0].field);if(first)first.focus();}
}
function signContract(){
    if(contractSigning || !chat || chat.stage!=='contract' || chat.done)return false;
    advanceGameTime(Date.now());tickPending();
    var draft=currentContract();if(!draft || chat.stage!=='contract')return false;
    var errors=contractErrors(draft);
    if(draft.carId!==chat.car.id || draft.price!==chat.price || !meetingHere(chat.mode,chat.car.id))errors.push({text:'Условия встречи изменились. Сделка не может быть подписана.'});
    if(chat.mode==='buy' && (garage.indexOf(chat.car.id)!==-1 || retiredMarketCars.indexOf(chat.car.id)!==-1))errors.push({text:'Это объявление уже снято с рынка.'});
    if(chat.mode==='sell' && garage.indexOf(chat.car.id)===-1)errors.push({text:'Автомобиль больше не принадлежит вашему персонажу.'});
    if(chat.mode==='buy' && !canAfford(draft.price))errors.push({text:'Не хватает денег на покупку. Пополните счёт и вернитесь к договору.'});
    if(chat.mode==='sell' && (!Number.isSafeInteger(balance+draft.price) || (!ADM.infMoney && balance+draft.price<parkingDebt(chat.car.id))))errors.push({text:'Нельзя провести расчёт: проверьте сумму и долг за парковку.'});
    if(errors.length){displayContractErrors(errors);return false;}
    var player={fullName:contractNormal(draft.fields.fullName),passport:contractNormal(draft.fields.passport),address:contractNormal(draft.fields.address)};
    var record={version:1,id:draft.id,number:draft.number,mode:draft.mode,carId:draft.carId,city:draft.city,createdAt:draft.createdAt,signedAt:gameMs,price:draft.price,vehicle:Object.assign({},draft.vehicle),seller:draft.mode==='buy'?draft.other:player,buyer:draft.mode==='buy'?player:draft.other};
    contractSigning=true;
    try{
        completeDeal();
        if(chat.meetingOutcome!=='success'){renderChat();return false;}
        if(!contractBook.records.some(function(d){return d.id===record.id;}))contractBook.records.unshift(record);
        contractBook.records=contractBook.records.slice(0,100);contractBook.profile=player;chat.signedContractId=record.id;
        saveContracts();sysSay('Договор '+record.number+' подписан обеими сторонами и сохранён в «Документах».');
        renderChat();renderDocuments();save();return true;
    }finally{contractSigning=false;}
}
function cancelContract(){
    if(!currentContract() || chat.stage!=='contract' || !confirm('Отказаться от подписания? Автомобиль и деньги останутся у владельцев.'))return;
    chat.done=true;chat.stage='done';chat.meetingOutcome='cancelled';chat.meetingResult='Вы отказались подписывать договор. Деньги и автомобиль остались у владельцев.';
    sysSay(chat.meetingResult);renderChat();refreshList();
}
function signedContractHtml(d){
    var player=d.mode==='buy'?d.buyer:d.seller;
    var draft={number:d.number,city:d.city,createdAt:d.createdAt,price:d.price,mode:d.mode,vehicle:d.vehicle,other:d.mode==='buy'?d.seller:d.buyer,fields:Object.assign({},player,d.vehicle)};
    return renderContractPreview(draft)+'<div class="contract-signed"><b>Подписан обеими сторонами · '+fmtMeet(new Date(d.signedAt))+'</b><p>Продавец: '+esc(d.seller.fullName)+'</p><p>Покупатель: '+esc(d.buyer.fullName)+'</p><p>Автомобиль и сумма переданы. Экземпляр вашего персонажа сохранён.</p></div>';
}
function renderDocuments(){
    var body=$('documentsBody');if(!body || !openWindows.documents)return;
    var selected=contractBook.records.find(function(d){return d.id===selectedContractId;});
    body.innerHTML='<div class="contract-heading"><span>Ваши документы</span><h2>Договоры купли-продажи</h2><p>Сохраняются последние 100 подписанных договоров. Черновик остаётся в текущей встрече.</p></div><details class="contract-help"><summary>Игровой паспорт персонажа</summary>'+contractPartyHtml('Данные для заполнения договоров',contractBook.profile)+'</details>'+
        (selected?'<button class="document-back" data-document-back>← Все договоры</button>'+signedContractHtml(selected):!contractBook.records.length?'<div class="empty">Здесь появятся ваши подписанные договоры после покупки или продажи автомобиля.</div>':'<div class="document-list">'+contractBook.records.map(function(d){return '<button class="document-card" data-document="'+esc(d.id)+'"><span>'+esc(d.number)+' · '+(d.mode==='buy'?'Покупка':'Продажа')+'</span><b>'+esc(d.vehicle.name)+'</b><span>'+money(d.price)+' · '+fmtMeet(new Date(d.signedAt))+'</span><small>Подписан обеими сторонами →</small></button>';}).join('')+'</div>');
}
function openSignedContract(id){selectedContractId=id;openWin('documents');renderDocuments();}
function initContracts(){
    saveContracts();
    $('meetingContract').addEventListener('input',function(event){
        var draft=currentContract(),key=event.target.dataset.contractField;if(!draft || !key || !Object.prototype.hasOwnProperty.call(draft.fields,key))return;
        draft.fields[key]=event.target.value.slice(0,key==='address'?200:80);save();$('contractPreview').innerHTML=renderContractPreview(draft);
    });
    $('meetingContract').addEventListener('change',function(event){var draft=currentContract();if(draft && event.target.id==='contractConfirm'){draft.acknowledged=event.target.checked;save();}});
    $('meetingContract').addEventListener('submit',function(event){event.preventDefault();signContract();});
    $('meetingContract').addEventListener('click',function(event){var b=event.target.closest('button');if(!b)return;if(b.id==='contractAutofill')fillContractAssist();if(b.id==='contractCancel')cancelContract();});
    $('meetingContractView').addEventListener('click',function(){if(chat && chat.signedContractId)openSignedContract(chat.signedContractId);});
    $('documentsBody').addEventListener('click',function(event){var b=event.target.closest('button');if(!b)return;if(b.dataset.document)openSignedContract(b.dataset.document);if(b.hasAttribute('data-document-back')){selectedContractId=null;renderDocuments();}});
}
