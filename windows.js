'use strict';

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
    writeSaved("window_" + id, state);
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

    if(id === "travel"){ renderTravel(); }
    if(id === "garage"){ renderGarageApp(); }
    if(id === "shop"){ renderShop(); }
    if(id === "bank"){ renderBank(true); }
    if(id === "documents"){ renderDocuments(); }
    if(id === "settings"){ renderSettings(); }
    if(id === "calendar"){ renderCal(); }
    if(id === "admin"){ renderAdmin(); }
}

function closeWin(id){
    if(id === "meeting" || id === "chat"){ closeChat(); return; }
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
    if(id==='chat')$('overlay').classList.remove('open');
    updateGameSpeed();
    renderTaskbar();
}

function restoreWin(id){
    var w = $("win-" + id);
    if(!w) return;
    w.classList.remove("minimized");
    void w.offsetWidth;
    w.classList.add("open");
    if(id==='chat')$('overlay').classList.add('open');
    clampWindow(w);
    w.style.zIndex = ++zTop;
    updateGameSpeed(id);
    if(id === "travel") renderTravel();
    if(id === "garage") renderGarageApp();
    if(id === "documents") renderDocuments();
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


// Кнопки создаются один раз: фокус и обработчики остаются на месте.
function renderTaskbar(){
    var list=$("taskList");
    if(!list.children.length){
        ["market","help","calc","calendar","clock","settings"].forEach(function(id){
            var icon=ICONS.find(function(item){return item.id===id;}),button=document.createElement("button");
            button.type="button";button.dataset.app=id;button.title=icon.label;
            button.setAttribute("aria-label",icon.label);button.innerHTML='<span class="task-icon">'+appIconSvg(id)+'</span><span class="task-label">'+icon.label+'</span>';list.appendChild(button);
        });
    }
    Array.from(list.children).forEach(function(button){
        var id=button.dataset.app,win=$("win-"+id),running=!!openWindows[id];
        var className="task-btn"+(running?" running":"")+(running && !win.classList.contains("minimized")?" active":"");
        if(button.className!==className)button.className=className;
    });
}
function activateTaskbarApp(id){
    var win=$("win-"+id);
    if(!openWindows[id])openWin(id);
    else if(win.classList.contains("minimized"))restoreWin(id);
    else if(Number(win.style.zIndex)===zTop)minimizeWin(id);
    else focusWin(id);
}

// Один обработчик для перемещения и изменения размера вместо нескольких копий.
var windowGesture=null;
function windowEdge(win,event){
    var rect=win.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,edge=8;
    if(x < -edge || y < -edge || x > rect.width+edge || y > rect.height+edge)return "";
    return (y<edge?"n":y>rect.height-edge?"s":"")+(x<edge?"w":x>rect.width-edge?"e":"");
}
function windowCursor(direction){return direction?direction+"-resize":"";}
function startWindowGesture(event){
    if(event.button!==0)return;
    var win=event.target.closest(".window");
    if(!win || !win.classList.contains("open"))return;
    var id=win.id.replace("win-",""),button=event.target.closest("button"),direction=button?"":windowEdge(win,event);
    focusWin(id);
    if(button || (!direction && !event.target.closest(".win-head")))return;
    event.preventDefault();event.stopPropagation();win.dataset.hasPos="1";
    windowGesture={win:win,id:id,direction:direction,x:event.clientX,y:event.clientY,
        left:win.offsetLeft,top:win.offsetTop,width:win.offsetWidth,height:win.offsetHeight,desk:getDeskRect()};
    if(direction)document.body.style.cursor=windowCursor(direction);
}
function moveWindowGesture(event){
    var gesture=windowGesture;
    if(!gesture){
        var win=event.target.closest(".window");
        if(win && win.classList.contains("open"))win.style.cursor=event.target.closest("button")?"":windowCursor(windowEdge(win,event));
        else $("deskArea").style.cursor="";
        return;
    }
    event.preventDefault();
    var dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,dir=gesture.direction;
    var left=gesture.left,top=gesture.top,width=gesture.width,height=gesture.height,desk=gesture.desk;
    if(!dir){
        left=clamp(left+dx,0,Math.max(0,desk.width-width));
        top=clamp(top+dy,0,Math.max(0,desk.height-height));
    }else{
        var minWidth=Math.min(380,desk.width),minHeight=Math.min(280,desk.height);
        if(dir.indexOf("e")!==-1)width=Math.min(Math.max(minWidth,gesture.width+dx),desk.width-left);
        if(dir.indexOf("w")!==-1){
            width=Math.max(minWidth,gesture.width-dx);left=gesture.left+gesture.width-width;
            if(left<0){width+=left;left=0;}
        }
        if(dir.indexOf("s")!==-1)height=Math.min(Math.max(minHeight,gesture.height+dy),desk.height-top);
        if(dir.indexOf("n")!==-1){
            height=Math.max(minHeight,gesture.height-dy);top=gesture.top+gesture.height-height;
            if(top<0){height+=top;top=0;}
        }
        gesture.win.style.width=width+"px";gesture.win.style.height=height+"px";
    }
    gesture.win.style.left=left+"px";gesture.win.style.top=top+"px";
}
function finishWindowGesture(){
    if(!windowGesture)return;
    saveWindowState(windowGesture.id,windowGesture.win);windowGesture=null;document.body.style.cursor="";
}
function initWindowManager(){
    $("desktop").addEventListener("mousedown",startWindowGesture,true);
    document.addEventListener("mousemove",moveWindowGesture);
    document.addEventListener("mouseup",finishWindowGesture);
    $("desktop").addEventListener("click",function(event){
        var button=event.target.closest("[data-min],[data-close],[data-max],#taskList [data-app]");
        if(!button)return;
        event.preventDefault();event.stopPropagation();
        if(button.dataset.min)minimizeWin(button.dataset.min.replace("win-",""));
        else if(button.dataset.close)closeWin(button.dataset.close.replace("win-",""));
        else if(button.dataset.max)toggleWindowMaximize(button.dataset.max.replace('win-',''));
        else activateTaskbarApp(button.dataset.app);
    });
}
