'use strict';
// Independent desk game: no rewards or changes to the car market economy.
(function(){
    var size=22,body,food,direction,nextTurns,score,best=Number(readSaved('snakeBest',0))||0,playing=false,ended=false,timer=0,last=0,carry=0;
    ICONS.push({id:'snake',ico:'🐍',label:'Змейка'});
    APP_ICON_PATHS.snake='<path d="M7 19h9a4 4 0 0 0 0-8H8a3 3 0 0 1 0-6h8M14 3l3 2-3 2M7 19v-4"/>';
    var win=document.createElement('section');win.className='window';win.id='win-snake';win.dataset.title='Змейка';
    win.innerHTML='<div class="win-head"><div class="wi">'+appIconSvg('snake')+'</div><div class="win-title">Змейка</div><div class="win-btns"><button class="min" data-min="win-snake" title="Свернуть">—</button><button class="x" data-close="win-snake" title="Закрыть">✕</button></div></div><div class="win-body snake-app"><header><div><h2>Змейка</h2><p>Небольшой перерыв между сделками</p></div><div class="snake-numbers"><span>Счёт <b id="snakeScore">0</b></span><span>Рекорд <b id="snakeBest"></b></span></div></header><canvas id="snakeCanvas" width="440" height="440" tabindex="0" aria-label="Поле змейки. Стрелки или WASD для управления, пробел для паузы."></canvas><p id="snakeStatus" role="status">Нажмите «Начать»</p><div class="snake-actions"><button id="snakeStart" type="button">Начать</button><button id="snakePause" type="button" disabled>Пауза</button></div><div class="snake-pad" aria-label="Направление"><button data-snake="0,-1" aria-label="Вверх">↑</button><button data-snake="-1,0" aria-label="Влево">←</button><button data-snake="0,1" aria-label="Вниз">↓</button><button data-snake="1,0" aria-label="Вправо">→</button></div><small>Стрелки / WASD · Пробел — пауза. При переключении приложения игра останавливается.</small></div>';
    $('deskArea').appendChild(win);
    var canvas=$('snakeCanvas'),ctx=canvas.getContext('2d');$('snakeBest').textContent=best;
    function visible(){return win.classList.contains('open')&&!win.classList.contains('minimized')&&activeAppId==='snake'&&!document.hidden;}
    function placeFood(){var free=[];for(var y=0;y<size;y++)for(var x=0;x<size;x++)if(!body.some(function(p){return p.x===x&&p.y===y;}))free.push({x:x,y:y});return free.length?free[Math.floor(Math.random()*free.length)]:null;}
    function draw(){
        var unit=canvas.width/size;ctx.fillStyle='#14272a';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#ffffff05';ctx.lineWidth=1;
        for(var n=1;n<size;n++){ctx.beginPath();ctx.moveTo(n*unit,0);ctx.lineTo(n*unit,canvas.height);ctx.moveTo(0,n*unit);ctx.lineTo(canvas.width,n*unit);ctx.stroke();}
        if(food){ctx.fillStyle='#efab77';ctx.beginPath();ctx.arc((food.x+.5)*unit,(food.y+.5)*unit,unit*.32,0,Math.PI*2);ctx.fill();}
        body.forEach(function(p,i){ctx.fillStyle=i?'#58b99f':'#a4efd2';ctx.fillRect(p.x*unit+2,p.y*unit+2,unit-4,unit-4);});
        $('snakeScore').textContent=score;$('snakeBest').textContent=best;
    }
    function reset(){body=[{x:10,y:11},{x:9,y:11},{x:8,y:11}];direction={x:1,y:0};nextTurns=[];score=0;ended=false;food=placeFood();draw();}
    function pause(){playing=false;cancelAnimationFrame(timer);timer=0;$('snakePause').textContent='Продолжить';$('snakePause').disabled=ended;$('snakeStatus').textContent=ended?'Игра окончена. Попробуем ещё?':'Пауза';}
    function end(won){pause();ended=true;$('snakePause').disabled=true;$('snakeStart').textContent='Ещё раз';$('snakeStatus').textContent=won?'Вы заполнили всё поле!':'Игра окончена · Счёт '+score;}
    function step(){
        if(nextTurns.length)direction=nextTurns.shift();var head={x:body[0].x+direction.x,y:body[0].y+direction.y};var growing=food&&head.x===food.x&&head.y===food.y;
        if(head.x<0||head.y<0||head.x>=size||head.y>=size||body.slice(0,growing?body.length:body.length-1).some(function(p){return p.x===head.x&&p.y===head.y;})){end(false);return;}
        body.unshift(head);if(!growing)body.pop();else{score++;if(score>best){best=score;writeSaved('snakeBest',best);}food=placeFood();if(!food){draw();end(true);return;}}draw();
    }
    function frame(time){timer=0;if(!playing)return;if(!visible()){pause();return;}carry+=Math.min(250,time-last);last=time;var speed=Math.max(65,130-score*2);while(carry>=speed&&playing){carry-=speed;step();}if(playing)timer=requestAnimationFrame(frame);}
    function resume(){if(ended)return;playing=true;last=performance.now();carry=0;$('snakePause').disabled=false;$('snakePause').textContent='Пауза';$('snakeStatus').textContent='Собирайте яблоки и не врезайтесь';canvas.focus({preventScroll:true});cancelAnimationFrame(timer);timer=requestAnimationFrame(frame);}
    function turn(x,y){if(!playing)return;var previous=nextTurns.length?nextTurns[nextTurns.length-1]:direction;if(nextTurns.length<2&&(x!==previous.x||y!==previous.y)&&(x!==-previous.x||y!==-previous.y))nextTurns.push({x:x,y:y});}
    $('snakeStart').onclick=function(){pause();reset();$('snakeStart').textContent='Новая игра';resume();};$('snakePause').onclick=function(){if(playing)pause();else resume();};
    win.querySelectorAll('[data-snake]').forEach(function(b){b.onclick=function(){var p=b.dataset.snake.split(',').map(Number);turn(p[0],p[1]);};});
    var touch=null;canvas.addEventListener('pointerdown',function(e){touch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',function(e){if(!touch)return;var x=e.clientX-touch.x,y=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(x),Math.abs(y))<12)return;if(Math.abs(x)>Math.abs(y))turn(Math.sign(x),0);else turn(0,Math.sign(y));});
    document.addEventListener('keydown',function(e){if(!visible()||document.querySelector('.overlay.open')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;var key=e.key.toLowerCase(),move={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]}[key];if(move){e.preventDefault();e.stopImmediatePropagation();turn(move[0],move[1]);}else if(key===' '||key==='escape'){e.preventDefault();e.stopImmediatePropagation();if(playing)pause();else if(key===' '&&!ended)resume();}},true);
    document.addEventListener('visibilitychange',function(){if(document.hidden&&playing)pause();});window.addEventListener('blur',function(){if(playing)pause();});
    new MutationObserver(function(){if(playing&&!visible())pause();}).observe(win,{attributes:true,attributeFilter:['class']});reset();
})();
