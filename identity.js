'use strict';

function validSignature(strokes){
    return Array.isArray(strokes) && strokes.length>0 && strokes.length<=50 && strokes.every(function(line){return Array.isArray(line) && line.length>=2 && line.length<=2500 && line.every(function(p){return Array.isArray(p) && p.length===2 && p.every(function(n){return Number.isFinite(n) && n>=0 && n<=1;});});}) &&
        strokes.reduce(function(sum,line){return sum+line.slice(1).reduce(function(s,p,i){return s+Math.hypot(p[0]-line[i][0],p[1]-line[i][1]);},0);},0)>.025;
}
function validNickname(value){return typeof value==='string' && /^[^<>\u0000-\u001f\u007f]{2,32}$/u.test(value.trim());}
var playerIdentity=readSaved('playerIdentity',{}),identityStrokes=[],identityPointer=null;
if(playerIdentity.version!==1 || !validNickname(playerIdentity.nickname) || !validSignature(playerIdentity.signature))playerIdentity=null;
function hasPlayerIdentity(){return !!playerIdentity;}
function signatureHtml(strokes,label){
    if(!validSignature(strokes))return '';
    return '<svg class="player-signature" viewBox="0 0 640 240" role="img" aria-label="'+esc(label || 'Подпись игрока')+'"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+strokes.map(function(line){return '<polyline points="'+line.map(function(p){return (p[0]*640).toFixed(2)+','+(p[1]*240).toFixed(2);}).join(' ')+'"/>';}).join('')+'</g></svg>';
}
function showIdentitySetup(){
    if(hasPlayerIdentity())return;
    startupResetPending=true;lastRealMs=Date.now();$('identityOverlay').classList.add('open');updateGameSpeed();$('identityNickname').focus();
}
function redrawIdentitySignature(){
    var canvas=$('identityCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#173c63';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';
    identityStrokes.forEach(function(line){ctx.beginPath();line.forEach(function(p,i){if(i)ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height);else ctx.moveTo(p[0]*canvas.width,p[1]*canvas.height);});ctx.stroke();});
}
function savePlayerIdentity(){
    if(hasPlayerIdentity())return false;
    var nickname=$('identityNickname').value.trim().replace(/\s+/g,' '),error='';
    identityStrokes=identityStrokes.filter(function(line){return line.length>=2;});
    if(!validNickname(nickname))error='Напишите ник от 2 до 32 символов.';
    else if(!validSignature(identityStrokes))error='Нарисуйте подпись мышью или пальцем — одного нажатия недостаточно.';
    if(error){$('identityError').textContent=error;return false;}
    var identity={version:1,nickname:nickname,signature:JSON.parse(JSON.stringify(identityStrokes))};
    try{localStorage.setItem('playerIdentity',JSON.stringify(identity));}catch(e){$('identityError').textContent='Не удалось сохранить ник и подпись. Проверьте доступность хранилища браузера.';return false;}
    playerIdentity=identity;contractBook.profile.fullName=nickname;saveContracts();
    pending.forEach(function(it){if(it.contract && it.contract.fields){it.contract.fields.fullName=nickname;it.contract.fields.signature=nickname;}});save();
    $('identityOverlay').classList.remove('open');startupResetPending=false;resumeAfterEntry();return true;
}
function initIdentity(){
    var canvas=$('identityCanvas');
    function point(event){var r=canvas.getBoundingClientRect();return [clamp((event.clientX-r.left)/r.width,0,1),clamp((event.clientY-r.top)/r.height,0,1)];}
    canvas.addEventListener('pointerdown',function(event){
        if(hasPlayerIdentity() || identityPointer!==null || (event.pointerType==='mouse' && event.button!==0) || identityStrokes.length>=50)return;
        event.preventDefault();identityPointer=event.pointerId;canvas.setPointerCapture(event.pointerId);identityStrokes.push([point(event)]);$('identityError').textContent='';
    });
    canvas.addEventListener('pointermove',function(event){
        if(event.pointerId!==identityPointer || hasPlayerIdentity())return;event.preventDefault();var line=identityStrokes[identityStrokes.length-1];if(line.length<2500)line.push(point(event));redrawIdentitySignature();
    });
    function end(event){if(event.pointerId!==identityPointer)return;identityPointer=null;identityStrokes=identityStrokes.filter(function(line){return line.length>=2;});redrawIdentitySignature();}
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
    $('identityClear').addEventListener('click',function(){if(hasPlayerIdentity())return;identityPointer=null;identityStrokes=[];redrawIdentitySignature();$('identityError').textContent='';});
    $('identityForm').addEventListener('submit',function(event){event.preventDefault();savePlayerIdentity();});
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
