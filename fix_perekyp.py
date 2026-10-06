#!/usr/bin/env python3
# Положи рядом с script.js и index.html, запусти: python fix_perekyp.py
# Правит существующий код на месте. Копии оригиналов: *.bak (если *.bak уже есть, правка начинается с него).
import os, re, shutil

def load(path):
    if not os.path.exists(path):
        print("НЕТ ФАЙЛА:", path); return None
    bak = path + ".bak"
    if os.path.exists(bak):
        shutil.copy(bak, path)
    else:
        shutil.copy(path, bak)
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()

def save(path, s):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(s)

def rep(s, name, old, new):
    if s.count(old) != 1:
        print("  НЕ НАЙДЕНО (пропуск):", name); return s
    print("  ок:", name); return s.replace(old, new)

def rx(s, name, pattern, new, flags=0):
    s2, n = re.subn(pattern, new, s, count=1, flags=flags)
    print(("  ок:" if n else "  НЕ НАЙДЕНО (пропуск):"), name)
    return s2

print("script.js")
s = load("script.js")
if s is not None:
    s = rep(s, "калькулятор не ловит ввод из полей",
        'if(!wc || !wc.classList.contains("open") || wc.classList.contains("minimized")) return;',
        'if(!wc || !wc.classList.contains("open") || wc.classList.contains("minimized") || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName)) return;')
    s = rep(s, "калькулятор: ведущие нули",
        'var e = calcExpr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");',
        'var e = calcExpr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/(^|[^\\d.])0+(\\d)/g,"$1$2");')
    s = rep(s, "«500к» -> 500 000", r'/(тыс|к\b|k\b)/.test(t)', r'/(тыс|\d\s*к(\s|$)|\d\s*k\b)/.test(t)')
    s = rep(s, "«ок» без \\b", r'окей|\bок\b|давай)', r'окей|\sок\s|давай)')
    s = rep(s, "«дороже» = торг", 'дорого|сбавь', 'дорого|дороже|сбавь')
    s = rep(s, "«Давай дороже» не соглашается",
        'if(intent.offer == null && intent.agree){',
        'if(intent.offer == null && intent.agree && !intent.haggle){')
    s = rep(s, "свернуть: верный id окна", 'minimizeWin(btn.dataset.min);', 'minimizeWin(btn.dataset.min.replace("win-", ""));')
    s = rep(s, "закрыть: верный id окна", 'closeWin(btn.dataset.close);', 'closeWin(btn.dataset.close.replace("win-", ""));')
    s = rx(s, "убран вызов attachResizeHandlers", r'^[ \t]*attachResizeHandlers\(\);[ \t]*\r?\n', '', re.M)
    s = rx(s, "убран дубль перетаскивания окон",
        r'/\* =+ ПРИНУДИТЕЛЬНОЕ ПЕРЕТАСКИВАНИЕ ОКОН \(ФИКС\) =+ \*/.*?(?=/\* =+ РЕСАЙЗ ОКОН ЗА ЛЮБУЮ ГРАНИЦУ)', '', re.S)
    save("script.js", s)

print("index.html")
h = load("index.html")
if h is not None:
    h = rx(h, "убраны пустые resize-handle", r'(?:[ \t]*<div class="resize-handle \w+"></div>\r?\n)+', '')
    h = re.sub(r'(?:[ \t]*<div class="resize-handle \w+"></div>\r?\n)+', '', h)
    save("index.html", h)

print("Готово. Обнови страницу: Ctrl+F5.")
