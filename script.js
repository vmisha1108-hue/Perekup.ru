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
var START_BALANCE = 100000;
var balance = parseInt(localStorage.getItem("balance"),10);
if(isNaN(balance)) balance = START_BALANCE;
var garage = JSON.parse(localStorage.getItem("garage") || "[]");
var deals = parseInt(localStorage.getItem("deals"),10) || 0;
var garageLvl = parseInt(localStorage.getItem("garageLvl"),10) || 0;
var notes = JSON.parse(localStorage.getItem("notes") || "{}");
var purchasePrices = {};
var listings = {};
try{ purchasePrices = JSON.parse(localStorage.getItem("purchasePrices") || "{}") || {}; }catch(e){}
try{ listings = JSON.parse(localStorage.getItem("listings") || "{}") || {}; }catch(e){}
var saleCarId = null;
var meetingTimeEdited = false;
var firstVisit = !localStorage.getItem("helpPromptSeen") &&
    !["balance", "garage", "gameMs", "chats", "pending"].some(function(key){ return localStorage.getItem(key) !== null; });
var chat = null;
var view = "market";
var zTop = 100;
var openWindows = {};

/* память переписок: ключ "buy:<id машины>" или "sell:<id машины>" */
var chatStore = {};
try{ chatStore = JSON.parse(localStorage.getItem("chats") || "{}") || {}; }catch(e){ chatStore = {}; }
var dealsFilter = "ads";

/* Одна реальная секунда — игровая минута; активные «Часы» удваивают скорость. */
var GAME_SPEED = 60;
var CLOCK_GAME_SPEED = 120;
var currentGameSpeed = GAME_SPEED;
var activeAppId = null;
var gameMs = parseInt(localStorage.getItem("gameMs"), 10);
if(isNaN(gameMs) || gameMs <= 0) gameMs = Date.now();
var lastRealMs = Date.now();
var lastGameSave = 0;
var lastDayKey = "";
var lastClockStr = "";

/* ожидающие дела: объявления о продаже и назначенные встречи (живут независимо от окна чата) */
var BUYER_WAIT_MEAN = 3 * 3600000;  // случайные отклики: в среднем раз в три игровых часа
var BUYER_TIMING_VERSION = 2;
var MEET_GRACE  = 4 * 3600000;       // на встречу можно приехать в течение 4 игровых часов после назначенного
var BUYER_NO_SHOW_CHANCE = 0.15;    // часть покупателей не приезжает; исход сохраняется при назначении
var MEETING_WAIT_MIN = 5 * 60000, MEETING_WAIT_MAX = 15 * 60000;
var MEETING_INSPECTION_MIN = 5 * 60000, MEETING_INSPECTION_MAX = 10 * 60000;
var pending = [];
try{ pending = JSON.parse(localStorage.getItem("pending") || "[]") || []; }catch(e){ pending = []; }
pending = pending.filter(function(it){
    return it && it.id && it.type && carById(it.carId) && (!it.trade || carById(it.trade.carId));
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
    if(src.indexOf("img/") === 0) src += (src.indexOf("?") === -1 ? "?" : "&") + "v=20261008-plates";
    return '<img src="' + esc(src) + '" alt="' + esc(car.name) + '"' + (car.fictional ? ' class="custom-car-photo"' : '') + ' loading="lazy" ' +
           'onerror="this.outerHTML=\'🚗\'">';
}

function save(){
    localStorage.setItem("balance", balance);
    localStorage.setItem("garage", JSON.stringify(garage));
    localStorage.setItem("deals", deals);
    localStorage.setItem("garageLvl", garageLvl);
    localStorage.setItem("notes", JSON.stringify(notes));
    localStorage.setItem("pending", JSON.stringify(pending));
    localStorage.setItem("purchasePrices", JSON.stringify(purchasePrices));
    localStorage.setItem("listings", JSON.stringify(listings));
}
function currentGarage(){ return GARAGES[garageLvl]; }

function migrateStartingBalance(){
    if(localStorage.getItem("startingBalanceVersion") === "1") return;
    // Старый сброс выдавал миллион. Исправляем только пустую игру без сделок.
    if(balance === 1000000 && deals === 0 && garageLvl === 0 && !garage.length && !pending.length &&
        !Object.keys(listings).length && !Object.keys(chatStore).length){
        balance = START_BALANCE;
        localStorage.setItem("balance", String(balance));
    }
    localStorage.setItem("startingBalanceVersion", "1");
}

function updateStats(){
    var cap = currentGarage().cap;
    if($("balance")) $("balance").textContent = balance.toLocaleString("ru-RU");
    if($("garageCount")) $("garageCount").textContent = garage.length + " / " + cap;
    if($("garageValue")) $("garageValue").textContent = money(garage.reduce(function(s,id){
        var c = carById(id);
        return s + (c?(c.marketPrice || c.price):0);
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
    updateGameSpeed(id);
    saveWindowState(id, w);
    renderTaskbar();

    if(id === "shop"){ renderShop(); }
    if(id === "admin"){ renderAdmin(); }
}

function closeWin(id){
    if(id === "meeting"){ closeChat(); return; }
    var w = $("win-" + id);
    if(!w) return;
    w.classList.remove("open");
    delete openWindows[id];
    updateGameSpeed();
    renderTaskbar();
}

function minimizeWin(id){
    var w = $("win-" + id);
    if(!w) return;
    w.classList.remove("open");
    w.classList.add("minimized");
    updateGameSpeed();
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
    updateGameSpeed(id);
    renderTaskbar();
}

function focusWin(id){
    var w = $("win-" + id);
    if(!w) return;
    if(!w.classList.contains("open")) return;
    w.style.zIndex = ++zTop;
    updateGameSpeed(id);
    saveWindowState(id, w);
    renderTaskbar();
}

function renderTaskbar(){
    var list = $("taskList");
    if(!list) return;
    list.innerHTML = "";

    var apps = ICONS.map(function(i){ return {id:i.id, ico:i.ico, title:i.label.replace(/<br>/g, " ")}; });
    if(openWindows.admin) apps.push({id:"admin", ico:"⚙️", title:"Система"});
    if(openWindows.meeting) apps.push({id:"meeting", ico:"🤝", title:"Встреча"});

    apps.forEach(function(app){
        var w = $("win-" + app.id);
        var running = !!openWindows[app.id];
        var minimized = !!(w && w.classList.contains("minimized"));
        var btn = document.createElement("button");
        btn.className = "task-btn" + (running ? " running" : "") + (running && !minimized ? " active" : "");
        btn.title = app.title;
        btn.textContent = app.ico;

        btn.addEventListener("click", function(){
            if(!running){ openWin(app.id); return; }
            if(minimized){
                restoreWin(app.id);
            }else if(Number(w.style.zIndex) === zTop){
                minimizeWin(app.id);
            }else{
                focusWin(app.id);
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
    updateGameSpeed(id);
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
                updateGameSpeed(win.id.replace("win-", ""));
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
var filters = {q:"", sort:"default", min:"", max:"", mood:"all", afford:false, city:"", radius:"0"};
var marketLimit = 60;
try{
    var savedLocation = JSON.parse(localStorage.getItem("marketLocation") || "{}");
    if(CITY_BY_ID[savedLocation.city]) filters.city = savedLocation.city;
    if(["0","50","100","200","500","1000","2000","all"].indexOf(String(savedLocation.radius)) !== -1) filters.radius = String(savedLocation.radius);
}catch(e){}

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
    if(key === "distance") return distanceFromCity(car, filters.city);
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
            if(!locationMatches(car, filters.city, filters.radius)) return false;
            if(filters.mood !== "all" && car.seller.personality !== filters.mood) return false;
            if(filters.afford && !canAfford(car.price)) return false;
        }
        return true;
    });

    if(filters.sort !== "default" && (filters.sort !== "distance_asc" || (view === "market" && filters.city))){
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
function saveMarketLocation(){
    localStorage.setItem("marketLocation", JSON.stringify({city:filters.city, radius:filters.radius}));
}
function updateLocationControls(){
    var city = CITY_BY_ID[filters.city];
    $("fCity").value = city ? city.label : "";
    $("fRadius").value = filters.radius;
    $("fRadius").disabled = !city;
    var option = $("fSort").querySelector('option[value="distance_asc"]');
    if(option) option.disabled = !city || view !== "market";
}
function applyCityInput(){
    var label = $("fCity").value.trim(), city = cityFromLabel(label);
    if(label && !city) return false;
    var nextCity = city ? city.id : "";
    if(filters.city === nextCity){
        updateLocationControls();
        return true;
    }
    filters.city = nextCity;
    if(!city && filters.sort === "distance_asc"){
        filters.sort = "default";
        $("fSort").value = "default";
    }
    marketLimit = 60;
    saveMarketLocation();
    updateLocationControls();
    refreshList();
    return true;
}
function bindFilters(){
    if(!$("fSearch")) return;
    $("cityOptions").innerHTML = CITIES.slice().sort(function(a,b){ return a.label.localeCompare(b.label,"ru"); }).map(function(city){ return '<option value="' + esc(city.label) + '"></option>'; }).join("");
    updateLocationControls();
    $("fCity").addEventListener("input", applyCityInput);
    $("fCity").addEventListener("change", function(){
        if(!applyCityInput()){
            updateLocationControls();
            toast("Выберите город из списка.");
        }
    });
    $("fRadius").addEventListener("change", function(){ filters.radius = this.value; marketLimit = 60; saveMarketLocation(); refreshList(); });
    $("marketMore").addEventListener("click", function(){ marketLimit += 60; showMarket(); });
    $("fSearch").addEventListener("input", function(){ filters.q = this.value; marketLimit = 60; refreshList(); });
    $("fSort").addEventListener("change", function(){ filters.sort = this.value; marketLimit = 60; refreshList(); });
    $("fMin").addEventListener("input", function(){ filters.min = this.value; marketLimit = 60; refreshList(); });
    $("fMax").addEventListener("input", function(){ filters.max = this.value; marketLimit = 60; refreshList(); });
    $("fMood").addEventListener("change", function(){ filters.mood = this.value; marketLimit = 60; refreshList(); });
    $("fAfford").addEventListener("change", function(){ filters.afford = this.checked; marketLimit = 60; refreshList(); });
    $("fReset").addEventListener("click", function(){
        filters = {q:"", sort:"default", min:"", max:"", mood:"all", afford:false, city:"", radius:"0"};
        marketLimit = 60;
        $("fSearch").value = ""; $("fSort").value = "default";
        $("fMin").value = ""; $("fMax").value = "";
        $("fMood").value = "all"; $("fAfford").checked = false;
        saveMarketLocation();
        updateLocationControls();
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
    if($("fCity")) $("fCity").hidden = active !== "market";
    if($("fRadius")) $("fRadius").hidden = active !== "market";
    if($("marketMore")) $("marketMore").hidden = true;
    updateLocationControls();
}
function showMarket(){
    view = "market";
    setTabs("market");
    var shown = visibleCars(CARS);
    var pageCars = shown.slice(0, marketLimit);
    $("content").innerHTML = pageCars.map(function(car){
        var owned = garage.indexOf(car.id) !== -1;
        var p = PERSONALITY[car.seller.personality];
        return '<article class="card" data-info="' + car.id + '">' +
            '<div class="car-img">' + carImg(car) + '</div>' +
            '<div class="info">' +
                '<div class="name">' + esc(car.name) + '</div>' +
                '<div class="car-location">' + esc(carLocationText(car, filters.city)) + (car.legend ? ' · 🏁 Легенда' : '') + '</div>' +
                '<div class="meta">' + esc(shortDesc(car.desc, 60)) + '</div>' +
                '<div class="more">Подробнее ›</div>' +
                '<div class="seller">' + car.seller.avatar + ' ' + car.seller.name + ' · ' + p.label + '</div>' +
                '<div class="price">' + money(car.price) + '</div>' +
                buyBtn(car, owned) +
            '</div></article>';
    }).join("");
    if(!shown.length) $("content").innerHTML = noResults();
    updateResultCount(shown.length, CARS.length);
    if(pageCars.length < shown.length){
        $("fCount").textContent = "Найдено: " + shown.length + " из " + CARS.length + " · на экране " + pageCars.length;
        $("marketMore").hidden = false;
    }
    updateStats();
}
function showGarage(){
    view = "garage";
    setTabs("garage");
    garage = garage.filter(function(id){ return !!carById(id); });
    if(!garage.length){
        $("content").innerHTML = '<div class="empty" style="grid-column:1/-1">🏠<br><br>Гараж пока пуст.<br>Купи первый автомобиль.</div>';
        updateResultCount(0, 0);
        updateStats();
        return;
    }
    var mine = garage.map(carById);
    var shownG = visibleCars(mine);
    $("content").innerHTML = shownG.map(function(car){
        return '<article class="card" data-info="' + car.id + '">' +
            '<div class="car-img">' + carImg(car) + '</div>' +
            '<div class="info">' +
                '<div class="name">' + car.name + '</div>' +
                '<div class="meta">' + esc(shortDesc(car.desc, 60)) + '</div>' +
                '<div class="more">Подробнее ›</div>' +
                '<div class="seller">Рынок: ' + money(car.marketPrice || car.price) + '</div>' +
                '<div class="seller">Куплено за: ' + money(purchaseCost(car)) + '</div>' +
                (listings[car.id] ? '<div class="price">Продажа: ' + money(listings[car.id].price) + '</div>' : '') +
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
    var car = carById(id);
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
        ? '<div class="car-seller"><b>Рыночная цена:</b> ' + money(car.marketPrice || car.price) + '</div>'
        : '<div class="car-seller"><div class="ava">' + s.avatar + '</div>' +
            '<div><div class="car-seller-name">' + esc(s.name) + ' · ' + p.label + '</div>' +
            '<div class="car-seller-note">«' + esc(SELLER_NOTE[s.personality]) + '»</div></div></div>';

    var action;
    if(inGarage){
        action = sellBtn(car);
    }else{
        action = car.exchangeOnly && !owned ? '<button class="buy" data-trade-back>Вернуться к предложению</button>' : buyBtn(car, owned);
    }

    $("carModalImg").innerHTML = carImg(car);
    $("carModalBody").innerHTML =
        '<div class="car-title">' + esc(car.name) + '</div>' +
        '<div class="car-location">' + esc(carLocationText(car, filters.city)) + (car.fictional ? ' · Игровое объявление' : '') + '</div>' +
        '<div class="car-price">' + money(car.price) + '</div>' +
        '<div class="price-assessment"><span class="price-badge ' + priceAssessment(car).tone + '">' + priceAssessment(car).label + '</span>' +
        '<span>Оценка рынка: ' + money(car.marketPrice || car.price) + '</span></div>' +
        specHtml + fullHtml + who +
        '<div class="car-actions">' + action + '</div>';
    $("carOverlay").classList.add("open");
    updateGameSpeed("car");
}
function closeCarInfo(){
    $("carOverlay").classList.remove("open");
    updateGameSpeed();
}

/* ================= ЧАТ ================= */
/* ================= ПАМЯТЬ ПЕРЕПИСКИ ================= */
function chatKey(c){ return c.mode + ":" + c.car.id + (c.mode === "sell" && c.pid ? ":" + c.pid : ""); }
function persistChats(){ try{ localStorage.setItem("chats", JSON.stringify(chatStore)); }catch(e){} }
function saveChat(){
    if(!chat || chat.done) return;
    chatStore[chatKey(chat)] = {
        mode: chat.mode, carId: chat.car.id, npc: chat.npc, ask: chat.ask, bid: chat.bid,
        listingPrice: chat.listingPrice, maxBid: chat.maxBid, trade: chat.trade || null, referencePrice: chat.referencePrice,
        log: chat.log.slice(-80), last: chat.last, stage: chat.stage, price: chat.price,
        meet: chat.meet ? {whenMs: chat.meet.whenMs, label: chat.meet.label} : null,
        note: chat.note, busyUsed: chat.busyUsed, pid: chat.pid, met: chat.met, event: chat.event
    };
    persistChats();
    renderDealsTab();
}
function deleteChat(c){
    var k = chatKey(c);
    if(chatStore[k]){ delete chatStore[k]; persistChats(); renderDealsTab(); }
}
function deleteChatByPid(pid){
    var ch = false;
    Object.keys(chatStore).forEach(function(k){
        if(chatStore[k].pid === pid){ delete chatStore[k]; ch = true; }
    });
    if(ch) persistChats();
}
function restoreChat(sv){
    var car = carById(sv.carId);
    if(!car) return null;
    return {mode: sv.mode, car: car, npc: sv.npc, ask: sv.ask, bid: sv.bid, log: sv.log.slice(), last: sv.last || "",
            done: false, stage: sv.stage, price: sv.price, event: sv.event || null,
            meet: sv.meet ? {when: new Date(sv.meet.whenMs), whenMs: sv.meet.whenMs, label: sv.meet.label} : null,
            note: sv.note || null, met: !!sv.met, busyUsed: !!sv.busyUsed, pid: sv.pid || null,
            listingPrice: sv.listingPrice, maxBid: sv.maxBid, trade: sv.trade || null, referencePrice: sv.referencePrice || sv.ask};
}

function openBuyChat(carId){
    if(!canOpenChat()) return;
    var car = carById(carId);
    if(!car || car.exchangeOnly) return;
    if(garage.length >= currentGarage().cap){ alert("❌ Нет места! Расширь гараж."); return; }
    if(garage.indexOf(carId) !== -1) return;
    if(pendingFor(carId)) return;

    var sv = chatStore["buy:" + carId];
    if(sv && !sv.pid){
        var rc = restoreChat(sv);
        if(rc){ chat = rc; openOverlay(); return; }
    }

    var s = car.seller;
    var p = PERSONALITY[s.personality];
    var npc = {name:s.name, avatar:s.avatar, personality:s.personality,
               mood: clamp(p.mood + rnd(-8,8), 5, 95), greeted:false};
    var ask = car.price;
    chat = {mode:"buy", car:car, npc:npc, ask:ask, log:[], last:"", done:false, stage:"talk", price:null, event:null, meet:null, note:null, met:false, busyUsed:false, pid:null};
    chat.referencePrice = ask;

    var opening = {
        kind:   'Привет! Это ' + car.name + '. Состояние отличное, отдам за ' + money(ask) + '. Что скажешь? 🙂',
        neutral:'Здравствуйте. ' + car.name + ', цена — ' + money(ask) + '. Торг возможен.',
        evil:   car.name + '. ' + money(ask) + '. Деньги вперёд, торговаться не люблю.'
    }[s.personality];
    npcSay(opening);
    openOverlay();
}

function openSellChat(carId, ad){
    if(!canOpenChat()) return;
    var car = carById(carId);
    var b = ad ? ad.npc : pick(BUYERS);
    var p = PERSONALITY[b.personality];
    var npc = {name:b.name, avatar:b.avatar, personality:b.personality,
               mood: ad ? b.mood : clamp(p.mood + rnd(-8,8), 5, 95), greeted:false};
    var b0 = lerp(p.bMin, p.bMax, npc.mood/100);
    var bid = ad && Number.isFinite(ad.bid) ? ad.bid : Math.round(car.price * (1 + b0) * 0.88 / 500) * 500;
    chat = {mode:"sell", car:car, npc:npc, bid:bid, log:[], last:"", done:false, stage:"talk", price:null, event:null, meet:null, note:null, met:false, busyUsed:false, pid:null};

    chat.pid = ad ? ad.id : null;
    chat.trade = ad && ad.trade ? Object.assign({}, ad.trade) : null;
    chat.listingPrice = ad ? (ad.listingPrice || car.price) : car.price;
    chat.maxBid = ad ? (ad.maxBid || bid) : bid;
    var svs = ad ? (chatStore[chatKey(chat)] || chatStore["sell:" + carId]) : null;
    if(svs && svs.pid === ad.id){
        var rcs = restoreChat(svs);
        if(rcs){ chat = rcs; openOverlay(); return; }
    }
    var opening = {
        kind:   'Здравствуйте! Увидел объявление про ' + car.name + '. Готов дать ' + money(bid) + ' 🙂',
        neutral:'Добрый день. ' + car.name + ' ещё продаётся? Даю ' + money(bid) + '.',
        evil:   'Ну чё, ' + car.name + '? Больше ' + money(bid) + ' всё равно никто не даст.'
    }[b.personality];
    npcSay(opening);
    if(chat.trade) npcSay('Предлагаю обмен на ' + carById(chat.trade.carId).name + '. ' + tradeTerms(chat.trade, bid));
    sysSay("📢 Цена в объявлении: " + money(chat.listingPrice));
    openOverlay();
}

function canOpenChat(){
    if(chat && chat.met && !chat.done){
        openWin("meeting");
        toast("🤝 Сначала завершите текущую встречу или уезжайте с неё.");
        return false;
    }
    if(chat && chat.met) closeChat();
    return true;
}
function setMeetingDefaults(){
    var now = gameNow();
    $("meetDate").min = ymd(now);
    $("meetDate").value = ymd(now);
    $("meetTime").value = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
    meetingTimeEdited = false;
}
function openOverlay(){
    setMeetingDefaults();
    $("overlay").classList.add("open");
    updateGameSpeed("chat");
    $("msgInput").value = "";
    $("offerInput").value = "";
    renderChat();
    setTimeout(function(){ $("msgInput").focus(); }, 60);
}
function closeChat(){
    $("overlay").classList.remove("open");
    $("win-meeting").classList.remove("open", "minimized");
    delete openWindows.meeting;
    updateGameSpeed();
    renderTaskbar();
    if(chat && chat.pid){
        if(chat.met && !chat.done){
            toast("💤 Вы уехали со встречи: сделка сорвалась.");
            dropPending(chat.pid, true);
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
    if(chat.done) deleteChat(chat); else saveChat();
    if(chat.met){ renderMeeting(); return; }
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
            (chat.mode === "buy" ? ' · Баланс: ' + money(balance) : ' · Рынок: ' + money(chat.car.marketPrice || chat.car.price));
    }else{
        $("dealRow").innerHTML = chat.mode === "buy"
            ? 'Запрос продавца: <b>' + money(chat.ask) + '</b> · Баланс: ' + money(balance)
            : 'Предложение: <b>' + money(chat.bid) + '</b> · Рынок: ' + money(chat.car.price);
    }
    if(chat.trade) $("dealRow").innerHTML += tradePreview(chat.trade, chat.price == null ? chat.bid : chat.price);

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
    if(offer != null && /(тыс|\d\s*к(\s|$)|\d\s*k\b)/.test(t) && offer < 1000) offer *= 1000;

    return {
        offer: offer,
        greet  : /(привет|здравств|хай|добрый день|добрый вечер|доброе утро|салют|здарова)/.test(t),
        praise : /(красив|классн|отличн|крут|люблю|уважа|нравитс|супер|молодец|шикарн|легенд|топ)/.test(t),
        polite : /(пожалуйста|спасибо|благодар|будьте добры|извини|простите)/.test(t),
        rude   : /(дурак|тупой|идиот|дебил|отстой|дерьм|говно|плохой|обман|развод|лох|жмот|жадн|урод|заткнись)/.test(t),
        haggle : /(скидк|дешевл|торг|уступ|дорого|дороже|сбавь|снизь|сброс|уценк|сойдемся|реальн|адекватн|подвинь)/.test(t),
        agree  : /(согласен|согласна|беру|договорились|по рукам|идет|окей|\sок\s|давай)/.test(t),
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
    return Math.round((chat.referencePrice || chat.ask) * (1 - d));
}
function buyerLimit(){
    if(chat.listingPrice != null) return Math.max(chat.bid, chat.maxBid || chat.bid);
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

    if(intent.offer == null && intent.agree && !intent.haggle){
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

    if(offer < (chat.referencePrice || chat.ask) * 0.3){
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
    if(!Number.isSafeInteger(price) || price < 1){
        sysSay("❌ Некорректная цена сделки."); chat.done = true; return;
    }
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
    purchasePrices[chat.car.id] = price;
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

    if(price > Math.max(car.price * 2.5, (chat.listingPrice || car.price) * 1.5)){
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
    if(!Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(balance + price)){
        sysSay("❌ Сумма сделки выходит за допустимый диапазон."); chat.done = true; return;
    }
    if(garage.indexOf(chat.car.id) === -1){
        sysSay("❌ Этой машины уже нет в гараже.");
        chat.done = true;
        return;
    }
    balance += price;
    garage = garage.filter(function(x){ return x !== chat.car.id; });
    delete listings[chat.car.id];
    delete purchasePrices[chat.car.id];
    removeSaleOffers(chat.car.id);
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
    if(!Number.isSafeInteger(price) || price < 1){ sysSay("Укажите положительную цену в рублях."); return; }
    if(chat.trade && price < chat.trade.value && !canAfford(chat.trade.value - price)){
        sysSay('💸 Не хватает денег на доплату за обмен. Предложите больше за свою машину.'); return;
    }
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
    setMeetingDefaults();
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
    advanceGameTime(Date.now());
    if(!meetingTimeEdited) setMeetingDefaults();
    var ds = $("meetDate").value, ts = $("meetTime").value;
    if(!ds || !ts){ sysSay("📅 Выберите дату и время встречи."); renderChat(); return; }
    var when = new Date(ds + "T" + ts);
    if(isNaN(when.getTime())){ sysSay("📅 Не удалось разобрать дату."); renderChat(); return; }
    // Поля имеют точность до минуты: текущую минуту можно назначить «сейчас».
    var currentMinute = Math.floor(gameMs / 60000) * 60000;
    if(when.getTime() < currentMinute){ sysSay("📅 Это время уже прошло. Выберите другое."); renderChat(); return; }
    if(when.getTime() < gameMs) when = gameNow();

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
    if(chat.mode === "sell"){
        removeSaleOffers(chat.car.id);
        if(listings[chat.car.id]) listings[chat.car.id].nextBuyerAt = gameMs + nextBuyerDelay(listings[chat.car.id]);
    }
    chat.pid = newPid();
    pending.push({
        id: chat.pid, type: "meet", mode: chat.mode, carId: chat.car.id,
        npc: {name: chat.npc.name, avatar: chat.npc.avatar, personality: chat.npc.personality, mood: chat.npc.mood},
        price: chat.price, trade: chat.trade || null, when: chat.meet.whenMs, label: chat.meet.label, note: chat.note, reached: false,
        noShow: chat.mode === "sell" && !ADM.smoothMeet && Math.random() < BUYER_NO_SHOW_CHANCE,
        attendanceChecked: false
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
    if(chat.mode === "sell"){
        if(price <= 1) return null;
        fuel = Math.min(fuel, price - 1);
    }

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
    var cut = Math.min(price - 1, Math.max(1000, Math.round(price * lerp(0.01, 0.03, Math.random()) / 500) * 500));
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
    advanceGameTime(Date.now());
    if(!ADM.smoothMeet && chat.meet && gameMs < chat.meet.whenMs){
        sysSay("⏳ Ещё рано: встреча назначена на " + chat.meet.label + ".");
        renderChat();
        return;
    }
    chat.met = true;
    $("overlay").classList.remove("open");
    openWin("meeting");
    var meeting = chat.pid ? findPending(chat.pid) : null;
    if(!meeting) return;
    if(!meeting.flow){
        var arrivalAt = gameMs + rnd(MEETING_WAIT_MIN, MEETING_WAIT_MAX);
        meeting.flow = {stage:"waiting", startedAt:gameMs, arrivalAt:arrivalAt,
            inspectionUntil:arrivalAt + rnd(MEETING_INSPECTION_MIN, MEETING_INSPECTION_MAX), event:null};
        sysSay("🚗 Вы приехали на встречу: " + chat.car.name + ".");
        save();
    }
    chat.stage = meeting.flow.stage;
    chat.event = meeting.flow.event;
    renderChat();
    tickMeeting();
}

function meetingConfirmation(){
    if(chat.trade) return {sign:0, amount:0, confirmation:true, prompt:'Обе машины осмотрены. ' + tradeTerms(chat.trade, chat.price), yesLabel:'Подтвердить обмен'};
    return {sign:0, amount:0, confirmation:true,
        prompt:(chat.mode === "sell" ? "Клиент готов купить автомобиль" : "Осмотр завершён, автомобиль соответствует описанию") +
            " по согласованной цене: " + money(chat.price) + ".",
        yesLabel:(chat.mode === "sell" ? "Продать за " : "Купить за ") + money(chat.price)};
}
function tickMeeting(){
    if(!chat || !chat.met || chat.done) return;
    var meeting = findPending(chat.pid), flow = meeting && meeting.flow;
    if(!flow) return;
    var changed = false;
    if(flow.stage === "waiting" && gameMs >= flow.arrivalAt){
        meeting.attendanceChecked = true;
        if(chat.mode === "sell" && meeting.noShow && !ADM.smoothMeet){
            chat.event = null;
            chat.done = true;
            chat.stage = "done";
            chat.meetingOutcome = "no-show";
            chat.meetingEndStage = "waiting";
            chat.meetingResult = "Клиент не приехал. Автомобиль остаётся в гараже, деньги не изменились. Объявление снова принимает отклики.";
            sysSay(chat.meetingResult);
            renderChat();
            return;
        }
        flow.stage = "inspection";
        chat.stage = "inspection";
        sysSay(chat.mode === "sell" ? (chat.trade ? "Участники приехали и осматривают обе машины." : "Клиент приехал и осматривает автомобиль.") : "Продавец приехал. Вы осматриваете автомобиль.");
        changed = true;
    }
    if(flow.stage === "inspection" && gameMs >= flow.inspectionUntil){
        flow.event = rollEvent() || meetingConfirmation();
        flow.stage = "event";
        chat.stage = "event";
        chat.event = flow.event;
        sysSay("Осмотр завершён. Можно принять решение по цене.");
        changed = true;
    }
    if(changed){ save(); renderChat(); }
    else renderMeeting();
}

function renderMeeting(){
    if(!chat || !chat.met) return;
    var meeting = findPending(chat.pid), flow = meeting && meeting.flow;
    var stage = chat.done ? "done" : chat.stage;
    $("meetingTitle").textContent = "Встреча · " + chat.car.name;
    $("meetingPerson").textContent = chat.npc.avatar + " " + chat.npc.name +
        (chat.mode === "sell" ? " · Покупатель" : " · Продавец");
    $("meetingDeal").innerHTML = 'Согласованная цена: ' + money(chat.price) + (chat.trade ? tradePreview(chat.trade, chat.price) : '');
    if($("meetingCarImage").dataset.carId !== String(chat.car.id)){
        $("meetingCarImage").innerHTML = carImg(chat.car);
        $("meetingCarImage").dataset.carId = String(chat.car.id);
    }
    $("meetingCarName").textContent = chat.car.name;
    var active = stage === "waiting" || chat.meetingEndStage === "waiting" ? 0 : stage === "inspection" ? 1 : 2;
    $("meetingSteps").querySelectorAll("li").forEach(function(step, index){
        step.classList.toggle("current", index === active && !chat.done);
        step.classList.toggle("completed", index < active || chat.meetingOutcome === "success");
        if(index === active && !chat.done) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
    });
    var timed = stage === "waiting" || stage === "inspection";
    $("meetingTimer").hidden = !timed;
    $("stEvent").style.display = stage === "event" ? "block" : "none";
    $("meetingFinish").style.display = chat.done ? "" : "none";
    if(timed && flow){
        var start = stage === "waiting" ? flow.startedAt : flow.arrivalAt;
        var end = stage === "waiting" ? flow.arrivalAt : flow.inspectionUntil;
        $("meetingStatus").textContent = stage === "waiting" ? (chat.mode === "sell" ? "Ожидание клиента" : "Ожидание продавца") : "Осмотр автомобиля";
        $("meetingDescription").textContent = stage === "waiting" ? "Вы на месте. Дождитесь приезда второй стороны." :
            chat.trade ? "Вы проверяете обе машины: кузов, салон и двигатель. После осмотра подтвердите условия обмена." : chat.mode === "sell" ? "Клиент проверяет кузов, салон и двигатель. После осмотра он сообщит своё решение." :
                "Вы проверяете кузов, салон и двигатель перед покупкой.";
        $("meetingProgress").value = clamp((gameMs - start) / Math.max(1, end - start) * 100, 0, 100);
        $("meetingTimeLeft").textContent = "Осталось: " + fmtDur(end - gameMs) + " игрового времени";
    }else if(stage === "event" && chat.event){
        var ev = chat.event, lack = ev.sign > 0 && !canAfford(chat.price + ev.amount);
        $("meetingStatus").textContent = ev.confirmation ? "Осмотр завершён" : ev.sign < 0 ? "Клиент просит скидку" : "Продавец просит доплату";
        $("meetingDescription").textContent = "Примите предложение или выберите другое действие. Деньги и автомобиль передаются после вашего решения.";
        $("stEventText").textContent = ev.prompt;
        $("stEventNote").textContent = lack ? "Не хватает денег, чтобы согласиться." : "";
        $("evYes").textContent = ev.yesLabel;
        $("evYes").disabled = lack || !!(chat.trade && chat.trade.value > chat.price + ev.sign * ev.amount && !canAfford(chat.trade.value - chat.price - ev.sign * ev.amount));
        $("evNo").textContent = ev.confirmation ? "Отказаться от сделки" : "Оставить прежнюю цену";
    }else if(chat.done){
        $("meetingStatus").textContent = chat.meetingOutcome === "no-show" ? "Клиент не приехал" :
            chat.meetingOutcome === "success" ? "Сделка завершена" : "Встреча завершена";
        var result = chat.log.filter(function(message){ return message.who === "sys"; }).slice(-1)[0];
        $("meetingDescription").textContent = chat.meetingResult || (result ? result.text : "Встреча завершена.");
    }
}

function restoreActiveMeeting(){
    var meeting = pending.find(function(it){ return it.type === "meet" && it.flow; });
    if(meeting) openMeetChat(meeting.id);
}

function agreeEvent(){
    if(!chat || chat.done || chat.stage !== "event" || !chat.event) return;
    var ev = chat.event;
    var newPrice = chat.price + ev.sign * ev.amount;
    if((ev.sign > 0 && !canAfford(newPrice)) || (chat.trade && newPrice < chat.trade.value && !canAfford(chat.trade.value - newPrice))){ renderChat(); return; }
    meSay("Хорошо, согласен.");
    chat.price = newPrice;
    chat.event = null;
    completeDeal();
    renderChat();
}

function refuseEvent(){
    if(!chat || chat.done || chat.stage !== "event") return;
    if(chat.event && chat.event.confirmation){
        chat.event = null;
        chat.done = true;
        chat.stage = "done";
        chat.meetingOutcome = "cancelled";
        chat.meetingResult = "Вы отказались от сделки. Деньги и автомобиль остались у владельцев.";
        sysSay(chat.meetingResult);
        renderChat();
        return;
    }
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
    if(chat.trade) finishTrade(chat.price); else if(chat.mode === "buy") finishBuy(chat.price); else finishSell(chat.price);
    chat.stage = "done";
    var result = chat.log.filter(function(message){ return message.who === "sys"; }).slice(-1)[0];
    chat.meetingResult = result ? result.text : "Встреча завершена.";
    chat.meetingOutcome = result && result.text.indexOf("✅") === 0 ? "success" : "failed";
    updateStats();
}

/* ================= ОЖИДАЮЩИЕ ДЕЛА (ОБЪЯВЛЕНИЯ И ВСТРЕЧИ) ================= */
var pidSeq = 0;
function newPid(){ return "p" + Date.now().toString(36) + (++pidSeq).toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
function findPending(id){ return pending.find(function(x){ return x.id === id; }) || null; }
function pendingFor(carId){ return pending.find(function(x){ return x.carId === carId; }) || null; }
function carById(id){ return CARS.find(function(c){ return c.id === id; }) || TRADE_CARS.find(function(c){ return c.id === id; }) || null; }
function tradeTerms(trade, price){
    var difference = price - trade.value;
    return 'Оценка машины покупателя: ' + money(trade.value) + '. ' + (difference > 0 ? 'Покупатель доплатит ' + money(difference) : difference < 0 ? 'Ваша доплата: ' + money(-difference) : 'Обмен без доплаты');
}
function tradePreview(trade, price){
    var car = carById(trade.carId);
    if(!car) return '';
    return '<div class="trade-preview"><button class="trade-photo" data-trade-info="' + car.id + '" aria-label="Осмотреть ' + esc(car.name) + '">' + carImg(car) + '</button><div><b>🔁 ' + esc(car.name) + '</b><br>' + esc(car.desc) + '<br>' + esc(tradeTerms(trade, price)) + '<br><button class="trade-details" data-trade-info="' + car.id + '">Подробнее о машине</button></div></div>';
}
function finishTrade(price){
    var incoming = carById(chat.trade.carId), difference = price - chat.trade.value;
    var newBalance = balance + difference, index = garage.indexOf(chat.car.id);
    if(!incoming || index < 0 || garage.indexOf(incoming.id) !== -1 || !Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(newBalance) || newBalance < 0){
        sysSay('❌ Обмен невозможен: проверьте наличие машин и деньги на доплату.'); chat.done = true; return;
    }
    var cost = Math.max(1, purchaseCost(chat.car) - difference);
    balance = newBalance;
    garage[index] = incoming.id;
    delete purchasePrices[chat.car.id];
    purchasePrices[incoming.id] = cost;
    delete listings[chat.car.id];
    removeSaleOffers(chat.car.id);
    // Одна машина не может одновременно перейти от двух покупателей.
    pending.filter(function(it){ return it.type === 'ad' && it.trade && it.trade.carId === incoming.id; }).forEach(function(it){ dropPending(it.id); });
    deals++;
    save();
    sysSay('✅ Обмен: ' + chat.car.name + ' → ' + incoming.name + '. ' + tradeTerms(chat.trade, price));
    chat.done = true;
}
function isMeetReady(it){ return !!(ADM.smoothMeet || gameMs >= it.when); }

function dropPending(id, removeNote){
    deleteChatByPid(id);
    var it = findPending(id);
    if(!it) return;
    if(removeNote && it.note) removeCalNote(it.note);
    pending = pending.filter(function(x){ return x.id !== id; });
    if(it.type === "meet" && it.mode === "sell" && listings[it.carId]){
        listings[it.carId].nextBuyerAt = gameMs + nextBuyerDelay(listings[it.carId]);
    }
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
function toastDeals(text, filter){
    toast(text, function(){ dealsFilter = filter || "in"; openWin("market"); showDeals(); });
}

/* кнопки на карточках машин */
function buyBtn(car, owned){
    if(owned) return '<button class="buy" disabled>Уже в гараже</button>';
    if(pendingFor(car.id)) return '<button class="buy" disabled>📅 Встреча назначена</button>';
    return '<button class="buy" data-buy="' + car.id + '">💬 Написать</button>';
}
function sellBtn(car){
    var it = pendingFor(car.id);
    if(!it){
        return listings[car.id]
            ? '<button class="sell" data-sale-edit="' + car.id + '">📢 Изменить цену</button>'
            : '<button class="sell" data-sell="' + car.id + '">💰 Выставить на продажу</button>';
    }
    if(it.type === "ad"){
        if(it.ready) return '<button class="sell ready" data-ad-open="' + it.id + '">💬 Покупатель написал</button>';
        return '<button class="sell" disabled>⏳ Ждём покупателя…</button>';
    }
    return '<button class="sell" disabled>📅 Встреча назначена</button>';
}

function purchaseCost(car){
    return Number.isFinite(purchasePrices[car.id]) ? purchasePrices[car.id] : (car.basePrice || car.price);
}
function nextBuyerDelay(listing){
    var markup = listing.price - listing.purchasePrice;
    var factor = markup > 500000 ? Math.min(8, 3 + (markup - 500000) / 500000) : 1;
    // Экспоненциальное ожидание: возможны и тишина на несколько часов, и быстрые серии.
    var draw = Math.min(1 - Number.EPSILON, Math.max(0, Math.random()));
    return Math.max(60000, Math.round(-Math.log(1 - draw) * BUYER_WAIT_MEAN * factor));
}
function makeBuyerOffer(listing, arrivedAt){
    var b = pick(BUYERS.filter(function(b){ return b.name !== listing.lastBuyerName; }));
    var p = PERSONALITY[b.personality];
    var kind = Math.random(), price = listing.price;
    var bid = kind < 0.15 ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(price + 1, Math.round(price * (1.01 + Math.random() * 0.09))))
        : kind < 0.50 ? price : Math.max(1, Math.round(price * (0.75 + Math.random() * 0.20)));
    listing.lastBuyerName = b.name;
    var offered = null;
    if(kind >= 0.50 && kind < 0.75){
        var pool = TRADE_CARS.filter(function(car){
            return garage.indexOf(car.id) === -1 && car.id !== listing.carId &&
                car.marketPrice >= price * 0.30 && car.marketPrice <= price * 1.60 &&
                !pending.some(function(it){ return it.trade && it.trade.carId === car.id; });
        });
        if(pool.length){ var swap = pick(pool); offered = {carId:swap.id, value:swap.marketPrice}; }
    }
    return {
        id: newPid(), type: "ad", mode: "sell", carId: listing.carId,
        npc: {name: b.name, avatar: b.avatar, personality: b.personality, mood: clamp(p.mood + rnd(-8, 8), 5, 95)},
        listingPrice: price, bid: bid, trade: offered, maxBid: Math.min(Number.MAX_SAFE_INTEGER, Math.max(bid, Math.round(bid * 1.05))),
        readyAt: arrivedAt == null ? gameMs : arrivedAt, ready: true
    };
}
function removeSaleOffers(carId){
    pending.filter(function(it){ return it.type === "ad" && it.carId === carId; }).forEach(function(it){
        deleteChatByPid(it.id);
    });
    pending = pending.filter(function(it){ return it.type !== "ad" || it.carId !== carId; });
    Object.keys(chatStore).forEach(function(key){
        var sv = chatStore[key];
        if(sv.mode === "sell" && sv.carId === carId) delete chatStore[key];
    });
    persistChats();
}
function tickListings(){
    var changed = false;
    Object.keys(listings).forEach(function(key){
        var listing = listings[key], car = carById(Number(key));
        if(!car || garage.indexOf(car.id) === -1){ delete listings[key]; changed = true; return; }
        if(pending.some(function(it){ return it.carId === car.id && it.type === "meet"; })) return;
        if(gameMs < listing.nextBuyerAt) return;
        var offers = pending.filter(function(it){ return it.type === "ad" && it.carId === car.id; });
        while(offers.length < 3 && listing.nextBuyerAt <= gameMs){
            var arrivedAt = listing.nextBuyerAt;
            var offer = makeBuyerOffer(listing, arrivedAt);
            pending.push(offer);
            offers.push(offer);
            toastDeals("📩 " + offer.npc.name + (offer.trade ? " предлагает обмен, оценка вашей машины: " : " предлагает ") + money(offer.bid) + " за " + car.name + ".");
            listing.nextBuyerAt = arrivedAt + nextBuyerDelay(listing);
            changed = true;
        }
        if(listing.nextBuyerAt <= gameMs){
            listing.nextBuyerAt = gameMs + nextBuyerDelay(listing);
            changed = true;
        }
    });
    return changed;
}
function migrateSaleListings(){
    Object.keys(listings).forEach(function(key){
        var l = listings[key];
        if(!l || !Number.isFinite(l.price) || l.price <= 0 || !carById(Number(key))){ delete listings[key]; return; }
        if(l.buyerTimingVersion !== BUYER_TIMING_VERSION){
            l.nextBuyerAt = gameMs + nextBuyerDelay(l);
            l.buyerTimingVersion = BUYER_TIMING_VERSION;
        }
    });
    pending.filter(function(it){ return it.type === "ad" && it.mode === "sell"; }).forEach(function(it){
        var car = carById(it.carId);
        if(!listings[it.carId]){
            listings[it.carId] = {carId: it.carId, price: car.basePrice || car.price, purchasePrice: purchaseCost(car),
                buyerTimingVersion: BUYER_TIMING_VERSION};
            listings[it.carId].nextBuyerAt = gameMs + nextBuyerDelay(listings[it.carId]);
        }
        if(!Number.isFinite(it.bid)){
            it.bid = Math.round(listings[it.carId].price * 0.9);
            it.listingPrice = listings[it.carId].price;
            it.maxBid = Math.round(it.bid * 1.05);
        }
    });
    // Старые записи ожидания становятся объявлениями; сообщения создаются по новому расписанию.
    pending = pending.filter(function(it){ return it.type !== "ad" || it.ready; });
    save();
}
function openSaleForm(carId){
    var car = carById(carId);
    if(!car || garage.indexOf(carId) === -1) return;
    if(pending.some(function(it){ return it.carId === carId && it.type === "meet"; })){
        toast("📅 Сначала завершите назначенную встречу."); return;
    }
    saleCarId = carId;
    $("saleCarName").textContent = car.name;
    $("salePurchase").textContent = "Цена покупки: " + money(purchaseCost(car));
    $("salePrice").value = listings[carId] ? listings[carId].price : car.price;
    $("saleSubmit").textContent = listings[carId] ? "Сохранить цену" : "Разместить объявление";
    $("saleOverlay").classList.add("open");
    updateGameSpeed("sale");
    $("salePrice").focus();
}
function closeSaleForm(){
    $("saleOverlay").classList.remove("open");
    saleCarId = null;
    updateGameSpeed();
}
/* Объявление остаётся активным, пока машину не продадут или не снимут с продажи. */
function postAd(carId, price){
    var car = carById(carId);
    if(!car || garage.indexOf(carId) === -1) return false;
    price = Number(price);
    if(!Number.isSafeInteger(price) || price < 1){ toast("Укажите целую положительную цену в рублях."); return false; }
    if(pending.some(function(it){ return it.carId === carId && it.type === "meet"; })) return false;
    removeSaleOffers(carId);
    var listing = {carId: carId, price: price, purchasePrice: purchaseCost(car), buyerTimingVersion: BUYER_TIMING_VERSION};
    listing.nextBuyerAt = gameMs + (ADM.smoothMeet ? 0 : nextBuyerDelay(listing));
    listings[carId] = listing;
    save();
    toast("📢 Объявление: " + car.name + " за " + money(price) + ". Ждём покупателей.");
    refreshList();
    renderDealsTab();
    return true;
}
function cancelListing(carId){
    if(!listings[carId]) return;
    if(!confirm("Снять объявление и отклонить все предложения?")) return;
    removeSaleOffers(carId);
    delete listings[carId];
    save();
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
    toast("Предложение отклонено. Объявление остаётся активным.");
    refreshList();
    renderDealsTab();
}

/* встреча: восстанавливаем договорённость и открываем окно по приезде */
function openMeetChat(id, travel){
    if(!canOpenChat()) return;
    var it = findPending(id);
    var car = it ? carById(it.carId) : null;
    if(!it || it.type !== "meet" || !car) return;
    var npc = {name: it.npc.name, avatar: it.npc.avatar, personality: it.npc.personality, mood: it.npc.mood, greeted: true};
    chat = {mode: it.mode, car: car, npc: npc, ask: it.price, bid: it.price, log: [], last: "", done: false,
            stage: "go", price: it.price, event: null, trade: it.trade || null,
            meet: {when: new Date(it.when), whenMs: it.when, label: it.label},
            note: it.note, met: false, busyUsed: true, pid: it.id};
    var svm = chatStore[chatKey(chat)];
    if(svm && svm.pid === it.id && svm.log && svm.log.length){
        chat.log = svm.log.slice();
        chat.last = svm.last || "";
    }else{
        sysSay("🤝 Цена согласована: " + money(it.price));
        sysSay("📅 Встреча: " + it.label);
    }
    if(it.flow) goToMeeting();
    else{
        openOverlay();
        if(travel !== false) goToMeeting();
    }
}
function cancelMeet(id){
    if(!confirm("Отменить встречу? Сделка сорвётся.")) return;
    dropPending(id, true);
    if(chat && chat.pid === id){
        sysSay("💤 Встреча отменена: сделка сорвалась.");
        chat.done = true;
        chat.stage = "done";
        chat.pid = null;
        renderChat();
    }
    toast("Встреча отменена.");
    refreshList();
    renderDealsTab();
}

function dealAction(e){
    var t = e.target.closest("[data-ad-open],[data-ad-cancel],[data-meet-go],[data-meet-chat],[data-meet-cancel],[data-dtab],[data-chat-open],[data-chat-del],[data-sale-edit],[data-listing-cancel]");
    if(!t || t.disabled) return false;
    var d = t.dataset;
    if(d.adOpen){ closeCarInfo(); openAdChat(d.adOpen); }
    else if(d.saleEdit){ closeCarInfo(); openSaleForm(Number(d.saleEdit)); }
    else if(d.listingCancel){ cancelListing(Number(d.listingCancel)); }
    else if(d.adCancel){ cancelAd(d.adCancel); }
    else if(d.meetGo){ openMeetChat(d.meetGo); }
    else if(d.meetChat){ openMeetChat(d.meetChat, false); }
    else if(d.meetCancel){ cancelMeet(d.meetCancel); }
    else if(d.dtab){ dealsFilter = d.dtab; showDeals(); }
    else if(d.chatOpen){ closeCarInfo(); openBuyChat(parseInt(d.chatOpen, 10)); }
    else if(d.chatDel){
        if(confirm("Удалить переписку?")){
            delete chatStore[d.chatDel]; persistChats(); showDeals(); renderDealsTab();
        }
    }
    return true;
}

function renderDealsTab(){
    var t = $("tabDeals");
    if(!t) return;
    var attn = pending.filter(function(it){ return it.type === "ad" ? it.ready : gameMs >= it.when; }).length;
    var n = dealItems().length;
    t.textContent = "📋 Сделки" + (n ? " · " + n : "");
    t.classList.toggle("alert", attn > 0);
}

// Объявления отделены от переписок: входящие — покупатели, исходящие — продавцы.
function dealItems(){
    var items = [];
    Object.keys(listings).forEach(function(key){
        var listing = listings[key];
        items.push({dir:"ads", html:function(){ return listingCard(listing); }});
    });
    pending.forEach(function(it){
        if(it.type === "ad" && !it.ready) return;
        items.push({dir: it.mode === "sell" ? "in" : "out", html: function(){ return dealCard(it); }});
    });
    Object.keys(chatStore).forEach(function(k){
        var sv = chatStore[k];
        var car = sv ? carById(sv.carId) : null;
        if(!car || sv.mode !== "buy" || sv.pid) return;
        if(garage.indexOf(sv.carId) !== -1 || pendingFor(sv.carId)) return;
        items.push({dir: "out", html: function(){ return chatCard(k, sv, car); }});
    });
    return items;
}

function chatCard(key, sv, car){
    var n = sv.npc, last = "";
    for(var i = sv.log.length - 1; i >= 0; i--){
        if(sv.log[i].who !== "sys"){ last = sv.log[i].text; break; }
    }
    var body = '<div class="name">💬 ' + esc(car.name) + '</div>' +
        '<div class="meta">' + esc(n.avatar + " " + n.name) + ' · ' + esc(shortDesc(last, 60)) + '</div>' +
        '<div class="deal-status">' + (sv.price != null ? 'Цена согласована: ' + money(sv.price) : 'Переписка не закончена') + '</div>' +
        '<button class="buy" data-chat-open="' + car.id + '">💬 Продолжить</button>' +
        '<button class="deal-cancel" data-chat-del="' + esc(key) + '">Удалить переписку</button>';
    return '<article class="card"><div class="car-img">' + carImg(car) + '</div><div class="info">' + body + '</div></article>';
}

function listingCard(listing){
    var car = carById(listing.carId);
    if(!car) return "";
    var count = pending.filter(function(it){ return it.type === "ad" && it.carId === car.id && it.ready; }).length;
    var meeting = pending.some(function(it){ return it.type === "meet" && it.carId === car.id; });
    return '<article class="card"><div class="car-img">' + carImg(car) + '</div><div class="info">' +
        '<div class="name">📢 ' + esc(car.name) + '</div>' +
        '<div class="price">Цена объявления: ' + money(listing.price) + '</div>' +
        '<div class="deal-status">' + (meeting ? '📅 Встреча назначена · Отклики приостановлены' : count ? 'Предложений покупателей: ' + count : 'Ждём покупателей') + '</div>' +
        '<button class="buy" data-sale-edit="' + car.id + '"' + (meeting ? ' disabled' : '') + '>Изменить цену</button>' +
        '<button class="deal-cancel" data-listing-cancel="' + car.id + '"' + (meeting ? ' disabled' : '') + '>Снять с продажи</button>' +
        '</div></article>';
}
function dealCard(it){
    var car = carById(it.carId);
    if(!car) return "";
    var n = it.npc, body;
    if(it.type === "ad"){
        if(it.ready){
            body = '<div class="name">📩 ' + esc(n.avatar + " " + n.name) + ' пишет по объявлению</div>' +
                '<div class="meta">' + esc(car.name) + '</div>' +
                '<div class="price">' + (it.trade ? '🔁 Обмен · Ваша машина: ' : 'Предлагает: ') + money(it.bid || car.price) + '</div>' +
                (it.trade ? tradePreview(it.trade, it.bid) : '') +
                '<div class="deal-status ok">Покупатель ждёт ответа</div>' +
                '<button class="buy" data-ad-open="' + it.id + '">💬 Ответить</button>' +
                '<button class="deal-cancel" data-ad-cancel="' + it.id + '">Отклонить предложение</button>';
        }else{
            body = '<div class="name">📢 ' + esc(car.name) + '</div>' +
                '<div class="meta">Объявление размещено, покупатель пока не написал.</div>' +
                '<div class="deal-status">Ждём покупателя</div>' +
                '<button class="deal-cancel" data-ad-cancel="' + it.id + '">Отклонить предложение</button>';
        }
    }else{
        var ready = isMeetReady(it);
        var saved = chatStore[chatKey({mode:it.mode, car:car, pid:it.id})];
        var messages = saved && saved.log ? saved.log.filter(function(msg){ return msg.who !== "sys"; }) : [];
        var last = messages.length ? messages[messages.length - 1].text : "Встреча назначена";
        body = '<div class="name">💬 ' + esc(n.avatar + " " + n.name) + '</div>' +
            '<div class="meta">' + esc(car.name) + ' · ' + esc(shortDesc(last, 60)) + '</div>' +
            '<div class="meta">📅 ' + esc(it.label) + '</div>' +
            '<div class="price">' + money(it.price) + '</div>' +
            (ready
                ? '<div class="deal-status ok">Пора ехать! Успейте в течение ' + Math.round(MEET_GRACE / 3600000) + ' ч.</div>'
                : '<div class="deal-status">До встречи: <span data-until="' + it.when + '"></span></div>') +
            '<button class="buy" data-meet-chat="' + it.id + '">💬 Открыть переписку</button>' +
            '<button class="buy" data-meet-go="' + it.id + '" ' + (ready ? '' : 'disabled') + '>🚗 Поехать на встречу</button>' +
            '<button class="deal-cancel" data-meet-cancel="' + it.id + '">Отменить встречу</button>';
    }
    return '<article class="card"><div class="car-img">' + carImg(car) + '</div><div class="info">' + body + '</div></article>';
}

function showDeals(){
    view = "deals";
    setTabs("deals");
    var all = dealItems();
    if(["ads", "in", "out"].indexOf(dealsFilter) === -1) dealsFilter = "ads";
    var nAds = all.filter(function(d){ return d.dir === "ads"; }).length;
    var nIn = all.filter(function(d){ return d.dir === "in"; }).length;
    var nOut = all.filter(function(d){ return d.dir === "out"; }).length;
    var shown = all.filter(function(d){ return d.dir === dealsFilter; });
    var bar = '<div class="deal-tabs">' + [["ads", "📢 Объявления", nAds], ["in", "📥 Входящие", nIn], ["out", "📤 Исходящие", nOut]].map(function(t){
        return '<button class="dtab' + (dealsFilter === t[0] ? ' active' : '') + '" data-dtab="' + t[0] + '">' + t[1] + ' · ' + t[2] + '</button>';
    }).join("") + '</div>';
    var empty = {
        ads: 'Объявлений пока нет.<br>Выставите автомобиль из гаража на продажу.',
        "in": 'Входящих сообщений пока нет.<br>Покупатели напишут сюда по вашим объявлениям.',
        out: 'Исходящих сообщений пока нет.<br>Напишите продавцу на рынке — переписка появится здесь.'
    }[dealsFilter];
    $("content").innerHTML = bar + (shown.length
        ? shown.map(function(d){ return d.html(); }).join("")
        : '<div class="empty" style="grid-column:1/-1">📋<br><br>' + empty + '</div>');
    if($("fCount")) $("fCount").textContent = "";
    updateStats();
    updatePendingCountdowns();
}

// проверяется каждый тик игрового времени
function tickPending(){
    tickMeeting();
    var changed = tickListings();
    if(!pending.length){
        if(changed){ save(); refreshList(); renderDealsTab(); }
        return;
    }

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
                toastDeals("📩 " + it.npc.name + " предлагает " + money(it.bid || car.price) + " за " + cname + ".");
            }
        }else{
            if(!it.reached && gameMs >= it.when){
                it.reached = true;
                changed = true;
                toastDeals("🚗 Пора на встречу: " + cname + " (" + it.npc.name + ").", it.mode === "sell" ? "in" : "out");
                if(chat && chat.pid === it.id) renderChat();
            }
            if(gameMs > it.when + MEET_GRACE && !(chat && chat.pid === it.id && chat.met)){
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
    var e = calcExpr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/(^|[^\d.])0+(\d)/g,"$1$2");
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
    if(!wc || !wc.classList.contains("open") || wc.classList.contains("minimized") || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName)) return;
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

function canSleep(){
    var hour = gameNow().getHours();
    return (hour >= 22 || hour < 9) && !(chat && chat.met && !chat.done);
}
function sleepUntilMorning(){
    advanceGameTime(Date.now());
    if(!canSleep()){
        renderGameTime();
        toast(chat && chat.met && !chat.done ? "Сначала завершите встречу." : "Спать можно с 22:00 до 09:00.");
        return false;
    }
    var now = gameNow(), morning = new Date(now);
    if(now.getHours() >= 22) morning.setDate(morning.getDate() + 1);
    morning.setHours(9, 0, 0, 0);
    var existingMessages = pending.filter(function(it){ return it.type === "ad"; }).map(function(it){ return it.id; });
    // Дела продолжаются ночью: обрабатываем отклики и сроки встреч по ходу сна.
    while(gameMs < morning.getTime()){
        gameMs = Math.min(morning.getTime(), gameMs + 15 * 60000);
        tickPending();
    }
    lastRealMs = Date.now();
    renderGameTime();
    if(chat && chat.stage === "schedule" && !meetingTimeEdited) setMeetingDefaults();
    saveGameTime();
    save();
    refreshList();
    renderDealsTab();
    var count = pending.filter(function(it){ return it.type === "ad" && existingMessages.indexOf(it.id) === -1; }).length;
    toast(count ? "☀️ Вы проснулись в 09:00. Новых сообщений: " + count + "." : "☀️ Вы проснулись в 09:00. Новых сообщений нет.",
        count ? function(){ dealsFilter = "in"; openWin("market"); showDeals(); } : null);
    return true;
}

function closeWelcome(){
    $("welcomeOverlay").classList.remove("open");
    updateGameSpeed();
}
function offerFirstVisitHelp(){
    if(localStorage.getItem("helpPromptSeen")) return;
    localStorage.setItem("helpPromptSeen", "1");
    if(!firstVisit) return;
    $("welcomeOverlay").classList.add("open");
    updateGameSpeed("welcome");
    $("welcomeHelp").focus();
}

function advanceGameTime(now){
    var delta = now - lastRealMs;
    lastRealMs = now;
    if(delta < 0) delta = 0;
    if(delta > 120000) delta = 120000;
    gameMs += delta * currentGameSpeed;
}

function updateGameSpeed(focusedApp){
    // До переключения учитываем прошедший интервал с прежней скоростью.
    advanceGameTime(Date.now());
    if(focusedApp !== undefined) activeAppId = focusedApp;
    var clockWin = $("win-clock");
    var accelerated = activeAppId === "clock" && !document.hidden && clockWin &&
        clockWin.classList.contains("open") && !clockWin.classList.contains("minimized") &&
        !document.querySelector(".overlay.open");
    if(accelerated){
        document.querySelectorAll(".window.open").forEach(function(win){
            if(win !== clockWin && Number(win.style.zIndex) > Number(clockWin.style.zIndex)) accelerated = false;
        });
    }
    currentGameSpeed = accelerated ? CLOCK_GAME_SPEED : GAME_SPEED;
    renderGameTime();
}

function renderGameTime(){
    var d = gameNow();
    var hm = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    if($("sleepBtn")){
        $("sleepBtn").disabled = !canSleep();
        $("sleepStatus").textContent = chat && chat.met && !chat.done ? "Сначала завершите встречу." :
            canSleep() ? "Можно поспать до 09:00. Сообщения продолжат приходить." : "Сон доступен с 22:00 до 09:00.";
    }
    if($("clock")){
        $("clock").textContent = pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "  " + hm;
        $("clock").title = "Игровое время (×" + currentGameSpeed + ")";
    }

    // приложение «Часы»
    if($("clockBig")){
        var clockKey = ymd(d) + " " + hm;
        if(clockKey !== lastClockStr){
            lastClockStr = clockKey;
            var h = d.getHours(), m = d.getMinutes();
            $("clockBig").textContent = hm;
            $("clockDate").textContent = DOW_FULL[d.getDay()] + ", " + d.getDate() + " " +
                MONTHS_GEN[d.getMonth()] + " " + d.getFullYear();
            if($("hHand")) $("hHand").setAttribute("transform", "rotate(" + ((h % 12) * 30 + m * 0.5) + ")");
            if($("mHand")) $("mHand").setAttribute("transform", "rotate(" + (m * 6) + ")");
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
    advanceGameTime(now);
    renderGameTime();
    if(chat && chat.stage === "schedule" && !meetingTimeEdited) setMeetingDefaults();
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
    document.addEventListener("visibilitychange", function(){
        updateGameSpeed();
        if(document.hidden) saveGameTime();
    });
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
    updateGameSpeed("adminGate");
    setTimeout(function(){ $("gatePass").focus(); }, 40);
}
function closeAdminGate(){ $("adminGate").classList.remove("open"); updateGameSpeed(); }

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
    purchasePrices[id] = car.price;
    admMsg("✅ В гараж добавлено: " + car.name);
    admApply();
}
function admCarDel(id){
    if(garage.indexOf(id) === -1){ admMsg("ℹ️ Этой машины нет в гараже."); return; }
    garage = garage.filter(function(x){ return x !== id; });
    delete purchasePrices[id];
    delete listings[id];
    removeSaleOffers(id);
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
    balance = START_BALANCE; garage = []; deals = 0; garageLvl = 0; notes = {}; pending = [];
    purchasePrices = {}; listings = {}; chatStore = {};
    persistChats();
    if(chat) closeChat();
    closeSaleForm();
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
    $("sleepBtn").addEventListener("click", sleepUntilMorning);
    $("welcomeHelp").addEventListener("click", function(){ closeWelcome(); openWin("help"); });
    $("welcomeLater").addEventListener("click", closeWelcome);
    document.addEventListener("keydown", function(e){
        if(e.key === "Escape" && $("welcomeOverlay").classList.contains("open")) closeWelcome();
    });

    buildIcons();
    attachIconHandlers();

    document.querySelectorAll(".win-head").forEach(function(head){
        head.addEventListener("mousedown", function(e){
            if(e.target.closest(".win-btns")) return;
            if(e.target.closest("button")) return;
            var win = head.closest(".window");
            if(!win) return;
            startDrag(e, win.id.replace("win-", ""));
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
            minimizeWin(btn.dataset.min.replace("win-", ""));
        });
    });
    document.querySelectorAll("[data-close]").forEach(function(btn){
        btn.addEventListener("click", function(e){
            e.stopPropagation();
            e.preventDefault();
            closeWin(btn.dataset.close.replace("win-", ""));
        });
    });

    bindFilters();
    document.addEventListener('click', function(e){
        var info = e.target.closest('[data-trade-info]'), back = e.target.closest('[data-trade-back]');
        if(!info && !back) return;
        e.preventDefault(); e.stopPropagation();
        if(info) openCarInfo(Number(info.dataset.tradeInfo)); else closeCarInfo();
    }, true);
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
            openSaleForm(parseInt(sell.dataset.sell,10));
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
            openSaleForm(parseInt(sell.dataset.sell,10));
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
    $("saleForm").addEventListener("submit", function(e){
        e.preventDefault();
        if(postAd(saleCarId, $("salePrice").value)) closeSaleForm();
    });
    $("saleCancel").addEventListener("click", closeSaleForm);
    $("saleOverlay").addEventListener("mousedown", function(e){ if(e.target === this) closeSaleForm(); });
    document.addEventListener("keydown", function(e){
        if(e.key === "Escape" && $("saleOverlay").classList.contains("open")) closeSaleForm();
    });
    if($("meetingFinish")) $("meetingFinish").addEventListener("click", closeChat);
    if($("meetBtn")) $("meetBtn").addEventListener("click", scheduleMeeting);
    [$("meetDate"), $("meetTime")].forEach(function(input){
        input.addEventListener("input", function(){ meetingTimeEdited = true; });
        input.addEventListener("change", function(){ meetingTimeEdited = true; });
    });
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
    migrateStartingBalance();
    migrateSaleListings();
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
    restoreActiveMeeting();
    offerFirstVisitHelp();
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
        updateGameSpeed(win.id.replace("win-", ""));
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
            updateGameSpeed(win.id.replace("win-", ""));
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
