'use strict';

/* ================= ДАННЫЕ ================= */
var BUYERS = [
    {name:"Сергей",avatar:"🧔‍♂️",personality:"kind"},
    {name:"Анна",avatar:"👩‍🦰",personality:"kind"},
    {name:"Игорь",avatar:"👨‍🦲",personality:"neutral"},
    {name:"Марина",avatar:"👩‍💼",personality:"neutral"},
    {name:"Гоша",avatar:"🧑‍🎤",personality:"evil"},
    {name:"Ринат",avatar:"🧔",personality:"evil"},
    {name:"Павел",avatar:"👨‍🔧",personality:"neutral"},
    {name:"Люба",avatar:"👵",personality:"kind"}
];
var PERSONALITY = {
    kind:    {label:"😇 Добрый",      mood:72, markup:1.00, dMin: 0.05, dMax: 0.20, bMin: 0.00, bMax: 0.15, rudeness:30, praise:14, polite:9},
    neutral: {label:"😐 Нейтральный", mood:50, markup:1.05, dMin:-0.02, dMax: 0.12, bMin:-0.05, bMax: 0.05, rudeness:22, praise:8,  polite:6},
    evil:    {label:"😈 Злой",        mood:30, markup:1.12, dMin:-0.08, dMax: 0.04, bMin:-0.20, bMax:-0.02, rudeness:12, praise:4,  polite:2}
};
var GARAGES = [
    {cap:3,  price:0,       name:"Гараж «Стартовый»",   desc:"Три места."},
    {cap:5,  price:300000,  name:"Гараж «Расширенный»", desc:"Пять мест."},
    {cap:8,  price:800000,  name:"Гараж «Профи»",       desc:"Восемь мест."},
    {cap:12, price:2000000, name:"Гараж «Ангар»",       desc:"Двенадцать мест."},
    {cap:20, price:5000000, name:"Автопарк «Империя»",  desc:"Двадцать мест."}
];

var QUICK = {
    buy:["👋 Привет","😊 Отличная машина!","🙏 Уступите, пожалуйста","😡 Ты жадный!","🤝 Согласен"],
    sell:["👋 Здравствуйте","🙏 Спасибо!","💰 Давай дороже","😡 Хватит жадничать","🤝 Согласен"]
};

/* ================= СОСТОЯНИЕ ================= */
var balance = parseInt(localStorage.getItem("balance"),10);
if(isNaN(balance)) balance = 1000000;
var garage = JSON.parse(localStorage.getItem("garage") || "[]");
var deals = parseInt(localStorage.getItem("deals"),10) || 0;
var garageLvl = parseInt(localStorage.getItem("garageLvl"),10) || 0;
var notes = JSON.parse(localStorage.getItem("notes") || "{}");
var chat = null;
var view = "market";
var zTop = 100;
var openWindows = {};

/* игровое время: идёт в GAME_SPEED раз быстрее реального, пока открыта страница */
var GAME_SPEED = 10;
var gameMs = parseInt(localStorage.getItem("gameMs"), 10);
if(isNaN(gameMs) || gameMs <= 0) gameMs = Date.now();
var lastRealMs = Date.now();
var lastGameSave = 0;
var lastDayKey = "";
var lastClockStr = "";

/* ожидающие дела: объявления о продаже и назначенные встречи (живут независимо от окна чата) */
var AD_WAIT_MIN = 10 * 60000;        // покупатель находится через 10–45 игровых минут
var AD_WAIT_MAX = 45 * 60000;
var MEET_GRACE  = 4 * 3600000;       // на встречу можно приехать в течение 4 игровых часов после назначенного
var pending = [];
try{ pending = JSON.parse(localStorage.getItem("pending") || "[]") || []; }catch(e){ pending = []; }
pending = pending.filter(function(it){
    return it && it.id && it.type && CARS.some(function(c){ return c.id === it.carId; });
});
pending.forEach(function(it){ if(it.type === "meet") it.reached = gameMs >= it.when; });

/* ================= ХЕЛПЕРЫ ================= */
function $(id){ return document.getElementById(id); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function rnd(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function money(n){ return Math.round(n).toLocaleString("ru-RU") + " ₽"; }
function shortDesc(t, n){
    t = String(t || "");
    if(t.length <= n) return t;
    var cut = t.slice(0, n);
    var sp = cut.lastIndexOf(" ");
    if(sp > n * 0.6) cut = cut.slice(0, sp);
    return cut.replace(/[,\s.;:-]+$/, "") + "…";
}
function carImg(car){
    var src = car.img || ("img/" + car.id + ".jpg");
    return '<img src="' + esc(src) + '" alt="' + esc(car.name) + '" loading="lazy" ' +
           'onerror="this.outerHTML=\'🚗\'">';
}

function save(){
    localStorage.setItem("balance", balance);
    localStorage.setItem("garage", JSON.stringify(garage));
    localStorage.setItem("deals", deals);
    localStorage.setItem("garageLvl", garageLvl);
    localStorage.setItem("notes", JSON.stringify(notes));
    localStorage.setItem("pending", JSON.stringify(pending));
}
function currentGarage(){ return GARAGES[garageLvl]; }

function updateStats(){
    var cap = currentGarage().cap;
    if($("balance")) $("balance").textContent = balance.toLocaleString("ru-RU");
    if($("garageCount")) $("garageCount").textContent = garage.length + " / " + cap;
    if($("garageValue")) $("garageValue").textContent = money(garage.reduce(function(s,id){
        var c = CARS.find(function(x){ return x.id === id; });
        return s + (c?c.price:0);
    },0));
    if($("deals")) $("deals").textContent = deals;
    if($("shopCap")){
        $("shopCap").textContent  = cap;
        $("shopUsed").textContent = garage.length;
        $("shopFree").textContent = Math.max(0, cap - garage.length);
    }
    if(typeof renderAdmin === "function") renderAdmin();
    if(typeof renderDealsTab === "function") renderDealsTab();
}

/* ================= ИКОНКИ ================= */
var ICONS = [
    {id:"market",   ico:"🚗", label:"Авторынок"},
    {id:"shop",     ico:"🏪", label:"Магазин<br>гаражей"},
    {id:"calc",     ico:"🧮", label:"Калькулятор"},
    {id:"calendar", ico:"📅", label:"Календарь"},
    {id:"clock",    ico:"🕐", label:"Часы"},
    {id:"help",     ico:"❓", label:"Справка"}
];

function loadIconPositions(){
    try{ return JSON.parse(localStorage.getItem("iconPos") || "{}"); }
    catch(e){ return {}; }
}
function saveIconPositions(p){ localStorage.setItem("iconPos", JSON.stringify(p)); }

function buildIcons(){
    var desk = $("deskArea");
    if(!desk) return;
    var saved = loadIconPositions();
    var hint = desk.querySelector(".desk-hint");
    desk.querySelectorAll(".desk-icon").forEach(function(el){ el.remove(); });

    ICONS.forEach(function(item, idx){
        var el = document.createElement("div");
        el.className = "desk-icon";
        el.dataset.app = item.id;
        el.innerHTML = '<div class="ico">' + item.ico + '</div><span>' + item.label + '</span>';

        var pos = saved[item.id];
        var x, y;
        if(pos && typeof pos.x === "number"){
            x = pos.x; y = pos.y;
        }else{
            var col = Math.floor(idx / 4);
            var row = idx % 4;
            x = 20 + col * 112;
            y = 20 + row * 120;
        }
        el.style.left = x + "px";
        el.style.top  = y + "px";
        desk.appendChild(el);
    });
    if(hint) desk.appendChild(hint);
    snapAllIcons(false);
}

/* ================= ПЕРЕТАСКИВАНИЕ ИКОНОК ================= */
var iconDrag = null;

function attachIconHandlers(){
    document.querySelectorAll(".desk-icon").forEach(function(el){
        el.addEventListener("mousedown", onIconDown);
        el.addEventListener("touchstart", onIconDown, {passive:false});
    });
}

function onIconDown(e){
    if(e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    var el = e.currentTarget;
    var rect = el.getBoundingClientRect();
    var deskRect = $("deskArea").getBoundingClientRect();
    var point = e.touches ? e.touches[0] : e;
    iconDrag = {
        el: el,
        offsetX: point.clientX - rect.left,
        offsetY: point.clientY - rect.top,
        deskRect: deskRect,
        moved: false,
        startX: point.clientX,
        startY: point.clientY
    };
    el.classList.add("dragging");
    el.style.zIndex = 999;

    var ghost = document.createElement("div");
    ghost.className = "icon-ghost";
    ghost.style.width  = el.offsetWidth  + "px";
    ghost.style.height = el.offsetHeight + "px";
    ghost.style.left = el.style.left;
    ghost.style.top  = el.style.top;
    $("deskArea").appendChild(ghost);
    iconDrag.ghost = ghost;
    document.addEventListener("mousemove", onIconMove);
    document.addEventListener("mouseup", onIconUp);
    document.addEventListener("touchmove", onIconMove, {passive:false});
    document.addEventListener("touchend", onIconUp);
}

/* ----- Сетка как в Windows ----- */
var GRID = {w:112, h:120, x0:20, y0:20};

function gridInfo(el){
    var desk = $("deskArea");
    var iw = el ? el.offsetWidth  : 104;
    var ih = el ? el.offsetHeight : 100;
    return {
        cols: Math.max(1, Math.floor((desk.clientWidth  - GRID.x0 - iw) / GRID.w) + 1),
        rows: Math.max(1, Math.floor((desk.clientHeight - GRID.y0 - ih) / GRID.h) + 1)
    };
}
function cellOf(x, y, g){
    return {
        col: clamp(Math.round((x - GRID.x0) / GRID.w), 0, g.cols - 1),
        row: clamp(Math.round((y - GRID.y0) / GRID.h), 0, g.rows - 1)
    };
}
function cellXY(c){
    return { x: GRID.x0 + c.col * GRID.w, y: GRID.y0 + c.row * GRID.h };
}
function takenCells(except, g){
    var t = {};
    document.querySelectorAll(".desk-icon").forEach(function(el){
        if(el === except) return;
        var c = cellOf(parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0, g);
        t[c.col + "," + c.row] = true;
    });
    return t;
}
// ближайшая свободная клетка к желаемой
function freeCellNear(c, taken, g){
    if(!taken[c.col + "," + c.row]) return c;
    var best = null, bd = Infinity;
    for(var col = 0; col < g.cols; col++){
        for(var row = 0; row < g.rows; row++){
            if(taken[col + "," + row]) continue;
            var d = (col - c.col) * (col - c.col) + (row - c.row) * (row - c.row);
            if(d < bd){ bd = d; best = {col:col, row:row}; }
        }
    }
    return best || c;
}
function placeIcon(el, c){
    var p = cellXY(c);
    el.style.left = p.x + "px";
    el.style.top  = p.y + "px";
}
// выравнивает все иконки по сетке (при загрузке и при изменении размера окна браузера)
function snapAllIcons(save){
    var icons = document.querySelectorAll(".desk-icon");
    if(!icons.length) return;
    var g = gridInfo(icons[0]);
    var taken = {};
    icons.forEach(function(el){
        var want = cellOf(parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0, g);
        var c = freeCellNear(want, taken, g);
        taken[c.col + "," + c.row] = true;
        placeIcon(el, c);
    });
    var p = {};
    icons.forEach(function(el){
        p[el.dataset.app] = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
    });
    saveIconPositions(p);
}

function onIconMove(e){
    if(!iconDrag) return;
    e.preventDefault();
    var point = e.touches ? e.touches[0] : e;
    var dx = Math.abs(point.clientX - iconDrag.startX);
    var dy = Math.abs(point.clientY - iconDrag.startY);
    if(dx > 3 || dy > 3) iconDrag.moved = true;

    var desk = $("deskArea");
    var x = point.clientX - iconDrag.deskRect.left - iconDrag.offsetX;
    var y = point.clientY - iconDrag.deskRect.top  - iconDrag.offsetY;

    var maxX = desk.clientWidth  - iconDrag.el.offsetWidth;
    var maxY = desk.clientHeight - iconDrag.el.offsetHeight;
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));

    // иконка свободно следует за курсором
    iconDrag.el.style.left = x + "px";
    iconDrag.el.style.top  = y + "px";

    // а рамка показывает клетку, куда она встанет
    if(iconDrag.moved && iconDrag.ghost){
        var g = gridInfo(iconDrag.el);
        var c = freeCellNear(cellOf(x, y, g), takenCells(iconDrag.el, g), g);
        var p = cellXY(c);
        iconDrag.ghost.style.left = p.x + "px";
        iconDrag.ghost.style.top  = p.y + "px";
        iconDrag.cell = c;
    }
}

function onIconUp(){
    if(!iconDrag) return;
    var el = iconDrag.el;
    var moved = iconDrag.moved;
    var ghost = iconDrag.ghost;
    var cell = iconDrag.cell;

    el.classList.remove("dragging");
    el.style.zIndex = "";
    if(ghost) ghost.remove();
    iconDrag = null;

    document.removeEventListener("mousemove", onIconMove);
    document.removeEventListener("mouseup", onIconUp);
    document.removeEventListener("touchmove", onIconMove);
    document.removeEventListener("touchend", onIconUp);

    // «примагничиваем» к клетке сетки
    var g = gridInfo(el);
    if(!cell){
        cell = freeCellNear(cellOf(parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0, g), takenCells(el, g), g);
    }
    placeIcon(el, cell);

    var saved = loadIconPositions();
    saved[el.dataset.app] = {
        x: parseFloat(el.style.left) || 0,
        y: parseFloat(el.style.top)  || 0
    };
    saveIconPositions(saved);

    if(!moved){
        openWin(el.dataset.app);
    }
}

/* ================= ОКНА ================= */

function getDeskRect(){
    return $("deskArea").getBoundingClientRect();
}

function getWindowState(id){
    try{
        var data = JSON.parse(localStorage.getItem("window_" + id));
        return data || null;
    }catch(e){
        return null;
    }
}

function saveWindowState(id, w){
    var state = {
        left: parseFloat(w.style.left) || 0,
        top: parseFloat(w.style.top) || 0,
        width: w.offsetWidth,
        height: w.offsetHeight
    };
    localStorage.setItem("window_" + id, JSON.stringify(state));
}

function clampWindow(w){
    var desk = getDeskRect();
    var width = w.offsetWidth;
    var height = w.offsetHeight;
    var left = parseFloat(w.style.left);
    var top = parseFloat(w.style.top);
    if(isNaN(left)) left = 0;
    if(isNaN(top)) top = 0;
    var maxLeft = Math.max(0, desk.width - width);
    var maxTop = Math.max(0, desk.height - height);
    left = Math.max(0, Math.min(maxLeft, left));
    top = Math.max(0, Math.min(maxTop, top));
    w.style.left = left + "px";
    w.style.top = top + "px";
}

function openWin(id){
    var w = $("win-" + id);
    if(!w) return;
    if(id === "admin" && !adminUnlocked){ openAdminGate(); return; }
    var desk = getDeskRect();

    if(!w.dataset.hasPos){
        var saved = getWindowState(id);
        w.classList.add("open");
        w.classList.remove("minimized");
        w.style.visibility = "hidden";

        if(saved){
            w.style.width = saved.width + "px";
            w.style.height = saved.height + "px";
            w.style.left = saved.left + "px";
            w.style.top = saved.top + "px";
        }else{
            var left = Math.max(0, (desk.width - w.offsetWidth) / 2);
            var top = Math.max(0, (desk.height - w.offsetHeight) / 2);
            w.style.left = left + "px";
            w.style.top = top + "px";
        }
        w.dataset.hasPos = "1";
        w.style.visibility = "";
    }

    w.classList.add("open");
    w.classList.remove("minimized");
    clampWindow(w);
    w.style.zIndex = ++zTop;

    openWindows[id] = true;
    saveWindowState(id, w);
    renderTaskbar();

    if(id === "shop"){ renderShop(); }
    if(id === "admin"){ renderAdmin(); }
}

function closeWin(id){
    var w = $("win-" + id);
    if(!w) return;
    w.classList.remove("open");
    delete openWindows[id];
    renderTaskbar();
}

function minimizeWin(id){
    var w = $("win-" + id);
    if(!w) return;
    w.classList.remove("open");
    w.classList.add("minimized");
    renderTaskbar();
}

function restoreWin(id){
    var w = $("win-" + id);
    if(!w) return;
    w.classList.remove("minimized");
    void w.offsetWidth;
    w.classList.add("open");
    clampWindow(w);
    w.style.zIndex = ++zTop;
    renderTaskbar();
}

function focusWin(id){
    var w = $("win-" + id);
    if(!w) return;
    if(!w.classList.contains("open")) return;
    w.style.zIndex = ++zTop;
    saveWindowState(id, w);
    renderTaskbar();
}

function renderTaskbar(){
    var list = $("taskList");
    if(!list) return;
    list.innerHTML = "";

    Object.keys(openWindows).forEach(function(id){
        var w = $("win-" + id);
        if(!w) return;
        var minimized = w.classList.contains("minimized");
        var btn = document.createElement("button");
        btn.className = "task-btn" + (minimized ? "" : " active");
        btn.textContent = (w.dataset.icon || "🪟") + " " + (w.dataset.title || id);

        btn.addEventListener("click", function(){
            if(w.classList.contains("minimized")){
                restoreWin(id);
            }else{
                if(Number(w.style.zIndex) === zTop){
                    minimizeWin(id);
                }else{
                    focusWin(id);
                }
            }
        });
        list.appendChild(btn);
    });
}

/* ================= ПЕРЕТАСКИВАНИЕ ОКОН ================= */
var winDrag = null;

function startDrag(e, id){
    if(e.button !== undefined && e.button !== 0) return;
    var win = $("win-" + id);
    if(!win) return;

    win.style.zIndex = ++zTop;
    var rect = win.getBoundingClientRect();
    var desk = getDeskRect();

    win.style.left = (rect.left - desk.left) + "px";
    win.style.top  = (rect.top  - desk.top ) + "px";
    win.dataset.hasPos = "1";

    winDrag = {
        el: win,
        startX: e.clientX,
        startY: e.clientY,
        left: rect.left - desk.left,
        top:  rect.top  - desk.top,
        desk: desk
    };
    e.preventDefault();
    document.addEventListener("mousemove", onWinMove);
    document.addEventListener("mouseup", onWinUp);
}

function onWinMove(e){
    if(!winDrag) return;
    var dx = e.clientX - winDrag.startX;
    var dy = e.clientY - winDrag.startY;
    var x = winDrag.left + dx;
    var y = winDrag.top  + dy;

    var maxX = Math.max(0, winDrag.desk.width  - winDrag.el.offsetWidth);
    var maxY = Math.max(0, winDrag.desk.height - winDrag.el.offsetHeight);

    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));

    winDrag.el.style.left = x + "px";
    winDrag.el.style.top  = y + "px";
}

function onWinUp(){
    if(!winDrag) return;
    var win = winDrag.el;
    var id = win.id.replace("win-", "");
    saveWindowState(id, win);
    winDrag = null;
    document.removeEventListener("mousemove", onWinMove);
    document.removeEventListener("mouseup", onWinUp);
}


/* ================= ИЗМЕНЕНИЕ РАЗМЕРА ОКОН ================= */
var winResize = null;

function attachResizeHandlers(){
    document.querySelectorAll(".window").forEach(function(win){
        win.querySelectorAll(".resize-handle").forEach(function(handle){
            handle.addEventListener("mousedown", function(e){
                if(e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();

                var desk = getDeskRect();
                var rect = win.getBoundingClientRect();
                var dir = handle.className.replace("resize-handle","").trim();

                winResize = {
                    el: win,
                    dir: dir,
                    startX: e.clientX,
                    startY: e.clientY,
                    startLeft:   rect.left - desk.left,
                    startTop:    rect.top  - desk.top,
                    startWidth:  rect.width,
                    startHeight: rect.height,
                    desk: desk
                };

                win.style.zIndex = ++zTop;
                document.body.style.cursor = getComputedStyle(handle).cursor;
                document.addEventListener("mousemove", onWinResize);
                document.addEventListener("mouseup", onWinResizeEnd);
            });
        });
    });
}

function onWinResize(e){
    if(!winResize) return;
    e.preventDefault();

    var dx = e.clientX - winResize.startX;
    var dy = e.clientY - winResize.startY;

    var left   = winResize.startLeft;
    var top    = winResize.startTop;
    var width  = winResize.startWidth;
    var height = winResize.startHeight;

    var minW = 380;
    var minH = 280;
    var desk = winResize.desk;

    if(winResize.dir.indexOf("e") !== -1){
        width = Math.max(minW, winResize.startWidth + dx);
        width = Math.min(width, desk.width - left);
    }
    if(winResize.dir.indexOf("w") !== -1){
        var newWidth = Math.max(minW, winResize.startWidth - dx);
        left = winResize.startLeft + (winResize.startWidth - newWidth);
        if(left < 0){ newWidth += left; left = 0; }
        width = newWidth;
    }
    if(winResize.dir.indexOf("s") !== -1){
        height = Math.max(minH, winResize.startHeight + dy);
        height = Math.min(height, desk.height - top);
    }
    if(winResize.dir.indexOf("n") !== -1){
        var newHeight = Math.max(minH, winResize.startHeight - dy);
        top = winResize.startTop + (winResize.startHeight - newHeight);
        if(top < 0){ newHeight += top; top = 0; }
        height = newHeight;
    }

    winResize.el.style.left   = left   + "px";
    winResize.el.style.top    = top    + "px";
    winResize.el.style.width  = width  + "px";
    winResize.el.style.height = height + "px";
    winResize.el.dataset.hasPos = "1";
}

function onWinResizeEnd(){
    if(!winResize) return;
    var win = winResize.el;
    var id = win.id.replace("win-", "");
    saveWindowState(id, win);
    winResize = null;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onWinResize);
    document.removeEventListener("mouseup", onWinResizeEnd);
}

/* ================= ФИЛЬТРЫ И СОРТИРОВКА ================= */
var filters = {q:"", sort:"default", min:"", max:"", mood:"all", afford:false};

// год и пробег берём из названия и описания
function carStats(car){
    if(car._st) return car._st;
    var ym = /,?\s*((?:19|20)\d{2})\s*$/.exec(car.name || "");
    var km = /(\d[\d\s]*)\s*км/i.exec(car.desc || "");
    var kmv = km ? parseInt(km[1].replace(/\s/g, ""), 10) : (/нов/i.test(car.desc || "") ? 0 : null);
    car._st = {year: ym ? parseInt(ym[1], 10) : null, km: kmv};
    return car._st;
}

function sortKey(car, key){
    if(key === "price") return car.price;
    var st = carStats(car);
    return key === "year" ? st.year : st.km;
}

function visibleCars(list){
    var q = filters.q.trim().toLowerCase().replace(/ё/g, "е");
    var min = filters.min === "" ? null : Number(filters.min);
    var max = filters.max === "" ? null : Number(filters.max);

    var out = list.filter(function(car){
        if(q && (car.name + " " + (car.desc || "")).toLowerCase().replace(/ё/g, "е").indexOf(q) === -1) return false;
        if(min !== null && car.price < min) return false;
        if(max !== null && car.price > max) return false;
        if(view === "market"){
            if(filters.mood !== "all" && car.seller.personality !== filters.mood) return false;
            if(filters.afford && !canAfford(car.price)) return false;
        }
        return true;
    });

    if(filters.sort !== "default"){
        var parts = filters.sort.split("_");
        var key = parts[0], dir = parts[1] === "asc" ? 1 : -1;
        out.sort(function(a, b){
            var x = sortKey(a, key), y = sortKey(b, key);
            if(x === null && y === null) return 0;
            if(x === null) return 1;      // машины без данных — в конец
            if(y === null) return -1;
            return (x - y) * dir;
        });
    }
    return out;
}

function noResults(){
    return '<div class="empty" style="grid-column:1/-1">🔎<br><br>Ничего не найдено.<br>Измени фильтры или нажми «Сбросить».</div>';
}
function updateResultCount(shown, total){
    if($("fCount")) $("fCount").textContent = "Показано: " + shown + " из " + total;
}
function refreshList(){
    if(view === "market") showMarket(); else if(view === "deals") showDeals(); else showGarage();
}
function bindFilters(){
    if(!$("fSearch")) return;
    $("fSearch").addEventListener("input", function(){ filters.q = this.value; refreshList(); });
    $("fSort").addEventListener("change", function(){ filters.sort = this.value; refreshList(); });
    $("fMin").addEventListener("input", function(){ filters.min = this.value; refreshList(); });
    $("fMax").addEventListener("input", function(){ filters.max = this.value; refreshList(); });
    $("fMood").addEventListener("change", function(){ filters.mood = this.value; refreshList(); });
    $("fAfford").addEventListener("change", function(){ filters.afford = this.checked; refreshList(); });
    $("fReset").addEventListener("click", function(){
        filters = {q:"", sort:"default", min:"", max:"", mood:"all", afford:false};
        $("fSearch").value = ""; $("fSort").value = "default";
        $("fMin").value = ""; $("fMax").value = "";
        $("fMood").value = "all"; $("fAfford").checked = false;
        refreshList();
    });
}

/* ================= РЫНОК ================= */
function setTabs(active){
    var tm = $("tabMarket");
    var tg = $("tabGarage");
    if(tm) tm.classList.toggle("active", active === "market");
    if(tg) tg.classList.toggle("active", active === "garage");
    var td = $("tabDeals");
    if(td) td.classList.toggle("active", active === "deals");
    if($("filters")) $("filters").style.display = active === "deals" ? "none" : "";
    if($("fMood")) $("fMood").style.display = active === "market" ? "" : "none";
    if($("fAffordWrap")) $("fAffordWrap").style.display = active === "market" ? "" : "none";
}
function showMarket(){
    view = "market";
    setTabs("market");
    var shown = visibleCars(CARS);
    $("content").innerHTML = shown.map(function(car){
        var owned = garage.indexOf(car.id) !== -1;
        var p = PERSONALITY[car.seller.personality];
        return '<article class="card" data-info="' + car.id + '">' +
            '<div class="car-img">' + carImg(car) + '</div>' +
            '<div class="info">' +
                '<div class="name">' + car.name + '</div>' +
                '<div class="meta">' + esc(shortDesc(car.desc, 60)) + '</div>' +
                '<div class="more">Подробнее ›</div>' +
                '<div class="seller">' + car.seller.avatar + ' ' + car.seller.name + ' · ' + p.label + '</div>' +
                '<div class="price">' + money(car.price) + '</div>' +
                buyBtn(car, owned) +
            '</div></article>';
    }).join("");
    if(!shown.length) $("content").innerHTML = noResults();
    updateResultCount(shown.length, CARS.length);
    updateStats();
}
function showGarage(){
    view = "garage";
    setTabs("garage");
    garage = garage.filter(function(id){ return CARS.some(function(c){ return c.id === id; }); });
    if(!garage.length){
        $("content").innerHTML = '<div class="empty" style="grid-column:1/-1">🏠<br><br>Гараж пока пуст.<br>Купи первый автомобиль.</div>';
        updateResultCount(0, 0);
        updateStats();
        return;
    }
    var mine = garage.map(function(id){ return CARS.find(function(c){ return c.id === id; }); });
    var shownG = visibleCars(mine);
    $("content").innerHTML = shownG.map(function(car){
        return '<article class="card" data-info="' + car.id + '">' +
            '<div class="car-img">' + carImg(car) + '</div>' +
            '<div class="info">' +
                '<div class="name">' + car.name + '</div>' +
                '<div class="meta">' + esc(shortDesc(car.desc, 60)) + '</div>' +
                '<div class="more">Подробнее ›</div>' +
                '<div class="seller">Рынок: ' + money(car.price) + '</div>' +
                sellBtn(car) +
            '</div></article>';
    }).join("");
    if(!shownG.length) $("content").innerHTML = noResults();
    updateResultCount(shownG.length, mine.length);
    updateStats();
}

/* ================= МАГАЗИН ================= */
function renderShop(){
    var grid = $("upGrid");
    if(!grid) return;
    grid.innerHTML = GARAGES.map(function(g, i){
        var owned = i <= garageLvl;
        var current = i === garageLvl;
        var canBuy = i === garageLvl + 1 && canAfford(g.price);
        var btn;
        if(current) btn = '<button disabled>✓ Текущий</button>';
        else if(owned) btn = '<button disabled>Уже куплен</button>';
        else if(i > garageLvl + 1) btn = '<button disabled>Сначала предыдущий</button>';
        else btn = '<button data-buy-garage="' + i + '" ' + (canBuy?'':'disabled') + '>Купить за ' + money(g.price) + '</button>';
        return '<div class="up-card ' + (current?'current':'') + '">' +
            '<h3>' + g.name + '</h3>' +
            '<div class="up-cap">Вместимость: <b>' + g.cap + '</b> машин</div>' +
            '<div class="up-cap">' + g.desc + '</div>' +
            '<div class="up-price">' + (g.price === 0 ? 'Бесплатно' : money(g.price)) + '</div>' +
            btn + '</div>';
    }).join("");
    var cap = currentGarage().cap;
    if($("shopCap")) $("shopCap").textContent  = cap;
    if($("shopUsed")) $("shopUsed").textContent = garage.length;
    if($("shopFree")) $("shopFree").textContent = Math.max(0, cap - garage.length);
}
function buyGarage(i){
    var g = GARAGES[i];
    if(i !== garageLvl + 1) return;
    if(!canAfford(g.price)) return;
    spend(g.price);
    garageLvl = i;
    save(); renderShop(); updateStats();
    alert('✅ Куплен: ' + g.name + '\nВместимость: ' + g.cap + ' машин');
}

/* ================= ОБЪЯВЛЕНИЕ (ПОДРОБНО) ================= */
var SELLER_NOTE = {
    kind:   "Берёг её, документы в порядке. Приезжайте, покажу и отвечу на любые вопросы 🙂",
    neutral:"Машина как машина, цена указана. Осмотр и торг возможны.",
    evil:   "Цена честная. Торг — только по делу, не тратьте моё время."
};

function openCarInfo(id){
    var car = CARS.find(function(c){ return c.id === id; });
    if(!car) return;
    var s = car.seller;
    var p = PERSONALITY[s.personality];
    var owned = garage.indexOf(id) !== -1;
    var inGarage = (view === "garage");

    var specs = String(car.desc || "").split(",").map(function(x){ return x.trim(); }).filter(Boolean);
    var specHtml = specs.length
        ? '<ul class="car-specs">' + specs.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>'
        : '';
    var fullHtml = car.full ? '<p class="car-full">' + esc(car.full) + '</p>' : '';

    var who = inGarage
        ? '<div class="car-seller"><b>Рыночная цена:</b> ' + money(car.price) + '</div>'
        : '<div class="car-seller"><div class="ava">' + s.avatar + '</div>' +
            '<div><div class="car-seller-name">' + esc(s.name) + ' · ' + p.label + '</div>' +
            '<div class="car-seller-note">«' + esc(SELLER_NOTE[s.personality]) + '»</div></div></div>';

    var action;
    if(inGarage){
        action = sellBtn(car);
    }else{
        action = buyBtn(car, owned);
    }

    $("carModalImg").innerHTML = carImg(car);
    $("carModalBody").innerHTML =
        '<div class="car-title">' + esc(car.name) + '</div>' +
        '<div class="car-price">' + money(car.price) + '</div>' +
        specHtml + fullHtml + who +
        '<div class="car-actions">' + action + '</div>';
    $("carOverlay").classList.add("open");
}
function closeCarInfo(){
    $("carOverlay").classList.remove("open");
}

/* ================= ЧАТ ================= */
function openBuyChat(carId){
    var car = CARS.find(function(c){ return c.id === carId; });
    if(garage.length >= currentGarage().cap){ alert("❌ Нет места! Расширь гараж."); return; }
    if(garage.indexOf(carId) !== -1) return;
    if(pendingFor(carId)) return;

    var s = car.seller;
    var p = PERSONALITY[s.personality];
    var npc = {name:s.name, avatar:s.avatar, personality:s.personality,
               mood: clamp(p.mood + rnd(-8,8), 5, 95), greeted:false};
    var ask = Math.round(car.price * p.markup / 500) * 500;
    chat = {mode:"buy", car:car, npc:npc, ask:ask, log:[], last:"", done:false, stage:"talk", price:null, event:null, meet:null, note:null, met:false, busyUsed:false, pid:null};

    var opening = {
        kind:   'Привет! Это ' + car.name + '. Состояние отличное, отдам за ' + money(ask) + '. Что скажешь? 🙂',
        neutral:'Здравствуйте. ' + car.name + ', цена — ' + money(ask) + '. Торг возможен.',
        evil:   car.name + '. ' + money(ask) + '. Деньги вперёд, торговаться не люблю.'
    }[s.personality];
    npcSay(opening);
    openOverlay();
}

function openSellChat(carId, ad){
    var car = CARS.find(function(c){ return c.id === carId; });
    var b = ad ? ad.npc : pick(BUYERS);
    var p = PERSONALITY[b.personality];
    var npc = {name:b.name, avatar:b.avatar, personality:b.personality,
               mood: ad ? b.mood : clamp(p.mood + rnd(-8,8), 5, 95), greeted:false};
    var b0 = lerp(p.bMin, p.bMax, npc.mood/100);
    var bid = Math.round(car.price * (1 + b0) * 0.88 / 500) * 500;
    chat = {mode:"sell", car:car, npc:npc, bid:bid, log:[], last:"", done:false, stage:"talk", price:null, event:null, meet:null, note:null, met:false, busyUsed:false, pid:null};

    chat.pid = ad ? ad.id : null;
    var opening = {
        kind:   'Здравствуйте! Увидел объявление про ' + car.name + '. Готов дать ' + money(bid) + ' 🙂',
        neutral:'Добрый день. ' + car.name + ' ещё продаётся? Даю ' + money(bid) + '.',
        evil:   'Ну чё, ' + car.name + '? Больше ' + money(bid) + ' всё равно никто не даст.'
    }[b.personality];
    npcSay(opening);
    openOverlay();
}

function openOverlay(){
    var now = gameNow();
    $("meetDate").min = ymd(now);
    $("meetDate").value = ymd(new Date(now.getTime() + 86400000));
    $("meetTime").value = "18:00";
    $("overlay").classList.add("open");
    $("msgInput").value = "";
    $("offerInput").value = "";
    renderChat();
    setTimeout(function(){ $("msgInput").focus(); }, 60);
}
function closeChat(){
    $("overlay").classList.remove("open");
    if(chat && chat.pid){
        if(chat.stage === "event" && !chat.done){
            toast("💤 Вы уехали со встречи: сделка сорвалась.");
            dropPending(chat.pid);
        }else if(chat.done){
            dropPending(chat.pid);
        }
    }
    chat = null;
    refreshList();
    renderDealsTab();
}
function npcSay(t){ chat.log.push({who:"npc", text:t}); }
function meSay(t){  chat.log.push({who:"me",  text:t}); }
function sysSay(t){ chat.log.push({who:"sys", text:t}); }

function renderChat(){
    if(!chat) return;
    if(chat.done && chat.pid){ dropPending(chat.pid); chat.pid = null; }
    var p = PERSONALITY[chat.npc.personality];
    $("npcAva").textContent  = chat.npc.avatar;
    $("npcName").textContent = chat.npc.name;
    $("npcTag").textContent  = p.label + (chat.mode === "buy" ? " · Продавец" : " · Покупатель");

    var m = chat.npc.mood;
    $("moodFill").style.width = m + "%";
    $("moodFill").style.background = m > 60 ? "#35d07f" : m > 30 ? "#f5c542" : "#ff5964";
    $("moodVal").textContent = Math.round(m);

    if(chat.price != null){
        $("dealRow").innerHTML = 'Цена сделки: <b>' + money(chat.price) + '</b>' +
            (chat.mode === "buy" ? ' · Баланс: ' + money(balance) : ' · Рынок: ' + money(chat.car.price));
    }else{
        $("dealRow").innerHTML = chat.mode === "buy"
            ? 'Запрос продавца: <b>' + money(chat.ask) + '</b> · Баланс: ' + money(balance)
            : 'Предложение: <b>' + money(chat.bid) + '</b> · Рынок: ' + money(chat.car.price);
    }

    var log = $("chatLog");
    log.innerHTML = chat.log.map(function(x){
        return '<div class="msg ' + x.who + '">' + esc(x.text) + '</div>';
    }).join("");
    log.scrollTop = log.scrollHeight;

    $("msgInput").disabled   = chat.done;
    $("offerInput").disabled = chat.done;
    $("offerBtn").disabled   = chat.done;
    $("sendBtn").disabled    = chat.done;

    // панель этапов сделки: назначение встречи, поездка, решение на встрече
    var st = chat.done ? "done" : chat.stage;
    var talkUi = (st === "talk" || st === "done");
    $("quick").style.display      = talkUi ? "" : "none";
    $("offerRow").style.display   = talkUi ? "" : "none";
    $("msgRow").style.display     = talkUi ? "" : "none";
    $("stagePanel").style.display = talkUi ? "none" : "block";
    $("stSchedule").style.display = st === "schedule" ? "block" : "none";
    $("stGo").style.display       = st === "go" ? "block" : "none";
    $("stEvent").style.display    = st === "event" ? "block" : "none";
    if(st === "go" && chat.meet){
        var reached = ADM.smoothMeet || gameMs >= chat.meet.whenMs;
        $("stGoText").textContent = "📅 Встреча: " + chat.meet.label;
        $("stGoSub").innerHTML = reached
            ? 'Пора ехать! Если опоздать больше чем на ' + Math.round(MEET_GRACE / 3600000) + ' ч, встреча сорвётся.'
            : 'До встречи: <b><span data-until="' + chat.meet.whenMs + '"></span></b>. Можно закрыть чат: встреча сохранится во вкладке «Сделки».';
        $("goBtn").disabled = !reached;
        updatePendingCountdowns();
    }
    if(st === "event" && chat.event){
        var lack = chat.event.sign > 0 && !canAfford(chat.price + chat.event.amount);
        $("stEventText").textContent = chat.event.prompt;
        $("stEventNote").textContent = lack ? "💸 Не хватает денег, чтобы согласиться." : "";
        $("evYes").textContent = chat.event.yesLabel;
        $("evYes").disabled = lack;
    }

    var q = $("quick");
    if(chat.done){
        q.innerHTML = '<button id="chatFinishClose">Закрыть</button>';
        $("chatFinishClose").addEventListener("click", closeChat);
    }else{
        q.innerHTML = QUICK[chat.mode].map(function(t,i){
            return '<button data-quick="' + i + '">' + esc(t) + '</button>';
        }).join("");
        q.querySelectorAll("[data-quick]").forEach(function(btn){
            btn.addEventListener("click", function(){
                quickSend(parseInt(btn.dataset.quick,10));
            });
        });
    }
}

function sendMsg(){
    if(!chat || chat.done) return;
    var inp = $("msgInput");
    var t = inp.value.trim();
    if(!t) return;
    inp.value = "";
    handleMessage(t);
}
function sendOffer(){
    if(!chat || chat.done) return;
    var inp = $("offerInput");
    var v = Number(inp.value);
    if(!v) return;
    inp.value = "";
    handleMessage((chat.mode === "buy" ? "Моя цена: " : "Хочу за неё: ") + v + " ₽");
}
function quickSend(i){
    if(!chat || chat.done) return;
    handleMessage(QUICK[chat.mode][i]);
}

/* ================= АНАЛИЗ ================= */
function analyze(text){
    var t = " " + text.toLowerCase().replace(/ё/g,"е") + " ";
    var nums = (t.match(/\d[\d\s]*/g) || [])
        .map(function(s){ return Number(s.replace(/\s/g,"")); })
        .filter(function(n){ return n > 0; });
    var offer = nums.length ? nums[nums.length-1] : null;
    if(offer != null && /(тыс|к\b|k\b)/.test(t) && offer < 1000) offer *= 1000;

    return {
        offer: offer,
        greet  : /(привет|здравств|хай|добрый день|добрый вечер|доброе утро|салют|здарова)/.test(t),
        praise : /(красив|классн|отличн|крут|люблю|уважа|нравитс|супер|молодец|шикарн|легенд|топ)/.test(t),
        polite : /(пожалуйста|спасибо|благодар|будьте добры|извини|простите)/.test(t),
        rude   : /(дурак|тупой|идиот|дебил|отстой|дерьм|говно|плохой|обман|развод|лох|жмот|жадн|урод|заткнись)/.test(t),
        haggle : /(скидк|дешевл|торг|уступ|дорого|сбавь|снизь|сброс|уценк|сойдемся|реальн|адекватн|подвинь)/.test(t),
        agree  : /(согласен|согласна|беру|договорились|по рукам|идет|окей|\bок\b|давай)/.test(t),
        question: /\?/.test(text)
    };
}

function applyMood(intent){
    var p = PERSONALITY[chat.npc.personality];
    var d = 0;
    if(intent.greet && !chat.npc.greeted){ d += 8; chat.npc.greeted = true; }
    if(intent.praise) d += p.praise;
    if(intent.polite) d += p.polite;
    if(intent.rude)   d -= p.rudeness;
    if(intent.haggle) d -= 4;
    if(intent.offer != null) d -= 3;
    if(intent.same)   d -= 7;
    chat.npc.mood = clamp(chat.npc.mood + d, 0, 100);
}

function sellerLimit(){
    var p = PERSONALITY[chat.npc.personality];
    var d = lerp(p.dMin, p.dMax, chat.npc.mood/100);
    return Math.round(chat.car.price * (1 - d));
}
function buyerLimit(){
    var p = PERSONALITY[chat.npc.personality];
    var b = lerp(p.bMin, p.bMax, chat.npc.mood/100);
    return Math.round(chat.car.price * (1 + b));
}

function smallTalk(intent){
    var bank = {
        rude:   { kind:"Зачем так? 😔", neutral:"Без этого.", evil:"Полегче." },
        praise: { kind:"Спасибо! 🙂", neutral:"Спасибо. К делу.", evil:"Неинтересно." },
        polite: { kind:"Не за что!", neutral:"Хорошо.", evil:"Ну-ну." },
        greet:  { kind:"Привет! 🙂", neutral:"Здравствуйте.", evil:"Чего надо?" },
        haggle: { kind:"Давай договоримся 🤝", neutral:"Торг возможен.", evil:"Скидок не будет." },
        question:{ kind:"Отвечу!", neutral:"Слушаю.", evil:"Меньше вопросов." },
        def:    { kind:"Слушаю 🙂", neutral:"Итак?", evil:"Ну?" }
    };
    var key = "def";
    if(intent.rude) key = "rude";
    else if(intent.praise) key = "praise";
    else if(intent.polite) key = "polite";
    else if(intent.greet) key = "greet";
    else if(intent.haggle) key = "haggle";
    else if(intent.question) key = "question";
    return bank[key][chat.npc.personality];
}

/* ================= ДИАЛОГ ================= */
function handleMessage(text){
    if(!chat || chat.done || chat.stage !== "talk") return;

    meSay(text);
    var intent = analyze(text);
    intent.same = (text.trim().toLowerCase() === chat.last);
    chat.last = text.trim().toLowerCase();
    applyMood(intent);
    if(ADM.anyPrice) chat.npc.mood = 100;

    if(chat.npc.mood <= 6){
        var leaves = {
            kind:"Мне неприятно. Пойду.",
            neutral:"Разговор окончен.",
            evil:"Всё, достал."
        };
        npcSay(leaves[chat.npc.personality]);
        sysSay("💤 Разговор прерван.");
        chat.done = true;
        renderChat();
        return;
    }

    if(intent.offer == null && intent.agree){
        if(chat.mode === "buy"){
            agreePrice(chat.ask);
            renderChat();
            return;
        }else{
            agreePrice(chat.bid);
            renderChat();
            return;
        }
    }

    if(intent.offer != null){
        if(chat.mode === "buy") handleBuyOffer(intent.offer);
        else handleSellAsk(intent.offer);
    }else{
        npcSay(smallTalk(intent));
    }
    renderChat();
}

function handleBuyOffer(offer){
    var car = chat.car;
    var limit = sellerLimit();
    if(ADM.anyPrice){ agreePrice(offer); return; }

    if(offer < car.price * 0.3){
        npcSay(pick([
            "Это несерьёзно.",
            "Ты издеваешься? За такие деньги я лучше оставлю её себе."
        ]));
        return;
    }

    if(offer >= chat.ask){ agreePrice(chat.ask); return; }
    if(offer >= limit){ agreePrice(offer); return; }

    var counter = Math.round(((offer + chat.ask) / 2) / 500) * 500;
    counter = Math.max(counter, limit);
    if(counter <= offer) counter = offer + 500;
    chat.ask = Math.min(chat.ask, counter);

    var banks = {
        kind:   ['Хм, ' + money(offer) + ' маловато. Давай ' + money(chat.ask) + '?',
                 'Могу отдать за ' + money(chat.ask) + '.'],
        neutral:[money(offer) + ' не подходит. Цена — ' + money(chat.ask) + '.',
                 'Не сойдёмся. ' + money(chat.ask) + '.'],
        evil:   [money(offer) + '? Ха. ' + money(chat.ask) + '.',
                 'Не смеши. ' + money(chat.ask) + ' или ищи другого.']
    };
    npcSay(pick(banks[chat.npc.personality]));
}

function finishBuy(price){
    price = Math.round(price);
    if(!canAfford(price)){
        npcSay("Без денег я машину не отдам. Зря съездили.");
        sysSay("💤 Сделка сорвалась.");
        chat.done = true;
        return;
    }
    if(garage.length >= currentGarage().cap){
        sysSay("❌ В гараже нет места. Сделка сорвалась.");
        chat.done = true;
        return;
    }

    if(garage.indexOf(chat.car.id) !== -1){
        sysSay("ℹ️ Эта машина уже у вас.");
        chat.done = true;
        return;
    }
    spend(price);
    garage.push(chat.car.id);
    deals++;
    save();

    var deals2 = {
        kind:   "Отлично! Держи ключи, береги её 🙂",
        neutral:"Договорились. Документы у меня.",
        evil:   "Забирай. И не возвращайся с претензиями."
    };
    npcSay(deals2[chat.npc.personality]);
    sysSay('✅ Куплено: ' + chat.car.name + ' за ' + money(price));
    chat.done = true;
}

function handleSellAsk(price){
    var car = chat.car;
    var limit = buyerLimit();
    if(ADM.anyPrice){ agreePrice(price); return; }

    if(price > car.price * 2.5){
        npcSay(pick(["Ты цену не перепутал? Это грабёж.", "За такие деньги я лучше новую возьму."]));
        return;
    }

    if(price <= chat.bid){
        agreePrice(chat.bid);
        return;
    }

    if(price <= limit){
        agreePrice(price);
        return;
    }

    var counter = Math.round(((price + chat.bid) / 2) / 500) * 500;
    counter = Math.min(counter, limit);
    if(counter >= price) counter = price - 500;
    chat.bid = Math.max(chat.bid, counter);

    var banks = {
        kind:   ['Могу поднять до ' + money(chat.bid) + ' 🙂',
                 'Давайте ' + money(chat.bid) + '?'],
        neutral:['Максимум ' + money(chat.bid) + '.',
                 money(chat.bid) + ', и разошлись.'],
        evil:   ['Держи ' + money(chat.bid) + '.',
                 'Больше ' + money(chat.bid) + ' не дам.']
    };
    npcSay(pick(banks[chat.npc.personality]));
}

function finishSell(price){
    price = Math.round(price);
    if(garage.indexOf(chat.car.id) === -1){
        sysSay("❌ Этой машины уже нет в гараже.");
        chat.done = true;
        return;
    }
    balance += price;
    garage = garage.filter(function(x){ return x !== chat.car.id; });
    deals++;
    save();

    var deals2 = {
        kind:   "Спасибо вам огромное! Буду за ней следить 🙂",
        neutral:"Договорились. Переводите деньги.",
        evil:   "Наконец-то. Ключи давай."
    };
    npcSay(deals2[chat.npc.personality]);
    sysSay('✅ Продано: ' + chat.car.name + ' за ' + money(price));
    chat.done = true;
}

/* ================= ВСТРЕЧА ================= */
function pad2(n){ return String(n).padStart(2, "0"); }
function ymd(d){ return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function fmtMeet(d){
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear() +
           " в " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

// запись о встрече в календаре
function addCalNote(d, text){
    var key = calKey(d.getFullYear(), d.getMonth(), d.getDate());
    notes[key] = notes[key] ? notes[key] + " · " + text : text;
    save();
    if($("calGrid")) renderCal();
    return {key: key, text: text};
}
function removeCalNote(h){
    if(!h || !notes[h.key]) return;
    var parts = notes[h.key].split(" · ").filter(function(x){ return x !== h.text; });
    if(parts.length) notes[h.key] = parts.join(" · "); else delete notes[h.key];
    save();
    if($("calGrid")) renderCal();
}

// цена согласована -> переходим к назначению встречи
// баланс игрока продавцу не озвучивается: подсказка о нехватке денег видна только игроку
function agreePrice(price){
    price = Math.round(price);
    if(chat.mode === "buy"){
        if(garage.length >= currentGarage().cap){
            sysSay("❌ В гараже нет места.");
            return;
        }
        if(!canAfford(price)){
            sysSay("💸 На вашем счёте не хватает денег для такой цены. Предложите меньше.");
            return;
        }
    }
    chat.price = price;
    chat.stage = "schedule";
    var lines = {
        kind:   'Договорились на ' + money(price) + '! Когда вам удобно встретиться? 🙂',
        neutral:'Хорошо, ' + money(price) + '. Назначьте встречу.',
        evil:   money(price) + '. Когда приедешь?'
    };
    npcSay(lines[chat.npc.personality]);
    sysSay("🤝 Цена согласована: " + money(price));
}

function scheduleMeeting(){
    if(!chat || chat.done || chat.stage !== "schedule") return;
    var ds = $("meetDate").value, ts = $("meetTime").value;
    if(!ds || !ts){ sysSay("📅 Выберите дату и время встречи."); renderChat(); return; }
    var when = new Date(ds + "T" + ts);
    if(isNaN(when.getTime())){ sysSay("📅 Не удалось разобрать дату."); renderChat(); return; }
    if(when.getTime() < gameMs){ sysSay("📅 Это время уже прошло. Выберите другое."); renderChat(); return; }

    var p = chat.npc.personality;
    meSay("Давайте встретимся " + fmtMeet(when) + ".");

    // небольшой шанс, что продавец или покупатель занят (не больше одного раза за сделку)
    var chance = {kind:0.05, neutral:0.08, evil:0.14}[p];
    if(!ADM.smoothMeet && !chat.busyUsed && Math.random() < chance){
        chat.busyUsed = true;
        npcSay({
            kind:   "Ой, в это время никак не получится, я занят. Давайте другой день? 🙂",
            neutral:"В это время занят. Назовите другое.",
            evil:   "Не могу в это время. Выбирай другое, да поживее."
        }[p]);
        renderChat();
        return;
    }

    npcSay({
        kind:   "Отлично, буду ждать! 🙂",
        neutral:"Хорошо, встретимся.",
        evil:   "Ладно. Не опаздывай."
    }[p]);
    chat.meet = {when: when, whenMs: when.getTime(), label: fmtMeet(when)};
    chat.note = addCalNote(when,
        (chat.mode === "buy" ? "🚗 " : "💰 ") + pad2(when.getHours()) + ":" + pad2(when.getMinutes()) +
        " — " + (chat.mode === "buy" ? "купить " : "продать ") + chat.car.name + " (" + chat.npc.name + ")");
    sysSay("📅 Встреча назначена: " + chat.meet.label);
    if(chat.pid) dropPending(chat.pid);
    chat.pid = newPid();
    pending.push({
        id: chat.pid, type: "meet", mode: chat.mode, carId: chat.car.id,
        npc: {name: chat.npc.name, avatar: chat.npc.avatar, personality: chat.npc.personality, mood: chat.npc.mood},
        price: chat.price, when: chat.meet.whenMs, label: chat.meet.label, note: chat.note, reached: false
    });
    save();
    chat.stage = "go";
    renderChat();
}

// на встрече: покупатель или продавец может попросить скинуть или добавить
function rollEvent(){
    if(ADM.smoothMeet || Math.random() > 0.65) return null;
    var p = chat.npc.personality;
    var price = chat.price;
    var fuel = pick([500, 1000, 1500, 2000, 3000]);

    if(chat.mode === "buy"){
        // продавец просит добавить на бензин
        return {
            sign: 1, amount: fuel,
            line: {
                kind:   'Ехал к вам через весь город… Подкинете ' + money(fuel) + ' на бензин? 🙂',
                neutral:'Бензин сейчас недешёвый. Добавьте ' + money(fuel) + ' за дорогу.',
                evil:   'Ехал полгорода. ' + money(fuel) + ' на бензин, и забирайте.'
            }[p],
            prompt: "Продавец просит добавить на бензин: +" + money(fuel),
            yesLabel: "✅ Согласиться (+" + money(fuel) + ")"
        };
    }

    // покупатель осматривает машину и просит скинуть
    if(Math.random() < 0.5){
        return {
            sign: -1, amount: fuel,
            line: {
                kind:   'Ехал к вам далеко. Не скинете ' + money(fuel) + ' на бензин? 🙂',
                neutral:'Ехал через весь город. Скиньте ' + money(fuel) + ' на бензин.',
                evil:   'Я сюда не просто так ехал. Скидывай ' + money(fuel) + ' на бензин.'
            }[p],
            prompt: "Покупатель просит скинуть на бензин: −" + money(fuel),
            yesLabel: "✅ Согласиться (−" + money(fuel) + ")"
        };
    }
    var cut = Math.max(1000, Math.round(price * lerp(0.01, 0.03, Math.random()) / 500) * 500);
    return {
        sign: -1, amount: cut,
        line: {
            kind:   'Вижу небольшие царапины… Скинете ' + money(cut) + '? 🙂',
            neutral:'Есть замечания по кузову. Скиньте ' + money(cut) + '.',
            evil:   'Тут и там косяки. Минус ' + money(cut) + ', иначе уезжаю.'
        }[p],
        prompt: "Покупатель нашёл недостатки и просит скинуть: −" + money(cut),
        yesLabel: "✅ Согласиться (−" + money(cut) + ")"
    };
}

function goToMeeting(){
    if(!chat || chat.done || chat.stage !== "go") return;
    if(!ADM.smoothMeet && chat.meet && gameMs < chat.meet.whenMs){
        sysSay("⏳ Ещё рано: встреча назначена на " + chat.meet.label + ".");
        renderChat();
        return;
    }
    chat.met = true;
    sysSay("🚗 Вы на месте: " + chat.car.name + ".");
    if(chat.mode === "buy") sysSay("🔍 Вы осматриваете машину: всё соответствует описанию.");
    else sysSay("🔍 " + chat.npc.name + " осматривает вашу машину…");

    var ev = rollEvent();
    if(!ev){
        completeDeal();
    }else{
        chat.event = ev;
        npcSay(ev.line);
        chat.stage = "event";
    }
    renderChat();
}

function agreeEvent(){
    if(!chat || chat.done || chat.stage !== "event" || !chat.event) return;
    var ev = chat.event;
    var newPrice = chat.price + ev.sign * ev.amount;
    if(ev.sign > 0 && !canAfford(newPrice)){ renderChat(); return; }
    meSay("Хорошо, согласен.");
    chat.price = newPrice;
    chat.event = null;
    completeDeal();
    renderChat();
}

function refuseEvent(){
    if(!chat || chat.done || chat.stage !== "event") return;
    var p = chat.npc.personality;
    meSay("Нет, цена остаётся прежней.");
    chat.event = null;
    var leave = {kind:0.10, neutral:0.30, evil:0.55}[p] + (chat.npc.mood < 30 ? 0.10 : 0);
    if(Math.random() < leave){
        npcSay({
            kind:   "Тогда извините, не договорились. Всего доброго.",
            neutral:"Тогда сделки не будет.",
            evil:   "Тогда ищи другого. Я уехал."
        }[p]);
        sysSay("💤 Сделка сорвалась.");
        chat.done = true;
        chat.stage = "done";
    }else{
        npcSay({
            kind:   "Ладно, ничего страшного 🙂",
            neutral:"Ну ладно, как договорились.",
            evil:   "Ладно. В другой раз так просто не отделаешься."
        }[p]);
        completeDeal();
    }
    renderChat();
}

function completeDeal(){
    if(chat.mode === "buy") finishBuy(chat.price); else finishSell(chat.price);
    chat.stage = "done";
}

/* ================= ОЖИДАЮЩИЕ ДЕЛА (ОБЪЯВЛЕНИЯ И ВСТРЕЧИ) ================= */
var pidSeq = 0;
function newPid(){ return "p" + Date.now().toString(36) + (++pidSeq).toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
function findPending(id){ return pending.find(function(x){ return x.id === id; }) || null; }
function pendingFor(carId){ return pending.find(function(x){ return x.carId === carId; }) || null; }
function carById(id){ return CARS.find(function(c){ return c.id === id; }) || null; }
function isMeetReady(it){ return !!(ADM.smoothMeet || gameMs >= it.when); }

function dropPending(id, removeNote){
    var it = findPending(id);
    if(!it) return;
    if(removeNote && it.note) removeCalNote(it.note);
    pending = pending.filter(function(x){ return x.id !== id; });
    save();
}

function fmtDur(ms){
    var m = Math.max(0, Math.round(ms / 60000));
    if(m < 1) return "меньше минуты";
    var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    var parts = [];
    if(d) parts.push(d + " д");
    if(h) parts.push(h + " ч");
    if(mm && !d) parts.push(mm + " мин");
    return parts.join(" ");
}
function updatePendingCountdowns(){
    var els = document.querySelectorAll("[data-until]");
    for(var i = 0; i < els.length; i++){
        var rem = Number(els[i].getAttribute("data-until")) - gameMs;
        els[i].textContent = rem > 0 ? fmtDur(rem) : "сейчас";
    }
}

/* уведомления */
function toast(text, onClick){
    var box = $("toasts");
    if(!box) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    el.addEventListener("click", function(){ if(onClick) onClick(); el.remove(); });
    box.appendChild(el);
    while(box.children && box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function(){ if(el.parentNode) el.remove(); }, 9000);
}
function toastDeals(text){
    toast(text, function(){ openWin("market"); showDeals(); });
}

/* кнопки на карточках машин */
function buyBtn(car, owned){
    if(owned) return '<button class="buy" disabled>Уже в гараже</button>';
    if(pendingFor(car.id)) return '<button class="buy" disabled>📅 Встреча назначена</button>';
    return '<button class="buy" data-buy="' + car.id + '">💬 Написать</button>';
}
function sellBtn(car){
    var it = pendingFor(car.id);
    if(!it) return '<button class="sell" data-sell="' + car.id + '">💰 Найти покупателя</button>';
    if(it.type === "ad"){
        if(it.ready) return '<button class="sell ready" data-ad-open="' + it.id + '">💬 Покупатель написал</button>';
        return '<button class="sell" disabled>⏳ Ждём покупателя… <span data-until="' + it.readyAt + '"></span></button>';
    }
    return '<button class="sell" disabled>📅 Встреча назначена</button>';
}

/* продажа: объявление -> ожидание покупателя -> чат */
function postAd(carId){
    var car = carById(carId);
    if(!car || garage.indexOf(carId) === -1) return;
    if(pendingFor(carId)){ toast("ℹ️ По этой машине уже есть объявление или встреча."); return; }
    var b = pick(BUYERS);
    var p = PERSONALITY[b.personality];
    var wait = ADM.smoothMeet ? 0 : rnd(AD_WAIT_MIN, AD_WAIT_MAX);
    pending.push({
        id: newPid(), type: "ad", mode: "sell", carId: carId,
        npc: {name: b.name, avatar: b.avatar, personality: b.personality, mood: clamp(p.mood + rnd(-8, 8), 5, 95)},
        readyAt: gameMs + wait, ready: false
    });
    save();
    toast("📢 Объявление размещено: " + car.name + ". Ждём покупателя…");
    refreshList();
    renderDealsTab();
}
function openAdChat(id){
    var it = findPending(id);
    if(!it || it.type !== "ad" || !it.ready) return;
    openSellChat(it.carId, it);
}
function cancelAd(id){
    dropPending(id);
    toast("Объявление снято.");
    refreshList();
    renderDealsTab();
}

/* встреча: возвращаемся в чат на этапе «ехать» */
function openMeetChat(id){
    var it = findPending(id);
    var car = it ? carById(it.carId) : null;
    if(!it || it.type !== "meet" || !car) return;
    var npc = {name: it.npc.name, avatar: it.npc.avatar, personality: it.npc.personality, mood: it.npc.mood, greeted: true};
    chat = {mode: it.mode, car: car, npc: npc, ask: it.price, bid: it.price, log: [], last: "", done: false,
            stage: "go", price: it.price, event: null,
            meet: {when: new Date(it.when), whenMs: it.when, label: it.label},
            note: it.note, met: false, busyUsed: true, pid: it.id};
    sysSay("🤝 Цена согласована: " + money(it.price));
    sysSay("📅 Встреча: " + it.label);
    openOverlay();
}
function cancelMeet(id){
    if(!confirm("Отменить встречу? Сделка сорвётся.")) return;
    dropPending(id, true);
    toast("Встреча отменена.");
    refreshList();
    renderDealsTab();
}

function dealAction(e){
    var t = e.target.closest("[data-ad-open],[data-ad-cancel],[data-meet-go],[data-meet-cancel]");
    if(!t || t.disabled) return false;
    var d = t.dataset;
    if(d.adOpen){ closeCarInfo(); openAdChat(d.adOpen); }
    else if(d.adCancel){ cancelAd(d.adCancel); }
    else if(d.meetGo){ openMeetChat(d.meetGo); }
    else if(d.meetCancel){ cancelMeet(d.meetCancel); }
    return true;
}

function renderDealsTab(){
    var t = $("tabDeals");
    if(!t) return;
    var attn = pending.filter(function(it){ return it.type === "ad" ? it.ready : gameMs >= it.when; }).length;
    t.textContent = "📋 Сделки" + (pending.length ? " · " + pending.length : "");
    t.classList.toggle("alert", attn > 0);
}

function dealCard(it){
    var car = carById(it.carId);
    if(!car) return "";
    var n = it.npc, body;
    if(it.type === "ad"){
        if(it.ready){
            body = '<div class="name">📩 ' + esc(n.avatar + " " + n.name) + ' пишет по объявлению</div>' +
                '<div class="meta">' + esc(car.name) + '</div>' +
                '<div class="deal-status ok">Покупатель ждёт ответа</div>' +
                '<button class="buy" data-ad-open="' + it.id + '">💬 Ответить</button>' +
                '<button class="deal-cancel" data-ad-cancel="' + it.id + '">Снять с продажи</button>';
        }else{
            body = '<div class="name">📢 ' + esc(car.name) + '</div>' +
                '<div class="meta">Объявление размещено, покупатель пока не написал.</div>' +
                '<div class="deal-status">Ждём покупателя: ещё около <span data-until="' + it.readyAt + '"></span></div>' +
                '<button class="deal-cancel" data-ad-cancel="' + it.id + '">Снять с продажи</button>';
        }
    }else{
        var ready = isMeetReady(it);
        body = '<div class="name">📅 ' + (it.mode === "buy" ? "Покупка" : "Продажа") + ': ' + esc(car.name) + '</div>' +
            '<div class="meta">' + esc(n.avatar + " " + n.name) + ' · ' + esc(it.label) + '</div>' +
            '<div class="price">' + money(it.price) + '</div>' +
            (ready
                ? '<div class="deal-status ok">Пора ехать! Успейте в течение ' + Math.round(MEET_GRACE / 3600000) + ' ч.</div>'
                : '<div class="deal-status">До встречи: <span data-until="' + it.when + '"></span></div>') +
            '<button class="buy" data-meet-go="' + it.id + '" ' + (ready ? '' : 'disabled') + '>🚗 Поехать на встречу</button>' +
            '<button class="deal-cancel" data-meet-cancel="' + it.id + '">Отменить встречу</button>';
    }
    return '<article class="card"><div class="car-img">' + carImg(car) + '</div><div class="info">' + body + '</div></article>';
}

function showDeals(){
    view = "deals";
    setTabs("deals");
    $("content").innerHTML = pending.length
        ? pending.map(dealCard).join("")
        : '<div class="empty" style="grid-column:1/-1">📋<br><br>Пока нет активных сделок.<br>Разместите машину на продажу или договоритесь о встрече.</div>';
    if($("fCount")) $("fCount").textContent = "";
    updateStats();
    updatePendingCountdowns();
}

// проверяется каждый тик игрового времени
function tickPending(){
    if(!pending.length) return;
    var changed = false;

    // убираем дела, потерявшие смысл (например, машину убрали из гаража)
    var before = pending.length;
    pending = pending.filter(function(it){
        var inG = garage.indexOf(it.carId) !== -1;
        return it.mode === "sell" ? inG : !inG;
    });
    if(pending.length !== before) changed = true;

    pending.slice().forEach(function(it){
        var car = carById(it.carId);
        var cname = car ? car.name : "машину";
        if(it.type === "ad"){
            if(!it.ready && gameMs >= it.readyAt){
                it.ready = true;
                changed = true;
                toastDeals("📩 " + it.npc.name + " хочет купить: " + cname + ". Нажмите, чтобы ответить.");
            }
        }else{
            if(!it.reached && gameMs >= it.when){
                it.reached = true;
                changed = true;
                toastDeals("🚗 Пора на встречу: " + cname + " (" + it.npc.name + ").");
                if(chat && chat.pid === it.id) renderChat();
            }
            if(gameMs > it.when + MEET_GRACE){
                dropPending(it.id, true);
                changed = true;
                toast("❌ Встреча сорвалась: вы не приехали вовремя (" + cname + ").");
                if(chat && chat.pid === it.id){
                    sysSay("💤 Вы опоздали: встреча сорвалась.");
                    chat.done = true;
                    chat.stage = "done";
                    chat.pid = null;
                    renderChat();
                }
            }
        }
    });

    if(changed){ save(); refreshList(); renderDealsTab(); }
    updatePendingCountdowns();
}

/* ================= КАЛЬКУЛЯТОР ================= */
var CALC_KEYS = [
    ["C","red"],["←","op"],["÷","op"],["×","op"],
    ["7",""],["8",""],["9",""],["−","op"],
    ["4",""],["5",""],["6",""],["+","op"],
    ["1",""],["2",""],["3",""],["=","eq"],
    ["0",""],["." ,""],["00",""],["%","op"]
];
var calcExpr = "";
function initCalc(){
    var grid = $("calcGrid");
    if(!grid) return;
    grid.innerHTML = CALC_KEYS.map(function(k){
        return '<button class="' + k[1] + '" data-calc="' + k[0] + '">' + k[0] + '</button>';
    }).join("");
    grid.querySelectorAll("[data-calc]").forEach(function(btn){
        btn.addEventListener("click", function(){ calcKey(btn.dataset.calc); });
    });
    renderCalc();
}
function calcKey(k){
    if(k === "C"){ calcExpr = ""; renderCalc(); return; }
    if(k === "←"){ calcExpr = calcExpr.slice(0,-1); renderCalc(); return; }
    if(k === "="){ calcEval(); return; }
    if(k === "%"){ calcExpr += "/100"; renderCalc(); return; }
    calcExpr += k;
    renderCalc();
}
function renderCalc(){
    if($("calcExpr")) $("calcExpr").textContent = calcExpr || "\u00a0";
    if($("calcVal")) $("calcVal").textContent = calcExpr === "" ? "0" : calcExpr;
}
function calcEval(){
    var e = calcExpr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
    try{
        var r = Function('"use strict";return (' + e + ')')();
        if(r === undefined || isNaN(r)) throw 0;
        var out = Math.round(r * 1000000) / 1000000;
        $("calcExpr").textContent = calcExpr + " =";
        $("calcVal").textContent = out;
        calcExpr = String(out);
    }catch(err){
        $("calcVal").textContent = "Ошибка";
        calcExpr = "";
    }
}
document.addEventListener("keydown", function(e){
    var wc = $("win-calc");
    if(!wc || !wc.classList.contains("open") || wc.classList.contains("minimized")) return;
    if(/^[0-9+\-*/.()]$/.test(e.key)){ calcExpr += e.key; renderCalc(); }
    else if(e.key === "Enter"){ calcEval(); }
    else if(e.key === "Backspace"){ calcExpr = calcExpr.slice(0,-1); renderCalc(); }
    else if(e.key === "Escape"){ calcExpr = ""; renderCalc(); }
});

/* ================= КАЛЕНДАРЬ ================= */
var MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
var DOW = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
var calYear, calMonth;

function calKey(y,m,d){ return y + "-" + String(m+1).padStart(2,"0") + "-" + String(d).padStart(2,"0"); }
function renderCal(){
    if(!$("calTitle")) return;
    $("calTitle").textContent = MONTHS[calMonth] + " " + calYear;
    var first = new Date(calYear, calMonth, 1);
    var startDay = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    var today = gameNow();
    var todayKey = calKey(today.getFullYear(), today.getMonth(), today.getDate());
    var html = DOW.map(function(d){ return '<div class="cal-dow">' + d + '</div>'; }).join("");
    for(var i=0;i<startDay;i++) html += '<div class="cal-day blank"></div>';
    for(var d=1; d<=daysInMonth; d++){
        var key = calKey(calYear, calMonth, d);
        var cls = "cal-day";
        if(key === todayKey) cls += " today";
        if(notes[key]) cls += " has";
        html += '<div class="' + cls + '" data-day="' + key + '">' +
            d + (notes[key] ? '<span class="dot"></span>' : '') + '</div>';
    }
    $("calGrid").innerHTML = html;
    $("calGrid").querySelectorAll("[data-day]").forEach(function(el){
        el.addEventListener("click", function(){ pickDay(el.dataset.day); });
    });
}
function calShift(n){
    calMonth += n;
    if(calMonth < 0){ calMonth = 11; calYear--; }
    if(calMonth > 11){ calMonth = 0; calYear++; }
    renderCal();
}
function calToday(){
    var t = gameNow();
    calYear = t.getFullYear();
    calMonth = t.getMonth();
    renderCal();
}
function pickDay(key){
    var cur = notes[key] || "";
    var v = prompt("Заметка на " + key + ":", cur);
    if(v === null) return;
    if(v.trim() === "") delete notes[key];
    else notes[key] = v.trim();
    save(); renderCal();
    $("calNote").innerHTML = '<b>' + key + '</b><br>' + (notes[key] ? esc(notes[key]) : "Заметки нет.");
}

/* ================= ИГРОВОЕ ВРЕМЯ ================= */
var DOW_FULL = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
var MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function gameNow(){ return new Date(gameMs); }
function saveGameTime(){
    localStorage.setItem("gameMs", String(Math.round(gameMs)));
    lastGameSave = Date.now();
}

function renderGameTime(){
    var d = gameNow();
    var hm = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    if($("clock")){
        $("clock").textContent = pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "  " + hm;
        $("clock").title = "Игровое время (×" + GAME_SPEED + ")";
    }

    // приложение «Часы»
    if($("clockBig")){
        var big = hm + ":" + pad2(d.getSeconds());
        if(big !== lastClockStr){
            lastClockStr = big;
            var h = d.getHours(), m = d.getMinutes(), sec = d.getSeconds();
            $("clockBig").textContent = big;
            $("clockDate").textContent = DOW_FULL[d.getDay()] + ", " + d.getDate() + " " +
                MONTHS_GEN[d.getMonth()] + " " + d.getFullYear();
            if($("hHand")) $("hHand").setAttribute("transform", "rotate(" + ((h % 12) * 30 + m * 0.5) + ")");
            if($("mHand")) $("mHand").setAttribute("transform", "rotate(" + (m * 6 + sec * 0.1) + ")");
            if($("sHand")) $("sHand").setAttribute("transform", "rotate(" + (sec * 6) + ")");
        }
    }

    // сменился игровой день — обновляем календарь
    var key = ymd(d);
    if(key !== lastDayKey){
        lastDayKey = key;
        if($("calGrid") && typeof renderCal === "function") renderCal();
    }
}

function tickGame(){
    var now = Date.now();
    var delta = now - lastRealMs;
    lastRealMs = now;
    if(delta < 0) delta = 0;
    if(delta > 120000) delta = 120000;   // если вкладка «спала», не прыгаем на часы вперёд
    gameMs += delta * GAME_SPEED;
    renderGameTime();
    tickPending();
    if(now - lastGameSave > 5000) saveGameTime();
}

function initGameTime(){
    var g = $("clockTicks");
    if(g){
        var t = "";
        for(var i = 0; i < 60; i++){
            var major = i % 5 === 0;
            t += '<line class="tick' + (major ? ' major' : '') + '" x1="0" y1="' + (major ? -80 : -86) +
                 '" x2="0" y2="-91" transform="rotate(' + (i * 6) + ')"/>';
        }
        g.innerHTML = t;
    }
    lastRealMs = Date.now();
    renderGameTime();
    setInterval(tickGame, 250);
    window.addEventListener("pagehide", saveGameTime);
    window.addEventListener("beforeunload", saveGameTime);
    document.addEventListener("visibilitychange", function(){ if(document.hidden) saveGameTime(); });
}

/* ================= СЛУЖЕБНОЕ ОКНО ================= */
// Внимание: игра работает целиком в браузере, поэтому пароль здесь только «от случайных глаз».
// Пароль в коде не хранится, только его хеш; открывается окно пятью быстрыми кликами по логотипу.
var ADM_SALT = "perekyp:";
var ADM_HASH = 1979982443587708;
var adminUnlocked = false;
var gateFails = 0, gateLockUntil = 0;
var logoClicks = [];

function hashStr(str, seed){
    seed = seed || 0;
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(var i = 0, ch; i < str.length; i++){
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function loadAdminFlags(){
    var f = {};
    try{ f = JSON.parse(localStorage.getItem("adminFlags") || "{}") || {}; }catch(e){ f = {}; }
    return {infMoney: !!f.infMoney, anyPrice: !!f.anyPrice, smoothMeet: !!f.smoothMeet};
}
var ADM = loadAdminFlags();
function saveAdminFlags(){ localStorage.setItem("adminFlags", JSON.stringify(ADM)); }

// деньги: в режиме «деньги не списываются» всегда хватает
function canAfford(p){ return ADM.infMoney || balance >= p; }
function spend(p){ if(!ADM.infMoney) balance -= p; }

function openAdminGate(){
    $("gatePass").value = "";
    $("gateErr").textContent = "";
    $("adminGate").classList.add("open");
    setTimeout(function(){ $("gatePass").focus(); }, 40);
}
function closeAdminGate(){ $("adminGate").classList.remove("open"); }

function tryAdminGate(){
    var now = Date.now();
    if(now < gateLockUntil){
        $("gateErr").textContent = "Подождите " + Math.ceil((gateLockUntil - now) / 1000) + " с.";
        return;
    }
    var pass = $("gatePass").value;
    if(hashStr(ADM_SALT + pass) === ADM_HASH){
        gateFails = 0;
        adminUnlocked = true;
        closeAdminGate();
        openWin("admin");
    }else{
        gateFails++;
        $("gatePass").value = "";
        if(gateFails >= 3){
            gateFails = 0;
            gateLockUntil = now + 15000;
            $("gateErr").textContent = "Слишком много попыток. Подождите 15 с.";
        }else{
            $("gateErr").textContent = "Неверный пароль.";
        }
    }
}

function admMsg(t){ if($("admMsg")) $("admMsg").textContent = t; }
function admApply(){
    save(); updateStats(); renderShop();
    if(typeof refreshList === "function") refreshList();
}

function admMoney(mode, n){
    n = Math.floor(Number(n));
    if(!isFinite(n) || n < 0 || (mode !== "set" && n === 0)){ admMsg("⚠️ Введите сумму больше нуля."); return; }
    var LIM = 1e15;
    if(mode === "add"){ balance = Math.min(LIM, balance + n); admMsg("✅ Выдано " + money(n)); }
    else if(mode === "sub"){ balance = Math.max(0, balance - n); admMsg("✅ Забрано " + money(n)); }
    else { balance = Math.min(LIM, n); admMsg("✅ Баланс установлен: " + money(balance)); }
    admApply();
}
function admCarAdd(id){
    var car = CARS.find(function(c){ return c.id === id; });
    if(!car){ admMsg("⚠️ Машина не найдена."); return; }
    if(garage.indexOf(id) !== -1){ admMsg("ℹ️ Эта машина уже в гараже."); return; }
    if(garage.length >= currentGarage().cap){ admMsg("⚠️ Гараж заполнен. Поднимите уровень гаража."); return; }
    garage.push(id);
    admMsg("✅ В гараж добавлено: " + car.name);
    admApply();
}
function admCarDel(id){
    if(garage.indexOf(id) === -1){ admMsg("ℹ️ Этой машины нет в гараже."); return; }
    garage = garage.filter(function(x){ return x !== id; });
    admMsg("✅ Машина убрана из гаража.");
    admApply();
}
function admGarLvl(i){
    if(!GARAGES[i]) return;
    garageLvl = i;
    admMsg("✅ Уровень гаража: " + GARAGES[i].name);
    admApply();
}
function admReset(){
    if(!confirm("Сбросить весь прогресс (баланс, гараж, сделки, заметки)?")) return;
    balance = 1000000; garage = []; deals = 0; garageLvl = 0; notes = {}; pending = [];
    save();
    if(typeof renderCal === "function") renderCal();
    admMsg("✅ Прогресс сброшен.");
    admApply();
}
function admTime(ms){
    ms = Number(ms);
    if(!isFinite(ms) || ms <= 0) return;
    gameMs += ms;
    saveGameTime();
    renderGameTime();
    admMsg("✅ Время сдвинуто вперёд.");
}
function admLock(){
    adminUnlocked = false;
    closeWin("admin");
}
function admSetFlag(flag, on){
    if(flag === "god"){ ADM.infMoney = ADM.anyPrice = ADM.smoothMeet = !!on; }
    else if(flag in ADM){ ADM[flag] = !!on; }
    saveAdminFlags();
    admApply();
}

function renderAdmin(){
    if($("godBadge")) $("godBadge").classList.toggle("on", !!(ADM.infMoney || ADM.anyPrice || ADM.smoothMeet));
    if(!$("admStatus")) return;
    $("admStatus").textContent = "Баланс: " + money(balance) + " · Гараж: " + garage.length + " / " +
        currentGarage().cap + " · Сделок: " + deals;
    $("admInf").checked    = !!ADM.infMoney;
    $("admAny").checked    = !!ADM.anyPrice;
    $("admSmooth").checked = !!ADM.smoothMeet;
    $("admGod").checked    = !!(ADM.infMoney && ADM.anyPrice && ADM.smoothMeet);
}

function bindAdmin(){
    var logo = document.querySelector(".tb-logo");
    if(logo) logo.addEventListener("click", function(){
        var now = Date.now();
        logoClicks = logoClicks.filter(function(t){ return now - t < 2500; });
        logoClicks.push(now);
        if(logoClicks.length >= 5){ logoClicks = []; openWin("admin"); }
    });

    if($("admCar")) $("admCar").innerHTML = CARS.map(function(c){
        return '<option value="' + c.id + '">' + c.id + '. ' + esc(c.name) + ' — ' + money(c.price) + '</option>';
    }).join("");
    if($("admGarage")) $("admGarage").innerHTML = GARAGES.map(function(g, i){
        return '<option value="' + i + '">' + esc(g.name) + ' (' + g.cap + ' мест)</option>';
    }).join("");

    if($("gateOk")) $("gateOk").addEventListener("click", tryAdminGate);
    if($("gateCancel")) $("gateCancel").addEventListener("click", closeAdminGate);
    if($("gatePass")) $("gatePass").addEventListener("keydown", function(e){
        if(e.key === "Enter"){ e.preventDefault(); tryAdminGate(); }
        else if(e.key === "Escape"){ closeAdminGate(); }
    });
    if($("adminGate")) $("adminGate").addEventListener("mousedown", function(e){
        if(e.target === $("adminGate")) closeAdminGate();
    });

    if($("adminBody")){
        $("adminBody").addEventListener("click", function(e){
            var b = e.target.closest("[data-adm]");
            if(!b || !adminUnlocked) return;
            var act = b.dataset.adm;
            if(act === "add" || act === "sub" || act === "set") admMoney(act, $("admMoney").value);
            else if(act === "quick") admMoney("add", b.dataset.val);
            else if(act === "carAdd") admCarAdd(parseInt($("admCar").value, 10));
            else if(act === "carDel") admCarDel(parseInt($("admCar").value, 10));
            else if(act === "garLvl") admGarLvl(parseInt($("admGarage").value, 10));
            else if(act === "time") admTime(b.dataset.ms);
            else if(act === "reset") admReset();
            else if(act === "lock") admLock();
        });
        $("adminBody").addEventListener("change", function(e){
            var f = e.target.dataset && e.target.dataset.flag;
            if(f && adminUnlocked) admSetFlag(f, e.target.checked);
        });
    }
    renderAdmin();
}

/* ================= ПРИВЯЗКА СОБЫТИЙ ================= */
function bindUI(){
    bindAdmin();
    attachResizeHandlers();

    buildIcons();
    attachIconHandlers();

    document.querySelectorAll(".win-head").forEach(function(head){
        head.addEventListener("mousedown", function(e){
            if(e.target.closest(".win-btns")) return;
            if(e.target.closest("button")) return;
            var win = head.closest(".window");
            if(!win) return;
            startDrag(e, win.id);
        });
    });

    document.querySelectorAll(".window").forEach(function(win){
        win.addEventListener("mousedown", function(e){
            if(e.target.closest(".resize-handle")) return;
            var id = win.id.replace("win-", "");
            focusWin(id);
        });
    });

    document.querySelectorAll("[data-min]").forEach(function(btn){
        btn.addEventListener("click", function(e){
            e.stopPropagation();
            e.preventDefault();
            minimizeWin(btn.dataset.min);
        });
    });
    document.querySelectorAll("[data-close]").forEach(function(btn){
        btn.addEventListener("click", function(e){
            e.stopPropagation();
            e.preventDefault();
            closeWin(btn.dataset.close);
        });
    });

    bindFilters();
    if($("tabMarket")) $("tabMarket").addEventListener("click", showMarket);
    if($("tabDeals")) $("tabDeals").addEventListener("click", showDeals);
    if($("tabGarage")) $("tabGarage").addEventListener("click", showGarage);

    if($("content")) $("content").addEventListener("click", function(e){
        if(dealAction(e)) return;
        var buy = e.target.closest("[data-buy]");
        if(buy && !buy.disabled){
            openBuyChat(parseInt(buy.dataset.buy,10));
            return;
        }
        var sell = e.target.closest("[data-sell]");
        if(sell && !sell.disabled){
            postAd(parseInt(sell.dataset.sell,10));
            return;
        }
        var info = e.target.closest("[data-info]");
        if(info){ openCarInfo(parseInt(info.dataset.info,10)); }
    });

    if($("carClose")) $("carClose").addEventListener("click", closeCarInfo);
    if($("carOverlay")) $("carOverlay").addEventListener("mousedown", function(e){
        if(e.target === $("carOverlay")) closeCarInfo();
    });
    if($("carModalBody")) $("carModalBody").addEventListener("click", function(e){
        if(dealAction(e)) return;
        var buy = e.target.closest("[data-buy]");
        if(buy && !buy.disabled){
            closeCarInfo();
            openBuyChat(parseInt(buy.dataset.buy,10));
            return;
        }
        var sell = e.target.closest("[data-sell]");
        if(sell && !sell.disabled){
            closeCarInfo();
            postAd(parseInt(sell.dataset.sell,10));
        }
    });
    document.addEventListener("keydown", function(e){
        if(e.key === "Escape" && $("carOverlay") && $("carOverlay").classList.contains("open")) closeCarInfo();
    });

    if($("upGrid")) $("upGrid").addEventListener("click", function(e){
        var b = e.target.closest("[data-buy-garage]");
        if(b && !b.disabled){
            buyGarage(parseInt(b.dataset.buyGarage,10));
        }
    });

    if($("calPrev")) $("calPrev").addEventListener("click", function(){ calShift(-1); });
    if($("calNext")) $("calNext").addEventListener("click", function(){ calShift(1); });
    if($("calTodayBtn")) $("calTodayBtn").addEventListener("click", calToday);

    if($("chatClose")) $("chatClose").addEventListener("click", closeChat);
    if($("meetBtn")) $("meetBtn").addEventListener("click", scheduleMeeting);
    if($("goBtn")) $("goBtn").addEventListener("click", goToMeeting);
    if($("evYes")) $("evYes").addEventListener("click", agreeEvent);
    if($("evNo")) $("evNo").addEventListener("click", refuseEvent);
    if($("offerBtn")) $("offerBtn").addEventListener("click", sendOffer);
    if($("sendBtn")) $("sendBtn").addEventListener("click", sendMsg);
    if($("msgInput")) $("msgInput").addEventListener("keydown", function(e){
        if(e.key === "Enter"){ e.preventDefault(); sendMsg(); }
    });
    if($("offerInput")) $("offerInput").addEventListener("keydown", function(e){
        if(e.key === "Enter"){ e.preventDefault(); sendOffer(); }
    });

    window.addEventListener("resize", function(){
        document.querySelectorAll(".window.open").forEach(clampWindow);
        snapAllIcons(true);
    });
}

/* ================= СТАРТ ================= */
window.addEventListener("DOMContentLoaded", function(){
    bindUI();
    initCalc();

    var t = gameNow();
    calYear = t.getFullYear();
    calMonth = t.getMonth();
    renderCal();
    initGameTime();

    showMarket();
    updateStats();
    renderShop();
    renderTaskbar();
});
/* ================= ПРИНУДИТЕЛЬНОЕ ПЕРЕТАСКИВАНИЕ ОКОН (ФИКС) ================= */
window.addEventListener("load", function(){
    document.querySelectorAll(".win-head").forEach(function(head){
        // убираем возможный старый обработчик
        head.onmousedown = null;

        head.addEventListener("mousedown", function(e){
            // не тащим, если кликнули по кнопке свернуть/закрыть
            if(e.target.closest(".win-btns")) return;
            if(e.target.closest("button")) return;
            if(e.button !== undefined && e.button !== 0) return;

            var win = head.closest(".window");
            if(!win) return;

            win.style.zIndex = ++zTop;
            var rect = win.getBoundingClientRect();
            var desk = document.getElementById("deskArea").getBoundingClientRect();

            var offsetX = e.clientX - rect.left;
            var offsetY = e.clientY - rect.top;

            win.style.left = (rect.left - desk.left) + "px";
            win.style.top  = (rect.top  - desk.top)  + "px";
            win.dataset.hasPos = "1";

            function onMove(ev){
                var x = ev.clientX - desk.left - offsetX;
                var y = ev.clientY - desk.top  - offsetY;

                var maxX = desk.width  - win.offsetWidth;
                var maxY = desk.height - win.offsetHeight;
                if(x < 0) x = 0;
                if(x > maxX) x = maxX;
                if(y < 0) y = 0;
                if(y > maxY) y = maxY;

                win.style.left = x + "px";
                win.style.top  = y + "px";
            }

            function onUp(){
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                try{
                    localStorage.setItem("window_" + win.id.replace("win-",""), JSON.stringify({
                        left: parseFloat(win.style.left) || 0,
                        top:  parseFloat(win.style.top)  || 0,
                        width: win.offsetWidth,
                        height: win.offsetHeight
                    }));
                }catch(err){}
            }

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            e.preventDefault();
        });
    });
});
/* ================= РЕСАЙЗ ОКОН ЗА ЛЮБУЮ ГРАНИЦУ (ФИКС) ================= */
window.addEventListener("load", function(){

    var EDGE = 8;   // сколько пикселей от края считается «за границу»
    var MIN_W = 380;
    var MIN_H = 280;

    var activeResize = null;

    // ---- Определяем, у какого края окна находится курсор ----
    function getEdge(win, e){
        var r = win.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;

        var nearL = x < EDGE;
        var nearR = x > r.width - EDGE;
        var nearT = y < EDGE;
        var nearB = y > r.height - EDGE;

        // только если курсор реально внутри окна (или чуть за границей)
        if(x < -EDGE || x > r.width + EDGE) return null;
        if(y < -EDGE || y > r.height + EDGE) return null;

        var dir = "";
        if(nearT) dir += "n";
        if(nearB) dir += "s";
        if(nearL) dir += "w";
        if(nearR) dir += "e";
        return dir || null;
    }

    // ---- Курсор в нужный вид ----
    function cursorFor(dir){
        if(dir === "n"  || dir === "s")  return "ns-resize";
        if(dir === "e"  || dir === "w")  return "ew-resize";
        if(dir === "ne" || dir === "sw") return "nesw-resize";
        if(dir === "nw" || dir === "se") return "nwse-resize";
        return "";
    }

    // ---- Отслеживаем движение мыши над окнами, меняем курсор ----
    document.addEventListener("mousemove", function(e){
        if(activeResize) return;   // если уже ресайзим — не мешаем

        var win = e.target.closest && e.target.closest(".window");
        if(!win || !win.classList.contains("open") || win.classList.contains("minimized")){
            // если курсор не над окном — сбрасываем курсор
            var deskCursor = document.getElementById("deskArea");
            if(deskCursor) deskCursor.style.cursor = "";
            return;
        }

        // не трогаем курсор, если мы над кнопками окна
        if(e.target.closest(".win-btns")){
            win.style.cursor = "";
            return;
        }

        var dir = getEdge(win, e);
        win.style.cursor = cursorFor(dir);
    });

    // ---- Начинаем ресайз при клике у границы ----
    document.addEventListener("mousedown", function(e){
        if(e.button !== undefined && e.button !== 0) return;

        var win = e.target.closest && e.target.closest(".window");
        if(!win || !win.classList.contains("open") || win.classList.contains("minimized")) return;

        // клики по кнопкам свернуть/закрыть не трогаем
        if(e.target.closest(".win-btns")) return;
        if(e.target.closest("button")) return;

        var dir = getEdge(win, e);
        if(!dir) return;   // не у границы — обычный клик, не мешаем

        // ★ Начинаем ресайз
        e.preventDefault();
        e.stopPropagation();

        var desk = document.getElementById("deskArea").getBoundingClientRect();
        var rect = win.getBoundingClientRect();

        activeResize = {
            win: win,
            dir: dir,
            startX: e.clientX,
            startY: e.clientY,
            startLeft:   rect.left - desk.left,
            startTop:    rect.top  - desk.top,
            startWidth:  rect.width,
            startHeight: rect.height,
            desk: desk
        };

        win.style.zIndex = ++zTop;
        document.body.style.cursor = cursorFor(dir);

        // ★ Слушаем движение
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup", onResizeUp);
    }, true);   // ← true = захватываем ДО других обработчиков

    function onResizeMove(e){
        if(!activeResize) return;
        e.preventDefault();

        var r = activeResize;
        var dx = e.clientX - r.startX;
        var dy = e.clientY - r.startY;

        var left   = r.startLeft;
        var top    = r.startTop;
        var width  = r.startWidth;
        var height = r.startHeight;

        // восточная грань — тянем ширину
        if(r.dir.indexOf("e") !== -1){
            width = Math.max(MIN_W, r.startWidth + dx);
            width = Math.min(width, r.desk.width - left);
        }
        // западная грань — тянем ширину и left
        if(r.dir.indexOf("w") !== -1){
            var newW = Math.max(MIN_W, r.startWidth - dx);
            left = r.startLeft + (r.startWidth - newW);
            if(left < 0){ newW += left; left = 0; }
            width = newW;
        }
        // южная грань — высота
        if(r.dir.indexOf("s") !== -1){
            height = Math.max(MIN_H, r.startHeight + dy);
            height = Math.min(height, r.desk.height - top);
        }
        // северная грань — высота и top
        if(r.dir.indexOf("n") !== -1){
            var newH = Math.max(MIN_H, r.startHeight - dy);
            top = r.startTop + (r.startHeight - newH);
            if(top < 0){ newH += top; top = 0; }
            height = newH;
        }

        r.win.style.left   = left   + "px";
        r.win.style.top    = top    + "px";
        r.win.style.width  = width  + "px";
        r.win.style.height = height + "px";
        r.win.dataset.hasPos = "1";
    }

    function onResizeUp(){
        if(!activeResize) return;

        // сохраняем в localStorage
        try{
            var w = activeResize.win;
            localStorage.setItem("window_" + w.id.replace("win-",""), JSON.stringify({
                left: parseFloat(w.style.left) || 0,
                top:  parseFloat(w.style.top)  || 0,
                width: w.offsetWidth,
                height: w.offsetHeight
            }));
        }catch(err){}

        activeResize = null;
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeUp);
    }

});
/* ================= ПЕРЕТАСКИВАНИЕ ОКОН БЕЗ ПРЫЖКОВ (ФИНАЛЬНАЯ ВЕРСИЯ) =================
   Окна лежат внутри #deskArea, поэтому left/top считаются в той же системе координат.
   Двигаем по смещению курсора (delta) от стартовой позиции — без округлений и без прыжков. */
window.addEventListener("load", function(){

    // Убираем все старые обработчики с заголовков
    document.querySelectorAll(".win-head").forEach(function(head){
        head.parentNode.replaceChild(head.cloneNode(true), head);
    });

    // cloneNode стирает обработчики, поэтому кнопки «свернуть» и «закрыть» вешаем заново
    document.querySelectorAll(".win-head [data-min]").forEach(function(btn){
        btn.addEventListener("click", function(e){
            e.stopPropagation();
            e.preventDefault();
            minimizeWin(btn.dataset.min.replace("win-", ""));
        });
    });
    document.querySelectorAll(".win-head [data-close]").forEach(function(btn){
        btn.addEventListener("click", function(e){
            e.stopPropagation();
            e.preventDefault();
            closeWin(btn.dataset.close.replace("win-", ""));
        });
    });

    var area = $("deskArea");

    document.querySelectorAll(".win-head").forEach(function(head){
        head.addEventListener("mousedown", function(e){
            if(e.button !== undefined && e.button !== 0) return;
            if(e.target.closest("button")) return;

            var win = head.closest(".window");
            if(!win || !win.classList.contains("open")) return;

            win.style.zIndex = ++zTop;
            win.dataset.hasPos = "1";

            var startLeft = win.offsetLeft;
            var startTop  = win.offsetTop;
            var startX = e.clientX;
            var startY = e.clientY;

            e.preventDefault();

            function onMove(ev){
                var maxX = Math.max(0, area.clientWidth  - win.offsetWidth);
                var maxY = Math.max(0, area.clientHeight - win.offsetHeight);
                var x = Math.max(0, Math.min(maxX, startLeft + (ev.clientX - startX)));
                var y = Math.max(0, Math.min(maxY, startTop  + (ev.clientY - startY)));
                win.style.left = x + "px";
                win.style.top  = y + "px";
            }

            function onUp(){
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                saveWindowState(win.id.replace("win-", ""), win);
            }

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
    });
});
