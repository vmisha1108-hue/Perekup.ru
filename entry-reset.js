'use strict';

// Временное предложение на период разработки. Для отключения достаточно поставить false.
var ENTRY_RESET_PROMPT_ENABLED=true;
var startupResetPending=ENTRY_RESET_PROMPT_ENABLED;
function resumeAfterEntry(){
    lastRealMs=Date.now();updateGameSpeed();
    if(!chat || !chat.met || chat.done)restoreActiveMeeting();
    offerFirstVisitHelp();
    if($('collectorOverlay').classList.contains('open'))$('collectorHangup').focus();
    else if($('arrivalOverlay').classList.contains('open'))$('arrivalClose').focus();
}
function finishEntryReset(reset){
    if(!startupResetPending)return;
    if(reset)resetGameProgress(true);
    $('entryResetOverlay').classList.remove('open');
    startupResetPending=false;resumeAfterEntry();
    if(reset)toast('Прогресс сброшен. Новая игра начинается со 100 000 ₽.');
}
function offerEntryReset(){
    if(!ENTRY_RESET_PROMPT_ENABLED){startupResetPending=false;resumeAfterEntry();return;}
    startupResetPending=true;lastRealMs=Date.now();
    $('entryResetOverlay').classList.add('open');updateGameSpeed();$('entryContinue').focus();
}
function initEntryReset(){
    window.addEventListener('pageshow',function(event){if(event.persisted)offerEntryReset();});
    $('entryContinue').addEventListener('click',function(){finishEntryReset(false);});
    $('entryReset').addEventListener('click',function(){finishEntryReset(true);});
    document.addEventListener('keydown',function(event){
        if(!startupResetPending || !$('entryResetOverlay').classList.contains('open'))return;
        if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finishEntryReset(false);}
        if(event.key==='Tab'){
            var first=$('entryContinue'),last=$('entryReset');
            if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
            else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
    },true);
}
