 void musicCollections() {
     OsDialog dialog(this);
     dialog.setWindowTitle(QStringLiteral("Избранное, история и плейлисты"));
     auto layout = new QVBoxLayout(&dialog);
     auto group = new QComboBox;
     layout->addWidget(group);
     auto list = new QListWidget;
     layout->addWidget(list, 1);
     auto source = new QComboBox;
     source->setSizeAdjustPolicy(QComboBox::AdjustToMinimumContentsLengthWithIcon);
     source->setMinimumContentsLength(16);
     for (const auto& track : music.tracks())
         source->addItem(track.title + " · " + track.artist, track.url.toString());
     layout->addWidget(source);
     auto controls = new QHBoxLayout;
     auto create = button(QStringLiteral("Новый плейлист"));
     auto add = button(QStringLiteral("Добавить трек"));
     auto remove = button(QStringLiteral("Убрать трек"));
     auto play = button(QStringLiteral("Слушать"));
     for (auto item : {create, add, remove, play}) controls->addWidget(item);
     layout->addLayout(controls);
     auto status = new QLabel;
     status->setWordWrap(true);
     layout->addWidget(status);
     auto groups = preferences.value("musicCollections").toObject();
     auto current = [group] { return group->currentData().toString(); };
     auto fillGroups = [&](const QString& selected) {
         QSignalBlocker block(group);
         group->clear();
         group->addItem(QStringLiteral("Избранное"), "@favorites");
         group->addItem(QStringLiteral("История"), "@history");
         for (const auto& key : groups.keys())
             if (!key.startsWith('@')) group->addItem(key, key);
         group->setCurrentIndex(std::max(0, group->findData(selected)));
     };
     auto refresh = [&] {
         list->clear();
         const auto key = current();
         const auto entries = key == "@history" ? music.history() : groups.value(key).toArray();
         for (const auto& entry : entries) {
             const auto data = entry.toObject();
             auto item = new QListWidgetItem(data.value("title").toString() + " · " + data.value("artist").toString(), list);
             item->setData(Qt::UserRole, data.value("url").toString());
         }
         add->setEnabled(key != "@history" && source->count());
         remove->setEnabled(key != "@history" && list->count());
         play->setEnabled(list->count());
         if (list->count()) list->setCurrentRow(0);
     };
     auto save = [&](const QJsonObject& next) {
         auto before = preferences;
         preferences["musicCollections"] = next;
         if (!savePreferences()) {
             preferences = before;
             status->setText(QStringLiteral("Не удалось сохранить музыкальную библиотеку."));
             return false;
         }
         groups = next;
         status->clear();
         return true;
     };
     connect(group, qOverload<int>(&QComboBox::currentIndexChanged), &dialog, refresh);
     connect(create, &QPushButton::clicked, &dialog, [&] {
         bool ok = false;
         auto name = QInputDialog::getText(&dialog, QStringLiteral("Новый плейлист"), QStringLiteral("Название"),
                                           QLineEdit::Normal, {}, &ok).trimmed().left(80);
         if (!ok || name.isEmpty()) return;
         if (name.startsWith('@') || groups.contains(name) || groups.size() >= 100) {
             status->setText(QStringLiteral("Выберите другое имя или освободите место в библиотеке."));
             return;
         }
         auto next = groups;
         next[name] = QJsonArray{};
         if (save(next)) { fillGroups(name); refresh(); }
     });
     connect(add, &QPushButton::clicked, &dialog, [&] {
         const auto key = current();
         const auto url = source->currentData().toString();
         if (key == "@history" || url.isEmpty()) return;
         auto entries = groups.value(key).toArray();
         if (entries.size() >= 500) { status->setText(QStringLiteral("В списке уже 500 треков.")); return; }
         for (const auto& entry : entries) if (entry.toObject().value("url").toString() == url) return;
         for (const auto& track : music.tracks()) if (track.url.toString() == url) {
             entries.append(track.json());
             auto next = groups;
             next[key] = entries;
             if (save(next)) refresh();
             return;
         }
     });
     connect(remove, &QPushButton::clicked, &dialog, [&] {
         const auto key = current();
         auto entries = groups.value(key).toArray();
         if (key == "@history" || list->currentRow() < 0 || list->currentRow() >= entries.size()) return;
         entries.removeAt(list->currentRow());
         auto next = groups;
         next[key] = entries;
         if (save(next)) refresh();
     });
     auto listen = [&] {
         auto item = list->currentItem();
         if (!item) return;
         QStringList urls;
         for (int i = 0; i < list->count(); ++i) urls.append(list->item(i)->data(Qt::UserRole).toString());
         if (!music.selectQueue(urls, item->data(Qt::UserRole).toString()))
             status->setText(QStringLiteral("Треки недоступны. Подключите исходную папку или добавьте ссылку снова."));
         else {
             preferences["musicEnabled"] = true;
             scheduleMusicSave();
             dialog.accept();
         }
     };
     connect(play, &QPushButton::clicked, &dialog, listen);
     connect(list, &QListWidget::itemDoubleClicked, &dialog, listen);
     fillGroups("@favorites");
     refresh();
     dialog.resize(600, 460);
     dialog.exec();
 }
