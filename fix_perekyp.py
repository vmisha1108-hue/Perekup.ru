#!/usr/bin/env python3
# Запуск: положи этот файл в папку проекта (рядом с script.js) и выполни: python fix_perekyp.py
# Перед правкой создаются копии *.bak. Скрипт можно запускать повторно: уже применённые правки пропускаются.
import os, re, shutil, sys

def patch(path, pairs):
    if not os.path.exists(path):
        print("НЕТ ФАЙЛА:", path); return
    with open(path, encoding="utf-8", newline="") as f:
        s = f.read()
    orig = s
    for name, old, new in pairs:
        if new in s:
            print("  уже применено:", name); continue
        if s.count(old) != 1:
            print("  НЕ НАЙДЕНО (пропуск):", name); continue
        s = s.replace(old, new); print("  ок:", name)
    if s != orig:
        shutil.copy(path, path + ".bak")
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(s)

print("script.js")
patch("script.js", [
    ("калькулятор не ловит ввод из полей",
     'if(!wc || !wc.classList.contains("open") || wc.classList.contains("minimized")) return;',
     'if(!wc || !wc.classList.contains("open") || wc.classList.contains("minimized")) return;\n'
     '    var tg = e.target && e.target.tagName;\n'
     '    if(tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;'),
    ("калькулятор: ведущие нули",
     'var e = calcExpr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");',
     'var e = calcExpr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");\n'
     '    e = e.replace(/(^|[^\\d.])0+(\\d)/g, "$1$2");'),
    ("«500к» -> 500 000",
     r'/(тыс|к\b|k\b)/.test(t)',
     r'/(тыс|\d\s*к(\s|$)|\d\s*k\b)/.test(t)'),
    ("«ок» без \\b",
     r'окей|\bок\b|давай)',
     r'окей|\sок\s|давай)'),
    ("«дороже» = торг",
     'дорого|сбавь',
     'дорого|дороже|сбавь'),
    ("«Давай дороже» не соглашается",
     'if(intent.offer == null && intent.agree){',
     'if(intent.offer == null && intent.agree && !intent.haggle){'),
])

print("admin.js")
patch("admin.js", [
    ("кнопки и перетаскивание окна админки",
     'document.getElementById("deskArea").appendChild(win);',
     '''document.getElementById("deskArea").appendChild(win);

        win.querySelector("[data-close]").addEventListener("click", function(e){
            e.stopPropagation(); closeWin("admin"); loggedIn = false;
        });
        win.querySelector("[data-min]").addEventListener("click", function(e){
            e.stopPropagation(); minimizeWin("admin");
        });
        win.addEventListener("mousedown", function(e){
            win.style.zIndex = ++zTop;
            if(!e.target.closest(".win-head") || e.target.closest("button")) return;
            var area = document.getElementById("deskArea");
            var sl = win.offsetLeft, st = win.offsetTop, sx = e.clientX, sy = e.clientY;
            e.preventDefault();
            function mv(ev){
                win.style.left = Math.max(0, Math.min(area.clientWidth  - win.offsetWidth,  sl + ev.clientX - sx)) + "px";
                win.style.top  = Math.max(0, Math.min(area.clientHeight - win.offsetHeight, st + ev.clientY - sy)) + "px";
            }
            function up(){
                document.removeEventListener("mousemove", mv);
                document.removeEventListener("mouseup", up);
            }
            document.addEventListener("mousemove", mv);
            document.addEventListener("mouseup", up);
        });'''),
])

print("index.html")
if os.path.exists("index.html"):
    with open("index.html", encoding="utf-8", newline="") as f:
        h = f.read()
    h2 = re.sub(r'[ \t]*<div class="resize-handle \w+"></div>\r?\n', "", h)
    if h2 != h:
        shutil.copy("index.html", "index.html.bak")
        with open("index.html", "w", encoding="utf-8", newline="") as f:
            f.write(h2)
        print("  ок: убраны пустые resize-handle")
    else:
        print("  уже применено / не найдено")
else:
    print("НЕТ ФАЙЛА: index.html")

print("Готово. Обнови страницу с Ctrl+F5.")
