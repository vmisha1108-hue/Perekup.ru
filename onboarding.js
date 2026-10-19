'use strict';
var onboardingActive=false,tutorialIndex=0,tutorialSaved=null,tutorialFocus=null,tutorialFrame=0;
var TUTORIAL_STEPS=[
 {title:'Ваш рабочий стол',icon:'settings',target:'#taskbar',text:'Все приложения живут в Perekup OS. Внизу закреплены авторынок, гараж, календарь, калькулятор, часы и настройки. Кнопка P открывает полный список приложений.',note:'Обучение можно пропустить и пройти снова из справки.'},
 {title:'Найдите первую машину',icon:'market',app:'market',target:'.os-market-toolbar',text:'На авторынке выберите город, найдите марку или модель и откройте фильтры. Сравните цену, пробег и состояние. Сердечко сохраняет объявление в избранном.',note:'У вас 100 000 ₽ на старте. Оставляйте запас на осмотр, дорогу и возможный ремонт.'},
 {title:'Сначала прочитайте объявление',icon:'market',app:'market',target:'#content .card .car-img',text:'Нажмите «Подробнее», чтобы изучить автомобиль и описание. Внутри объявления можно написать продавцу. Низкая цена может означать плохое состояние — проверяйте детали до покупки.',note:'В обучении мы ничего не покупаем и не тратим ваши деньги.'},
 {title:'Договоритесь с продавцом',icon:'chat',text:'В переписке задавайте вопросы и предлагайте свою цену. Характер и настроение продавца влияют на торг. Когда сойдётесь в цене, назначьте встречу.',demo:'chat',note:'Это пример переписки. Настоящий диалог начнётся из объявления.'},
 {title:'Не опоздайте на встречу',icon:'calendar',app:'calendar',target:'.cal-head',text:'В календаре появятся назначенные встречи. Проверьте дату, время и город, затем отправляйтесь на осмотр. Для поездок в другой город откройте «Переезд» через меню P.',note:'В игре время идёт быстрее реального. Пока вы проходите обучение, оно остановлено.'},
 {title:'Осмотр и подпись',icon:'documents',app:'documents',target:'#win-documents .win-head',text:'На встрече осмотрите автомобиль и проверьте условия. Перед подписанием ДКП сверьте цену и данные машины. Деньги и автомобиль передаются после подписания, а договор сохраняется в «Документах».',demo:'signature',note:'Можно отказаться до подписания. В игре встречаются скрытые неисправности и угнанные машины.'},
 {title:'Подготовьте машину к продаже',icon:'garage',app:'garage',target:'#win-garage .win-head',text:'Купленная машина появится в гараже. Посмотрите её состояние и расходы, подготовьте к продаже и разместите объявление. Прибыль — это выручка за вычетом покупки и остальных затрат.',note:'Честно указывайте известные неисправности: это влияет на репутацию и дальнейшие сделки.'},
 {title:'Вы готовы к первой сделке',icon:'clock',target:'#taskbar',text:'Калькулятор поможет посчитать расходы. В часах можно следить за игровым временем и спать ночью. В настройках меняются ник и подпись, там же можно скачать копию прогресса.',note:'Справка и повтор обучения всегда доступны через меню P. Удачной первой сделки!'}
];
function showStartWelcome(){
    startupResetPending=true;lastRealMs=Date.now();$('identityOverlay').classList.remove('open');$('welcomeOverlay').classList.add('open');updateGameSpeed();
    $('welcomeHelp').focus({preventScroll:true});
}
function tutorialState(){var state=readSaved('tutorialProgress',{});return state.version===1 && ['active','done','skipped'].indexOf(state.status)!==-1?state:null;}
function offerStartTutorial(){
    var state=tutorialState();if(onboardingActive || !hasPlayerIdentity())return;
    if(state && state.status==='active')startTutorial(state.step);
    else if(!state && firstVisit)startTutorial(0);
}
function startTutorial(step){
    if(onboardingActive || !hasPlayerIdentity() || startupResetPending || marketGameOver())return false;
    if(document.querySelector('.overlay.open:not(#overlay):not(#welcomeOverlay)')){toast('Сначала закройте текущее диалоговое окно, затем откройте обучение.');return false;}
    advanceGameTime(Date.now());onboardingActive=true;lastRealMs=Date.now();tutorialFocus=document.activeElement;
    tutorialSaved={open:Object.keys(openWindows),minimized:Object.keys(openWindows).filter(function(id){return $('win-'+id).classList.contains('minimized');}),active:activeAppId,view:view,favorites:marketFavoritesOnly};
    $('desktop').inert=true;$('tutorialOverlay').hidden=false;
    tutorialIndex=Number.isInteger(step)?clamp(step,0,TUTORIAL_STEPS.length-1):0;renderTutorial();return true;
}
function positionTutorialHighlight(){
    tutorialFrame=0;if(!onboardingActive)return;
    var selector=TUTORIAL_STEPS[tutorialIndex].target,node=selector && document.querySelector(selector),highlight=$('tutorialHighlight');
    if(!node || !node.getClientRects().length){highlight.hidden=true;return;}
    var r=node.getBoundingClientRect();highlight.hidden=false;
    Object.assign(highlight.style,{left:Math.max(5,r.left-5)+'px',top:Math.max(5,r.top-5)+'px',width:Math.min(innerWidth-10,r.width+10)+'px',height:Math.min(innerHeight-10,r.height+10)+'px'});
}
function renderTutorial(){
    var step=TUTORIAL_STEPS[tutorialIndex];
    if(step.app){if(step.app==='market'){marketFavoritesOnly=false;showMarket();}openWin(step.app);}
    $('tutorialCounter').textContent='Шаг '+(tutorialIndex+1)+' из '+TUTORIAL_STEPS.length;
    $('tutorialIcon').innerHTML=appIconSvg(step.icon);$('tutorialTitle').textContent=step.title;$('tutorialText').textContent=step.text;$('tutorialNote').textContent=step.note;
    $('tutorialProgress').value=tutorialIndex+1;$('tutorialProgress').max=TUTORIAL_STEPS.length;
    $('tutorialBack').disabled=tutorialIndex===0;$('tutorialNext').textContent=tutorialIndex===TUTORIAL_STEPS.length-1?'Начать играть →':'Далее →';
    var demo=$('tutorialDemo');demo.hidden=!step.demo;demo.innerHTML=step.demo==='chat'?'<span class="tutorial-demo-label">ПРИМЕР · БЕЗ СДЕЛКИ</span><div class="tutorial-bubble">Здравствуйте! Машина ещё продаётся?</div><div class="tutorial-bubble seller">Да. Что хотите узнать?</div>':step.demo==='signature'?'<span class="tutorial-demo-label">ВАША ПОДПИСЬ В ДКП</span>'+signatureHtml(playerIdentity.signature,'Пример вашей подписи в договоре'):'';
    writeSaved('tutorialProgress',{version:1,status:'active',step:tutorialIndex});
    positionTutorialHighlight();requestAnimationFrame(positionTutorialHighlight);
    var win=step.app && $('win-'+step.app);if(win)Promise.all(win.getAnimations().map(function(a){return a.finished.catch(function(){});})).then(positionTutorialHighlight);
    $('tutorialOverlay').querySelector('.tutorial-copy').scrollTop=0;
    $('tutorialNext').focus({preventScroll:true});
}
function finishTutorial(skipped){
    if(!onboardingActive)return;
    writeSaved('tutorialProgress',{version:1,status:skipped?'skipped':'done',step:tutorialIndex});
    $('tutorialOverlay').hidden=true;$('desktop').inert=false;
    if(tutorialSaved){
        Object.keys(openWindows).forEach(function(id){if(tutorialSaved.open.indexOf(id)===-1)closeWin(id);});
        tutorialSaved.minimized.forEach(function(id){if(openWindows[id])minimizeWin(id);});
        marketFavoritesOnly=tutorialSaved.favorites;
        if(tutorialSaved.view==='garage')showGarage();else if(tutorialSaved.view==='deals')showDeals();else showMarket();
        if(tutorialSaved.active && openWindows[tutorialSaved.active] && tutorialSaved.minimized.indexOf(tutorialSaved.active)===-1)focusWin(tutorialSaved.active);
    }
    onboardingActive=false;lastRealMs=Date.now();updateGameSpeed();
    if(tutorialFocus && tutorialFocus.isConnected && tutorialFocus.getClientRects().length)tutorialFocus.focus({preventScroll:true});
    else $('taskList').querySelector('button').focus({preventScroll:true});
    tutorialSaved=null;
}
function initOnboarding(){
    var root=document.createElement('section');root.id='tutorialOverlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','tutorialTitle');root.setAttribute('aria-describedby','tutorialText');
    root.innerHTML='<div class="tutorial-shade"></div><div id="tutorialHighlight" hidden></div><div class="tutorial-panel"><div class="tutorial-top"><span id="tutorialCounter" aria-live="polite"></span><button type="button" id="tutorialSkip">Пропустить</button></div><progress id="tutorialProgress" aria-label="Прогресс обучения"></progress><div class="tutorial-copy"><div id="tutorialIcon"></div><h2 id="tutorialTitle"></h2><p id="tutorialText"></p><div id="tutorialDemo" hidden></div><p id="tutorialNote"></p></div><div class="tutorial-actions"><button type="button" id="tutorialBack">← Назад</button><button type="button" id="tutorialNext">Далее →</button></div></div>';
    document.body.appendChild(root);
    $('welcomeHelp').addEventListener('click',function(){localStorage.setItem('onboardingWelcomeSeen','1');var welcome=$('welcomeOverlay');welcome.classList.remove('open');Promise.all(welcome.getAnimations().map(function(a){return a.finished.catch(function(){});})).then(showIdentitySetup);});
    $('tutorialReplay').addEventListener('click',function(){startTutorial(0);});
    $('tutorialNext').addEventListener('click',function(){if(tutorialIndex===TUTORIAL_STEPS.length-1)finishTutorial(false);else{tutorialIndex++;renderTutorial();}});
    $('tutorialBack').addEventListener('click',function(){if(tutorialIndex>0){tutorialIndex--;renderTutorial();}});
    $('tutorialSkip').addEventListener('click',function(){finishTutorial(true);});
    document.addEventListener('keydown',function(event){
        if($('welcomeOverlay').classList.contains('open')){if(event.key==='Tab' || event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();$('welcomeHelp').focus();}return;}
        if(!onboardingActive)return;
        if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finishTutorial(true);}
        if(event.key==='Tab'){var controls=Array.from(root.querySelectorAll('button:not(:disabled)')),first=controls[0],last=controls[controls.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}}
    },true);
    window.addEventListener('resize',function(){if(onboardingActive && !tutorialFrame)tutorialFrame=requestAnimationFrame(positionTutorialHighlight);});
}
