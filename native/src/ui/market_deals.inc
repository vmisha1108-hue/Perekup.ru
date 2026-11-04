 void readDealHistory(const Json& row){
  SellerChatDialog dialog(this);dialog.setWindowTitle(QStringLiteral("История переписки"));
  auto layout=new QVBoxLayout(&dialog);auto transcript=new QTextEdit;transcript->setReadOnly(true);
  QStringList lines;for(const auto& line:row.value("log",Json::array()))if(line.is_string())lines<<qs(line.get<std::string>());
  transcript->setPlainText(lines.isEmpty()?QStringLiteral("Сообщений в этой переписке пока нет."):lines.join("\n\n"));layout->addWidget(transcript);
  auto bottom=new QHBoxLayout;auto close=button(QStringLiteral("Закрыть"));bottom->addWidget(close);bottom->addWidget(new ChatResizeGrip(&dialog));layout->addLayout(bottom);
  connect(close,&QPushButton::clicked,&dialog,&QDialog::accept);dialog.resize(600,560);dialog.exec();
 }
 void openDealMeeting(const QString& id){meetingsApp();if(windows.count("meetings"))if(auto selector=windows["meetings"]->findChild<QComboBox*>("meetingSelector")){auto index=selector->findData(id);if(index>=0)selector->setCurrentIndex(index);}}
 QWidget* marketDealsPage(){
  auto body=new QWidget;body->setObjectName("marketDealsPage");auto layout=new QVBoxLayout(body);layout->setContentsMargins(20,20,20,16);layout->setSpacing(14);
  auto title=new QLabel(QStringLiteral("Мои сделки"));title->setObjectName("heading");layout->addWidget(title);
  auto tabs=new QTabWidget;tabs->setObjectName("marketDealsTabs");layout->addWidget(tabs,1);
  QList<QVBoxLayout*> lists;
  for(const auto& name:QStringList{QStringLiteral("Мои объявления"),QStringLiteral("Входящие"),QStringLiteral("Исходящие")}){
   auto scroll=new QScrollArea;scroll->setWidgetResizable(true);auto page=new QWidget;auto rows=new QVBoxLayout(page);rows->setContentsMargins(8,10,8,10);rows->setSpacing(12);rows->setAlignment(Qt::AlignTop);lists<<rows;scroll->setWidget(page);tabs->addTab(scroll,name);
  }
  auto footer=new QHBoxLayout;auto garage=button(QStringLiteral("Выставить машину из гаража"));auto history=button(QStringLiteral("Подписанные договоры"));history->setProperty("secondary",true);footer->addWidget(garage);footer->addWidget(history);layout->addLayout(footer);
  connect(garage,&QPushButton::clicked,body,[this]{garageApp();});connect(history,&QPushButton::clicked,body,[this]{documentsApp();});
  auto refresh=[this,body,tabs,lists]{
   if(!session||!session->ready()||closing||QApplication::activeModalWidget())return;
   auto data=perekup::nativeDealInbox(session->state);auto revision=qs(data.dump());if(body->property("revision").toString()==revision)return;body->setProperty("revision",revision);
   const QStringList keys{"listings","incoming","outgoing"};const QStringList labels{QStringLiteral("Мои объявления"),QStringLiteral("Входящие"),QStringLiteral("Исходящие")};
   for(int section=0;section<3;++section){
    auto rows=lists[section];while(auto item=rows->takeAt(0)){delete item->widget();delete item;}
    const auto& records=data[keys[section].toStdString()];tabs->setTabText(section,labels[section]+QStringLiteral(" (%1)").arg(qulonglong(records.size())));
    if(records.empty()){
     auto empty=new QLabel(section==0?QStringLiteral("Активных объявлений пока нет. Выставьте автомобиль из гаража."):section==1?QStringLiteral("Откликов пока нет. Здесь появятся покупатели ваших машин и назначенные с ними встречи."):QStringLiteral("Вы ещё не писали продавцам. Откройте объявление и свяжитесь с продавцом."));empty->setObjectName("muted");empty->setWordWrap(true);rows->addWidget(empty);continue;
    }
    for(const auto& row:records){
     auto id=row.value("carId",0LL);auto key=std::to_string(id);auto card=new QFrame;card->setObjectName(section==0?"ownListingCard":section==1?"incomingDealCard":"outgoingDealCard");card->setProperty("carId",qlonglong(id));card->setStyleSheet("QFrame{border:1px solid rgba(138,153,152,70);border-radius:8px;}");auto col=new QVBoxLayout(card);col->setContentsMargins(16,14,16,14);col->setSpacing(9);
     auto vehicle=new QLabel(carsById.contains(key)?qs(carsById.at(key).value("name","")):QStringLiteral("Автомобиль №%1").arg(qlonglong(id)));vehicle->setStyleSheet("font-size:15px;font-weight:600;border:0;");vehicle->setWordWrap(true);col->addWidget(vehicle);
     QString summary;
     if(section==0)summary=QStringLiteral("Цена: ")+money(perekup::num(row,"amount"))+QStringLiteral(" · Откликов: %1").arg(row.value("responses",0))+(row.value("meeting",false)?QStringLiteral(" · назначена встреча"):row.value("responses",0)==0?QStringLiteral(" · ожидаем покупателей"):QString());
     else{
      auto stage=row.value("stage","");auto status=stage=="closed"?QStringLiteral("Продавец завершил диалог"):row.value("done",false)?QStringLiteral("Диалог завершён"):stage=="go"?QStringLiteral("Встреча назначена"):stage=="schedule"?QStringLiteral("Цена согласована"):stage=="response"?QStringLiteral("Новый отклик"):QStringLiteral("Переписка");
      summary=qs(row.at("npc").value("name","Собеседник"))+" · "+money(perekup::num(row,"amount"))+"\n"+status;
      if(stage=="go"&&perekup::num(row,"when")>0)summary+=" · "+QDateTime::fromMSecsSinceEpoch(qint64(perekup::num(row,"when"))).toString("dd.MM HH:mm");
     }
     auto detail=new QLabel(summary);detail->setWordWrap(true);detail->setStyleSheet("border:0;");col->addWidget(detail);
     auto actions=new QHBoxLayout;
     if(section==0){auto manage=button(QStringLiteral("Объявление и отклики"));manage->setObjectName("manageOwnListing");actions->addWidget(manage);connect(manage,&QPushButton::clicked,body,[this,id]{saleApp(id);});}
     else{
      if(!row.value("log",Json::array()).empty()){auto read=button(QStringLiteral("Читать переписку"));read->setProperty("secondary",true);actions->addWidget(read);connect(read,&QPushButton::clicked,body,[this,row]{readDealHistory(row);});}
      if(!row.value("done",false)&&row.value("stage","")!="closed"&&carsById.contains(key)){
       auto stage=row.value("stage","");auto action=button(stage=="go"?QStringLiteral("Открыть встречу"):section==1?QStringLiteral("Ответить покупателю"):QStringLiteral("Продолжить переписку"));action->setObjectName("openDealChat");actions->addWidget(action);
       connect(action,&QPushButton::clicked,body,[this,row,key,section,stage]{if(stage=="go")openDealMeeting(qs(row.value("id","")));else if(carsById.contains(key))buyChat(carsById.at(key),section==1?row.value("id",""):std::string());});
      }
     }
     actions->addStretch();col->addLayout(actions);rows->addWidget(card);
    }
   }
  };
  auto timer=new QTimer(body);connect(timer,&QTimer::timeout,body,refresh);timer->start(1000);refresh();return body;
 }
 void showMarketSection(int section){
  market();if(!windows.count("market"))return;auto win=windows["market"];if(auto pages=win->findChild<QStackedWidget*>("marketPages"))pages->setCurrentIndex(section);
  for(const auto& id:QStringList{"marketAll","marketFavorites","marketMyDeals"})if(auto b=win->findChild<QPushButton*>(id)){
   b->setProperty("selected",section==1?id=="marketMyDeals":id==(marketFavorites?"marketFavorites":"marketAll"));b->style()->unpolish(b);b->style()->polish(b);
  }
 }
