'use strict';

var knownCities = Object.create(null);
CITIES.forEach(function(city){ knownCities[city.id] = city; });
CUSTOM_CITIES.forEach(function(city){
    if(knownCities[city.id]) Object.assign(knownCities[city.id], city);
    else {
        CITIES.push(city);
        knownCities[city.id] = city;
    }
});
var moscowCity = CITIES.find(function(city){ return city.name === "Москва"; });
CARS.forEach(function(car){
    if(!car.cityId || (car.id >= 107 && car.id <= 146)) car.cityId = moscowCity.id;
});
var catalogueCarIds = Object.create(null);
CARS.forEach(function(car){ catalogueCarIds[car.id] = true; });
REGIONAL_CARS.concat(CUSTOM_CARS).forEach(function(car){
    if(!catalogueCarIds[car.id] && knownCities[car.cityId]){
        catalogueCarIds[car.id] = true;
        CARS.push(car);
    }
});
var populatedCityIds = Object.create(null);
CARS.forEach(function(car){ if(car.cityId) populatedCityIds[car.cityId] = true; });
CITIES = CITIES.filter(function(city){ return populatedCityIds[city.id]; });

var CITY_BY_ID = Object.create(null);
var CITY_BY_LABEL = Object.create(null);
var CITY_NAME_COUNTS = Object.create(null);
CITIES.forEach(function(city){ CITY_NAME_COUNTS[city.name] = (CITY_NAME_COUNTS[city.name] || 0) + 1; });
CITIES.forEach(function(city){
    CITY_BY_ID[city.id] = city;
    city.label = city.showRegion || CITY_NAME_COUNTS[city.name] > 1 ? city.name + " · " + city.region : city.name;
    CITY_BY_LABEL[city.label.toLowerCase().replace(/ё/g, "е")] = city;
});

function cityNamed(name){
    return CITIES.find(function(city){ return city.name === name && CITY_NAME_COUNTS[name] === 1; }) || null;
}
function cityFromLabel(label){
    var key = String(label || "").trim().toLowerCase().replace(/ё/g, "е");
    return CITY_BY_LABEL[key] || CITIES.find(function(city){
        return CITY_NAME_COUNTS[city.name] === 1 && city.name.toLowerCase().replace(/ё/g, "е") === key;
    }) || null;
}
function carCity(car){ return CITY_BY_ID[car.cityId] || null; }
function distanceBetweenCities(a, b){
    if(!a || !b) return null;
    if(a.id === b.id) return 0;
    var rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371.0088 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
function distanceFromCity(car, cityId){ return distanceBetweenCities(CITY_BY_ID[cityId], carCity(car)); }
function carLocationText(car, cityId){
    var city = carCity(car);
    if(!city) return "📍 Город не указан";
    var distance = distanceFromCity(car, cityId);
    return "📍 " + city.label + (distance !== null && distance > 0 ? " · ≈ " + Math.round(distance).toLocaleString("ru-RU") + " км" : "");
}
function locationMatches(car, cityId, radius){
    if(!cityId) return true;
    var origin = CITY_BY_ID[cityId], city = carCity(car);
    if(!origin || !city) return false;
    if(radius === "all") return true;
    if(Number(radius) === 0) return origin.id === city.id;
    var distance = distanceBetweenCities(origin, city);
    return distance !== null && distance <= Number(radius);
}
