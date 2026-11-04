'use strict';
function dismissToast(el){
    if(!el || el.dataset.dismissing)return;
    if(!el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches){el.remove();return;}
    el.dataset.dismissing='1';el.style.pointerEvents='none';
    var current=getComputedStyle(el),from={opacity:current.opacity,transform:current.transform};
    el.getAnimations().forEach(function(a){a.cancel();});
    var exit=el.animate([from,{opacity:0,transform:'translateY(-6px) scale(.98)'}],{duration:200,easing:'ease-in',fill:'forwards'});
    exit.onfinish=exit.oncancel=function(){el.remove();};
}
(function(){
    var reduced=matchMedia('(prefers-reduced-motion: reduce)'),active=new Map(),pending=new Set(),frame=0;
    var ease='cubic-bezier(.16,1,.3,1)';
    function track(node,frames,options){
        if(reduced.matches || !node.animate)return;
        var old=active.get(node);if(old)old.cancel();
        var a=node.animate(frames,options);active.set(node,a);
        function done(){if(active.get(node)===a)active.delete(node);if(node._geometryAnimation===a)node._geometryAnimation=null;}
        a.onfinish=a.oncancel=done;return a;
    }
    function anchor(id){return document.querySelector('#taskList [data-app="'+id+'"]')||document.querySelector('.desk-icon[data-app="'+id+'"]')||document.querySelector('.os-launcher');}
    function state(win){return {rect:win.getBoundingClientRect(),opacity:getComputedStyle(win).opacity,minimized:win.classList.contains('minimized'),visible:win.classList.contains('open')&&!win.classList.contains('minimized')};}
    function fromRect(a,b){return 'translate('+(a.left-b.left)+'px,'+(a.top-b.top)+'px) scale('+(a.width/b.width)+','+(a.height/b.height)+')';}
    function morph(win,before,opening,id){
        if(reduced.matches || !win.animate)return;
        var target=win.getBoundingClientRect();if(!target.width||!target.height)return;
        var source=before.rect,icon=anchor(id),dock=icon&&icon.getBoundingClientRect();
        // Retarget from the current rendered position when clicking during a transition.
        var from=fromRect(source,target),to='none',opacity=before.opacity;
        if(opening&&!before.visible&&Number(opacity)<.03){
            if(before.minimized&&dock){var w=target.width*.18,h=target.height*.18;from='translate('+(dock.left+dock.width/2-target.left-w/2)+'px,'+(dock.top+dock.height/2-target.top-h/2)+'px) scale(.18)';}
            else if(dock){var w=target.width*.88,h=target.height*.88;from='translate('+(dock.left+dock.width/2-target.left-w/2)*.12+'px,'+(dock.top+dock.height/2-target.top-h/2)*.12+'px) scale(.88)';}
            else from='translateY(24px) scale(.94)';opacity=0;
        }
        if(!opening){
            if(win.classList.contains('minimized')&&dock){var w=target.width*.18,h=target.height*.18;to='translate('+(dock.left+dock.width/2-target.left-w/2)+'px,'+(dock.top+dock.height/2-target.top-h/2)+'px) scale(.18)';}
            else to='translateY(12px) scale(.96)';
        }
        win._geometryAnimation=track(win,[{transformOrigin:'0 0',transform:from,opacity:opacity,visibility:'visible'},{transformOrigin:'0 0',transform:to,opacity:opening?1:0,visibility:'visible'}],{duration:opening?480:340,easing:ease});
    }
    ['openWin','restoreWin','minimizeWin','closeWin'].forEach(function(name){
        var original=window[name];window[name]=function(id){
            var win=document.getElementById('win-'+id),before=win&&state(win);
            var result=original.apply(this,arguments);
            if(win&&before){var now=win.classList.contains('open')&&!win.classList.contains('minimized');
                if(now!==before.visible || active.has(win))morph(win,before,now,id);}
            return result;
        };
    });
    // Geometry transitions (maximize/restore) use the same timing and can be interrupted.
    var maximize=toggleWindowMaximize;
    toggleWindowMaximize=function(id){var win=document.getElementById('win-'+id),before=win&&state(win);maximize(id);if(win&&before){if(win._geometryAnimation)win._geometryAnimation.cancel();morph(win,before,true,id);}};
    document.querySelectorAll('.window').forEach(function(win){win.classList.add('motion-managed');});
    function reveal(node){
        if(!node.isConnected||!node.getClientRects().length)return;
        track(node,[{opacity:.55,transform:'translateY(9px)'},{opacity:1,transform:'none'}],{duration:380,easing:ease});
    }
    function flush(){frame=0;var count=0;pending.forEach(function(node){if(count++<6)reveal(node);});pending.clear();}
    new MutationObserver(function(records){
        if(reduced.matches)return;
        records.forEach(function(record){
            if(!record.addedNodes.length)return;
            if(record.target.nodeType===1&&record.target.matches('.grid,#settingsBody,#bankBody,#travelBody,#garageBody,#businessBody,#documentsBody,.commerce-body,.tutorial-copy'))pending.add(record.target);
            record.addedNodes.forEach(function(node){if(node.nodeType===1&&node.matches('.toast,.msg,.commerce-detail'))pending.add(node);});
        });
        if(pending.size&&!frame)frame=requestAnimationFrame(flush);
    }).observe(document.body,{childList:true,subtree:true});
    reduced.addEventListener('change',function(){if(!reduced.matches)return;active.forEach(function(a){a.cancel();});active.clear();pending.clear();if(frame)cancelAnimationFrame(frame);frame=0;document.querySelectorAll('.window').forEach(function(win){if(win._geometryAnimation)win._geometryAnimation.cancel();});});
})();
