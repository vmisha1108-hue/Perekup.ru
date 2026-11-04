'use strict';
/* Display-only localization. Source text and persisted game records stay untouched. */
(function(){
    var catalogs=window.PEREKUP_LOCALES||{},locale=readSaved('perekupLanguage','ru');
    if(locale!=='ru'&&!catalogs[locale])locale='ru';
    var textState=new WeakMap(),attrState=new WeakMap(),roots=new Set(),scheduled=false;
    var ignore='script,style,noscript,textarea,[contenteditable],.signature-word,.signature-canvas,#settingsPlayerName,#settingsAvatar,#settingsSignaturePreview,.contract-preview,.contract-signed,.contract-docs dd,.signature-owner,.msg,.car-description,[data-no-i18n]';
    function t(value){
        value=String(value);if(locale==='ru')return value;
        var c=catalogs[locale],key=value.trim().replace(/\s+/g,' '),result=c.messages[key];
        if(result==null){for(var i=0;i<(c.patterns||[]).length;i++){var p=c.patterns[i];if(p[0].test(key)){result=key.replace(p[0],p[1]);break;}}}
        return result==null?value:value.replace(value.trim(),result);
    }
    function text(node){
        if(!node.parentElement||node.parentElement.closest(ignore))return;
        // An option without an explicit value uses its text as its value. Never change it.
        if(node.parentElement.tagName==='OPTION'&&!node.parentElement.hasAttribute('value'))return;
        var current=node.data,old=textState.get(node),source=old&&old.rendered===current?old.source:current,rendered=t(source);
        textState.set(node,{source:source,rendered:rendered});if(current!==rendered)node.data=rendered;
    }
    function attributes(el){
        if(el.closest(ignore))return;
        var old=attrState.get(el)||{};
        ['title','aria-label','placeholder','label'].forEach(function(name){
            if(name==='label'&&el.tagName!=='OPTGROUP')return;
            if(!el.hasAttribute(name))return;
            var current=el.getAttribute(name),entry=old[name],source=entry&&entry.rendered===current?entry.source:current,rendered=t(source);
            old[name]={source:source,rendered:rendered};if(current!==rendered)el.setAttribute(name,rendered);
        });attrState.set(el,old);
    }
    function translate(root){
        if(root.nodeType===3){text(root);return;}
        if(root.nodeType!==1||root.closest(ignore))return;
        attributes(root);root.querySelectorAll('[title],[aria-label],[placeholder],optgroup[label]').forEach(attributes);
        var walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walk.nextNode())text(walk.currentNode);
    }
    function flush(){scheduled=false;var list=Array.from(roots);roots.clear();list.forEach(function(node){if(node.isConnected&&!list.some(function(other){return other!==node&&other.contains&&other.contains(node);}))translate(node);});}
    new MutationObserver(function(records){
        records.forEach(function(r){if(r.type==='childList')r.addedNodes.forEach(function(n){if(n.nodeType===1||n.nodeType===3)roots.add(n);});else roots.add(r.target);});
        if(roots.size&&!scheduled){scheduled=true;queueMicrotask(flush);}
    }).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','label']});
    function setLanguage(next){
        if(next!=='ru'&&!catalogs[next])return false;
        // Persist before changing the UI, so a write failure leaves the previous language intact.
        writeSaved('perekupLanguage',next);locale=next;document.documentElement.lang=locale;
        document.querySelectorAll('[data-language-select]').forEach(function(s){s.value=locale;});translate(document.body);
        window.dispatchEvent(new CustomEvent('perekup-language-change',{detail:{language:locale}}));return true;
    }
    function selector(parent,startup){
        var section=document.createElement(startup?'div':'section');section.className=startup?'startup-language':'settings-section settings-language';
        section.innerHTML=startup?'<span>Язык / Language</span>':'<h2>Язык / Language</h2><p>Язык интерфейса. Тексты объявлений, переписок, договоров и часть справки пока доступны на русском.</p>';
        var select=document.createElement('select');select.dataset.languageSelect='';select.setAttribute('aria-label','Язык / Language');
        [['ru','Русский']].concat(Object.keys(catalogs).map(function(code){return [code,catalogs[code].name+(code==='en'?' (beta)':'')];})).forEach(function(pair){var option=document.createElement('option');option.value=pair[0];option.textContent=pair[1];select.appendChild(option);});select.value=locale;
        select.onchange=function(){try{setLanguage(this.value);}catch(e){this.value=locale;alert(t('Не удалось сохранить выбор языка.'));}};section.appendChild(select);parent.prepend(section);
    }
    var originalSettings=initSettings;initSettings=function(){originalSettings();selector(document.querySelector('#win-settings .win-body'),false);};
    selector(document.querySelector('#displayIntro .portable-dialog'),true);
    selector(document.querySelector('#welcomeOverlay .sale-modal'),true);
    ['confirm','alert','prompt'].forEach(function(name){var original=window[name];window[name]=function(message){var args=Array.from(arguments);args[0]=t(message);return original.apply(window,args);};});
    window.PerekupI18n=Object.freeze({t:t,setLanguage:setLanguage,get language(){return locale;},languages:Object.freeze(['ru'].concat(Object.keys(catalogs)))});
    if(typeof BACKUP_KEYS!=='undefined'&&BACKUP_KEYS.indexOf('perekupLanguage')<0)BACKUP_KEYS.push('perekupLanguage');
    document.documentElement.lang=locale;translate(document.body);
})();
