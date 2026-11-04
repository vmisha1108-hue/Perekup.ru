# Перекуп V6 — текущее состояние

База V8.5.1; по просьбе пользователя новый релиз называется V6.

- Музыка Windows: выбранная системная медиасессия через штатный PowerShell/WinRT, название/исполнитель/обложка/состояние/таймлайн. Команды ограничены возможностями источника. Нет аккаунтов, токенов и скачивания сервисного каталога.
- Остров поддерживает внешний источник и оставляет видимым трек на паузе. Интерфейс показывает недоступные команды, локальную громкость не выдаёт за громкость внешнего сервиса.
- Прямые аудиоссылки, радио, M3U/M3U8/PLS/XSPF/RSS/JSON и открытое HTML-аудио; асинхронная загрузка с лимитами и отменой. Сервисные страницы открываются снаружи с подключением через Windows.
- Нейросеть, worker, модели/LoRA, загрузчик и настройки удалены. В CMake нет цели для модели. Старые задания удаляются из активных и сохранённых чатов без изменения финансов/логов.
- Сценарные диалоги: существующие ответы и факты объявления, цена/скидка в тексте, настроение, торг, встречи, закрытие за повторные низкие предложения, Enter и изменение размера.
- Mevison и пользовательский «После сделки» остаются встроенными. Перенос стандартных музыкальных путей в новую папку поддержан.

Проверки — verification/v6. Основные сценарии проверены в Linux, Windows EXE кросс-компилирован. Настоящая сессия Яндекса/Spotify и Windows запуск здесь недоступны; протокол, интерфейс, синтаксис и сценарий отказа проверены отдельно. Полная портативная сборка предназначена для новой папки с переносом saves/Music, без старых компонентов модели.

V6 island follow-up: persistent accent/background/top offset/notification duration/category controls; new completed-contract, balance, city-arrival and day-transition notices with baseline deduplication. Mevison artist corrected to Perekyp.ru, existing app icon used as its cover. Existing After Deal MP3 and cover unchanged.

V7: shared native round sliders with direct seek, hover animation and tooltips; redesigned island grid (420x320), timeline alignment; unified OS surfaces/controls and accent; one-time dark-theme migration with light-theme support. Save format and gameplay remain compatible with V6.
