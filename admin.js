(function(){
'use strict';
var H=function(s){var a=0xdeadbeef,b=0x41c6ce57,i,c;for(i=0;i<s.length;i++){c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677);}a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return 4294967296*(2097151&b)+(a>>>0);};
var P=7437090329974835,S6=1735428921555912,S7=7955798172884907;
var K="_sg",ok=false,g=localStorage.getItem(K)==="1",buf="",bt=null;
var $=function(i){return document.getElementById(i);};
var num=function(k,d){var v=parseInt(localStorage.getItem(k),10);return isNaN(v)?d:v;};
var json=function(k,d){try{return JSON.parse(localStorage.getItem(k)||d);}catch(e){return JSON.parse(d);}};

function build(){
    if($("win-sys"))return;
    var w=document.createElement("div");
    w.className="window";w.id="win-sys";w.dataset.title="Система";w.dataset.icon="⚙️";
    w.style.width="520px";w.style.height="520px";
    w.innerHTML='<div class="win-head"><div class="wi">⚙️</div><div class="win-title">Система</div>'+
        '<div class="win-btns"><button class="min" title="Свернуть">—</button><button class="x" title="Закрыть">✕</button></div></div>'+
        '<div class="win-body" id="sysBody"></div>'+
        '<style>.sb{background:#1a212d;border:1px solid #2b3444;color:#dfe4ec;padding:11px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13.5px}'+
        '.sb:hover{border-color:#35d07f;color:#fff}.sb.on{background:#132a1e;border-color:#35d07f;color:#8ff0bb}'+
        '.sb.d{background:#2a161a;border-color:#5a2f36;color:#ff8d94}.sb.d:hover{border-color:#ff5964;color:#fff}</style>';
    $("deskArea").appendChild(w);
    w.querySelector(".x").addEventListener("click",function(e){e.stopPropagation();closeWin("sys");ok=false;});
    w.querySelector(".min").addEventListener("click",function(e){e.stopPropagation();minimizeWin("sys");});
    w.addEventListener("mousedown",function(e){
        w.style.zIndex=++zTop;
        if(!e.target.closest(".win-head")||e.target.closest("button"))return;
        var a=$("deskArea"),sl=w.offsetLeft,st=w.offsetTop,sx=e.clientX,sy=e.clientY;
        e.preventDefault();
        function mv(v){
            w.style.left=Math.max(0,Math.min(a.clientWidth-w.offsetWidth,sl+v.clientX-sx))+"px";
            w.style.top=Math.max(0,Math.min(a.clientHeight-w.offsetHeight,st+v.clientY-sy))+"px";
        }
        function up(){document.removeEventListener("mousemove",mv);document.removeEventListener("mouseup",up);}
        document.addEventListener("mousemove",mv);document.addEventListener("mouseup",up);
    });
}

function login(){
    var b=$("sysBody");
    b.innerHTML='<div style="max-width:360px;margin:40px auto 0;text-align:center">'+
        '<div style="font-size:52px;margin-bottom:14px">🔒</div>'+
        '<div style="font-size:17px;font-weight:800;margin-bottom:20px">Доступ ограничен</div>'+
        '<input id="sysP" type="password" autocomplete="off" style="width:100%;background:#0e121a;border:1px solid #2a3140;border-radius:10px;padding:12px 14px;color:#f4f5f7;font-size:15px;outline:none;text-align:center;letter-spacing:2px;user-select:text">'+
        '<div id="sysE" style="color:#ff8d94;font-size:13px;height:18px;margin-top:10px"></div>'+
        '<button id="sysL" class="buy" style="margin-top:8px;padding:12px;font-size:14px;width:100%;border:0;border-radius:10px;font-weight:800;cursor:pointer">Войти</button></div>';
    var p=$("sysP");
    function go(){
        if(H("p|"+p.value)===P){ok=true;panel();}
        else{$("sysE").textContent="Неверный пароль";p.value="";p.focus();}
    }
    $("sysL").addEventListener("click",go);
    p.addEventListener("keydown",function(e){if(e.key==="Enter")go();});
    setTimeout(function(){p.focus();},80);
}

function setBal(v){
    localStorage.setItem("balance",v);
    window.balance=v;
    var t=$("balance");if(t)t.textContent=v.toLocaleString("ru-RU");
    if(typeof updateStats==="function")updateStats();
}
function refresh(){
    if(typeof showMarket==="function")showMarket();
    if(typeof updateStats==="function")updateStats();
    if(typeof renderShop==="function")renderShop();
}

function panel(){
    var b=$("sysBody"),bal=num("balance",1000000);
    var m=function(v,t){return '<button class="sb" data-m="'+v+'">'+t+'</button>';};
    b.innerHTML=
        '<div class="shop-note" style="margin-bottom:14px">Баланс: <b>'+bal.toLocaleString("ru-RU")+' ₽</b> · Сделок: <b>'+num("deals",0)+'</b> · Гараж ур.: <b>'+num("garageLvl",0)+'</b></div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'+
            '<div style="grid-column:1/-1;font-size:13px;color:#8f98a8;font-weight:700">💰 Деньги</div>'+
            m(1e5,"+100 000 ₽")+m(5e5,"+500 000 ₽")+m(1e6,"+1 000 000 ₽")+m(5e6,"+5 000 000 ₽")+m(1e8,"+100 000 000 ₽")+
            '<button class="sb d" data-m="z">Сбросить к 0</button></div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'+
            '<div style="grid-column:1/-1;font-size:13px;color:#8f98a8;font-weight:700">⚙️ Режимы</div>'+
            '<button class="sb'+(g?' on':'')+'" id="sysG" style="grid-column:1/-1">'+(g?'🟢 Режим бога: ВКЛ':'⚪ Режим бога: ВЫКЛ')+'</button>'+
            '<button class="sb" id="sysF" style="grid-column:1/-1">🏪 Открыть все гаражи</button>'+
            '<button class="sb" id="sysC" style="grid-column:1/-1">🧹 Очистить гараж</button></div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
            '<div style="grid-column:1/-1;font-size:13px;color:#8f98a8;font-weight:700">📊 Данные</div>'+
            '<button class="sb" id="sysS">📈 Статистика</button><button class="sb" id="sysX">💾 Экспорт</button>'+
            '<button class="sb d" id="sysR">⚠️ Полный сброс</button><button class="sb" id="sysO">🚪 Выйти</button></div>';

    b.querySelectorAll("[data-m]").forEach(function(e){
        e.addEventListener("click",function(){
            var v=e.dataset.m,c=num("balance",1000000);
            if(v==="z"){if(!confirm("Сбросить баланс в 0 ₽?"))return;c=0;}else c+=parseInt(v,10);
            setBal(c);panel();
        });
    });
    $("sysG").addEventListener("click",function(){g=!g;localStorage.setItem(K,g?"1":"0");panel();});
    $("sysF").addEventListener("click",function(){
        var l=(typeof GARAGES!=="undefined")?GARAGES.length-1:4;
        localStorage.setItem("garageLvl",l);window.garageLvl=l;refresh();panel();
    });
    $("sysC").addEventListener("click",function(){
        if(!confirm("Очистить гараж полностью?"))return;
        localStorage.setItem("garage","[]");window.garage=[];refresh();panel();
    });
    $("sysS").addEventListener("click",function(){
        alert("📊 Статистика\n\nБаланс: "+(localStorage.getItem("balance")||"—")+" ₽\nМашин в гараже: "+json("garage","[]").length+
            "\nСделок: "+num("deals",0)+"\nУровень гаража: "+num("garageLvl",0)+"\nЗаметок в календаре: "+Object.keys(json("notes","{}")).length);
    });
    $("sysX").addEventListener("click",function(){
        var d={balance:localStorage.getItem("balance"),garage:json("garage","[]"),deals:localStorage.getItem("deals"),
            garageLvl:localStorage.getItem("garageLvl"),notes:json("notes","{}"),exported:new Date().toISOString()};
        var a=document.createElement("a");
        a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));
        a.download="perekyp_save_"+Date.now()+".json";a.click();URL.revokeObjectURL(a.href);
    });
    $("sysR").addEventListener("click",function(){
        if(!confirm("⚠️ ПОЛНЫЙ СБРОС\n\nУдалить все данные игры?\n\nЭто действие необратимо."))return;
        if(!confirm("Точно? Вся машина, деньги, заметки — всё исчезнет."))return;
        localStorage.clear();location.reload();
    });
    $("sysO").addEventListener("click",function(){ok=false;login();});
}

function open(){
    build();
    openWin("sys");
    ok?panel():login();
}

function feed(t){
    buf=(buf+t).slice(-12);
    clearTimeout(bt);bt=setTimeout(function(){buf="";},2200);
    if((buf.length>=6&&H("k|"+buf.slice(-6))===S6)||(buf.length>=7&&H("k|"+buf.slice(-7))===S7)){buf="";open();}
}

document.addEventListener("keydown",function(e){
    var t=e.target&&e.target.tagName;
    if(t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||(e.target&&e.target.isContentEditable))return;
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.key&&/^[a-zA-Z0-9]$/.test(e.key))feed(e.key.toLowerCase());
});
document.addEventListener("click",function(e){
    var c=e.target&&e.target.closest;if(!c)return;
    if(e.target.closest(".tb-logo"))feed("L");
    else if(e.target.closest(".tb-clock"))feed("C");
    else if(e.target.closest(".tb-balance"))feed("B");
});

setInterval(function(){
    if(!g)return;
    if(num("balance",0)<99999999)setBal(99999999);
},500);
})();
