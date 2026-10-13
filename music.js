'use strict';

// Start from a user gesture: browsers block audible autoplay on page load.
(function(){
    var audio=document.getElementById('backgroundMusic'),button=document.getElementById('musicToggle');
    var saved=readSaved('musicSettings',{}),enabled=saved.enabled!==false,started=false,failed=false;
    audio.volume=.2;
    function render(){
        var playing=enabled && !audio.paused;
        button.setAttribute('aria-pressed',String(playing));
        button.title=failed?'Музыка недоступна. Нажмите, чтобы повторить':playing?'Выключить музыку':'Включить музыку';
        button.setAttribute('aria-label',button.title);
        button.classList.toggle('playing',playing);
    }
    function play(){
        if(!enabled || document.hidden || failed || !audio.paused)return;
        var promise=audio.play();
        if(promise)promise.catch(function(){render();});
    }
    function gesture(event){
        if(event.isTrusted && !event.target.closest('#musicToggle'))play();
    }
    button.addEventListener('click',function(){
        if(enabled && !audio.paused){enabled=false;audio.pause();}
        else{enabled=true;if(failed)audio.load();failed=false;play();}
        writeSaved('musicSettings',{enabled:enabled});render();
    });
    audio.addEventListener('playing',function(){started=true;if(!enabled || document.hidden)audio.pause();render();});
    audio.addEventListener('pause',render);
    audio.addEventListener('error',function(){failed=true;render();});
    document.addEventListener('pointerup',gesture);
    document.addEventListener('click',gesture);
    document.addEventListener('keydown',function(event){if(!event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey)gesture(event);});
    document.addEventListener('visibilitychange',function(){if(document.hidden)audio.pause();else if(started)play();});
    window.addEventListener('pagehide',function(){audio.pause();});
    window.addEventListener('pageshow',function(){if(started)play();});
    render();
})();
