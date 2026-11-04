 bool launchMusicService(const QUrl& url) {
     if (!isMusicWebLink(url) || musicService(url).isEmpty()) return false;
     if (!QDesktopServices::openUrl(url)) return false;
#ifdef Q_OS_WIN
     music.setExternalMode(true);
     music.chooseExternal(QString());
#endif
     return true;
 }

 void searchMusicCatalog() {
     OsDialog dialog(this);
     dialog.setWindowTitle(QStringLiteral("Поиск музыки"));
     dialog.setStyleSheet("QDialog{background:#171321;} QLabel{color:#f2eafb;} "
                          "QLineEdit,QListWidget,QComboBox{background:#241b35;color:#f2eafb;}"
                          "QListWidget::item:selected{background:#59358a;}"
                          "QPushButton{background:#573488;color:white;border-radius:6px;padding:7px;}");
     auto layout = new QVBoxLayout(&dialog);
     auto query = new QLineEdit;
     query->setPlaceholderText(QStringLiteral("Трек, исполнитель, альбом или ссылка"));
     query->setMaxLength(2048);
     layout->addWidget(query);
     auto type = new QComboBox;
     type->addItems({QStringLiteral("Песни"), QStringLiteral("Альбомы")});
     layout->addWidget(type);
     auto status = new QLabel(QStringLiteral("Каталог Apple Music · полное воспроизведение в сервисе"));
     status->setWordWrap(true);
     layout->addWidget(status);
     auto results = new QListWidget;
     results->setIconSize(QSize(46, 46));
     layout->addWidget(results, 1);
     auto card = new QLabel;
     card->setTextFormat(Qt::PlainText);
     card->setWordWrap(true);
     layout->addWidget(card);
     auto play = button(QStringLiteral("Слушать полностью в Apple Music"));
     play->setEnabled(false);
     layout->addWidget(play);
     auto playlist = button(QStringLiteral("Искать плейлисты в Spotify"));
     layout->addWidget(playlist);
     auto network = new QNetworkAccessManager(&dialog);
     auto cache = new QNetworkDiskCache(network);
     cache->setCacheDirectory(root + "/saves/music-cache");
     cache->setMaximumCacheSize(16 * 1024 * 1024);
     network->setCache(cache);
     auto debounce = new QTimer(&dialog);
     debounce->setSingleShot(true);
     QPointer<QNetworkReply> active;
     int generation = 0;

     auto refreshSelection = [=] {
         auto item = results->currentItem();
         const auto data = item ? item->data(Qt::UserRole).toJsonObject() : QJsonObject{};
         card->setText(item ? data.value("title").toString() + "\n" + data.value("artist").toString() +
                           "\n" + data.value("album").toString() + QStringLiteral("\nИсточник: Apple Music · внешний плеер") : QString());
         play->setEnabled(item != nullptr);
     };
     connect(results, &QListWidget::currentItemChanged, &dialog, refreshSelection);
     auto openSelected = [&] {
         const QUrl url(query->text().trimmed());
         if (isMusicWebLink(url)) {
             musicLinkDialog(url.toString());
         } else if (auto item = results->currentItem()) {
             const auto link = QUrl(item->data(Qt::UserRole).toJsonObject().value("url").toString());
             status->setText(launchMusicService(link)
                 ? QStringLiteral("Сервис открыт. Нажмите воспроизведение в сервисе. На Windows трек появится в игровом плеере, если приложение передаёт медиасессию.")
                 : QStringLiteral("Не удалось открыть сервис."));
         }
     };
     connect(play, &QPushButton::clicked, &dialog, openSelected);
     connect(results, &QListWidget::itemDoubleClicked, &dialog, openSelected);
     connect(query, &QLineEdit::returnPressed, &dialog, openSelected);
     connect(playlist, &QPushButton::clicked, &dialog, [&] {
         const auto term = query->text().trimmed();
         if (term.isEmpty()) return;
         auto url = QUrl::fromEncoded("https://open.spotify.com/search/" + QUrl::toPercentEncoding(term) + "/playlists");
         if (!launchMusicService(url)) status->setText(QStringLiteral("Не удалось открыть Spotify."));
     });
     auto changed = [&] {
         ++generation;
         if (active) active->abort();
         debounce->stop();
         results->clear();
         card->clear();
         const auto term = query->text().trimmed();
         const QUrl url(term);
         const bool link = isMusicWebLink(url);
         play->setText(link ? QStringLiteral("Открыть ссылку") : QStringLiteral("Слушать полностью в Apple Music"));
         play->setEnabled(link);
         status->setText(link ? (musicService(url).isEmpty() ? QStringLiteral("Проверим открытое аудио или плейлист.") : musicService(url) + QStringLiteral(" · внешний плеер"))
                              : QStringLiteral("Введите название песни, исполнителя или альбома."));
         if (!link && term.size() >= 2) debounce->start(400);
     };
     connect(query, &QLineEdit::textChanged, &dialog, changed);
     connect(type, qOverload<int>(&QComboBox::currentIndexChanged), &dialog, changed);
     connect(debounce, &QTimer::timeout, &dialog, [&] {
         const int requestGeneration = generation;
         QNetworkRequest request(catalogSearchUrl(query->text(), type->currentIndex() == 1));
         request.setTransferTimeout(10000);
         auto reply = network->get(request);
         active = reply;
         status->setText(QStringLiteral("Поиск в каталоге…"));
         connect(reply, &QNetworkReply::finished, &dialog, [&, reply, requestGeneration] {
             reply->deleteLater();
             if (requestGeneration != generation) return;
             active.clear();
             if (reply->error() != QNetworkReply::NoError) {
                 status->setText(QStringLiteral("Каталог недоступен: ") + reply->errorString());
                 return;
             }
             const auto found = catalogResults(reply->readAll());
             status->setText(found.isEmpty() ? QStringLiteral("Совпадений в каталоге нет.") :
                             QStringLiteral("Полное воспроизведение через Apple Music. Доступность зависит от региона и аккаунта."));
             for (const auto& value : found) {
                 const auto data = value.toObject();
                 const int row = results->count();
                 auto item = new QListWidgetItem(data.value("title").toString() + "\n" + data.value("artist").toString(), results);
                 item->setData(Qt::UserRole, data);
                 item->setSizeHint(QSize(220, 52));
                 const QUrl art(data.value("art").toString());
                 if (art.isEmpty()) continue;
                 QNetworkRequest artwork(art);
                 artwork.setTransferTimeout(8000);
                 auto image = network->get(artwork);
                 connect(image, &QNetworkReply::finished, &dialog, [&, image, row, requestGeneration] {
                     image->deleteLater();
                     if (generation != requestGeneration || image->error() != QNetworkReply::NoError) return;
                     QPixmap pixmap;
                     const auto bytes = image->readAll();
                     if (bytes.size() <= 512 * 1024 && pixmap.loadFromData(bytes))
                         if (auto target = results->item(row)) target->setIcon(QIcon(pixmap));
                 });
             }
             if (results->count()) results->setCurrentRow(0);
         });
     });
     dialog.resize(600, 580);
     dialog.exec();
     // Stop network callbacks before the local state captured by them is destroyed.
     delete network;
 }
