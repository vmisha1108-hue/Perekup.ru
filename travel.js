/* Местоположение, поездки и хранение автомобилей. Время — только игровое. */
var transport = null;
var travelTarget = null;
var travelCarId = null;
var transportRenderKey = "";
var DAY_MS = 86400000;
function newTransport(){ return {version:1, cityId:moscowCity.id, trip:null, shipments:[], vehicles:{}, odometers:{}, arrival:null}; }
function initTransport(){
    try { transport = JSON.parse(localStorage.getItem("transport") || "null"); } catch(e){}
    if(!transport || transport.version !== 1) transport = newTransport();
    if(!CITY_BY_ID[transport.cityId]) transport.cityId = moscowCity.id;
    transport.vehicles = transport.vehicles || {};
    transport.odometers = transport.odometers || {};
    transport.shipments = transport.shipments || [];
    garage.forEach(function(id){ vehicleState(id); });
    rebalanceHome();
    bindTransport();
    saveTransport();
    showArrival();
}
function saveTransport(){ if(transport) localStorage.setItem("transport", JSON.stringify(transport)); }
function playerCity(){ return CITY_BY_ID[transport.cityId]; }
function vehicleState(id){
    if(!transport) return null;
    if(!transport.vehicles[id] && garage.indexOf(id) !== -1){
        // Старые покупки размещаются дома, без платы задним числом.
        transport.vehicles[id] = {cityId:moscowCity.id, place:"yard", debt:0};
        rebalanceHome();
    }
    return transport.vehicles[id] || null;
}
function homeOccupancy(){
    if(!transport) return Math.min(garage.length, currentGarage().cap);
    garage.forEach(vehicleState);
    return garage.filter(function(id){ return transport.vehicles[id].place === "garage"; }).length;
}
function rebalanceHome(){
    if(!transport) return;
    var home = garage.filter(function(id){
        var v = transport.vehicles[id];
        return v && v.cityId === moscowCity.id && (v.place === "garage" || v.place === "yard");
    });
    home.sort(function(a,b){ return (transport.vehicles[a].place === "garage" ? 0 : 1) - (transport.vehicles[b].place === "garage" ? 0 : 1); });
    home.forEach(function(id,i){ transport.vehicles[id].place = i < currentGarage().cap ? "garage" : "yard"; });
}
function parkVehicle(id, cityId, at){
    transport.vehicles[id] = {cityId:cityId, place:cityId === moscowCity.id ? "yard" : "parking", debt:0,
        nextChargeAt:cityId === moscowCity.id ? null : (at == null ? gameMs : at) + DAY_MS};
    rebalanceHome();
}
function removeVehicle(id){ delete transport.vehicles[id]; rebalanceHome(); }
function vehicleMoving(id){ var v = vehicleState(id); return !!(v && (v.place === "road" || v.place === "carrier")); }
function locationText(id){
    var v = vehicleState(id);
    if(!v) return carLocationText(carById(id), filters.city);
    var labels = {garage:"гараж", yard:"бесплатный двор", parking:"парковка · 100 ₽/сутки", road:"в пути своим ходом", carrier:"на автовозе"};
    return (CITY_BY_ID[v.cityId] ? CITY_BY_ID[v.cityId].name : "Москва") + " · " + labels[v.place];
}
function vehicleDesc(car){
    var desc = String(car.desc || ""), extra = transport && transport.odometers[car.id] || 0;
    if(!extra) return desc;
    return desc.replace(/(\d[\d\s]*)\s*км/i, function(_,km){ return (Number(km.replace(/\s/g,"")) + extra).toLocaleString("ru-RU") + " км"; });
}
function meetingCity(mode,id){
    var v = mode === "sell" ? vehicleState(id) : null;
    return v ? CITY_BY_ID[v.cityId] : carCity(carById(id)) || moscowCity;
}
function meetingHere(mode,id){
    var city = meetingCity(mode,id);
    return !transport.trip && city.id === transport.cityId && !(mode === "sell" && vehicleMoving(id));
}
function guardDealLocation(){
    if(meetingHere(chat.mode,chat.car.id)) return true;
    sysSay("❌ Сделка возможна только при личном осмотре в городе " + meetingCity(chat.mode,chat.car.id).name + ".");
    chat.done = true;
    return false;
}
function parkingDebt(id){ var v = vehicleState(id); return v ? v.debt || 0 : 0; }
function payParkingDebt(id){
    var v = vehicleState(id), amount = parkingDebt(id);
    if(!canAfford(amount)) return false;
    spend(amount); v.debt = 0; return true;
}
function settleParking(id, until){
    var v = vehicleState(id);
    if(!v || v.place !== "parking" || !v.nextChargeAt || until < v.nextChargeAt) return false;
    var days = Math.floor((until - v.nextChargeAt) / DAY_MS) + 1, fee = days * 100;
    var paid = ADM.infMoney ? fee : Math.min(balance, fee);
    spend(paid);
    v.debt = Math.min(Number.MAX_SAFE_INTEGER, (v.debt || 0) + fee - paid);
    v.nextChargeAt += days * DAY_MS;
    return true;
}
function roadDistance(a,b){
    var direct = distanceBetweenCities(a,b);
    var ferry = a.name === "Калининград" || b.name === "Калининград";
    return Math.max(1, Math.round(direct * (ferry ? 1.55 : 1.3)));
}
function localDrivingCars(){
    return garage.filter(function(id){
        var v = vehicleState(id), c = carById(id);
        return v && v.cityId === transport.cityId && !vehicleMoving(id) && !/не на ходу/i.test(c.desc + " " + (c.full || ""));
    });
}
function routeOptions(targetId){
    var target = CITY_BY_ID[targetId], from = playerCity();
    if(!target || target.id === from.id) return [];
    var road = roadDistance(from,target), direct = distanceBetweenCities(from,target);
    var ferry = from.name === "Калининград" || target.name === "Калининград";
    var regional = /Алдан|Магдагачи/.test(from.name + " " + target.name);
    var options = [
        {mode:"train", label:"🚆 Поезд", price:Math.ceil((800 + road * 2.4) / 100) * 100,
            hours:Math.ceil(2 + road / 55 + (ferry ? 36 : 0) + (regional ? 6 : 0)), note:"С пересадками при необходимости. Самый недорогой общественный транспорт."},
        {mode:"plane", label:"✈️ Самолёт", price:Math.ceil((4500 + direct * 5.5 + (regional ? 3000 : 0)) / 100) * 100,
            hours:Math.ceil(3 + direct / 750 + (regional ? 5 : 0)), note:regional ? "Через ближайший аэропорт: трансфер включён в цену и время." : "Дорога в аэропорт и регистрация включены."}
    ];
    if(road <= 1500 && !ferry) options.push({mode:"taxi",label:"🚕 Междугороднее такси",price:Math.ceil((700 + road * 40) / 100) * 100,
        hours:Math.ceil(1 + road / 70), note:"От двери до двери. Доступно на маршрутах до 1 500 км."});
    if(localDrivingCars().length) options.push({mode:"drive",label:"🚗 Своим ходом",price:Math.ceil((road * 6 + (ferry ? 12000 : 0)) / 100) * 100,
        hours:Math.ceil(road / 70 + Math.floor(road / 700) * 10 + (ferry ? 36 : 0)), note:"Топливо и дорожные расходы включены. Длинный путь учитывает отдых" + (ferry ? " и паром" : "") + ". К пробегу: +" + road.toLocaleString("ru-RU") + " км."});
    return options.map(function(option){ option.distance = road; option.duration = Math.max(1,option.hours) * 3600000; return option; });
}
function shippingQuote(id){
    var v = vehicleState(id);
    if(!v || v.cityId === moscowCity.id || vehicleMoving(id)) return null;
    var distance = roadDistance(CITY_BY_ID[v.cityId],moscowCity);
    var ferry = CITY_BY_ID[v.cityId].name === "Калининград";
    return {distance:distance,price:Math.ceil((5000 + distance * 12 + (ferry ? 12000 : 0)) / 100) * 100,
        duration:(24 + Math.ceil(distance / 700) * 24 + (ferry ? 36 : 0)) * 3600000};
}
function carHasMeeting(id){ return pending.some(function(it){ return it.carId === id && it.type === "meet"; }); }
function depart(targetId,mode,carId){
    advanceGameTime(Date.now()); tickPending();
    var option = routeOptions(targetId).find(function(o){ return o.mode === mode; });
    if(transport.trip || !option) return false;
    if(chat && chat.met && !chat.done){ toast("Сначала завершите встречу."); return false; }
    if(mode === "drive" && (localDrivingCars().indexOf(carId) === -1 || carHasMeeting(carId))){ toast("Выберите местную машину без назначенной встречи."); return false; }
    var debt = mode === "drive" ? parkingDebt(carId) : 0;
    if(!canAfford(option.price + debt)){ toast("Не хватает денег на дорогу" + (debt ? " и долг за парковку" : "") + "."); return false; }
    spend(option.price);
    if(mode === "drive"){
        payParkingDebt(carId);
        transport.vehicles[carId].place = "road";
        removeSaleOffers(carId);
        rebalanceHome();
    }
    transport.arrival = null;
    transport.trip = {from:transport.cityId,to:targetId,mode:mode,label:option.label,carId:mode === "drive" ? carId : null,
        distance:option.distance,price:option.price,departedAt:gameMs,arrivesAt:gameMs + option.duration};
    save(); saveGameTime(); renderTravel(); renderGarageApp(); updateStats(); refreshList();
    toast("Вы отправились в город " + CITY_BY_ID[targetId].name + ".");
    return true;
}
function shipVehicle(id){
    advanceGameTime(Date.now()); tickPending();
    var quote = shippingQuote(id);
    if(!quote || carHasMeeting(id)){ toast("Сначала завершите или отмените встречу по этой машине."); return false; }
    var debt = parkingDebt(id);
    if(!canAfford(quote.price + debt)){ toast("Не хватает денег на автовоз и оплату долга за парковку."); return false; }
    spend(quote.price); payParkingDebt(id);
    transport.vehicles[id].place = "carrier";
    transport.shipments.push({carId:id,from:transport.vehicles[id].cityId,departedAt:gameMs,arrivesAt:gameMs + quote.duration,price:quote.price});
    removeSaleOffers(id);
    save(); saveGameTime(); refreshList(); renderGarageApp(); updateStats();
    toast("🚛 Автовоз отправлен в Москву. Парковка больше не начисляется.");
    return true;
}
function resumeVehicleListing(id,at){ if(listings[id]) listings[id].nextBuyerAt = at + nextBuyerDelay(listings[id]); }
function tickTransport(){
    if(!transport) return;
    var changed = false;
    var trip = transport.trip;
    if(trip && gameMs >= trip.arrivesAt){
        transport.cityId = trip.to;
        if(trip.carId && garage.indexOf(trip.carId) !== -1){
            transport.odometers[trip.carId] = (transport.odometers[trip.carId] || 0) + trip.distance;
            parkVehicle(trip.carId,trip.to,trip.arrivesAt);
            resumeVehicleListing(trip.carId,trip.arrivesAt);
        }
        transport.trip = null;
        transport.arrival = {cityId:trip.to,label:trip.label,when:trip.arrivesAt};
        changed = true;
        showArrival();
    }
    transport.shipments = transport.shipments.filter(function(shipment){
        if(gameMs < shipment.arrivesAt) return true;
        if(garage.indexOf(shipment.carId) !== -1){
            parkVehicle(shipment.carId,moscowCity.id,shipment.arrivesAt);
            resumeVehicleListing(shipment.carId,shipment.arrivesAt);
            toast("🚛 " + carById(shipment.carId).name + " доставлен: " + locationText(shipment.carId) + ".",function(){ openWin("garage"); });
        }
        changed = true; return false;
    });
    garage.forEach(function(id){ if(settleParking(id,gameMs)) changed = true; });
    if(changed){ save(); saveGameTime(); updateStats(); if(view === "garage") showGarage(); }
    var key = (transport.trip ? Math.floor(gameMs / 60000) : "idle") + ":" + transport.cityId + ":" + balance + ":" + garage.join(",") + ":" + garageLvl;
    if(changed || key !== transportRenderKey){
        transportRenderKey = key;
        if(openWindows.travel) renderTravel();
        if(openWindows.garage) renderGarageApp();
        if($("playerLocation")) $("playerLocation").textContent = transport.trip ? "В пути → " + CITY_BY_ID[transport.trip.to].name : playerCity().name;
    }
}
function waitForTransport(){
    advanceGameTime(Date.now()); tickPending();
    var arrivals = transport.shipments.map(function(s){ return s.arrivesAt; });
    if(transport.trip) arrivals.push(transport.trip.arrivesAt);
    if(!arrivals.length || (chat && chat.met && !chat.done)) return false;
    var until = Math.min.apply(null,arrivals);
    while(gameMs < until){ gameMs = Math.min(until,gameMs + 15 * 60000); tickPending(); }
    lastRealMs = Date.now();
    saveGameTime(); save(); renderGameTime(); refreshList(); renderTravel(); renderGarageApp();
    return true;
}
function openTravelTo(cityId){
    travelTarget = CITY_BY_ID[cityId] ? cityId : null;
    closeCarInfo();
    if(chat && !chat.met){ saveChat(); $("overlay").classList.remove("open"); }
    openWin("travel");
}
function renderTravel(){
    if(!transport || !$("travelBody")) return;
    var trip = transport.trip;
    if(trip){
        $("travelBody").innerHTML = '<div class="journey-status"><div class="journey-symbol">' + trip.label.split(" ")[0] + '</div><h2>В пути: ' + esc(CITY_BY_ID[trip.to].name) + '</h2><p>' + esc(CITY_BY_ID[trip.from].name) + ' → ' + esc(CITY_BY_ID[trip.to].name) + '</p><p>Прибытие: <b>' + fmtMeet(new Date(trip.arrivesAt)) + '</b></p><p>Осталось: ' + fmtDur(trip.arrivesAt-gameMs) + '</p><progress max="1" value="' + clamp((gameMs-trip.departedAt)/(trip.arrivesAt-trip.departedAt),0,1) + '"></progress><button data-wait-transport>Дождаться прибытия</button><p class="journey-note">Время идёт: поступают сообщения, начисляется парковка и истекают сроки встреч. Поездка уже оплачена.</p></div>';
        return;
    }
    if(!CITY_BY_ID[travelTarget] || travelTarget === transport.cityId) travelTarget = CITIES.find(function(c){ return c.id !== transport.cityId; }).id;
    var options = routeOptions(travelTarget), local = localDrivingCars();
    if(local.indexOf(travelCarId) === -1) travelCarId = local[0] || null;
    $("travelBody").innerHTML = '<div class="journey-heading"><span>📍 Вы сейчас</span><h2>' + esc(playerCity().label) + '</h2></div><label class="journey-destination">Куда поедем?<select id="travelCity">' + CITIES.filter(function(c){ return c.id !== transport.cityId; }).map(function(c){ return '<option value="' + esc(c.id) + '"' + (c.id === travelTarget ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join("") + '</select></label><p class="journey-note">По дороге примерно ' + options[0].distance.toLocaleString("ru-RU") + ' км. Цены и маршруты — игровые оценки с учётом расстояния, пересадок и отдыха.</p><div class="travel-options">' + options.map(function(o){
        var driving = o.mode === "drive";
        return '<article class="travel-option"><h3>' + o.label + '</h3><div class="travel-price">' + money(o.price) + '</div><div>Время в пути: <b>' + fmtDur(o.duration) + '</b></div><p>' + o.note + '</p>' + (driving ? '<label>На какой машине?<select id="travelCar">' + local.map(function(id){ return '<option value="' + id + '"' + (id === travelCarId ? ' selected' : '') + '>' + esc(carById(id).name) + (parkingDebt(id) ? ' · долг ' + money(parkingDebt(id)) : '') + (carHasMeeting(id) ? ' · назначена встреча' : '') + '</option>'; }).join("") + '</select></label>' : '') + '<button data-depart="' + o.mode + '"' + (!canAfford(o.price) ? ' disabled' : '') + '>Поехать за ' + money(o.price) + '</button></article>';
    }).join("") + '</div><p class="journey-note">Общественный транспорт перевозит только вас. Машина останется там, где припаркована. После покупки за пределами Москвы можно уехать на ней или заказать автовоз в приложении «Гараж».</p>';
}
function renderGarageApp(){
    if(!transport || !$("garageBody")) return;
    rebalanceHome();
    var debt = garage.reduce(function(sum,id){ return sum + parkingDebt(id); },0);
    $("garageBody").innerHTML = '<div class="journey-heading"><span>🏠 Домашняя база · Москва</span><h2>Гараж: ' + homeOccupancy() + ' / ' + currentGarage().cap + '</h2><p>Во владении: ' + garage.length + ' · Двор бесплатный' + (debt ? ' · Долг за парковку: ' + money(debt) : '') + '</p><button data-open-garage-shop>Расширить гараж</button></div>' + (!garage.length ? '<div class="empty">Здесь появятся ваши автомобили и их местоположение.</div>' : '<div class="vehicle-grid">' + garage.map(function(id){
        var car = carById(id), v = vehicleState(id), quote = shippingQuote(id);
        var shipment = transport.shipments.find(function(s){ return s.carId === id; });
        return '<article class="vehicle-card"><button class="vehicle-image" data-vehicle-info="' + id + '">' + carImg(car) + '</button><div class="vehicle-content"><h3>' + esc(car.name) + '</h3><div class="vehicle-location">📍 ' + esc(locationText(id)) + '</div><p>' + esc(vehicleDesc(car)) + '</p><p>Куплено за ' + money(purchaseCost(car)) + '</p>' + (v.place === "parking" ? '<p>Следующие 100 ₽: ' + fmtMeet(new Date(v.nextChargeAt)) + '</p>' : '') + (v.debt ? '<p class="parking-debt">Долг: ' + money(v.debt) + '</p><button data-pay-parking="' + id + '">Оплатить долг</button>' : '') + (shipment ? '<p>Москва: ' + fmtMeet(new Date(shipment.arrivesAt)) + '</p><button data-wait-transport>Дождаться автовоза</button>' : '') + (quote ? '<div class="carrier-quote">🚛 В Москву: ' + money(quote.price) + ' · ' + fmtDur(quote.duration) + '<button data-ship-vehicle="' + id + '"' + (!canAfford(quote.price + parkingDebt(id)) || carHasMeeting(id) ? ' disabled' : '') + '>Заказать автовоз</button>' + (carHasMeeting(id) ? '<small>Сначала завершите или отмените встречу.</small>' : '') + '</div>' : '') + (!vehicleMoving(id) ? '<button data-vehicle-sell="' + id + '">Выставить на продажу</button>' : '') + '</div></article>';
    }).join("") + '</div>');
}
function showArrival(){
    if(!transport || !transport.arrival || !$("arrivalOverlay")) return;
    $("arrivalCity").textContent = CITY_BY_ID[transport.arrival.cityId].label;
    $("arrivalDetails").textContent = transport.arrival.label + " · " + fmtMeet(new Date(transport.arrival.when));
    $("arrivalOverlay").classList.add("open");
    updateGameSpeed("arrival");
}
function closeArrival(){ transport.arrival = null; saveTransport(); $("arrivalOverlay").classList.remove("open"); updateGameSpeed(); }
function bindTransport(){
    document.addEventListener("keydown",function(event){ if(event.key === "Escape" && $("arrivalOverlay").classList.contains("open")) closeArrival(); });
    document.addEventListener("change",function(event){
        if(event.target.id === "travelCity"){ travelTarget = event.target.value; renderTravel(); }
        if(event.target.id === "travelCar") travelCarId = Number(event.target.value);
    });
    document.addEventListener("click",function(event){
        var btn = event.target.closest("button");
        if(!btn || btn.disabled) return;
        if(btn.hasAttribute("data-depart")) depart(travelTarget,btn.dataset.depart,$("travelCar") ? Number($("travelCar").value) : null);
        if(btn.hasAttribute("data-wait-transport")) waitForTransport();
        if(btn.hasAttribute("data-ship-vehicle")) shipVehicle(Number(btn.dataset.shipVehicle));
        if(btn.hasAttribute("data-pay-parking")){
            tickTransport();
            if(payParkingDebt(Number(btn.dataset.payParking))){ save(); updateStats(); renderGarageApp(); }
            else toast("Не хватает денег на оплату долга.");
        }
        if(btn.hasAttribute("data-travel-to")) openTravelTo(btn.dataset.travelTo);
        if(btn.hasAttribute("data-vehicle-info")) openCarInfo(Number(btn.dataset.vehicleInfo));
        if(btn.hasAttribute("data-vehicle-sell")) openSaleForm(Number(btn.dataset.vehicleSell));
        if(btn.hasAttribute("data-open-garage-shop")) openWin("shop");
        if(btn.id === "arrivalClose") closeArrival();
        if(btn.id === "arrivalGarage"){ closeArrival(); openWin("garage"); }
    });
}
