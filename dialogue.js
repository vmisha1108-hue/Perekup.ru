'use strict';

function dialogueIntent(text){
    var t = String(text).toLowerCase().replace(/ё/g, 'е').trim();
    var topic = /пробег|километр|скручен|\bкм\b/.test(t) ? 'mileage'
        : /состояни|косяк|недостат|ржав|кузов|красил|битая|дтп|царапин/.test(t) ? 'condition'
        : /ремонт|обслуж|менял|замен|масло|требует вложени/.test(t) ? 'service'
        : /двигател|мотор|коробк|автомат|механик|вариатор|расход|лошад|мощност/.test(t) ? 'engine'
        : /какого года|какой год|год выпуск/.test(t) ? 'year'
        : /документ|птс|стс|владел|собствен|залог|ограничен|учет|(?:^|[^а-яa-z])(?:вин|vin)(?=$|[^а-яa-z])/.test(t) ? 'documents'
        : /где|адрес|город|посмотр|осмотр|встрет|приех|когда|сегодня|завтра/.test(t) ? 'meeting'
        : /обмен|доплат/.test(t) ? 'trade'
        : /почему прода|зачем прода|причина продаж/.test(t) ? 'reason'
        : /фото|фотограф|снимок|видео/.test(t) ? 'photos'
        : /актуальн|еще прода|не продан|в наличии/.test(t) ? 'available'
        : /сколько стоит|какая цена|что по цене|цена актуальн|почему.*цен/.test(t) ? 'price'
        : /как дела|как настроение|как жизнь/.test(t) ? 'personal' : null;
    var priceIntent = /моя цена|хочу за|предлагаю\s*(?:\d|(?:один\s+)?миллион)|отда(?:шь|дите|ете).*за|готов.*(?:дать|отдать|купить).*(?:\d|миллион)|возьму за|беру за|даю\s*(?:\d|миллион)|сойдемся на|уступ.*до|скин.*до|за\s*\d|максимум\s*\d|соглас\S* на/.test(t);
    var apology = /извини|прости|погоряч|сорвался|сорвалась|не хотел.*(?:обид|груб)|мой косяк|был неправ|была неправа/.test(t) && !/не буду.*(?:извин|просить прощ)|не собираюсь.*извин/.test(t);
    var quotedApology = apology && /назвал|обозвал|за (?:слова|оскорб|груб)|за то[ ,]+что/.test(t) && !/но ты|все равно ты/.test(t);
    var personalInsult = /(?:^|[^а-я])(?:дурак[а-я]*|дура|тупой|тупая|идиот[а-я]*|дебил[а-я]*|лох(?:ом|а|и)?|жмот[а-я]*|жадн[а-я]*|урод[а-я]*|мудак[а-я]*|мраз[а-я]*|долбо[а-я]*|пидор[а-я]*|пидар[а-я]*|сволоч[а-я]*|чмо|козел|ублюд[а-я]*|кретин[а-я]*|придур[а-я]*)(?:$|[^а-я])/.test(t)
        || /заткнись|иди.*(?:нахуй|на хуй|в жопу)|пошел ты|пошла ты|не пизди|хватит пиздеть/.test(t)
        || /(?:^|[^а-я])(?:ты|вы|твоя|ваша)(?:[^а-я]|$).*(?:говно|дерьмо|сука|ебанут)|(?:говно|дерьмо).*(?:^|[^а-я])(?:ты|вы)(?:[^а-я]|$)/.test(t);
    if(/(?:^|[.!?] *)(?:я|сам|сама) (?:дурак|дура|идиот|дебил|тупой|тупая)/.test(t) && !/(?:^|[^а-я])(?:ты|вы)(?:[^а-я]|$)/.test(t)) personalInsult = false;
    var threat = /(?:тебя|тебе|вам|вас).*(?:убью|побью|изобью|сломаю)|(?:убью|побью|изобью|сломаю).*(?:тебя|тебе|вам|вас)|найду тебя|сожгу.*(?:машин|гараж)/.test(t);
    var suspect = /обманыва|обманщик|мошенник|разводишь|врешь|вранье|пытаешься развести/.test(t);
    var caution = /без обмана|не обман|не мошенник|не развод|точно.*честно/.test(t);
    var negativePrice = /не (?:беру|возьму|отдам|готов|согласен|согласна|хочу)[^.!?]*(?:\d|миллион)/.test(t);
    var priceText = t;
    if(negativePrice){
        var positiveClauses = t.split(/,(?!\d)|;|\s+(?:но|а|зато)\s+/).filter(function(clause){
            return /(?:предлагаю|моя цена|готов дать|возьму за|беру за|даю|хочу за).*(?:\d|миллион)/.test(clause)
                && !/не (?:беру|возьму|отдам|готов|согласен|согласна|хочу)/.test(clause);
        });
        priceText = positiveClauses.length ? positiveClauses[positiveClauses.length - 1] : '';
    }
    var amount = null;
    if(!topic || priceIntent){
        var unit = /(\d[\d\s]*(?:[.,]\d+)?)\s*(млн|миллион\S*|тыс\S*|тыщ\S*|[кk](?!м)(?=\s|$|[.!?,]))/.exec(priceText);
        var rubles = /(\d[\d\s]*(?:[.,]\d+)?)\s*(?:₽|руб\S*|р(?=\s|$|[.!?,]))/.exec(priceText);
        var bare = /^\d[\d\s]*[.!?]?$/.test(priceText);
        var number = unit || rubles || ((priceIntent || bare || /скин|сброс|уступ|добав|наки/.test(priceText)) ? /(\d[\d\s]*)/.exec(priceText) : null);
        if(number){
            amount = Number(number[1].replace(/\s/g, '').replace(',', '.'));
            if(unit) amount *= /млн|миллион/.test(unit[2]) ? 1000000 : 1000;
            amount = Math.round(amount);
            if(!Number.isSafeInteger(amount) || amount <= 0) amount = null;
        }else if(!/\d/.test(priceText) && /(?:^|[^а-я])(?:один\s+)?миллион(?:$|[^а-я])/.test(priceText))amount=1000000;
    }
    return {
        offer:amount, topic:topic,
        raw:t, priceIntent:priceIntent, apology:apology,
        rude:personalInsult && !quotedApology, threat:threat,
        accuse:suspect && !caution && !quotedApology, caution:caution,
        swearing:!personalInsult && /(?:^|[^а-я])(?:бля[а-я]*|сука|пиздец|ебать|хуй[а-я]*|говно|дерьмо)(?:$|[^а-я])/.test(t),
        pressure:/быстрее отвечай|отвечай быстрее|шевелись|не тяни|последний шанс|не трать мое время|решай сейчас/.test(t),
        joke:/шучу|шутка|ахаха|ха-ха|сарказм/.test(t),
        goodbye:/до свидания|всего доброго|удачи с продажей|не буду отвлекать|^пока[.!]*$/.test(t),
        followup:/^а\s+(?:что с ним|что с ней|еще|дальше)|подробнее|что именно|не понял|не поняла|насчет этого/.test(t),
        topics:[['mileage',/пробег|километр|скручен/],['condition',/состояни|косяк|недостат|ржав|кузов|красил|битая|дтп|царапин/],['service',/ремонт|обслуж|менял|замен|масло|вложени/],['engine',/двигател|мотор|коробк|автомат|механик|вариатор|расход|мощност/],['year',/какого года|какой год|год выпуск/],['documents',/документ|птс|стс|владел|собствен|залог|ограничен|учет|(?:^|[^а-яa-z])(?:вин|vin)(?=$|[^а-яa-z])/]].filter(function(pair){return pair[1].test(t);}).map(function(pair){return pair[0];}),
        adjustment:amount != null && !/\bдо\s*\d|до\s*\d/.test(t) ? (/скин|сброс|скидк|уступ.*на/.test(t) ? -1 : /добав|наки/.test(t) ? 1 : 0) : 0,
        greet:/привет|здравств|добрый день|добрый вечер|доброе утро|салют|здарова|хай/.test(t),
        praise:/красив|классн|отличн|крут|уважа|нравитс|супер|шикарн|легенд/.test(t) && !/не нрав|не красив|сарказм/.test(t),
        polite:/пожалуйста|спасибо|благодар|будьте добры|извини|простите/.test(t),
        haggle:/скидк|дешевл|торг|уступ|дорого|дороже|сбавь|снизь|сброс|сойдемся|подвинь|скин/.test(t),
        decline:/не соглас|не беру|не подходит|не устраивает|не договорились|передумал|отказыва/.test(t),
        agree:!(/не соглас|не беру|не готов|не договорились|не устраивает/.test(t)) && (/согласен|согласна|беру|договорились|по рукам|окей/.test(t) || /^(?:давай|идет|ок|хорошо)[.!]*$/.test(t)),
        question:/\?/.test(t)
    };
}
function dialogueMemory(){
    var memory = chat.npc.conversation;
    if(!memory || memory.version !== 1){
        memory = {version:1, warnings:0, tension:0, lastTopic:null, topics:{}, awaiting:null,
            praised:false, thanks:0, repeats:0, lastOffer:null, offerRepeats:0, apologyUsed:false};
        chat.npc.conversation = memory;
    }
    return memory;
}
function contextualIntent(text, intent){
    var memory = dialogueMemory(), t = intent.raw;
    if(!intent.topic && intent.followup && memory.lastTopic){
        intent.topic = memory.lastTopic; intent.topics = [intent.topic];
    }
    // Ответ на вопрос покупателя о пробеге не превращается в предложение цены.
    var directAnswer = /^(?:да|нет|ага|неа|конечно|хорошо|ок|окей|все в порядке)[.! ]*$/.test(t);
    var mileageAnswer = memory.awaiting === 'mileage' && /^\d[\d\s]*(?:\s*(?:км|тыс\S*|тыщ\S*|тысяч\S*))?[.! ]*$/.test(t);
    var information = !intent.question && !/^(?:какой|какая|что|сколько|есть ли|как|почему)/.test(t)
        && intent.topic && /\d|в порядке|чистые|менял|заменил|не ремонтировал|обслуживал|не скручен/.test(t);
    if(chat.mode === 'sell' && (!chat.trade || /у меня|мой|моей|моя/.test(t)) && !intent.priceIntent && !/₽|руб/.test(t)
        && ((memory.awaiting && (directAnswer || mileageAnswer)) || information)){
        intent.answer = true; intent.topic = intent.topic || memory.awaiting; intent.answerTopic = intent.topic;
        intent.offer = null; intent.agree = false;
    }
    return intent;
}
function rememberDialogue(intent){
    var memory = dialogueMemory();
    memory.repeats = intent.same ? memory.repeats + 1 : 0;
    if(intent.rude || intent.threat){
        memory.warnings++; memory.tension++; memory.apologyUsed = false;
    }
    memory.apologyAccepted = false;
    if(intent.apology && !intent.rude && !intent.threat && memory.tension && !memory.apologyUsed){
        memory.tension = Math.max(0,memory.tension - 1); memory.apologyUsed = true; memory.apologyAccepted = true;
    }
    if(intent.polite && !intent.rude) memory.thanks++;
    if(intent.offer != null){
        memory.offerRepeats = intent.offer === memory.lastOffer ? memory.offerRepeats + 1 : 0;
        memory.lastOffer = intent.offer;
    }
    if(intent.topic){
        memory.lastTopic = intent.topic;
        (intent.topics.length ? intent.topics : [intent.topic]).forEach(function(topic){memory.topics[topic] = (memory.topics[topic] || 0) + 1;});
    }
}
function humanConflictReply(intent){
    var memory = dialogueMemory(), patience = chat.npc.personality === 'evil' ? 2 : 3;
    if(intent.threat) return 'С угрозами разговаривать не буду. На этом закончим.';
    if(memory.tension >= patience || chat.npc.mood <= 6) return dialoguePick([
        'Я уже просил без оскорблений. Больше ничего обсуждать с вами не хочу.',
        'Мы можем не сойтись по цене, но терпеть оскорбления я не обязан. Разговор закончен.'
    ]);
    if(memory.warnings > 1) return dialogueTone({
        kind:['Вы снова оскорбляете меня. Если продолжится, разговора не будет.','Я уже просил без грубости. Мы машину обсуждаем или ругаемся?'],
        neutral:['Повторяю: без оскорблений. Ещё раз — и закончим.','Я предупреждал. С такими сообщениями договариваться не хочу.'],
        evil:['Последний раз говорю: без оскорблений.','Ещё один такой выпад — и разговор закончен.']
    });
    return dialogueTone({
        kind:['Давайте без грубости. Цена может не нравиться, но оскорблять меня зачем?','Я с вами нормально разговариваю. Давайте без оскорблений, хорошо?'],
        neutral:['Без оскорблений, пожалуйста. Есть предложение по делу — напишите.','Можем торговаться, но давайте без грубости.'],
        evil:['С таким тоном торговаться не буду. Без оскорблений.','Без грубости. Мне такой разговор совсем не нравится.']
    });
}
function humanSocialReply(intent){
    var memory = dialogueMemory();
    if(intent.apology){
        if(memory.apologyAccepted) return dialogueTone({
            kind:['Хорошо, принимаю извинения. Давайте спокойно продолжим.','Спасибо, что извинились. Не будем ругаться, обсудим нормально.'],
            neutral:['Извинения принял. Вернёмся к машине.','Хорошо. Главное, чтобы без новых оскорблений.'],
            evil:['Ладно, извинения принял. Только давайте без повторения.','Хорошо, забыли. Но дальше спокойно.']
        });
        return memory.warnings ? 'Я услышал извинения. Давайте уже спокойно по делу, доверие словами за минуту не вернёшь.'
            : dialoguePick(['Ничего страшного, всё нормально.','Да всё хорошо, не переживайте.']);
    }
    if(intent.accuse || intent.caution) return chat.mode === 'buy'
        ? 'Понимаю, что хотите проверить. Давайте сверим документы и состояние на осмотре, вслепую покупать не предлагаю.'
        : 'Проверять условия — нормально. Машину и документы посмотрим при встрече, оплату обсудим до передачи ключей.';
    if(intent.pressure) return dialogueTone({kind:['Я понимаю, что спешите, но давайте без давления.','Можно обсудить быстро, если говорить конкретно и спокойно.'],neutral:['Давайте без давления. Решение нужно обдумать.','Торопить меня не надо, условия мы ещё обсуждаем.'],evil:['Последними шансами меня не подгоняйте.','Давить на меня бесполезно. Давайте по существу.']});
    if(intent.joke) return memory.tension ? 'Понял, но такие шутки неприятны. Давайте дальше без личных выпадов.'
        : dialoguePick(['А, понял, шутите 🙂 Давайте к машине вернёмся.','Ладно, улыбнули. Что по машине хотите уточнить?']);
    return dialoguePick(['Понимаю, что раздражает. Давайте спокойно разберёмся.','Вижу, что вы расстроены. Можно сказать, что именно не устраивает, без ругани.']);
}
function humanAnswerReply(intent){
    var memory = dialogueMemory(), topic = intent.answerTopic || memory.awaiting;
    memory.awaiting = null;
    if(topic === 'mileage') return 'Понял по пробегу, спасибо. На осмотре сверим одометр и посмотрим, как машина себя чувствует.';
    if(topic === 'documents') return 'Понял. На встрече всё равно сверим документы и VIN до расчёта.';
    return dialoguePick(['Спасибо, понял вас. Тогда эти моменты проверим на осмотре.','Хорошо, что рассказали заранее. На месте посмотрим внимательнее.']);
}
function dialoguePick(lines){
    var recent = chat.log.filter(function(message){ return message.who === 'npc'; }).slice(-3).map(function(message){ return message.text; });
    var fresh = lines.filter(function(line){ return recent.indexOf(line) === -1; });
    return pick(fresh.length ? fresh : lines);
}
function dialogueTone(lines){
    var tone = chat.npc.mood < 25 ? 'evil' : chat.npc.personality;
    return dialoguePick(lines[tone]);
}
function dialogueCar(){ return chat.trade ? carById(chat.trade.carId) : chat.car; }
function dialogueFacts(topic){
    var car = dialogueCar(), desc = vehicleDesc(car), full = String(car.full || '');
    var sentences = full.split(/(?<=[.!?])\s+/);
    if(topic === 'mileage'){
        var mileage = /(\d[\d\s]*)\s*км/i.exec(desc);
        return mileage ? 'Пробег — ' + mileage[1].trim() + ' км. На встрече сверим одометр и состояние.' : 'Точный пробег сейчас не назову. Сверим одометр при осмотре.';
    }
    if(topic === 'year'){
        var year = /(?:19|20)\d{2}/.exec(car.name + ' ' + desc);
        return year ? year[0] + ' год, как указано в объявлении. На встрече сверим документы.' : 'Год выпуска сверим с документами, сейчас точнее не скажу.';
    }
    if(topic === 'engine'){
        var knownRepair = sentences.filter(function(s){return /двигател|трансмисс|коробк/i.test(s);}).slice(0,2).join(' ').trim();
        return desc + '. ' + (knownRepair ? knownRepair + ' ' : '') + 'По работе двигателя и коробки давайте проверим всё на месте.';
    }
    if(topic === 'condition' || topic === 'service'){
        var relevant = sentences.filter(function(s){ return topic === 'service' ? /ремонт|двигател|обслуж|масл|замен|диагност|трансмисс|требует/i.test(s) : /кузов|салон|ремонт|двигател|царап|состояни|требует|фары/i.test(s); });
        return relevant.length ? relevant.slice(0,2).join(' ').trim() + ' На месте покажу подробнее.' : 'Из того, что могу рассказать сейчас: ' + desc + '. По остальному лучше пройтись на осмотре, не хочу обещать лишнего.';
    }
    if(topic === 'documents') return /документ.*порядке|документ.*чист/i.test(full) ? 'По описанию документы в порядке. На встрече сверим VIN, собственника и бумаги до передачи денег.' : 'Документы и VIN нужно проверить при встрече. Не буду обещать юридическую чистоту без проверки.';
    return '';
}
function humanSmallTalk(intent){
    var price = money(chat.mode === 'buy' ? chat.ask : chat.bid);
    var memory = dialogueMemory();
    if(intent.goodbye) return dialogueTone({kind:['Хорошо, спасибо за разговор. Если захотите вернуться к машине, напишите.','Всего доброго! Буду на связи.'],neutral:['Хорошо, до свидания.','Понял. Если появятся конкретные предложения, пишите.'],evil:['Ладно, удачи.','Хорошо. На этом пока всё.']});
    if(intent.caution) return humanSocialReply(intent);
    if(intent.rude) return dialogueTone({kind:['Давайте без грубости. Я готов обсудить машину и цену спокойно.','Понимаю, что цена может не устраивать, но оскорблять друг друга зачем?'],neutral:['Давайте по существу, без личных выпадов.','Если хотите договориться, лучше спокойно обсудим условия.'],evil:['С таким тоном торговаться не буду.','Давайте без этого. Машину обсуждаем или спорим?']});
    if(intent.decline) return dialogueTone({kind:['Хорошо, понимаю. Если передумаете или предложите другой вариант, напишите.','Ничего страшного. Можем обсудить другую цену, если дело в ней.'],neutral:['Хорошо. Если захотите вернуться к разговору, я на связи.','Понял. Условия пока оставляем как есть.'],evil:['Ваше дело. Уговаривать не буду.','Не подходит — так не подходит.']});
    if(intent.topic){
        if(chat.mode === 'sell' && !chat.trade && ['mileage','condition','engine','service','documents'].indexOf(intent.topic) !== -1){
            memory.awaiting = intent.topic;
            var questions = {
                mileage:['Я как раз хотел спросить у вас: какой сейчас пробег?','Какой пробег у вашей машины? Есть чем подтвердить?'],
                condition:['Какие есть недостатки по кузову и салону? Расскажите честно, чтобы на встрече без сюрпризов.','Что по состоянию? Где крашена, что требует внимания?'],
                engine:['Как двигатель и коробка работают? Масло не ест, рывков нет?','Расскажите про двигатель: есть проблемы или нужен ремонт?'],
                service:['Что уже ремонтировали, что осталось сделать?','Когда обслуживали машину и что меняли в последнее время?'],
                documents:['Документы на вас? Есть ограничения или залог?','Что с ПТС и собственником? На встрече всё сверим.']
            };
            return dialoguePick(questions[intent.topic]);
        }
        var factualTopics = intent.topics.filter(function(topic){return ['mileage','condition','engine','service','year','documents'].indexOf(topic) !== -1;}).slice(0,3);
        if(factualTopics.length > 1){
            var multiple = factualTopics.map(dialogueFacts).filter(Boolean).join(' ');
            return (intent.followup ? 'Подробнее по этим пунктам: ' : '') + multiple;
        }
        var facts = dialogueFacts(intent.topic);
        if(facts){
            if(intent.followup){
                var details = String(dialogueCar().full || '').split(/(?<=[.!?])\s+/).filter(function(s){return /ремонт|состояни|двигател|кузов|обслуж|документ/i.test(s);}).slice(0,2).join(' ');
                return 'Да, расскажу подробнее. ' + facts + (details && facts.indexOf(details) === -1 ? ' ' + details : ' Больше точных данных сейчас нет, лучше проверим на месте.');
            }
            if(memory.topics[intent.topic] > 1) return dialoguePick(['Да, как уже писал: ' + facts,'По этому пункту ничего не изменилось: ' + facts, facts + ' Если сомневаетесь, проверим вместе.']);
            return dialogueTone({kind:['Конечно. ' + facts, facts + ' Что ещё хотели узнать?'],neutral:[facts, 'По этому поводу: ' + facts],evil:['Коротко: ' + facts, facts + ' Остальное при осмотре.']});
        }
        if(intent.topic === 'trade') return chat.trade ? dialoguePick([tradeTerms(chat.trade, chat.price == null ? chat.bid : chat.price) + '. Обе машины посмотрим до обмена.','Предлагаю ' + dialogueCar().name + '. ' + tradeTerms(chat.trade, chat.price == null ? chat.bid : chat.price)]) : dialoguePick(['В этой сделке обсуждаем деньги. По обмену пока подходящего варианта нет.','Пока без обмена. Если появится подходящее предложение, его можно будет обсудить отдельно.']);
        if(intent.topic === 'meeting'){
            var city = meetingCity(chat.mode,chat.car.id);
            if(chat.mode === 'sell') return dialoguePick(['Перед покупкой хочу посмотреть вашу машину. ' + (city ? 'Она в городе ' + city.name + ', верно? ' : '') + 'Сначала по цене договоримся, потом выберем время.','Состояние хочу проверить лично. Если по ' + price + ' сойдёмся, согласуем осмотр.']);
            return dialoguePick([(city ? 'Машина находится в городе ' + city.name + '. ' : '') + 'Сначала договоримся по цене, потом выберем время встречи. На месте спокойно осмотрите машину.','Осмотр устроим. Если ' + price + ' вас устраивает, согласуем встречу; если нет — предложите свою цену.']);
        }
        if(intent.topic === 'reason') return chat.mode === 'buy' ? dialoguePick(['Хочу сменить машину, поэтому и выставил. Спешки нет, но с реальным покупателем готов договориться.','Присматриваю другой вариант. Эту хочу передать человеку, который понимает, что покупает.']) : dialoguePick(['Ищу машину для себя. Хочется понимать, во что потом придётся вкладываться.','Подбираю подходящий вариант, смотрю состояние и цену вместе.']);
        if(intent.topic === 'photos') return dialoguePick(['Фото есть в объявлении, можно открыть покрупнее. А мелкие нюансы лучше смотреть вживую.','Посмотрите снимки в объявлении. На встрече покажу машину со всех сторон, чтобы без сюрпризов.']);
        if(intent.topic === 'available') return dialoguePick(['Да, пока актуально. Что хотели уточнить по машине?','Пока не договорились окончательно, можем обсудить. Цена сейчас ' + price + '.']);
        if(intent.topic === 'price') return dialoguePick(['Сейчас обсуждаем ' + price + '. Если есть своё предложение, напишите сумму.','По цене пока ' + price + '. Дальше зависит от того, на чём сойдёмся.']);
        if(intent.topic === 'personal') return dialogueTone({kind:['Спасибо, всё нормально! Рад, что написали. Какую машину ищете?','Дела потихоньку. Давайте и по машине попробуем договориться.'],neutral:['Нормально, спасибо. Что хотели обсудить по машине?','Всё в порядке. Я на связи, можем поговорить.'],evil:['Бывало и лучше. Давайте по машине, если есть вопросы.','Нормально. Только времени немного, давайте к делу.']});
    }
    if(intent.same) return dialoguePick(['Я прочитал ваше сообщение. Что именно хотите уточнить или изменить?','Мы это уже обсуждали. Давайте конкретнее: вопрос по машине или предложение по цене?']);
    if(intent.haggle) return dialogueTone({kind:['Давайте попробуем договориться. На какую сумму вы рассчитываете?','Небольшой торг возможен. Предложите свою цену, обсудим.'],neutral:['Можем обсудить. Какую сумму предлагаете?','Сейчас ' + price + '. Назовите свой вариант, посмотрим.'],evil:['Цена сейчас ' + price + '. Если хотите торговаться, называйте конкретную сумму.','Просто так цену менять не буду. Какое у вас предложение?']});
    if(intent.praise) return dialogueTone({kind:['Спасибо, приятно! Но давайте ещё состояние обсудим, внешность не всё решает.','Да, выглядит интересно. Что для вас важнее — состояние или цена?'],neutral:['Спасибо. Есть вопросы по машине?','Внешность — это одно. Давайте обсудим, что вас интересует по делу.'],evil:['Спасибо. Что по цене решаем?','Хорошо, что нравится. Теперь к условиям.']});
    if(intent.polite) return dialoguePick(['Не за что. Спрашивайте, если что-то осталось непонятным.','Хорошо, давайте спокойно всё обсудим.']);
    if(intent.greet) return dialogueTone({kind:['Здравствуйте! Я на связи. Что хотели узнать?','Привет! Рассказывайте, что интересует по машине.'],neutral:['Здравствуйте. Слушаю, какой у вас вопрос?','Добрый день. Машину ещё обсуждаем, спрашивайте.'],evil:['На связи. Что хотели уточнить?','Здравствуйте. Давайте сразу по делу.']});
    if(chat.mode === 'sell'){
        memory.awaiting = 'condition';
        return dialoguePick(intent.question ? ['Не совсем понял вопрос. Что вы хотите уточнить в моём предложении?','Вы про цену или про то, как будем смотреть машину?'] : ['Понял. А что по состоянию вашей машины — есть что-то, что лучше знать заранее?','Я вашу машину рассматриваю для покупки. Какие есть недостатки?','Давайте разберёмся с состоянием и ценой, тогда понятно будет, есть ли смысл встречаться.']);
    }
    return dialoguePick(intent.question ? ['Не совсем понял, что именно вы спрашиваете. Переформулируйте, пожалуйста.','Вы про машину или про условия продажи? Уточните немного.'] : ['Понял вас. Что для вас в этой машине самое важное?','Я на связи. Если есть конкретный вопрос или своя цена, давайте обсудим.','Хорошо. Давайте разберёмся, что вам подходит, а что смущает.']);
}
function humanOpening(){
    var name = chat.car.name, price = money(chat.mode === 'buy' ? chat.ask : chat.bid);
    if(chat.mode === 'buy') return dialogueTone({kind:['Здравствуйте! По ' + name + ' пишете? Сейчас прошу ' + price + '. Расскажу, что знаю по машине, спрашивайте.','Привет! Да, ' + name + ' продаётся. Цена ' + price + ', детали состояния обсудим до встречи.'],neutral:['Добрый день. ' + name + ' пока в продаже, цена ' + price + '. Что хотели уточнить?','Здравствуйте. По машине я на связи. Сейчас ' + price + ', осмотр можно согласовать.'],evil:['Здравствуйте. ' + name + ', цена ' + price + '. Давайте конкретно: вопросы по машине или своё предложение?','Да, машина продаётся. Прошу ' + price + '. Серьёзные предложения готов выслушать.']});
    return dialogueTone({kind:['Здравствуйте! Заинтересовала ваша ' + name + '. Рассчитываю на ' + price + '. Можно обсудить?','Добрый день! Присматриваюсь к ' + name + '. Могу предложить ' + price + ', состояние посмотрим на встрече.'],neutral:['Здравствуйте. ' + name + ' ещё продаётся? Мой вариант — ' + price + '.','Добрый день. Пишу по ' + name + '. Рассчитываю на ' + price + ', хочу обсудить условия.'],evil:['По ' + name + ' пишу. Моё предложение ' + price + '. Если подходит, обсудим встречу.','Здравствуйте. За вашу машину готов предложить ' + price + '. Больше пока не планировал.']});
}
