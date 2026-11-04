'use strict';

function validSignature(strokes){
    if(typeof strokes==='string')return /^[A-Z]{4}$/.test(strokes);
    return Array.isArray(strokes) && strokes.length>0 && strokes.length<=50 && strokes.every(function(line){return Array.isArray(line) && line.length>=2 && line.length<=2500 && line.every(function(p){return Array.isArray(p) && p.length===2 && p.every(function(n){return Number.isFinite(n) && n>=0 && n<=1;});});}) &&
        strokes.reduce(function(sum,line){return sum+line.slice(1).reduce(function(s,p,i){return s+Math.hypot(p[0]-line[i][0],p[1]-line[i][1]);},0);},0)>.025;
}
function validNickname(value){return typeof value==='string' && /^[^<>\u0000-\u001f\u007f]{2,32}$/u.test(value.trim());}
var playerIdentity=readSaved('playerIdentity',{});
if(playerIdentity.version!==1 || !validNickname(playerIdentity.nickname) || !validSignature(playerIdentity.signature))playerIdentity=null;
function hasPlayerIdentity(){return !!playerIdentity;}
function signatureHtml(strokes,label){
    if(!validSignature(strokes))return '';
    if(typeof strokes==='string')return '<span class="player-signature signature-word" role="img" aria-label="'+esc(label || 'Подпись игрока')+'">'+esc(strokes)+'</span>';
    return '<svg class="player-signature" viewBox="0 0 640 240" role="img" aria-label="'+esc(label || 'Подпись игрока')+'"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+strokes.map(function(line){return '<polyline points="'+line.map(function(p){return (p[0]*640).toFixed(2)+','+(p[1]*240).toFixed(2);}).join(' ')+'"/>';}).join('')+'</g></svg>';
}
function showIdentitySetup(){
    if(hasPlayerIdentity())return;
    if(!localStorage.getItem('onboardingWelcomeSeen')){showStartWelcome();return;}
    startupResetPending=true;lastRealMs=Date.now();$('identityOverlay').classList.add('open');updateGameSpeed();
    // На телефоне автофокус ввода вызывает клавиатуру и скрывает часть знакомства.
    if(!window.matchMedia('(pointer: coarse)').matches)$('identityNickname').focus({preventScroll:true});
}
function validWordSignature(value){return typeof value==='string' && /^[A-Z]{4}$/.test(value);}
function bindWordSignature(input){input.addEventListener('input',function(){input.value=input.value.toUpperCase();});}
function savePlayerIdentity(){
    if(hasPlayerIdentity())return false;
    var nickname=$('identityNickname').value.trim().replace(/\s+/g,' '),error='';
    var signature=$('identitySignature').value.toUpperCase();
    if(!validNickname(nickname))error='Напишите ник от 2 до 32 символов.';
    else if(!validWordSignature(signature))error='Подпись — ровно 4 заглавные латинские буквы, например MIKE.';
    if(error){$('identityError').textContent=error;return false;}
    var identity={version:1,nickname:nickname,signature:signature};
    try{localStorage.setItem('playerIdentity',JSON.stringify(identity));}catch(e){$('identityError').textContent='Не удалось сохранить ник и подпись. Проверьте доступность хранилища браузера.';return false;}
    playerIdentity=identity;contractBook.profile.fullName=nickname;saveContracts();
    pending.forEach(function(it){if(it.contract && it.contract.fields){it.contract.fields.fullName=nickname;it.contract.fields.signature=nickname;}});save();
    $('identityOverlay').classList.remove('open');startupResetPending=false;resumeAfterEntry();return true;
}
function initIdentity(){
    bindWordSignature($('identitySignature'));
    $('identityForm').addEventListener('submit',function(event){event.preventDefault();savePlayerIdentity();});
    // Показываем знакомство до загрузки остальных окон; проверяем и возврат из фона.
    function ensureIdentitySetup(){if(!hasPlayerIdentity() && !ENTRY_RESET_PROMPT_ENABLED)showIdentitySetup();}
    ensureIdentitySetup();
    window.addEventListener('pageshow',ensureIdentitySetup);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)ensureIdentitySetup();});
    document.addEventListener('keydown',function(event){
        if(!$('identityOverlay').classList.contains('open'))return;
        if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();}
        if(event.key==='Tab'){
            var first=$('identityNickname'),last=$('identitySave');
            if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
            else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
    },true);
}
