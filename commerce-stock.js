'use strict';

// Offer only the first car of each model. Retain former variants and their IDs
// so old garages, signed contracts and paid deliveries still load unchanged.
function buildCommerceStock(){
    var offers=[],cars=[],colours=['белый','серебристый','чёрный','синий','серый','красный'];
    var trims=['Базовая','Комфорт','Максимальная'];
    var routes={
        'Япония':{currency:'JPY',rate:.60,days:18,delivery:120000,steering:'Правый'},
        'Южная Корея':{currency:'KRW',rate:.065,days:24,delivery:135000,steering:'Левый'},
        'Китай':{currency:'CNY',rate:13,days:12,delivery:95000,steering:'Левый'},
        'Германия':{currency:'EUR',rate:98,days:28,delivery:180000,steering:'Левый'},
        'США':{currency:'USD',rate:90,days:35,delivery:220000,steering:'Левый'}
    };
    ['dealer','import'].forEach(function(kind){
        var models=COMMERCE_MODELS.filter(function(m){return m.kind===kind;}),ordinary=models.filter(function(m){return kind!=='dealer' || m.brand!=='Lada';});
        var target=kind==='dealer'?400:600,remaining=kind==='dealer'?target-models.filter(function(m){return m.brand==='Lada';}).length*35:target;
        models.forEach(function(model,mi){
            var oi=ordinary.indexOf(model),count=kind==='dealer' && model.brand==='Lada'?35:Math.floor(remaining/ordinary.length)+(oi<remaining%ordinary.length?1:0);
            for(var i=0;i<count;i++){
                var number=String(i+1).padStart(3,'0'),id='stock-'+kind+'-'+model.key+'-'+number,seed=2166136261;
                var family=kind+'-'+model.key;for(var j=0;j<family.length;j++)seed=Math.imul(seed^family.charCodeAt(j),16777619)>>>0;
                var carId=8000000+(seed%700000)*100+i;
                var year=kind==='dealer'?2026-Math.floor(i/18):(model.minYear || 2019)+i%(2026-(model.minYear || 2019)),trim=trims[i%3],colour=colours[Math.floor(i/3)%6];
                var vehicle=Math.round(model.price*(1+(i%3)*.06-(2026-year)*.035+(i%6)*.003)/1000)*1000;
                var route=routes[model.country],mileage=kind==='dealer'?0:18000+(2026-year)*8500+mi*137+i*311;
                var report=kind==='dealer'?'Новый автомобиль, пробег 0 км. Предпродажная подготовка выполнена; комплектация и VIN проверяются при выдаче.':
                    'VIN и экспортные документы сверены. Пробег '+mileage.toLocaleString('ru-RU')+' км. '+(i%5===0?'На бампере есть косметические следы эксплуатации.':'Кузов без заявленных силовых повреждений; техническое состояние проверяйте независимым осмотром.');
                var offer={id:id,kind:kind,brand:model.brand,model:model.model,modelKey:model.key,carId:carId,newCar:kind==='dealer',price:vehicle,trim:trim+' · '+model.engine,report:report,seller:kind==='dealer'?model.brand+' · Москва':model.country+' · Export Auto',body:model.body};
                offer.legacy=i>0;
                if(route && kind==='import')Object.assign(offer,{country:model.country,currency:route.currency,rate:route.rate,foreign:Math.round(vehicle/route.rate),delivery:route.delivery,duty:Math.round(vehicle*.23/1000)*1000,util:Math.round((vehicle<2000000?180000:340000)/1000)*1000,days:route.days,steering:route.steering});
                var full='Цвет — '+colour+'. '+report+' Комплектация: '+trim+'. '+(kind==='import'?'Руль: '+route.steering+'.':'Автомобиль из наличия автосалона.');
                cars.push({id:carId,name:model.brand+' '+model.model+(model.variant?' '+model.variant:'')+', '+year,brand:model.brand,modelFamily:model.brand+' '+model.model,body:model.body,price:vehicle,basePrice:vehicle,marketPrice:Math.round(vehicle*(kind==='import'?1.6:.98)/1000)*1000,img:model.photo || '',photoCaption:'Фото модели · цвет экземпляра: '+colour,desc:model.engine+', '+mileage.toLocaleString('ru-RU')+' км, '+trim,full:full,cityId:moscowCity.id,seller:{name:offer.seller,avatar:'👨‍💼',personality:'neutral'},commerceOffer:id,newCar:offer.newCar});
                if(model.illustration){cars[cars.length-1].illustration=model.illustration;cars[cars.length-1].photoCaption=(model.illustration.kind==='showroom'?'Изображение модели в автосалоне':'Рисованная иллюстрация модели')+' · цвет и комплектация условные';}
                offers.push(offer);
            }
        });
    });
    return {offers:offers,cars:cars};
}
