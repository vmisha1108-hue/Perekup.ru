'use strict';
(function(){
    var failure=false,finished=false;
    function english(){try{return JSON.parse(localStorage.getItem('perekupLanguage'))==='en';}catch(e){return false;}}
    function label(ru,en){return english()?en:ru;}
    function showError(){
        failure=true;var screen=document.getElementById('bootScreen');if(!screen)return;
        screen.hidden=false;document.body.classList.add('booting');
        document.getElementById('bootStatus').textContent=label('Не удалось загрузить игру. Попробуйте ещё раз.','Could not load the game. Please try again.');
        document.getElementById('bootRetry').hidden=false;screen.classList.add('boot-error');
        // Reveal the error screen even while the native host is still covering the WebView.
        if(window.perekupNative)window.perekupNative.send('ui-ready',{});
    }
    window.addEventListener('error',function(event){if(!finished&&(event.error||event.target&&event.target.tagName==='SCRIPT'))showError();},true);
    window.addEventListener('unhandledrejection',function(){if(!finished)showError();});
    document.addEventListener('DOMContentLoaded',function(){
        document.getElementById('bootRetry').onclick=function(){location.reload();};
        document.getElementById('bootStatus').textContent=label('Готовим рабочий стол…','Preparing your desktop…');
        document.getElementById('bootRetry').textContent=label('Повторить запуск','Retry');
        if(failure){showError();return;}
        // Run after the existing startup handlers. Do not add an artificial minimum wait.
        setTimeout(function(){
            if(failure)return;
            if(!document.querySelector('#taskList [data-app]')||typeof window.openWin!=='function'){showError();return;}
            if(window.perekupNative)window.perekupNative.send('ui-ready',{});
            document.body.classList.remove('booting');
            requestAnimationFrame(function(){requestAnimationFrame(function(){
                finished=true;var screen=document.getElementById('bootScreen');screen.classList.add('boot-complete');
                if(matchMedia('(prefers-reduced-motion: reduce)').matches)screen.remove();
                else{screen.addEventListener('transitionend',function(){screen.remove();},{once:true});setTimeout(function(){screen.remove();},400);}
            });});
        },0);
    });
})();
