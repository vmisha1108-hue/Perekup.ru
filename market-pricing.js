'use strict';

// Игровые ориентиры для исправной машины 2010 года, не котировки реальных объявлений.
var MODEL_VALUES = [
    [/Camry/i, 1100000], [/Corolla|Avensis/i, 700000], [/RAV4|CR-V|Forester/i, 1150000],
    [/Land Cruiser(?! Prado)/i, 2400000], [/Prado/i, 2000000], [/Cayenne|Touareg/i, 1900000],
    [/Escalade/i, 2400000], [/BMW.*(?:X6|X5)/i, 2000000], [/BMW|Mercedes|Lexus|Audi/i, 1300000],
    [/Solaris|Rio|Polo/i, 650000], [/Focus|Octavia|Mazda 6|Accord/i, 750000],
    [/Logan|Sandero|Geely MK/i, 380000], [/Nexia|Matiz/i, 250000],
    [/Yaris|Fit|March|Note|Probox/i, 550000], [/Лада|Lada|ВАЗ|VAZ/i, 280000]
];
function estimateMarketPrice(car){
    var original = car.basePrice || car.price;
    if(car.marketPrice) return car.marketPrice;
    // Дешёвые проекты оцениваются с учётом необходимого ремонта.
    if(original <= 100000 && /ремонт|проект|восстанов|не на ходу/i.test(car.desc + ' ' + car.full)){
        var year = +(car.name.match(/(?:19|20)\d{2}\s*$/) || [1990])[0];
        return Math.max(original, year >= 2010 ? 85000 : year >= 2000 ? 65000 : 25000);
    }
    if(car.legend || /Supra|Skyline|Chaser|Mark II|RX-7|Evolution|Ferrari|Lamborghini|Bugatti|911|ЗИЛ|ГАЗ 51/i.test(car.name)) return original;
    var match = car.name.match(/(?:19|20)\d{2}\s*$/);
    var rule = MODEL_VALUES.find(function(row){ return row[0].test(car.name); });
    if(!match || !rule) return original;
    var reference = rule[1] * Math.max(0.32, Math.min(3.5, Math.pow(1.075, +match[0] - 2010)));
    // Состояние и комплектация сохраняют влияние исходной оценки; исправляем явные перекосы.
    return Math.round(Math.max(reference * 0.65, Math.min(reference * 1.8, original)) / 1000) * 1000;
}
function initMarketSession(){
    var previous = {};
    try{ previous = JSON.parse(localStorage.getItem('sellerSessionMoods') || '{}') || {}; }catch(e){}
    var current = {}, moods = ['kind', 'neutral', 'evil'];
    var marketMove = 0.98 + Math.random() * 0.04;
    CARS.forEach(function(car){
        car.basePrice = car.price;
        car.marketPrice = estimateMarketPrice(car);
        var choices = moods.filter(function(mood){ return mood !== previous[car.id]; });
        var mood = choices[Math.min(choices.length - 1, Math.floor(Math.random() * choices.length))];
        car.seller = Object.assign({}, car.seller, {personality:mood});
        current[car.id] = mood;
        var factor = mood === 'kind' ? 0.85 + Math.random() * 0.09
            : mood === 'evil' ? 1.08 + Math.random() * 0.14 : 0.97 + Math.random() * 0.06;
        car.marketPrice = Math.max(1000, Math.round(car.marketPrice * marketMove / 500) * 500);
        car.price = Math.max(1000, Math.round(car.marketPrice * factor / 500) * 500);
    });
    localStorage.setItem('sellerSessionMoods', JSON.stringify(current));
}
function priceAssessment(car){
    var ratio = car.price / (car.marketPrice || car.price);
    return ratio < 0.95 ? {label:'Ниже рынка', tone:'below'}
        : ratio > 1.07 ? {label:'Выше рынка', tone:'above'} : {label:'Хорошая цена', tone:'fair'};
}
initMarketSession();
