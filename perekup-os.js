'use strict';
var marketFavorites=readSaved('marketFavorites',[]),marketFavoritesOnly=false;
marketFavorites=Array.isArray(marketFavorites)?marketFavorites.filter(function(id){return Number.isSafeInteger(id);}):[];
function favoriteButton(id){var saved=marketFavorites.indexOf(id)!==-1;return '<button type="button" class="os-favorite'+(saved?' selected':'')+'" data-favorite="'+id+'" aria-label="'+(saved?'Удалить из избранного':'В избранное')+'" aria-pressed="'+saved+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button>';}
function initPerekupOS(){
    var body=$('win-market').querySelector('.win-body'),tabs=body.querySelector('.tabs');
    var sidebar=document.createElement('aside');sidebar.className='os-sidebar';sidebar.setAttribute('aria-label','Разделы авторынка');
    var main=document.createElement('div');main.className='os-market-main';
    Array.from(body.children).forEach(function(child){if(child!==tabs)main.appendChild(child);});
    sidebar.appendChild(tabs);body.append(sidebar,main);
    $('tabMarket').innerHTML=appIconSvg('market')+'<span>Объявления</span>';
    $('tabGarage').innerHTML=appIconSvg('garage')+'<span>Мой гараж</span>';
    $('tabDeals').innerHTML=appIconSvg('clock')+'<span>История сделок</span>';
    var favorite=document.createElement('button');favorite.type='button';favorite.id='tabFavorites';favorite.className='tab';favorite.innerHTML='<span class="os-heart">♡</span><span>Избранное</span>';tabs.insertBefore(favorite,$('tabGarage'));
    favorite.addEventListener('click',function(){marketFavoritesOnly=true;showMarket();});
    var city=document.createElement('div');city.className='os-sidebar-city';city.innerHTML='<svg viewBox="0 0 160 80" fill="none" stroke="currentColor"><path d="M0 70h160M8 70V40h18v30m8 0V25h15v45m9 0V12h19v58m9 0V31h24v39m10 0V20h12v50m7 0V45h14v25M0 78h160M42 25V16m25-4V3"/></svg><span></span>';sidebar.appendChild(city);
    var location=$('playerLocation'),updateCity=function(){city.querySelector('span').textContent=location.textContent;};updateCity();new MutationObserver(updateCity).observe(location,{childList:true,characterData:true,subtree:true});
    var sources=$('marketSources');sidebar.appendChild(sources);
    var header=document.createElement('div');header.className='os-market-toolbar';
    var wallet=$('balance').parentElement;header.append($('fCity'),wallet,$('fSearch'),$('filterToggle'));$('filters').prepend(header);
    $('fSearch').placeholder='Марка или модель';
    $('content').addEventListener('click',function(event){var button=event.target.closest('[data-favorite]');if(!button)return;event.stopImmediatePropagation();var id=Number(button.dataset.favorite),index=marketFavorites.indexOf(id);if(index<0)marketFavorites.push(id);else marketFavorites.splice(index,1);writeSaved('marketFavorites',marketFavorites);showMarket();},true);
    document.querySelector('.tb-logo').innerHTML='PEREKUP OS <i></i>';
    var dock=$('taskbar'),launcher=document.createElement('button');launcher.type='button';launcher.className='os-launcher';launcher.textContent='P';launcher.title='Все приложения';launcher.setAttribute('aria-label','Все приложения');launcher.setAttribute('aria-expanded','false');dock.prepend(launcher);
    var menu=document.createElement('nav');menu.className='os-app-menu';menu.hidden=true;menu.setAttribute('aria-label','Приложения Perekup OS');menu.innerHTML='<strong>PEREKUP OS</strong>'+ICONS.map(function(app){return '<button type="button" data-launch-app="'+app.id+'">'+appIconSvg(app.id)+'<span>'+app.label.replace(/<br>/g,' ')+'</span></button>';}).join('');dock.appendChild(menu);
    launcher.addEventListener('click',function(){menu.hidden=!menu.hidden;launcher.setAttribute('aria-expanded',String(!menu.hidden));});
    menu.addEventListener('click',function(event){var button=event.target.closest('[data-launch-app]');if(!button)return;openWin(button.dataset.launchApp);menu.hidden=true;launcher.setAttribute('aria-expanded','false');});
    document.addEventListener('pointerdown',function(event){if(!dock.contains(event.target)){menu.hidden=true;launcher.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'){menu.hidden=true;launcher.setAttribute('aria-expanded','false');}});
    var status=document.createElement('div');status.className='os-dock-status';status.append($('musicToggle'),$('clock'));dock.appendChild(status);
    // Keep location available outside the market without showing the old top bar.
    $('clock').title='Игровое время';dock.appendChild(location.parentElement);location.parentElement.classList.add('os-dock-location');
    window.addEventListener('beforeunload',function(){localStorage.setItem('perekupOSLayout','1');});
}
