'use strict';

// Fixed additions to the private market. IDs and selection never depend on Math.random,
// the current date, prices, or saves. The first 837 cars keep their original IDs.
var EXPANDED_CARS=(function(){
    var originals=CARS.concat(REGIONAL_CARS,CUSTOM_CARS),byId=Object.create(null);
    originals.forEach(function(car){
        byId[car.id]=car;
    });
    var cities=Array.from(new Set(originals.map(function(c){return c.cityId;}).filter(Boolean)));
    // The initial Moscow cars have no city until city-market.js runs.
    var moscow=CITIES.find(function(c){return c.name==='Москва';});
    if(cities.indexOf(moscow.id)===-1)cities.unshift(moscow.id);
    var places=Object.create(null);CITIES.concat(CUSTOM_CITIES).forEach(function(c){places[c.id]=c.name;});
    // Freeze the source order so later additions cannot renumber or replace saved cars.
    var modelIds=[
        3000041,1758027,127,1224013,1063015,1063008,27,1996017,1996015,1382014,1996009,1160020,
        3000027,3000028,1928018,1412007,1787014,1833017,1224018,3000063,1620020,25,1648020,3000040,
        153,1648021,1224014,1160013,1160009,1648015,1620019,1620021,31,1657023,1224006,1160022,
        1412022,1657022,3000003,1758016,12,1758020,40,1224020,3000059,1382020,3000046,142,
        1758030,1122022,2065029,1787030,1787024,1122024,1382023,1996016,1063011,1412016,1758015,1160015,
        48,1783005,1160007,2098028,125,1224012,47,1648010,1122010,1707008,111,2098027,
        1620008,1620023,135,1996027,1928006,1122007,35,108,19,1160024,1063022,1063029,
        2065023,1412014,1783014,1620017,1063027,154,2098012,1382022,1758023,1707018,1122028,1412003,
        34,1224029,117,1996008,1783011,1758010,1783016,109,1160026,1833006,1160021,2065020,
        1833016,138,44,1620002,1783017,1783008,1996011,1758013,1657018,30,1648029,1657012,
        2016016,2016006,3000047,1718022,1996030,1412023,1833009,1382026,3000010,1718017,1718015,2016030,
        126,3000025,1718004,1224008,2016009,1412008,1412015,1657016,2098013,2098009,1833004,1160002,
        26,1787013,1787016,1787022,1707013,1063017,1160023,119,45,146,1833008,1122015,
        1620012,1620006,1063028,1382019,1648006,1928010,1122011,1833013,1063009,1063014,1787015,1657017,
        1224017,1382017,1996005,1783015,1620016,2098015,1928012,1787009,1648002,1620005,1996006,1122012,
        1833014,2098007,1707019,1224009,1063013,1783029,24,1718013,120,1758017,6,1412001,
        1122002,1224025,1657003,107,1160006,1224003,1783002,1063001,1657001,1063002,1648024,1707004,
        1620003,1122004,2016015,1063005,1122009,1620004,1620010,139,1996004,1382005,21,3000062,
        20,155,1928017,1412017,2016022,1996014,1412020,1224021,136,1122019,3000066,1224024,
        3000013,2016012,3000037,1707024,1758018,3000058,2098010,2098018,1648012,1718007,1122027,1787023,
        1063020,1382029,1063030,130,1648013,2065013,1382024,3000054,28,1928015,1160018,1996012,
        2016011,1657029,1122001,1648008,1718006,2065025,2016017,150,2098016,3000009,1160010,3000024,
        1707021,128,2016018,1224019,3000042,3000064,8,1648003,1412019,2098019,1996019,2065022,
        1758019,1707023,1063019,1758022,1718009,1063018,1928016,1928014,1063016,1224022,1718008,1382009,
        1707010,1787025,1783004,5,3000055,1620026,1758029,1758026,3000026,152,116,1224030,
        1648011,1620024,2016019,131,1996010,1707015,1787018,3000012,2098008,1783013,3000038,1620009,
        2065015,1928013,1783024,1787019,1382010,2016028,1224001,1224004,1718018,110,3000008,2016004,
        1382013,2098005,39,1718019,2016008,2065018,2016027,1928023,1657002,123,1787012,1657009,
        1657010,3000033,3000015,151,149,1718014,1224002,1412027,1648025,1758011,38,2016014,
        2098004,1833018,3000051,2098006,1412013,1648017,134,1122025,1996028,1063025,1412004,37,
        1783010,1648004,1412026,2,115,1707028,1657013,1620029,1122008,1382008,1224010,1928011,
        133,1783022,3000039,32,2098020,1996020,156,3000068,1412021,1648018,137,1657014,
        23,1063010,145,1620007,1122026,46,1063006,118,1160008,1758008,1160016,1707025,
        1160029,1382006,1382012,1758025,1928027,1620001,1758028,1122030,1928007,1063012,122,1648016,
        143,2098024,2016013,1620015,3000034,1063007,1996007,1648014,3000053,1224016,2098014,1160011,
        3000056,2098021,2098030,132,3000016,1758009,1718016,1718012,1783020,2016010,1620013,101,
        1160014,3000001,3000045,1718020,1648007,1718025,99,1648005,113,1648009,1833023,1657005,
        3000014,147,91,1707009,1707005,2016024,2098001,1063024,1718024,124,2065027,1718005,
        1224007,3000017,2098002,1122014,1657019,1620018,3000035,1412012,2098003,33,3000031,3000032,
        1783019,3000002,1657020,3000007,1718028,1718011,3000052,3000006,2016007,29,3000044,1224005,
        1224015,1783018,1160019,3000050,148,1718027,1707017,2016002,1412005,1718003,2016026,106,
        1758003,1160017,1707016,121,1620011,1122017,1620025,112,1928021,1758005,22,1122005,
        1382015,1707007,1382011,1648019,1382016,1122018,129,2016023,1122020,1657008,1783030,141,
        3000060,3000023,3000049,3000029,3000019,1160005,1833001,1833030,1928029,1787004,114,1224027,
        1718010,4,3000020,3000022,1412002,1657004,3000018,3000005,1224026,1382028,1,1382027,
        1160030,1122029,1160027,1412029,3000021,1833029,1718001,3000030,3000048,140,1758012,2016020,
        1412009,1382007,3000043
    ];
    var models=modelIds.map(function(id){var car=byId[id];return {family:car.name.replace(/,?\s*(?:19|20)\d{2}\s*$/,'').trim(),car:car};});
    var stylish=/BMW|Mercedes|Audi|Lexus|Porsche|Lamborghini|Ferrari|Bugatti|Jaguar|Cadillac|Infiniti|Maybach|Coupe|Coupé|Supra|Chaser|Mark II|Skyline|Silvia|RX-7|RX-8|NSX|Evolution|Giulia|Challenger|Mustang|Camaro|Hummer/i;
    var legends=/Supra|Skyline|Chaser|Mark II|Silvia|RX-7|NSX|Evolution|M3 E30|F40|Diablo|911 GT3|Chiron|Caldina GT-T|Laurel|Legacy B4/i;
    var trims=[
        {name:'Базовая',text:'Тканевый салон, обычные кресла, штатная аудиосистема.',factor:.91},
        {name:'Комфорт',text:'Климатическая система, подогрев передних сидений и электропакет.',factor:1},
        {name:'Кожаный салон',text:'Кожаный салон, электрорегулировки кресел и дополнительная шумоизоляция.',factor:1.06},
        {name:'Пакет Sport',text:'Спортивные сиденья, другой руль и комплект легкосплавных дисков.',factor:1.10},
        {name:'Зимний пакет',text:'Подогревы, второй комплект колёс и защита картера.',factor:1.03},
        {name:'Аудиопакет',text:'Улучшенная акустика, мультимедиа и камера заднего вида.',factor:1.05},
        {name:'Туринг-пакет',text:'Удобные кресла, круиз-контроль и багажные аксессуары для поездок.',factor:1.08},
        {name:'Заводской стиль',text:'Штатные колёса и салон; дополнительного внешнего декора нет.',factor:1.02}
    ];
    var conditions=[
        {key:'daily',label:'На каждый день',factor:.83,repair:.025,text:'На ходу, кузов со сколами и небольшими вмятинами. Подвеске требуется обслуживание.',defect:'Износ втулок подвески и тормозных дисков.'},
        {key:'cared',label:'Ухоженный',factor:1.03,repair:0,text:'Кузов аккуратный, салон сохранён. Последнее обслуживание подтверждается записями.',defect:''},
        {key:'stored',label:'После простоя',factor:.52,repair:.13,text:'После длительной стоянки двигатель запускается, но до поездок нужны ремонт тормозов и замена жидкостей.',defect:'Тормоза после простоя, аккумулятор, шланги и жидкости.'},
        {key:'project',label:'Проект под ремонт',factor:.20,repair:.43,text:'Не на ходу: двигатель требует капитального ремонта, коробка работает с неисправностью. Забирать на эвакуаторе.',defect:'Капитальный ремонт двигателя и восстановление коробки передач.'},
        {key:'accident',label:'После ДТП',factor:.35,repair:.35,text:'После ДТП: повреждена передняя часть кузова, оптика и радиаторы. Подушки безопасности нужно заменить; забирать на эвакуаторе.',defect:'Кузовной ремонт, оптика, радиаторы и система безопасности.'},
        {key:'prepared',label:'После обслуживания',factor:1.10,repair:0,text:'Выполнено обслуживание двигателя и трансмиссии, расходники заменены. Кузов имеет обычные возрастные следы.',defect:''},
        {key:'cosmetic',label:'С косметикой',factor:.67,repair:.09,text:'Двигатель и коробка работают. На кузове царапины, два элемента требуют окраски; обивка водительского кресла изношена.',defect:'Окраска двух элементов и восстановление обивки кресла.'},
        {key:'collection',label:'Для ценителя',factor:1.28,repair:0,text:'Редкий сохранившийся экземпляр. Владелец собирал историю обслуживания; кузов и салон показываются при дневном свете.',defect:''}
    ];
    var owners=[
        {name:'Артём',avatar:'👨',text:'Освобождаю место в гараже перед переездом.',style:'Пишите вечером, днём не всегда могу ответить.'},
        {name:'Екатерина',avatar:'👩',text:'Пересаживаюсь на другой автомобиль.',style:'Вопросы лучше задать заранее; к осмотру подготовлю документы.'},
        {name:'Руслан',avatar:'🧔',text:'Делал машину для себя, но изменились планы.',style:'Обмен обсуждаю только после осмотра, фотографии узлов могу показать.'},
        {name:'Виктория',avatar:'👩‍🦰',text:'В семье появилась вторая машина, эта стала лишней.',style:'Проверка в сервисе по договорённости, скрывать замечания не собираюсь.'},
        {name:'Денис',avatar:'👨‍🔧',text:'Закрываю незавершённый проект и освобождаю бокс.',style:'Список работ перечислил честно. На месте можно посмотреть всё снизу.'},
        {name:'Марат',avatar:'👨',text:'Ищу покупателя, который понимает особенности этой модели.',style:'На пустой торг не рассчитывайте, аргументы по состоянию выслушаю.'},
        {name:'Ирина',avatar:'👩‍💼',text:'Нужны деньги на другое дело, поэтому выставляю автомобиль.',style:'Покажу в выходные, время согласуем в переписке.'},
        {name:'Егор',avatar:'🧑',text:'Перестал ездить на этой машине каждый день.',style:'Торг у капота после проверки, перевод до встречи не прошу.'},
        {name:'Алексей',avatar:'👨‍🔧',text:'Сменил работу, теперь нужен автомобиль другого класса.',style:'Есть доступ к подъёмнику рядом с местом показа.'},
        {name:'Софья',avatar:'👩',text:'Покупали под свои задачи, теперь изменились планы.',style:'Расскажу о прошлых ремонтах и покажу оставшиеся чеки.'},
        {name:'Павел',avatar:'🧔',text:'Есть интерес к следующему проекту, этот продаю без спешки.',style:'Сначала вопросы по делу, затем договоримся об осмотре.'},
        {name:'Антон',avatar:'👨',text:'Автомобиль долго оставался в запасе, пора передать его новому владельцу.',style:'Звонить не обязательно, отвечу здесь и согласую удобное место.'}
    ];
    var reasons=[
        'Ремонт дальше оплачивать не планирую.', 'Подготовил список последних замен.',
        'С продажей не тороплюсь, но предметный торг возможен.', 'До осмотра цену окончательно не обсуждаю.',
        'Можно приехать со своим специалистом.', 'Два ключа покажу вместе с документами.',
        'Есть следы прежней эксплуатации, новый автомобиль не обещаю.', 'Предпочитаю спокойный осмотр без спешки.',
        'О времени показа прошу предупредить заранее.', 'Если нужны детали, спрашивайте по конкретным узлам.',
        'Обслуживание проходил в независимом сервисе.', 'Обсудим погрузку и передачу после проверки VIN.'
    ];
    var out=[],names=new Set(originals.map(function(c){return c.name;}));
    function add(source,variant,options){
        options=options || {};
        var family=source.name.replace(/,?\s*(?:19|20)\d{2}\s*$/,'').trim(),year=+(source.name.match(/(?:19|20)\d{2}\s*$/)||[2000])[0];
        var trim=trims[variant%trims.length],condition=conditions[Math.floor(variant/trims.length)%conditions.length];
        if(options.condition)condition=conditions.find(function(c){return c.key===options.condition;});
        var label=options.label || trim.name+' · '+condition.label,name=family+' · '+label+', '+year;
        if(names.has(name))return false;
        var index=out.length,id=options.id || 1000000000+source.id*100+variant,seed=(Math.imul(source.id,2654435761)+Math.imul(variant+1,2246822519))>>>0;
        var cityId=options.cityId || cities[(index*7+Math.floor(index/cities.length))%cities.length],owner=owners[seed%owners.length];
        var base=Math.min(99000000,source.basePrice || source.price),value=options.price || Math.round(base*trim.factor*condition.factor*(.94+(seed%13)/100)/500)*500;
        value=Math.max(10000,Math.min(99000000,value));
        var mileage=options.mileage || Math.max(5000,Math.round(((2026-year)*9500+10000+(seed%70000))*(condition.key==='collection'?.25:condition.key==='project'?1.3:1)/100)*100);
        var technical=source.desc.split(/,?\s*\d[\d\s]*\s*км/i)[0].replace(/[,\s]+$/,'');
        var desc=technical+', '+mileage.toLocaleString('ru-RU')+' км, '+condition.label.toLowerCase();
        if(desc.length>120)desc=technical.slice(0,55).replace(/[,\s]+$/,'')+', '+mileage.toLocaleString('ru-RU')+' км, '+condition.label.toLowerCase();
        var repair=options.repair || (condition.repair?Math.max(6000,Math.round(base*condition.repair/500)*500):0);
        var defects=options.defect || condition.defect,story=options.story || condition.text;
        var full=story+' Комплектация игрового экземпляра: '+trim.text+' '+owner.text+' '+reasons[(seed>>>8)%reasons.length]+' '+owner.style+' Пробег — '+mileage.toLocaleString('ru-RU')+' км. Город осмотра — '+places[cityId]+'. Документы сверим перед подписанием договора.';
        if(repair)full+=' Объявленные работы: '+defects+' Ориентир полной подготовки — '+repair.toLocaleString('ru-RU')+' ₽.';
        full+=' Фото иллюстрирует модель; состояние и оснащение этого экземпляра указаны в описании.';
        // Photos are shared only with the exact source model, never a different brand.
        out.push({id:id,name:name,price:value,marketPrice:value,img:source.img,desc:desc,full:full,cityId:cityId,
            seller:{name:owner.name,avatar:owner.avatar,personality:['kind','neutral','evil'][(seed>>>12)%3]},
            fictional:true,expanded:true,sourceCarId:source.id,sourceModelName:source.name,trim:trim.name,condition:condition.key,
            legend:!!(source.legend || legends.test(family)),rare:!!(source.legend || legends.test(family) || stylish.test(family) && condition.key==='collection'),
            story:{title:options.title || condition.label,text:owner.text+' '+reasons[(seed>>>8)%reasons.length],defect:defects,repair:repair},
            photoCaption:'Иллюстрация модели · состояние и оснащение — в описании'});
        names.add(name);return true;
    }
    // Hand-picked extremes and unusual bargains, each with a real disclosed restoration bill.
    add(byId[155],27,{id:5000001,price:200000,condition:'project',label:'Незавершённое восстановление',repair:18500000,title:'Суперкар из незавершённого проекта',cityId:moscow.id,
        defect:'Сборка двигателя V12, восстановление трансмиссии, проводки и салона.',
        story:'Lamborghini за 200 тысяч: незавершённый проект, не на ходу. Двигатель разобран, трансмиссия требует восстановления, часть салона отсутствует. Нужны эвакуатор и большой бюджет; дешёвая покупка не означает дешёвое восстановление.'});
    add(byId[154],63,{id:5000002,price:99000000,condition:'collection',label:'Коллекционный архив',mileage:8700});
    add(byId[3000060],24,{id:5000003,price:10000,condition:'project',label:'Гаражная находка',repair:85000,cityId:moscow.id});
    add(byId[25],25,{id:5000004,price:65000,condition:'project',label:'Мотор под замену',repair:650000,cityId:moscow.id});
    add(byId[3000042],26,{id:5000005,price:180000,condition:'accident',label:'AMG после ДТП',repair:2400000,cityId:moscow.id});
    add(byId[3000039],28,{id:5000006,price:750000,condition:'accident',label:'Трековый проект',repair:12000000});
    add(byId[3000046],29,{id:5000007,price:420000,condition:'project',label:'Большой проект',repair:9500000});
    add(byId[3000059],62,{id:5000008,price:89000000,condition:'collection',label:'Частная коллекция',mileage:12000});
    // Every model gets several distinct configurations; extra rounds add more showy cars.
    for(var round=0;out.length<3163;round++){
        for(var mi=0;mi<models.length && out.length<3163;mi++){
            var model=models[mi];
            if(round>=4 && !stylish.test(model.family) && (mi+round)%3!==0)continue;
            var variant=(round%8)*8+(mi+round*3)%8;
            add(model.car,variant);
        }
    }
    // Additional running luxury/sports configurations; previously assigned IDs stay intact.
    for(var styleRound=0;out.length<3363;styleRound++){
        for(var si=0;si<models.length && out.length<3363;si++){
            if(!stylish.test(models[si].family))continue;
            var styleVariant=[8,40,56,0,24][styleRound%5]+(si+styleRound*2)%8;
            add(models[si].car,styleVariant);
        }
    }
    return out;
})();
