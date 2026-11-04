 // The walkthrough observes the same saved contracts and chat stages as free play.
 void purchaseTutorial() {
     if (!session || !session->ready() || closing) return;
     if (!session->state.contains("purchaseTutorial") ||
         !session->state.at("purchaseTutorial").is_array()) {
         if (purchaseGuide) {
             purchaseGuide->hide();
             purchaseGuide->deleteLater();
             purchaseGuide = nullptr;
         }
         return;
     }
     if (purchaseGuide) return;
     auto guide = new QDockWidget(QStringLiteral("Первая покупка"), this);
     purchaseGuide = guide;
     guide->setFeatures(QDockWidget::NoDockWidgetFeatures);
     auto panel = new QWidget(guide);
     auto layout = new QVBoxLayout(panel);
     auto step = new QLabel(panel);
     step->setObjectName("heading");
     auto tip = new QLabel(panel);
     tip->setTextFormat(Qt::PlainText);
     tip->setWordWrap(true);
     panel->setMinimumWidth(220);
     panel->setMaximumWidth(280);
     layout->addWidget(step);
     layout->addWidget(tip);
     auto action = button(QStringLiteral("Открыть авторынок"));
     auto skip = button(QStringLiteral("Закрыть подсказки"));
     layout->addWidget(action);
     layout->addStretch();
     layout->addWidget(skip);
     guide->setWidget(panel);
     addDockWidget(Qt::RightDockWidgetArea, guide);
     auto finish = [this, guide] {
         auto draft = session->state;
         draft.erase("purchaseTutorial");
         try { session->commit(draft); }
         catch (const std::exception& e) { showError(QString::fromUtf8(e.what())); return; }
         purchaseGuide = nullptr;
         guide->hide();
         guide->deleteLater();
     };
     connect(skip, &QPushButton::clicked, guide, finish);
     connect(action, &QPushButton::clicked, guide, [this, action] {
         const auto target = action->property("tutorialTarget").toString();
         if (target == "garage") garageApp();
         else if (target == "meetings") meetingsApp();
         else market();
     });
     auto timer = new QTimer(guide);
     auto refresh = [this, step, tip, action, skip] {
         const auto& state = session->state;
         if (!state.contains("purchaseTutorial")) return;
         int number = 1;
         QString text = QStringLiteral("→ Откройте авторынок. Выберите машину в своём городе по карману, откройте объявление и нажмите «Связаться с продавцом».");
         QString target = "market";
         QString label = QStringLiteral("Открыть авторынок");
         if (perekup::tutorialPurchaseCompleted(state, state.at("purchaseTutorial"))) {
             number = 7;
             text = QStringLiteral("ДКП подписан. Вы сами завершили покупку! → Откройте гараж и найдите свою машину.");
             target = "garage";
             label = QStringLiteral("Открыть гараж");
             skip->setText(QStringLiteral("Завершить обучение"));
         } else if (state.contains("chat") && state["chat"].is_object()) {
             const auto& chat = state["chat"];
             const auto stage = chat.value("stage", "");
             if (chat.value("mode", "") == "buy" && !chat.value("done", false)) {
                 if (stage == "talk") {
                     number = 2;
                     text = QStringLiteral("→ Спросите о состоянии машины. Затем предложите свою сумму или согласитесь с ценой продавца.");
                 } else if (stage == "schedule") {
                     number = 3;
                     text = QStringLiteral("→ В переписке выберите время и нажмите «Назначить встречу».");
                 } else if (stage == "go" || stage == "waiting" || stage == "inspection") {
                     number = stage == "go" ? 4 : 5;
                     target = "meetings";
                     label = QStringLiteral("Открыть встречи");
                     text = stage == "go"
                         ? QStringLiteral("→ Откройте встречи. Выберите свою встречу и нажмите «Прибыть на встречу», когда наступит её время.")
                         : QStringLiteral("→ Дождитесь продавца и осмотра. Прочитайте отчёт о состоянии и решите, устраивают ли вас условия.");
                 } else if (stage == "event" || stage == "contract") {
                     number = 6;
                     target = "meetings";
                     label = QStringLiteral("Открыть встречи");
                     text = QStringLiteral("→ Откройте ДКП. Сверьте данные, введите свою подпись из четырёх букв, поставьте галочку и нажмите «Подписать ДКП».");
                 }
             }
         }
         step->setText(QStringLiteral("%1 / 7").arg(number));
         tip->setText(text);
         action->setText(label);
         action->setProperty("tutorialTarget", target);
     };
     connect(timer, &QTimer::timeout, guide, refresh);
     refresh();
     timer->start(300);
 }

 void addPurchaseHint(QVBoxLayout* layout, const QString& text) {
     if (!purchaseGuide || !purchaseGuide->isVisible()) return;
     auto hint = new QLabel(QStringLiteral("→ ") + text);
     hint->setTextFormat(Qt::PlainText);
     hint->setWordWrap(true);
     hint->setObjectName("stagePanel");
     layout->insertWidget(0, hint);
 }
