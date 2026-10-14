'use strict';

var OS_STYLES={
    windows:{label:'Windows',hint:'Оконный стиль',theme:'light',wallpapers:[{id:'ribbons',label:'Ленты'},{id:'aurora',label:'Сияние'}]},
    macos:{label:'macOS',hint:'Мягкий стиль',theme:'light',wallpapers:[{id:'valley',label:'Долины'},{id:'dawn',label:'Рассвет'}]},
    linux:{label:'Linux',hint:'Панельный стиль',theme:'dark',wallpapers:[{id:'facets',label:'Грани'},{id:'orbit',label:'Орбита'}]}
};
var appearance=readSaved('appearance',{}),settingsStrokes=[],settingsPointer=null;
function normalizeAppearance(value){
    var result={version:1,os:Object.prototype.hasOwnProperty.call(OS_STYLES,value.os)?value.os:'windows',themes:{},wallpapers:{}};
    Object.keys(OS_STYLES).forEach(function(os){
        var style=OS_STYLES[os],theme=value.themes && value.themes[os],wall=value.wallpapers && value.wallpapers[os];
        result.themes[os]=['light','dark'].indexOf(theme)!==-1?theme:style.theme;
        result.wallpapers[os]=style.wallpapers.some(function(item){return item.id===wall;})?wall:style.wallpapers[0].id;
    });
    return result;
}
appearance=normalizeAppearance(appearance);
function applyAppearance(){
    var root=document.documentElement;
    root.dataset.os=appearance.os;root.dataset.theme=appearance.themes[appearance.os];
    root.dataset.wallpaper=appearance.wallpapers[appearance.os];
    root.style.setProperty('--wallpaper-image','url("'+wallpaperPath(root.dataset.wallpaper)+'")');
}
applyAppearance();
function changeAppearance(kind,value){
    if(kind==='os' && Object.prototype.hasOwnProperty.call(OS_STYLES,value))appearance.os=value;
    else if(kind==='theme' && ['light','dark'].indexOf(value)!==-1)appearance.themes[appearance.os]=value;
    else if(kind==='wallpaper' && OS_STYLES[appearance.os].wallpapers.some(function(item){return item.id===value;}))appearance.wallpapers[appearance.os]=value;
    else return;
    applyAppearance();writeSaved('appearance',appearance);renderAppearanceControls();
    document.querySelectorAll('.window.open').forEach(clampWindow);
}
function renderAppearanceControls(){
    var os=appearance.os;
    document.querySelectorAll('[name="settingsOS"]').forEach(function(input){input.checked=input.value===os;});
    document.querySelectorAll('[name="settingsTheme"]').forEach(function(input){input.checked=input.value===appearance.themes[os];});
    var grid=$('settingsWallpapers');
    if(grid.dataset.os!==os){
        grid.dataset.os=os;
        grid.innerHTML=OS_STYLES[os].wallpapers.map(function(w){return '<label class="wallpaper-choice"><input type="radio" name="settingsWallpaper" value="'+w.id+'"><span class="wallpaper-swatch" style="background-image:url('+wallpaperPath(w.id)+')"></span><span>'+w.label+'</span></label>';}).join('');
    }
    grid.querySelectorAll('input').forEach(function(input){input.checked=input.value===appearance.wallpapers[os];});
}
function renderSettings(){
    if(!hasPlayerIdentity())return;
    $('settingsPlayerName').textContent=playerIdentity.nickname;
    $('settingsAvatar').textContent=Array.from(playerIdentity.nickname)[0].toUpperCase();
    $('settingsNickname').value=playerIdentity.nickname;
    $('settingsSignaturePreview').innerHTML=signatureHtml(playerIdentity.signature,'Ваша текущая подпись');
    renderAppearanceControls();
}
function editPlayerIdentity(nickname,signature){
    nickname=String(nickname).trim().replace(/\s+/g,' ');
    if(!hasPlayerIdentity() || !validNickname(nickname))return 'Ник должен содержать от 2 до 32 символов.';
    if(!validSignature(signature))return 'Нарисуйте подпись — одного нажатия недостаточно.';
    var identity={version:1,nickname:nickname,signature:JSON.parse(JSON.stringify(signature))};
    try{writeSaved('playerIdentity',identity);}catch(e){return 'Не удалось сохранить профиль. Проверьте хранилище браузера.';}
    playerIdentity=identity;
    // The profile may share an object with a signed contract. Replace it,
    // so historic signatures and names remain exactly as originally signed.
    contractBook.profile=Object.assign({},contractBook.profile,{fullName:nickname,signature:JSON.parse(JSON.stringify(identity.signature))});
    pending.forEach(function(item){if(item.contract){item.contract.fields.fullName=nickname;item.contract.fields.signature=nickname;item.contract.acknowledged=false;}});
    saveContracts();save();renderSettings();
    if(chat && chat.stage==='contract')renderContractForm(true);
    return '';
}
function redrawSettingsSignature(){
    var canvas=$('settingsSignatureCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#173c63';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';
    settingsStrokes.forEach(function(line){ctx.beginPath();line.forEach(function(p,i){if(i)ctx.lineTo(p[0]*640,p[1]*240);else ctx.moveTo(p[0]*640,p[1]*240);});ctx.stroke();});
}
function finishSignatureEditing(){
    var canvas=$('settingsSignatureCanvas');
    if(settingsPointer!==null && canvas.hasPointerCapture(settingsPointer))canvas.releasePointerCapture(settingsPointer);
    settingsPointer=null;settingsStrokes=[];redrawSettingsSignature();$('settingsSignatureEditor').hidden=true;$('settingsSignatureError').textContent='';
}
function initSettings(){
    $('settingsAppearance').addEventListener('change',function(event){
        var input=event.target;if(input.name==='settingsOS')changeAppearance('os',input.value);
        if(input.name==='settingsTheme')changeAppearance('theme',input.value);
        if(input.name==='settingsWallpaper')changeAppearance('wallpaper',input.value);
    });
    $('settingsNicknameForm').addEventListener('submit',function(event){
        event.preventDefault();var error=editPlayerIdentity($('settingsNickname').value,playerIdentity.signature);$('settingsNicknameError').textContent=error;
        if(!error)toast('Ник сохранён. Подписанные договоры сохранили прежние данные.');
    });
    $('settingsEditSignature').addEventListener('click',function(){finishSignatureEditing();$('settingsSignatureEditor').hidden=false;});
    var canvas=$('settingsSignatureCanvas');
    function point(event){var r=canvas.getBoundingClientRect();return [clamp((event.clientX-r.left)/r.width,0,1),clamp((event.clientY-r.top)/r.height,0,1)];}
    canvas.addEventListener('pointerdown',function(event){
        if(settingsPointer!==null || (event.pointerType==='mouse' && event.button!==0) || settingsStrokes.length>=50)return;
        event.preventDefault();settingsPointer=event.pointerId;canvas.setPointerCapture(event.pointerId);settingsStrokes.push([point(event)]);$('settingsSignatureError').textContent='';
    });
    canvas.addEventListener('pointermove',function(event){
        if(event.pointerId!==settingsPointer)return;event.preventDefault();var line=settingsStrokes[settingsStrokes.length-1];if(line.length<2500)line.push(point(event));redrawSettingsSignature();
    });
    function end(event){if(event.pointerId!==settingsPointer)return;settingsPointer=null;settingsStrokes=settingsStrokes.filter(function(line){return line.length>=2;});redrawSettingsSignature();}
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
    $('settingsClearSignature').addEventListener('click',function(){if(settingsPointer!==null && canvas.hasPointerCapture(settingsPointer))canvas.releasePointerCapture(settingsPointer);settingsPointer=null;settingsStrokes=[];redrawSettingsSignature();$('settingsSignatureError').textContent='';});
    $('settingsCancelSignature').addEventListener('click',finishSignatureEditing);
    $('settingsSignatureForm').addEventListener('submit',function(event){
        event.preventDefault();var error=editPlayerIdentity(playerIdentity.nickname,settingsStrokes);$('settingsSignatureError').textContent=error;
        if(!error){finishSignatureEditing();toast('Новая подпись сохранена для следующих договоров.');}
    });
    $('settingsSaveSignature').addEventListener('pointerup',function(event){if(event.pointerType==='touch'){event.preventDefault();$('settingsSignatureForm').requestSubmit();}});
    $('settingsReset').addEventListener('click',function(){
        if(!confirm('Сбросить игровой прогресс? Деньги, машины, долги, встречи и договоры будут удалены. Ник, подпись, оформление и музыка сохранятся.'))return;
        resetGameProgress(true);finishSignatureEditing();renderSettings();toast('Прогресс сброшен. Вы начинаете со 100 000 ₽.');
    });
    // Use one original icon family across all three desktop styles.
    document.querySelectorAll('.window .wi').forEach(function(el){var id=el.closest('.window').id.replace('win-','');if(APP_ICON_PATHS[id] || APP_ICON_ART[id]){el.dataset.app=id;el.innerHTML=appIconSvg(id);}});
    renderSettings();
}

// Small interface symbols keep their outline style; application artwork is layered and filled.
var APP_ICON_PATHS={
    chat:'<path d="M3 3h18v13H9l-6 5z"/>',
    profile:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    location:'<path d="M19 9c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 14 0z"/><circle cx="12" cy="9" r="2"/>',
    wallet:'<path d="M3 5h17v16H3zM3 5l15-3v3m-4 6h7v5h-7z"/>'
};
var GARAGE_ICON_ART='<path fill="#547088" d="m4 17 20-11 20 11v27H4z"/><path fill="url(#app-paper)" d="M7 16h34v26H7z"/><path fill="#bbc9d4" d="M37 16h4v26h-4z"/><path fill="#fff" d="M1 16 24 3l23 13-2 4L24 8 3 20z"/><path fill="#9db2c4" d="m3 20 21-12 21 12v2L24 11 3 23z"/><path fill="url(#app-metal)" d="M13 24h22v18H13z"/><path stroke="#8c9fae" stroke-width="1.5" d="M15 28h18m-18 4h18m-18 4h18"/><path fill="#c6d3dc" d="M20 38h8v2h-8z"/><path fill="#889daa" d="M4 42h40v3H4z"/>';
var APP_ICON_ART={
    market:'<path fill="#fff" d="m9 20 4-11a4 4 0 0 1 4-3h14a4 4 0 0 1 4 3l4 11 4 5v12H5V25z"/><path fill="var(--icon-color,#ff6254)" d="m13 19 3-10h16l3 10z"/><path fill="#fff" d="M3 18h6v4H3zm36 0h6v4h-6z"/><rect fill="url(#app-paper)" x="5" y="33" width="8" height="10" rx="3"/><rect fill="url(#app-paper)" x="35" y="33" width="8" height="10" rx="3"/><rect fill="var(--icon-color,#ff6254)" x="9" y="26" width="8" height="5" rx="2.5"/><rect fill="var(--icon-color,#ff6254)" x="31" y="26" width="8" height="5" rx="2.5"/><path stroke="#dce5eb" stroke-width="2" d="M18 34h12"/>',
    shop:GARAGE_ICON_ART,
    garage:GARAGE_ICON_ART,
    calc:'<rect fill="#bacddd" x="9" y="4" width="30" height="42" rx="4"/><rect fill="url(#app-paper)" x="8" y="3" width="30" height="41" rx="4"/><rect fill="#377ba9" x="12" y="8" width="22" height="9" rx="1"/><path fill="#4489b3" d="M13 9h20v2H13z"/><g fill="#4684ae"><rect x="12" y="21" width="5" height="5" rx=".7"/><rect x="20.5" y="21" width="5" height="5" rx=".7"/><rect x="29" y="21" width="5" height="5" rx=".7"/><rect x="12" y="29" width="5" height="5" rx=".7"/><rect x="20.5" y="29" width="5" height="5" rx=".7"/><rect x="29" y="29" width="5" height="13" rx=".7"/><rect x="12" y="37" width="5" height="5" rx=".7"/><rect x="20.5" y="37" width="5" height="5" rx=".7"/></g>',
    calendar:'<rect fill="#b93836" x="3" y="11" width="42" height="34" rx="5"/><rect fill="url(#app-paper)" x="3" y="10" width="42" height="33" rx="4"/><path fill="#fff" d="M3 14a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v5H3z"/><g fill="#fff"><rect x="11" y="2" width="3" height="11" rx="1.5"/><rect x="34" y="2" width="3" height="11" rx="1.5"/></g><path fill="#233449" d="m12 23 5-3h3v19h-4V25l-4 2zm14-3h12v4h-8v4c8-2 12 3 9 8-2 5-10 4-13 2l1-4c6 4 11-2 6-3-2-1-4 0-6 1z"/>',
    clock:'<circle fill="#bfd1df" cx="25" cy="25" r="23"/><circle fill="url(#app-paper)" cx="24" cy="23" r="22"/><g stroke="#526575" stroke-width="1.5" stroke-linecap="round"><path d="M24 5v2m0 32v2M6 23h2m32 0h2M15 7.4l1 1.7m16 27.8 1 1.7M8.4 14l1.7 1m27.8 16 1.7 1M8.4 32l1.7-1m27.8-16 1.7-1M15 38.6l1-1.7m16-27.8 1-1.7"/></g><path stroke="#283e51" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M24 11v13l10 7"/><circle fill="#283e51" cx="24" cy="24" r="2.2"/>',
    bank:'<path fill="#278657" d="M3 42h42v4H3z"/><path fill="#fff" d="m2 14 22-12 22 12z"/><path fill="#d7e8dd" d="M4 14h40v4H4z"/><circle fill="#469b70" cx="24" cy="10" r="2.7"/><path fill="url(#app-paper)" d="M8 18h6v20H8zm13 0h6v20h-6zm13 0h6v20h-6z"/><path fill="#c4dcd0" d="M11 19h3v17h-3zm13 0h3v17h-3zm13 0h3v17h-3z"/><path fill="#fff" d="M6 18h10v3H6zm13 0h10v3H19zm13 0h10v3H32zM6 36h10v3H6zm13 0h10v3H19zm13 0h10v3H32zM5 39h38v3H5z"/><path fill="#d7e8dd" d="M2 42h44v3H2z"/>',
    travel:'<rect fill="url(#app-paper)" x="1" y="7" width="31" height="29" rx="2.5"/><path fill="#d8ece1" d="M1 33h31v3H1z"/><path fill="#fff" d="M33 19h8l6 12v8H33z"/><path fill="#429e6b" d="M36 22h4l4 9h-8z"/><path fill="#e0eee7" d="M34 33h13v6H34z"/><rect fill="#b8d7c4" x="36" y="33" width="4" height="2" rx="1"/><circle fill="#2d8c58" cx="9" cy="40" r="5.5"/><circle fill="#fff" cx="9" cy="40" r="3.5"/><circle fill="#2d8c58" cx="39" cy="40" r="5.5"/><circle fill="#fff" cx="39" cy="40" r="3.5"/>',
    documents:'<path fill="#c0d3e3" d="M8 4h22l12 12v29H8z"/><path fill="url(#app-paper)" d="M6 2h23l11 12v29H6z"/><path fill="#b0c6d6" d="M28 3v13h12z"/><path fill="#e7eff6" d="M29 2v12h11z"/><g stroke="#9db4c6" stroke-width="2.5" stroke-linecap="round"><path d="M13 17h11m-11 7h20m-20 6h20m-20 6h14"/></g>',
    help:'<path fill="url(#app-paper)" d="M10 10C12-1 37-2 38 11c1 8-9 10-10 16v3h-8v-4c0-9 10-10 10-15 0-5-11-6-13 2z"/><circle fill="url(#app-paper)" cx="24" cy="40" r="4.5"/>',
    settings:'<path fill="url(#app-paper)" fill-rule="evenodd" d="m20 1-1 6-5 2-5-3-6 6 3 5-2 5-4 1v8l6 1 2 5-3 5 6 6 5-3 5 2 1 4h8l1-6 5-2 5 3 6-6-3-5 2-5 4-1v-8l-6-1-2-5 3-5-6-6-5 3-5-2-1-4zm4 14a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" transform="translate(3 2) scale(.88)"/><circle fill="#768a9a" cx="24.1" cy="23.1" r="5.5"/><circle fill="#dae3ea" cx="24.1" cy="23.1" r="3"/>'
};
var appIconSequence=0;
function appIconSvg(id){
    if(APP_ICON_ART[id]){
        // Each copy owns its paint IDs, so hiding a window cannot break another icon.
        var prefix='app-icon-'+(++appIconSequence)+'-';
        var art='<defs><linearGradient id="app-paper" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e1e9ef"/></linearGradient><linearGradient id="app-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#607787"/><stop offset="1" stop-color="#354959"/></linearGradient></defs>'+APP_ICON_ART[id];
        return '<svg class="app-icon app-icon-art" viewBox="0 0 48 48" fill="none" aria-hidden="true">'+art.replace(/app-(paper|metal)/g,function(match){return prefix+match.slice(4);})+'</svg>';
    }
    return '<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(APP_ICON_PATHS[id] || '')+'</svg>';
}
function wallpaperPath(id){return 'wallpapers/'+id+(['ribbons','valley','facets'].indexOf(id)!==-1?'.jpg':'.svg');}
