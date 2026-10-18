'use strict';

function windowControlSvg(kind){
    var paths={min:'M5 12h14',max:'M5 5h14v14H5z',restore:'M9 5h10v10M5 9h10v10H5z',close:'m5 5 14 14M19 5 5 19'};
    return '<svg class="window-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[kind]+'"/></svg>';
}

function toggleWindowMaximize(id){
    var win=$('win-'+id),desk=getDeskRect();if(!win)return;
    var before=win.getBoundingClientRect();
    if(win._geometryAnimation)win._geometryAnimation.cancel();
    if(win._restoreGeometry){Object.assign(win.style,win._restoreGeometry);delete win._restoreGeometry;win.classList.remove('maximized');}
    else{win._restoreGeometry={left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height};Object.assign(win.style,{left:'0px',top:'0px',width:desk.width+'px',height:desk.height+'px'});win.classList.add('maximized');}
    clampWindow(win);focusWin(id);
    var after=win.getBoundingClientRect();
    if(win.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && after.width && after.height){
        win._geometryAnimation=win.animate([{transformOrigin:'0 0',transform:'translate('+(before.left-after.left)+'px,'+(before.top-after.top)+'px) scale('+(before.width/after.width)+','+(before.height/after.height)+')'},{transformOrigin:'0 0',transform:'none'}],{duration:340,easing:'cubic-bezier(.22,1,.36,1)'});
    }
    var button=win.querySelector('[data-max]');if(button){button.title=win._restoreGeometry?'Восстановить размер':'Развернуть';button.setAttribute('aria-label',button.title);button.innerHTML=windowControlSvg(win._restoreGeometry?'restore':'max');}
}
function arrangeConversationWindows(){
    if(innerWidth<1100)return;
    var desk=getDeskRect(),talk=$('win-chat'),market=$('win-market'),gap=24;
    var side=Math.min(440,Math.max(350,desk.width*.28));
    var height=Math.min(640,desk.height-32),left=(desk.width-side)/2,top=Math.max(16,(desk.height-height)/2);
    if(market.classList.contains('open') && !market._restoreGeometry){
        // Keep the user's smaller size and cap old, oversized saved windows.
        var width=Math.min(market.offsetWidth,850,desk.width-244-side-gap*2);
        var marketHeight=Math.min(market.offsetHeight,desk.height-32);
        var groupWidth=width+gap+side;
        var marketLeft=Math.min(Math.max(244,(desk.width-groupWidth)/2),desk.width-groupWidth-gap);
        top=Math.max(16,(desk.height-Math.max(height,marketHeight))/2);left=marketLeft+width+gap;
        Object.assign(market.style,{left:marketLeft+'px',top:top+'px',width:width+'px',height:marketHeight+'px'});market.dataset.hasPos='1';
        clampWindow(market);saveWindowState('market',market);
    }
    Object.assign(talk.style,{left:left+'px',top:top+'px',width:side+'px',height:height+'px'});talk.dataset.hasPos='1';
    clampWindow(talk);saveWindowState('chat',talk);
    $('marketAdvanced').hidden=true;$('filterToggle').setAttribute('aria-expanded','false');
}

function initDesktopVisuals(){
    // Keep the existing conversation and game handlers; present it as an OS window.
    $('deskArea').appendChild($('overlay'));
    $('win-market').appendChild($('win-market').querySelector('.hero'));
    document.querySelectorAll('.window .win-btns').forEach(function(row){
        var win=row.closest('.window'),button=document.createElement('button');button.type='button';button.className='max';button.dataset.max=win.id;button.title='Развернуть';button.setAttribute('aria-label','Развернуть');row.insertBefore(button,row.querySelector('.x'));
        row.querySelectorAll('button').forEach(function(control){control.type='button';control.setAttribute('aria-label',control.title);control.innerHTML=windowControlSvg(control.classList.contains('min')?'min':control.classList.contains('max')?'max':'close');});
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
