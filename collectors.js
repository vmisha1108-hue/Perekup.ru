'use strict';

var COLLECTOR_GRACE = 90*BANK_DAY;
var collectorBusy = false, collectorPreviousFocus = null;
function collectorState(){
    if(!bank) return null;
    if(!isRecord(bank.collectors) || bank.collectors.version!==1){
        bank.collectors={version:1,active:false,loanIds:[],level:0,nextEventAt:null,sequence:0,call:null,log:[]};
    }
    var s=bank.collectors;
    if(!Array.isArray(s.loanIds))s.loanIds=[];
    if(!Array.isArray(s.log))s.log=[];
    s.log=s.log.filter(function(e){return isRecord(e) && Number.isFinite(e.when) && typeof e.text==='string';}).slice(0,60);
    if(!Number.isSafeInteger(s.sequence) || s.sequence<0)s.sequence=0;
    if(!Number.isFinite(s.nextEventAt))s.nextEventAt=null;
    if(s.call && (!isRecord(s.call) || !Number.isSafeInteger(s.call.minutes) || s.call.minutes<15 || s.call.minutes>90 || typeof s.call.name!=='string' || typeof s.call.text!=='string'))s.call=null;
    return bank.collectors;
}
function collectorLoans(){
    return bank ? bank.loans.filter(function(l){
        return l.status==='active' && overdueCents(l)>0 && Number.isFinite(l.overdueAt) && gameMs-l.overdueAt>=COLLECTOR_GRACE;
    }) : [];
}
function collectorPressureLevel(){
    var loans=collectorLoans();if(!loans.length) return 0;
    var days=Math.floor((gameMs-Math.min.apply(null,loans.map(function(l){return l.overdueAt;})))/BANK_DAY);
    return days>=180?3:days>=120?2:1;
}
function collectorBuyerMultiplier(){return [1,1.5,2,3][collectorPressureLevel()];}
function collectorEventDelay(level){return Math.round(rnd(6,12)*3600000/(level===3?2:level===2?1.5:1));}
function collectorLog(kind,text){
    var s=collectorState();if(!s) return;
    s.log.unshift({id:++s.sequence,when:gameMs,kind:kind,text:text});s.log=s.log.slice(0,60);
    bank.revision++;saveBank();
}
function hideCollectorCall(){
    var overlay=document.getElementById('collectorOverlay');
    if(!overlay || !overlay.classList.contains('open')) return;
    overlay.classList.remove('open');updateGameSpeed();
    if(collectorPreviousFocus && collectorPreviousFocus.isConnected) collectorPreviousFocus.focus();
    collectorPreviousFocus=null;
}
function syncCollectors(){
    var s=collectorState();if(!s) return;
    var loans=collectorLoans(),level=collectorPressureLevel(),wasActive=s.active;
    var ids=loans.map(function(l){return l.id;}).sort();
    var changed=s.level!==level || s.loanIds.join(',')!==ids.join(',');
    s.active=level>0;s.level=level;s.loanIds=ids;
    if(s.active && wasActive && s.nextEventAt===null){s.nextEventAt=gameMs+30*60000;changed=true;}
    if(s.active && !wasActive){
        s.nextEventAt=gameMs+30*60000;
        collectorLog('started','Просрочка достигла 90 дней. Долг передан игровому отделу взыскания.');
        toast('📞 Коллекторы подключились к просроченному долгу. Подробности в Банке.',function(){openWin('bank');});
    }else if(!s.active){
        s.call=null;s.nextEventAt=null;hideCollectorCall();
        if(wasActive){
            collectorLog('stopped','Длительная просрочка погашена. Коллекторы прекратили звонки и помехи.');
            toast('🏦 Просрочка погашена. Коллекторы больше не мешают.');
        }
    }
    if(changed){bank.revision++;saveBank();}
}
function collectorMessage(){
    var lines=[
        'Отдел взыскания: длительная просрочка сохраняется. Требуем погасить её в приложении «Банк».',
        'Коллектор снова написал: «Платёж так и не поступил. Когда закроете просрочку?»',
        'Новое напоминание от взыскателей: «Договорённости о погашении нет. Мы снова свяжемся с вами.»'
    ];
    var text=pick(lines);collectorLog('message',text);toast('📩 '+text,function(){openWin('bank');});
}
function collectorDelayMeeting(meeting,force){
    var level=collectorPressureLevel(),flow=meeting && meeting.flow;
    if(!level || !flow || flow.stage!=='waiting' || flow.collectorDelayed || (!force && Math.random()>[0,.25,.40,.55][level])) return false;
    var minutes=rnd(15,45)*level;
    flow.arrivalAt+=minutes*60000;flow.inspectionUntil+=minutes*60000;
    flow.collectorDelayed=true;flow.collectorDelayMinutes=minutes;
    var text='Коллекторы вмешались в переговоры. Вторая сторона задерживается на '+minutes+' игровых минут.';
    collectorLog('meeting',text);
    if(chat && chat.pid===meeting.id){sysSay(text);saveChat();renderChat();}
    save();return true;
}
function collectorWithdrawBuyer(){
    var offers=pending.filter(function(it){return it.type==='ad' && it.ready;});
    if(!offers.length) return false;
    var offer=pick(offers),text=offer.npc.name+' отказался от переговоров: звонки взыскателей отпугнули покупателя.';
    dropPending(offer.id);
    if(chat && chat.pid===offer.id){
        sysSay(text);chat.done=true;chat.stage='done';chat.pid=null;renderChat();
    }
    collectorLog('buyer',text);toast('❌ '+text);renderDealsTab();refreshList();return true;
}
function showCollectorCall(){
    var s=collectorState(),overlay=document.getElementById('collectorOverlay');
    if(!s || !s.active || !s.call || !overlay) return;
    var opening=!overlay.classList.contains('open');
    document.getElementById('collectorCaller').textContent=s.call.name+' · отдел взыскания';
    document.getElementById('collectorCallText').textContent=s.call.text;
    document.getElementById('collectorCallCost').textContent='Разговор отнимет '+s.call.minutes+' игровых минут. Сроки встреч и платежей продолжат идти.';
    document.getElementById('collectorHangup').textContent='Завершить разговор · '+s.call.minutes+' мин';
    if(opening){
        collectorPreviousFocus=document.activeElement;overlay.classList.add('open');updateGameSpeed();
        document.getElementById('collectorHangup').focus();
    }
}
function collectorPhoneCall(){
    var s=collectorState();if(s.call) return false;
    s.call={id:++s.sequence,name:pick(['Олег','Денис','Светлана']),minutes:rnd(15,30)*s.level,
        text:pick(['Мы снова по поводу вашей просрочки. Когда поступит платёж? Давайте разберёмся сейчас.','Просрочка не закрыта. Требуем погасить задолженность — открывайте Банк.','Обещаниями долг не закрыть. Обсудим, когда вы вернёте просроченную сумму.']),when:gameMs};
    collectorLog('call','Звонок взыскателя '+s.call.name+': разговор на '+s.call.minutes+' игровых минут.');
    showCollectorCall();return true;
}
function tickCollectors(){
    syncCollectors();var s=collectorState();
    if(!s || !s.active || collectorBusy) return;
    if(s.call){showCollectorCall();return;}
    if(gameMs<s.nextEventAt) return;
    // При перемотке не воспроизводим сотни пропущенных уведомлений за один кадр.
    s.nextEventAt=gameMs+collectorEventDelay(s.level);
    var event=Math.random();
    if(event<.45) collectorPhoneCall();
    else if(event<.70) collectorMessage();
    else if(event<.85){if(!collectorWithdrawBuyer())collectorMessage();}
    else{
        var meeting=pending.find(function(it){return it.type==='meet' && it.flow && it.flow.stage==='waiting' && !it.flow.collectorDelayed;});
        if(!collectorDelayMeeting(meeting,true))collectorMessage();
    }
    save();saveGameTime();renderBank();
}
function dismissCollectorCall(openBank){
    var s=collectorState();if(!s || !s.call) return false;
    var minutes=s.call.minutes;s.call=null;collectorBusy=true;hideCollectorCall();saveBank();
    try{
        var until=gameMs+minutes*60000;
        while(gameMs<until){gameMs=Math.min(until,gameMs+15*60000);tickPending();}
        lastRealMs=Date.now();syncCollectors();
        if(s.active) s.nextEventAt=Math.max(s.nextEventAt || 0,gameMs+collectorEventDelay(s.level));
        save();saveGameTime();renderGameTime();renderBank();
    }finally{collectorBusy=false;}
    if(openBank)openWin('bank');return true;
}
function collectorBankPanel(){
    var s=collectorState();if(!s || (!s.active && !s.log.length)) return '';
    var labels=['','Умеренное давление','Сильное давление','Постоянное давление'];
    return '<section class="collector-panel '+(s.active?'active':'')+'"><h3>📞 Коллекторы</h3>'+
        (s.active?'<p><b>'+labels[s.level]+'</b> · длительных просрочек: '+s.loanIds.length+'</p><p>Звонки отнимают время, покупатели пишут реже и могут отказаться от переговоров, ожидание на встречах затягивается. Погасите длительную просрочку, чтобы прекратить помехи.</p>':'<p>Взыскатели больше не мешают: длительная просрочка погашена.</p>')+
        '<ol>'+s.log.slice(0,12).map(function(e){return '<li><small>'+fmtMeet(new Date(e.when))+'</small>'+esc(e.text)+'</li>';}).join('')+'</ol></section>';
}
function initCollectors(){
    collectorState();syncCollectors();showCollectorCall();
    document.getElementById('collectorHangup').addEventListener('click',function(){dismissCollectorCall(false);});
    document.getElementById('collectorOpenBank').addEventListener('click',function(){dismissCollectorCall(true);});
    document.getElementById('collectorOverlay').addEventListener('keydown',function(event){
        if(event.key!=='Tab')return;
        var first=document.getElementById('collectorHangup'),last=document.getElementById('collectorOpenBank');
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    });
    document.addEventListener('keydown',function(event){
        if(event.key==='Escape' && document.getElementById('collectorOverlay').classList.contains('open')){
            event.preventDefault();event.stopImmediatePropagation();dismissCollectorCall(false);
        }
    },true);
}
