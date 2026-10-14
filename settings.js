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
    document.querySelectorAll('.window .wi').forEach(function(el){var id=el.closest('.window').id.replace('win-','');if(APP_ICON_PATHS[id])el.innerHTML=appIconSvg(id);});
    renderSettings();
}

var APP_ICON_PATHS={
    chat:'<path d="M3 3h18v13H9l-6 5z"/>',
    profile:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    location:'<path d="M19 9c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 14 0z"/><circle cx="12" cy="9" r="2"/>',
    wallet:'<path d="M3 5h17v16H3zM3 5l15-3v3m-4 6h7v5h-7z"/>',
    market:'<path d="m4 10 2-5h12l2 5M3 10h18v8H3zM6 18v2m12-2v2M6 14h2m8 0h2"/>',
    shop:'<path d="M3 10V5h18v5M3 10h18v11H3zM7 21v-7h10v7M1 10h22"/>',
    calc:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1m5 0h1m-7 4h1m5 0h1m-7 4h1m5 0h1"/>',
    calendar:'<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h1m6 0h1m-8 4h1m6 0h1"/>',
    clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v7l4 2"/>',
    help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4h.01"/>',
    travel:'<path d="M3 8h11v10H3zM14 11h4l3 4v3h-7M6 8V4h5v4"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    garage:'<path d="m2 10 10-8 10 8M4 9v13h16V9M8 22V12h8v10m-8-6h8m-8 3h8"/>',
    bank:'<path d="m2 8 10-6 10 6H2m2 4v7m5-7v7m6-7v7m5-7v7M2 22h20"/>',
    documents:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8m-8 4h8"/>',
    settings:'<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>'
};
function appIconSvg(id){return '<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(APP_ICON_PATHS[id] || '')+'</svg>';}
function wallpaperPath(id){return 'wallpapers/'+id+(['ribbons','valley','facets'].indexOf(id)!==-1?'.jpg':'.svg');}
