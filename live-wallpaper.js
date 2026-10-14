'use strict';

var LIVE_WALLPAPER={id:'winter-night',label:'Зимняя ночь · Живые',poster:'wallpapers/winter-night.jpg',video:'wallpapers/winter-night.mp4',fallbackVideo:'wallpapers/winter-night.webm'};
var syncLiveWallpaper;
(function(){
    var video=document.getElementById('liveWallpaper'),motion=matchMedia('(prefers-reduced-motion: reduce)');
    video.muted=true;video.defaultMuted=true;
    function selected(){return document.documentElement.dataset.wallpaper===LIVE_WALLPAPER.id;}
    function canAnimate(){return selected() && !document.hidden && !motion.matches;}
    syncLiveWallpaper=function(){
        video.hidden=!selected();
        if(!selected()){
            video.pause();video.classList.remove('playing');
            // Release the decoder and buffer when a static wallpaper is selected.
            if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}
            return;
        }
        if(!canAnimate()){video.pause();return;}
        if(!video.hasAttribute('src'))video.src=video.canPlayType('video/mp4; codecs="avc1.64001f"')?LIVE_WALLPAPER.video:LIVE_WALLPAPER.fallbackVideo;
        if(video.paused){
            var promise=video.play();
            // The still background remains visible if autoplay is unavailable.
            if(promise)promise.catch(function(){});
        }
    };
    video.addEventListener('playing',function(){if(canAnimate())video.classList.add('playing');else video.pause();});
    video.addEventListener('pause',function(){video.classList.remove('playing');});
    video.addEventListener('error',function(){video.classList.remove('playing');});
    document.addEventListener('visibilitychange',syncLiveWallpaper);
    document.addEventListener('pointerup',syncLiveWallpaper);
    document.addEventListener('keydown',function(event){if(!event.repeat)syncLiveWallpaper();});
    window.addEventListener('pagehide',function(){video.pause();});
    window.addEventListener('pageshow',syncLiveWallpaper);
    if(motion.addEventListener)motion.addEventListener('change',syncLiveWallpaper);
    else motion.addListener(syncLiveWallpaper);
})();
