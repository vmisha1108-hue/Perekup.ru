/* ============================================================
   Perekyp.ru — Админ-панель (скрытая)
   Открытие: набрать "admin" | Ctrl+Shift+Alt+A | 5 тапов по лого
   Пароль: gsfh9856
   ============================================================ */
(function(){
    'use strict';

    var PASSWORD = "gsfh9856";

    /* ---------- Служебное состояние ---------- */
    var godMode = localStorage.getItem("admin_god") === "1";
    var loggedIn = false;
    var capture = "";        // накопление набранных букв
    var captureTimer = null;
    var logoTaps = 0;
    var logoTapTimer = null;

    /* ---------- Создаём окно панели, если его нет в HTML ---------- */
    function ensurePanel(){
        if(document.getElementById("win-admin")) return;

        var win = document.createElement("div");
        win.className = "window";
        win.id = "win-admin";
        win.dataset.title = "Система";
        win.dataset.icon = "⚙️";
        win.style.width = "520px";
        win.style.height = "520px";

        win.innerHTML =
            '<div class="win-head" id="head-admin">' +
                '<div class="wi">⚙️</div>' +
                '<div class="win-title">Система</div>' +
                '<div class="win-btns">' +
                    '<button class="min" data-min="win-admin" title="Свернуть">—</button>' +
                    '<button class="x" data-close="win-admin" title="Закрыть">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="win-body" id="adminBody"></div>';

        document.getElementById("deskArea").appendChild(win);
    }

    /* ---------- Проверка пароля ---------- */
    function renderLogin(){
        var body = document.getElementById("adminBody");
        if(!body) return;
        body.innerHTML =
            '<div style="max-width:360px;margin:40px auto 0;text-align:center">' +
                '<div style="font-size:52px;margin-bottom:14px">🔒</div>' +
                '<div style="font-size:17px;font-weight:800;margin-bottom:6px">Доступ ограничен</div>' +
                '<div style="font-size:13px;color:#8f98a8;margin-bottom:20px">Введите пароль администратора</div>' +
                '<input id="adminPass" type="password" placeholder="Пароль" ' +
                    'style="width:100%;background:#0e121a;border:1px solid #2a3140;border-radius:10px;' +
                    'padding:12px 14px;color:#f4f5f7;font-size:15px;outline:none;text-align:center;' +
                    'letter-spacing:2px;user-select:text">' +
                '<div id="adminErr" style="color:#ff8d94;font-size:13px;height:18px;margin-top:10px"></div>' +
                '<button id="adminLoginBtn" class="buy" style="margin-top:8px;padding:12px;font-size:14px;' +
                    'width:100%;border:0;border-radius:10px;font-weight:800;cursor:pointer">Войти</button>' +
            '</div>';

        var pass = document.getElementById("adminPass");
        var btn = document.getElementById("adminLoginBtn");
        var err = document.getElementById("adminErr");

        function tryLogin(){
            if(pass.value === PASSWORD){
                loggedIn = true;
                renderPanel();
            }else{
                err.textContent = "Неверный пароль";
                pass.value = "";
                pass.focus();
            }
        }
        btn.addEventListener("click", tryLogin);
        pass.addEventListener("keydown", function(e){
            if(e.key === "Enter") tryLogin();
        });
        setTimeout(function(){ pass.focus(); }, 80);
    }

    /* ---------- Основная панель ---------- */
    function renderPanel(){
        var body = document.getElementById("adminBody");
        if(!body) return;
        var bal = parseInt(localStorage.getItem("balance"), 10);
        if(isNaN(bal)) bal = 1000000;
        var deals = parseInt(localStorage.getItem("deals"), 10) || 0;
        var garageLvl = parseInt(localStorage.getItem("garageLvl"), 10) || 0;

        body.innerHTML =
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">' +
                '<div style="font-size:38px">🛠️</div>' +
                '<div>' +
                    '<div style="font-size:19px;font-weight:800">Панель администратора</div>' +
                    '<div style="font-size:12.5px;color:#8f98a8">Perekyp.ru · служебный доступ</div>' +
                '</div>' +
            '</div>' +

            '<div class="shop-note" style="margin-bottom:14px">' +
                'Баланс: <b id="admBal">' + bal.toLocaleString("ru-RU") + ' ₽</b> · ' +
                'Сделок: <b>' + deals + '</b> · ' +
                'Гараж ур.: <b>' + garageLvl + '</b>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
                '<div style="grid-column:1/-1;font-size:13px;color:#8f98a8;font-weight:700">💰 Деньги</div>' +
                '<button class="adm-btn" data-money="100000">+100 000 ₽</button>' +
                '<button class="adm-btn" data-money="500000">+500 000 ₽</button>' +
                '<button class="adm-btn" data-money="1000000">+1 000 000 ₽</button>' +
                '<button class="adm-btn" data-money="5000000">+5 000 000 ₽</button>' +
                '<button class="adm-btn" data-money="100000000">+100 000 000 ₽</button>' +
                '<button class="adm-btn danger" data-money="reset">Сбросить к 0</button>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
                '<div style="grid-column:1/-1;font-size:13px;color:#8f98a8;font-weight:700">⚙️ Режимы</div>' +
                '<button class="adm-btn ' + (godMode ? 'on' : '') + '" id="admGod" style="grid-column:1/-1">' +
                    (godMode ? '🟢 Режим бога: ВКЛ' : '⚪ Режим бога: ВЫКЛ') +
                '</button>' +
                '<button class="adm-btn" id="admFreeGarage" style="grid-column:1/-1">🏪 Открыть все гаражи</button>' +
                '<button class="adm-btn" id="admClearGarage" style="grid-column:1/-1">🧹 Очистить гараж</button>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
                '<div style="grid-column:1/-1;font-size:13px;color:#8f98a8;font-weight:700">📊 Данные</div>' +
                '<button class="adm-btn" id="admStats">📈 Статистика</button>' +
                '<button class="adm-btn" id="admExport">💾 Экспорт</button>' +
                '<button class="adm-btn danger" id="admResetAll">⚠️ Полный сброс</button>' +
                '<button class="adm-btn" id="admLogout">🚪 Выйти</button>' +
            '</div>' +

            '<style>' +
                '.adm-btn{background:#1a212d;border:1px solid #2b3444;color:#dfe4ec;' +
                'padding:11px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13.5px}' +
                '.adm-btn:hover{border-color:#35d07f;color:#fff}' +
                '.adm-btn.on{background:#132a1e;border-color:#35d07f;color:#8ff0bb}' +
                '.adm-btn.danger{background:#2a161a;border-color:#5a2f36;color:#ff8d94}' +
                '.adm-btn.danger:hover{border-color:#ff5964;color:#fff}' +
            '</style>';

        bindPanel();
    }

    function bindPanel(){
        var body = document.getElementById("adminBody");

        body.querySelectorAll("[data-money]").forEach(function(b){
            b.addEventListener("click", function(){
                var v = b.dataset.money;
                var cur = parseInt(localStorage.getItem("balance"), 10);
                if(isNaN(cur)) cur = 1000000;

                if(v === "reset"){
                    if(!confirm("Сбросить баланс в 0 ₽?")) return;
                    cur = 0;
                }else{
                    cur += parseInt(v, 10);
                }
                localStorage.setItem("balance", cur);
                if(typeof balance !== "undefined") window.balance = cur;
                applyBalance(cur);
                renderPanel();
            });
        });

        var god = document.getElementById("admGod");
        if(god){
            god.addEventListener("click", function(){
                godMode = !godMode;
                localStorage.setItem("admin_god", godMode ? "1" : "0");
                renderPanel();
            });
        }

        var fg = document.getElementById("admFreeGarage");
        if(fg){
            fg.addEventListener("click", function(){
                // Ставим максимальный уровень гаража (последний в списке)
                var lvl = 4;
                if(typeof GARAGES !== "undefined") lvl = GARAGES.length - 1;
                localStorage.setItem("garageLvl", lvl);
                if(typeof garageLvl !== "undefined") window.garageLvl = lvl;
                refreshUI();
                renderPanel();
            });
        }

        var cg = document.getElementById("admClearGarage");
        if(cg){
            cg.addEventListener("click", function(){
                if(!confirm("Очистить гараж полностью?")) return;
                localStorage.setItem("garage", "[]");
                if(typeof garage !== "undefined") window.garage = [];
                refreshUI();
                renderPanel();
            });
        }

        var st = document.getElementById("admStats");
        if(st){
            st.addEventListener("click", function(){
                var bal2 = localStorage.getItem("balance") || "—";
                var g = JSON.parse(localStorage.getItem("garage") || "[]");
                var d = localStorage.getItem("deals") || "0";
                var lvl = localStorage.getItem("garageLvl") || "0";
                var notes = JSON.parse(localStorage.getItem("notes") || "{}");
                alert(
                    "📊 Статистика\n\n" +
                    "Баланс: " + bal2 + " ₽\n" +
                    "Машин в гараже: " + g.length + "\n" +
                    "Сделок: " + d + "\n" +
                    "Уровень гаража: " + lvl + "\n" +
                    "Заметок в календаре: " + Object.keys(notes).length + "\n" +
                    "Режим бога: " + (godMode ? "ВКЛ" : "ВЫКЛ")
                );
            });
        }

        var ex = document.getElementById("admExport");
        if(ex){
            ex.addEventListener("click", function(){
                var data = {
                    balance: localStorage.getItem("balance"),
                    garage: JSON.parse(localStorage.getItem("garage") || "[]"),
                    deals: localStorage.getItem("deals"),
                    garageLvl: localStorage.getItem("garageLvl"),
                    notes: JSON.parse(localStorage.getItem("notes") || "{}"),
                    god: godMode,
                    exported: new Date().toISOString()
                };
                var blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
                var a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "perekyp_save_" + Date.now() + ".json";
                a.click();
                URL.revokeObjectURL(a.href);
            });
        }

        var ra = document.getElementById("admResetAll");
        if(ra){
            ra.addEventListener("click", function(){
                if(!confirm("⚠️ ПОЛНЫЙ СБРОС\n\nУдалить все данные игры?\n\nЭто действие необратимо.")) return;
                if(!confirm("Точно? Вся машина, деньги, заметки — всё исчезнет.")) return;
                localStorage.clear();
                location.reload();
            });
        }

        var lo = document.getElementById("admLogout");
        if(lo){
            lo.addEventListener("click", function(){
                loggedIn = false;
                renderLogin();
            });
        }
    }

    /* ---------- Синхронизация с основной игрой ---------- */
    function applyBalance(v){
        // Меняем баланс в основном скрипте и на верхней панели
        try{
            if(typeof window.balance !== "undefined") window.balance = v;
        }catch(e){}
        var tb = document.getElementById("balance");
        if(tb) tb.textContent = v.toLocaleString("ru-RU");
        // Пытаемся вызвать основную функцию, если она есть
        try{
            if(typeof updateStats === "function") updateStats();
        }catch(e){}
    }

    function refreshUI(){
        try{
            if(typeof showMarket === "function") showMarket();
        }catch(e){}
        try{
            if(typeof updateStats === "function") updateStats();
        }catch(e){}
        try{
            if(typeof renderShop === "function") renderShop();
        }catch(e){}
    }

    /* ---------- Открытие окна ---------- */
    function openAdmin(){
        ensurePanel();
        var w = document.getElementById("win-admin");
        if(!w) return;

        // Регистрируем в системе окон основной игры (если функция доступна)
        try{
            if(typeof openWin === "function"){
                // openWin ищет $("win-" + id) — id="admin"
                openWin("admin");
            }else{
                w.classList.add("open");
            }
        }catch(e){
            w.classList.add("open");
        }

        loggedIn ? renderPanel() : renderLogin();
    }

    /* ---------- Тайное открытие ---------- */
    // 1) Набор слова "admin"
    document.addEventListener("keydown", function(e){
        // Не перехватываем, когда пользователь пишет в поле ввода
        var tag = (e.target && e.target.tagName) || "";
        if(tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;

        // 2) Ctrl+Shift+Alt+A — всегда работает
        if(e.ctrlKey && e.shiftKey && e.altKey && (e.key === "A" || e.key === "a" || e.code === "KeyA")){
            e.preventDefault();
            openAdmin();
            return;
        }

        // 1) Накопление букв для слова "admin"
        var k = e.key ? e.key.toLowerCase() : "";
        if(/^[a-z]$/.test(k)){
            capture += k;
            if(capture.length > 8) capture = capture.slice(-8);
            if(capture.indexOf("admin") !== -1){
                capture = "";
                openAdmin();
            }
            clearTimeout(captureTimer);
            captureTimer = setTimeout(function(){ capture = ""; }, 1500);
        }
    });

    // 3) 5 тапов по логотипу
    document.addEventListener("click", function(e){
        var logo = e.target && e.target.closest && e.target.closest(".tb-logo");
        if(!logo) return;
        logoTaps++;
        clearTimeout(logoTapTimer);
        logoTapTimer = setTimeout(function(){ logoTaps = 0; }, 1800);
        if(logoTaps >= 5){
            logoTaps = 0;
            openAdmin();
        }
    });

    /* ---------- Режим бога: применяем эффекты ---------- */
    // Раз в 500 мс проверяем, включён ли режим — если да, корректируем баланс
    setInterval(function(){
        if(!godMode) return;
        try{
            var b = parseInt(localStorage.getItem("balance"), 10);
            if(!isNaN(b) && b < 99999999){
                localStorage.setItem("balance", 99999999);
                if(typeof window.balance !== "undefined") window.balance = 99999999;
                var tb = document.getElementById("balance");
                if(tb) tb.textContent = (99999999).toLocaleString("ru-RU");
                if(typeof updateStats === "function") updateStats();
            }
        }catch(e){}
    }, 500);

    /* ---------- Экспортируем функцию открытия (на всякий случай) ---------- */
    window.__openAdmin = openAdmin;

})();