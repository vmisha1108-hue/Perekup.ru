'use strict';

function toggleWindowMaximize(id){
    var win=$('win-'+id),desk=getDeskRect();if(!win)return;
    if(win._restoreGeometry){Object.assign(win.style,win._restoreGeometry);delete win._restoreGeometry;win.classList.remove('maximized');}
    else{win._restoreGeometry={left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height};Object.assign(win.style,{left:'0px',top:'0px',width:desk.width+'px',height:desk.height+'px'});win.classList.add('maximized');}
    clampWindow(win);focusWin(id);
    var button=win.querySelector('[data-max]');if(button){button.title=win._restoreGeometry?'Восстановить размер':'Развернуть';button.setAttribute('aria-label',button.title);}
}
function arrangeConversationWindows(){
    if(innerWidth<1100)return;
    var desk=getDeskRect(),talk=$('win-chat'),market=$('win-market');
    var side=Math.min(440,Math.max(350,desk.width*.28)),left=244;
    var right=desk.width-side-24,height=Math.min(640,desk.height-70),top=Math.max(16,(desk.height-height)/2-20);
    Object.assign(talk.style,{left:right+'px',top:top+'px',width:side+'px',height:height+'px'});talk.dataset.hasPos='1';
    if(market.classList.contains('open') && !market._restoreGeometry){
        Object.assign(market.style,{left:left+'px',top:top+'px',width:(right-left-24)+'px',height:height+'px'});market.dataset.hasPos='1';
        saveWindowState('market',market);
    }
    clampWindow(talk);saveWindowState('chat',talk);
    $('marketAdvanced').hidden=true;$('filterToggle').setAttribute('aria-expanded','false');
}
function initDesktopVisuals(){
    // Keep the existing conversation and game handlers; present it as an OS window.
    $('deskArea').appendChild($('overlay'));
    $('win-market').appendChild($('win-market').querySelector('.hero'));
    document.querySelectorAll('.window .win-btns').forEach(function(row){
        var win=row.closest('.window'),button=document.createElement('button');button.type='button';button.className='max';button.dataset.max=win.id;button.title='Развернуть';button.setAttribute('aria-label','Развернуть');button.textContent='□';row.insertBefore(button,row.querySelector('.x'));
    });
    $('filterToggle').addEventListener('click',function(){var fields=$('marketAdvanced');fields.hidden=!fields.hidden;this.setAttribute('aria-expanded',String(!fields.hidden));});
    window.addEventListener('resize',function(){if($('overlay').classList.contains('open'))arrangeConversationWindows();});
    // The top bar groups clock/location/music with the balance, as in the mockups.
    var status=document.createElement('div');status.className='tb-status';
    var top=document.querySelector('.topbar');['clock','playerLocation','musicToggle','balance'].forEach(function(id){var item=$(id);status.appendChild(id==='playerLocation'||id==='balance'?item.parentElement:item);});top.appendChild(status);
    var location=$('playerLocation').parentElement;
    Array.from(location.childNodes).forEach(function(node){if(node.nodeType===3)node.textContent='';});location.insertAdjacentHTML('afterbegin',appIconSvg('location'));
    var wallet=$('balance').parentElement;
    Array.from(wallet.childNodes).forEach(function(node){if(node.nodeType===3 && node.textContent.indexOf('💰')!==-1)node.textContent='';});wallet.insertAdjacentHTML('afterbegin',appIconSvg('wallet'));
}
