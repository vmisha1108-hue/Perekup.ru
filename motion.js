'use strict';
function dismissToast(el){
    if(!el || el.dataset.dismissing)return;
    if(!el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.remove();return;}
    el.dataset.dismissing='1';el.style.pointerEvents='none';
    var current=getComputedStyle(el),from={opacity:current.opacity,transform:current.transform};
    el.getAnimations().forEach(function(animation){animation.cancel();});
    var exit=el.animate([from,{opacity:0,transform:'translateX(12px)'}],{duration:180,easing:'ease-in',fill:'forwards'});
    exit.onfinish=function(){el.remove();};exit.oncancel=function(){el.remove();};
}
// Observe only new content, never every attribute or every catalogue card.
(function(){
    var reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),active=new Map(),pending=new Set(),frame=0;
    var panels='.grid,#settingsBody,#bankBody,#travelBody,#garageBody,#businessBody,#documentsBody,.commerce-body';
    function reveal(node){
        if(reduced.matches || !node.isConnected || !node.animate || !node.getClientRects().length)return;
        var old=active.get(node);if(old)old.cancel();
        var animation=node.animate([{opacity:.65,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
        active.set(node,animation);
        function clear(){if(active.get(node)===animation)active.delete(node);}
        animation.onfinish=clear;animation.oncancel=clear;
    }
    function flush(){frame=0;var count=0;pending.forEach(function(node){if(count++<8)reveal(node);});pending.clear();}
    new MutationObserver(function(records){
        if(reduced.matches)return;
        records.forEach(function(record){
            if(!record.addedNodes.length)return;
            if(record.target.nodeType===1 && record.target.matches(panels))pending.add(record.target);
            record.addedNodes.forEach(function(node){if(node.nodeType===1 && node.matches('.toast,.msg,.commerce-detail'))pending.add(node);});
        });
        if(pending.size && !frame)frame=requestAnimationFrame(flush);
    }).observe(document.body,{childList:true,subtree:true});
    reduced.addEventListener('change',function(){if(!reduced.matches)return;active.forEach(function(animation){animation.cancel();});active.clear();pending.clear();if(frame)cancelAnimationFrame(frame);frame=0;document.querySelectorAll('.window').forEach(function(win){if(win._geometryAnimation)win._geometryAnimation.cancel();});});
})();
