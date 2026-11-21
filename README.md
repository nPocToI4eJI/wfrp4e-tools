<div align="center">
  
  # WFRP4e - Tools

  <p>
    <a href="https://foundryvtt.com/packages/wfrp4e-tools" rel="nofollow"><img src="https://img.shields.io/badge/WFRP4e%20--%20Tools-FoundryVTT-orange?labelColor=darkred" alt="FoundryVTT"></a>
    <a href="https://foundryvtt.com/" rel="nofollow"><img src="https://img.shields.io/badge/V13-Совместимо-darkgreen?labelColor=orange" alt="Совместимость"></a>
    <a href="https://github.com/nPocToI4eJI/wfrp4e-tools/releases" rel="nofollow"><img src="https://img.shields.io/github/v/release/nPocToI4eJI/wfrp4e-tools?display_name=release&label=%D0%92%D0%B5%D1%80%D1%81%D0%B8%D1%8F&labelColor=darkgreen" alt="Последняя версия"></a>
    <a href="https://github.com/nPocToI4eJI/wfrp4e-tools/releases/latest" rel="nofollow"><img src="https://img.shields.io/github/downloads/nPocToI4eJI/wfrp4e-tools/latest/wfrp4e-tools.zip?displayAssetName=false&label=%D0%A1%D0%BA%D0%B0%D1%87%D0%B8%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9&labelColor=blue&color=darkgreen" alt="Скачивания"></a>
    <a href="https://github.com/nPocToI4eJI/wfrp4e-tools/releases" rel="nofollow"><img src="https://img.shields.io/github/downloads/nPocToI4eJI/wfrp4e-tools/wfrp4e-tools.zip?displayAssetName=false&label=%D0%92%D1%81%D0%B5%D0%B3%D0%BE&labelColor=darkgreen&color=darkred" alt="Скачиваний всего"></a>
  </p>

  <p>
    <a href="https://discord.gg/tPrYvW7" rel="nofollow"><img src="https://img.shields.io/badge/Discord-black?logo=discord&logoColor=%235865F2" alt="Discord"></a>
    <a href="https://www.youtube.com/@nPocTo_4eJI" rel="nofollow"><img src="https://img.shields.io/badge/Youtube-black?logo=youtube&logoColor=%23FF0000" alt="Youtube"></a>
    <a href="https://boosty.to/npocto_4eji" rel="nofollow"><img src="https://img.shields.io/badge/Boosty-black?logo=boosty&logoColor=%23F15F2C" alt="Boosty"></a>
  </p>
  
  **[🇷🇺 Русский](#-русский) | [🇬🇧 English](#-english)**

</div>

---

<a id="-русский"></a>

**WFRP4e - Tools** - базовый модуль инструментов, улучшений и исправлений для системы **Warhammer Fantasy Roleplay 4th Edition** в Foundry VTT. Он объединяет аналитику бросков, журнал изменений, менеджер макросов, контекстную звуковую систему с авто-нормализацией громкости, доработку игровых механик и общую платформу для интеграции сопутствующих модулей.

### 📋 Содержание
- [Панель инструментов](#ru-tools)
  - [Статистика бросков](#ru-roll-stats)
  - [Журнал изменений](#ru-audit-logs)
  - [Сводка по Амбициям](#ru-ambitions)
  - [Менеджер макросов](#ru-macros)
- [Звуковая система](#ru-audio)
- [Исправления и улучшения системы](#ru-fixes)
- [Настройки и Меню отладки](#ru-settings)
- [Поддерживаемые модули](#ru-modules)

---

<a id="ru-tools"></a>
### 🤝 Панель инструментов

Модуль добавляет на левую панель управления отдельную вкладку **«Дополнительные инструменты»**, из которой открываются основные приложения.

![Панель дополнительных инструментов](https://github.com/user-attachments/assets/ea645d72-d6c9-4410-9fb3-3563a98f4d91)

---

<a id="ru-roll-stats"></a>
#### 📊 Статистика бросков
Аналитика бросков, созданная специально под математику **WFRP 4e**.

* **Права доступа:** Мастер видит общую вкладку *«Все игроки»* и вкладки каждого пользователя; игроки видят только свою статистику.
* **Учёт механик WFRP 4e:** порог проверки, итоговый и базовый УУ, бонусы к УУ от талантов и Преимущества, модификаторы сложности, перевороты кубов, осечки, магическая отдача (малая / серьёзная / катастрофическая), Гнев Богов, перебросы, трата Удачи (+1 УУ и переброс) и Тёмные сделки.
* **Гибкие фильтры:** выбор периода (*За всё время / Сегодня / 7 дней / 30 дней / Произвольный диапазон дат*) и категории проверки (*Бой / Навыки и Характеристики / Магия и Молитвы* или конкретный тип теста).
* **Переключаемые секции:** интерфейс не перегружается - 5 блоков (*Основное и Везение* с гистограммой 1d100, *УУ и Модификаторы*, *Криты/Магия/Удача*, *По проверкам*, *История бросков*) включаются и скрываются в один клик.
* **Восстановление из чата:** через Меню отладки можно пересчитать и догрузить статистику по всей старой истории чата.

<details align="center">
<summary>📷 Скриншоты</summary>

![Статистика бросков - обзор и УУ](https://github.com/user-attachments/assets/067c5889-d4ef-488e-b207-4f52aa1eb6d3)

![Статистика бросков - таблицы и события](https://github.com/user-attachments/assets/ec70d7e9-38a7-4683-abf6-5024bbef5863)

</details>

---

<a id="ru-audit-logs"></a>
#### :arrows_counterclockwise: Журнал изменений *(только для Мастера)*
Отслеживает изменения листов актёров и их предметов игроками в реальном времени.

* Фиксирует **создание**, **обновление** и **удаление** актёров и предметов, группируя быстрые правки в одно компактное уведомление.
* Кликабельное уведомление сразу открывает вкладку нужного игрока в Журнале изменений.
* Поддерживает **откат изменений** одной кнопкой (восстановление удалённых предметов/актёров, возврат старых значений, удаление ошибочно созданного).
* Максимальное количество хранимых записей настраивается в Меню отладки (по умолчанию `50`).

<details align="center">
<summary>📷 Скриншоты</summary>

![Журнал изменений](https://github.com/user-attachments/assets/e3782067-cbd6-4180-9fae-4f77fe48ead8)

![Уведомление Журнала изменений](https://github.com/user-attachments/assets/34cd46e3-cbfc-4233-8f09-0088cd0b8ed5)

</details>

---

<a id="ru-ambitions"></a>
#### ⭐ Сводка по Амбициям *(только для Мастера)*
Единое окно для контроля краткосрочных и долгосрочных амбиций партии и каждого персонажа: быстрая отметка достижения и синхронизация командных амбиций.

<details align="center">
<summary>📷 Скриншоты</summary>

![Сводка по Амбициям](https://github.com/user-attachments/assets/7df88173-617f-4469-b158-52415b79546e)

</details>

---

<a id="ru-macros"></a>
#### 💻 Менеджер макросов
Объединяет встроенные генераторы и утилиты (а также макросы из совместимых модулей) в одном окне.
* **ЛКМ** - мгновенный запуск скрипта.
* **Alt + ЛКМ** - создание обычного макроса на панели мира.

<details>
<summary>📋 Список встроенных макросов и скриншоты</summary>

**Создание предметов:**
* **Магический посох** - генерация с выбором школы магии, причуд/проклятий и эффектов.
* **Магический щит / оружие / броня** - генерация с роллами по таблицам свойств, истории и размеров доспехов.
* **Свиток заклинания** - выбор школы магии и максимального Порога Сотворения (ПС).
* **Гримуар** - генерация школы, списка заклинаний, внешнего вида, особенностей и случайного названия.

**Помощь Мастеру:**
* **Панель управления командами** - удобное меню для системных команд (`/credit`, `/pay`, `/exp`).
* **Название книги** - генератор названий книг в стилистике сеттинга (по типам или случайно).
* **Придумать ругательство** - генератор фэнтезийных оскорблений.

<div align="center">

  ![Окно Макросов](https://github.com/user-attachments/assets/c4e2549c-e6f7-4c64-b1e0-e2c2a7b09386)
  
  ![Пример работы макроса](https://github.com/user-attachments/assets/9563a49a-ec87-452c-a684-f11c081272f4)

</div>
</details>

---

<a id="ru-audio"></a>
### 🔊 Звуковая система

Модуль содержит встроенный движок контекстных звуковых эффектов (требуется пакет звуков, например [WFRP4e - Sounds](https://github.com/nPocToI4eJI/wfrp4e-sounds), либо собственная папка со звуками):

* **Авто-нормализация громкости:** при первом воспроизведении модуль анализирует файл, автоматически выравнивает тихие и слишком громкие звуки и пропускает их через защитный ограничитель.
* **События:** проверки навыков и характеристик, боевые удары/выстрелы/рикошеты/попадания по типам брони, падение в 0 ран, атаки чертами существ, концентрация и сотворение магии по школам, магическая отдача, молитвы и взаимодействие со снаряжением.
* **«Смешной» режим:** при включении добавляет альтернативные файлы из подпапок `funny/` в общий пул к обычным звукам.
* **Настройка пути и пересборка:** путь к папке со звуками задаётся в настройках, а каталог файлов обновляется кнопкой в Меню отладки.

<details>
<summary>📂 Структура папок звуков</summary>

Поддерживаемые форматы: `.ogg`, `.mp3`, `.wav`, `.webm`, `.flac`, `.m4a`.

```text
<путь из настройки soundsPath>/
├── combat/   (и опционально funny/) - боевые события, урон, криты, падение в 0 ран
├── weapon/   (и опционально funny/) - замахи, выстрелы, типы оружия и черты существ
├── opposed/  (и опционально funny/) - встречные проверки, парирование, уклонение, промахи
├── hit/      (и опционально funny/) - попадания по броне (латы, кольчуга, кожа, плоть)
├── magic/    (и опционально funny/) - концентрация, школы магии, мискасты
├── prayer/   (и опционально funny/) - благословения, чудеса, Гнев Богов
├── skill/    (и опционально funny/) - проверки навыков и характеристик
└── item/     (и опционально funny/) - действия с предметами и снаряжением
```

</details>

---

<a id="ru-fixes"></a>
### 🔧 Исправления и улучшения системы

* **«Уход в защиту»:** удобное окно выбора навыка для бонуса `+20`, гибкий фильтр навыков (*Боевые / Все / Свои* с автоподстановкой при выборе одного навыка) и опциональное авто-снятие статуса в начале следующего хода.
* **Исправление случайных изображений токенов в чате:** сохраняет фактическую картинку токена при броске и корректно отображает карточки в чате после перезапуска Foundry или удаления токена со сцены (устраняет битые ссылки со звёздочкой).
* **Новые уведомления:** переработанный компактный формат всплывающих уведомлений (можно включить только для модуля или заменить все стандартные уведомления Foundry).
* **Перевод актёров при импорте (Babele):** при импорте актёра из Библиотеки предлагает перевести его данные.
* **Системные правки:** добавлены описания/локализация доп. школ магии (*Великая Пасть*, *Малый/Большой Вааагх!*), изменение стандартных HTML шаблонов, добавляющее описание многим кнопкам.

<details align="center">
<summary>📷 Скриншоты</summary>

![Уход в защиту](https://github.com/user-attachments/assets/937776fb-24aa-4e6f-ac18-513fbae36c0d)

</details>

---

<a id="ru-settings"></a>
### ⚙️ Настройки и Меню отладки

**Основные настройки модуля:**
* **Меню отладки** - переключение `debug`-режима, настройка лимита записей Журнала изменений, обновление каталога звуков, пересчёт Статистики бросков из чата.
* **Использовать новые уведомления** - распространять новый стиль уведомлений на весь Foundry или только на модуль.
* **Переводить данные актёров при импорте** - требует модуль `Babele`.
* **«Уход в защиту» до начала хода** - автоматическое снятие эффекта в начале хода актёра.
* **Навыки для «Ухода в защиту»** - *Боевые (Уклонение и Рукопашный бой)* / *Все навыки* / *Свои* (ПКМ по списку для редактирования).
* **Звуковые эффекты** - включение звуков, множитель громкости, «Смешной» режим и путь к папке со звуками.

<details align="center">
<summary>📷 Скриншоты</summary>
  
![Меню отладки](https://github.com/user-attachments/assets/14f178f0-e264-4565-a2a7-437853c509d9)

</details>

---

<a id="ru-modules"></a>
### 🧩 Поддерживаемые модули
Список модулей, обладающих полной совместимостью:

* **[WFRP4e - Assistant\*](https://github.com/nPocToI4eJI/wfrp4e-assistant)** - этот модуль позволит Мастеру разнообразить НИП и их отыгрыш с помощью встроенных инструментов автоматизации.
* **[WFRP4e - Looting\* \*\*](https://github.com/nPocToI4eJI/wfrp4e-looting)** - этот модуль поможет Мастеру оптимизировать процесс создания уникального лута.
* **[WFRP4e - Sounds\* \*\*](https://github.com/nPocToI4eJI/wfrp4e-sounds)** - этот модуль содержит звуковые файлы, адаптированные для [Звуковой системы](#ru-audio).

\* Эти модули не работают без **WFRP4e - Tools**.  
\*\* Эти модули ещё не адаптированы под **WFRP4e - Tools**, и их работоспособность не подтверждена.

---

<a id="-english"></a>

**WFRP4e - Tools** is a core toolkit, quality-of-life, and bugfix module for **Warhammer Fantasy Roleplay 4th Edition** on Foundry VTT. It brings together roll analytics, a changelog, a macro manager, a context-sensitive audio system with automatic volume normalization, gameplay mechanic improvements, and a shared platform for integrating companion modules.

### 📋 Contents
- [Additional Tools Panel](#en-tools)
  - [Roll Statistics](#en-roll-stats)
  - [Changelog](#en-audit-logs)
  - [Ambitions Summary](#en-ambitions)
  - [Macro Manager](#en-macros)
- [Audio System](#en-audio)
- [System Fixes & Improvements](#en-fixes)
- [Settings & Debug Menu](#en-settings)
- [Supported Modules](#en-modules)

---

<a id="en-tools"></a>
### 🤝 Additional Tools Panel

The module adds a separate **Additional Tools** tab to the left scene controls bar, providing quick access to its main applications.

![Additional Tools Panel](https://github.com/user-attachments/assets/ea645d72-d6c9-4410-9fb3-3563a98f4d91)

---

<a id="en-roll-stats"></a>
#### 📊 Roll Statistics
Roll analytics built specifically for **WFRP 4e** mathematics.

* **Permissions:** The GM sees an *All Players* summary tab and individual tabs for each user; players see only their own statistics.
* **Full WFRP 4e Mechanics:** target number, total and base SL, SL bonuses from talents and Advantage, difficulty modifiers, dice reversals, misfires, miscasts (Minor / Major / Catastrophic), Wrath of the Gods, rerolls, Fortune usage (+1 SL and reroll), and Dark Deals.
* **Flexible Filters:** filter by period (*All Time / Today / Last 7 Days / Last 30 Days / Custom Date Range*) and test category (*Combat / Skills & Characteristics / Magic & Prayers* or a specific test type).
* **Toggleable Sections:** keeps the interface clean - 5 blocks (*Overview & Luck* with a 1d100 histogram, *SL & Modifiers*, *Crits, Magic & Fortune*, *By Test*, *Roll History*) can be toggled on and off in a single click.
* **Rebuild from Chat:** recalculate and import statistics from the entire existing chat history via the Debug Menu.

<details align="center">
<summary>📷 Screenshots</summary>

![Roll Statistics - Overview & SL](https://github.com/user-attachments/assets/067c5889-d4ef-488e-b207-4f52aa1eb6d3)

![Roll Statistics - Breakdown & Events](https://github.com/user-attachments/assets/ec70d7e9-38a7-4683-abf6-5024bbef5863)

</details>

---

<a id="en-audit-logs"></a>
#### :arrows_counterclockwise: Changelog *(GM Only)*
Tracks player changes to actor sheets and their items in real time.

* Logs **creation**, **updates**, and **deletion** of actors and items, grouping rapid consecutive edits into a single compact notification.
* Clicking a notification immediately opens the relevant player's tab in the Changelog.
* Supports one-click **Undo** (restoring deleted items/actors, reverting old values, or deleting mistakenly created entries).
* The maximum number of stored entries is configurable in the Debug Menu (default `50`).

<details align="center">
<summary>📷 Screenshots</summary>

![Changelog](https://github.com/user-attachments/assets/e3782067-cbd6-4180-9fae-4f77fe48ead8)

![Changelog Notification](https://github.com/user-attachments/assets/34cd46e3-cbfc-4233-8f09-0088cd0b8ed5)

</details>

---

<a id="en-ambitions"></a>
#### ⭐ Ambitions Summary *(GM Only)*
A single window for managing Short Term and Long Term ambitions for both the party and individual characters: quick achievement marking and party ambition synchronization.

<details align="center">
<summary>📷 Screenshots</summary>

![Ambitions Summary](https://github.com/user-attachments/assets/7df88173-617f-4469-b158-52415b79546e)

</details>

---

<a id="en-macros"></a>
#### 💻 Macro Manager
Brings together built-in generators and utilities (as well as macros from compatible modules) in a single window.
* **LMB** - run the script immediately.
* **Alt + LMB** - create a regular macro in the world.

<details>
<summary>📋 Built-in Macros & Screenshots</summary>

**Create Items:**
* **Enchanted Staff** - generates a staff with Magic Lore selection, quirks/curses, and effects.
* **Magical Shield / Weapon / Armour** - generates items using official property, history, and armour size tables.
* **Spell Scroll** - choose a Magic Lore and maximum Casting Number (CN).
* **Grimoire** - generates lore, spell list, appearance, features, and a random title.

**GM Helpers:**
* **Command Control Panel** - convenient menu for system commands (`/credit`, `/pay`, `/exp`).
* **Book Title** - generates setting-appropriate book titles (by type or at random).
* **Invent an Insult** - fantasy insult generator.

<div align="center">

  ![Macros Window](https://github.com/user-attachments/assets/c4e2549c-e6f7-4c64-b1e0-e2c2a7b09386)
  
  ![Macro Example](https://github.com/user-attachments/assets/9563a49a-ec87-452c-a684-f11c081272f4)

</div>
</details>

---

<a id="en-audio"></a>
### 🔊 Audio System

The module includes a built-in context-aware sound effects engine (requires a sound pack such as [WFRP4e - Sounds](https://github.com/nPocToI4eJI/wfrp4e-sounds), or your own custom sounds folder):

* **Automatic Volume Normalization:** on first playback, the module analyzes the file, automatically evens out quiet and overly loud sounds, and routes them through a protective limiter.
* **Events:** skill and characteristic tests, combat strikes/shots/deflections/hits by armour type, dropping to 0 Wounds, creature trait attacks, channelling and spellcasting by Magic Lore, miscasts, prayers, and equipment interactions.
* **"Funny" Mode:** when enabled, adds alternative files from `funny/` subfolders into the regular playback pool.
* **Custom Path & Rebuild:** configure the sounds folder path in settings and update the sound catalog with a button in the Debug Menu.

<details>
<summary>📂 Sound Folder Structure</summary>

Supported formats: `.ogg`, `.mp3`, `.wav`, `.webm`, `.flac`, `.m4a`.

```text
<path from soundsPath setting>/
├── combat/   (and optional funny/) - combat events, damage, crits, dropping to 0 wounds
├── weapon/   (and optional funny/) - swings, shots, weapon types, and creature traits
├── opposed/  (and optional funny/) - opposed tests, parries, dodges, misses
├── hit/      (and optional funny/) - hits by armour material (plate, mail, leather, flesh)
├── magic/    (and optional funny/) - channelling, spell lores, miscasts
├── prayer/   (and optional funny/) - blessings, miracles, Wrath of the Gods
├── skill/    (and optional funny/) - skill and characteristic tests
└── item/     (and optional funny/) - item and equipment interactions
```

</details>

---

<a id="en-fixes"></a>
### 🔧 System Fixes & Improvements

* **"Defending":** convenient skill selection dialog for the `+20` bonus, flexible skill filter (*Combat / All / Custom* with auto-selection when only one skill is specified), and optional automatic removal at the start of the actor's next turn.
* **Wildcard Token Images Fix in Chat:** saves the actual token image on roll and properly renders chat cards after restarting Foundry or deleting the token from the scene (eliminates broken `*` wildcard links).
* **New Notifications:** redesigned compact popup notification format (can be enabled for this module only or replace all standard Foundry notifications).
* **Translate Actors on Import (Babele):** prompts to translate actor data when importing an actor from a Compendium.
* **System Tweaks:** added descriptions/localization for additional Magic Lores (*The Great Maw*, *Little/Big Waaagh!*), and updated standard HTML templates to add tooltips/descriptions to many buttons.

<details align="center">
<summary>📷 Screenshots</summary>

![Defending](https://github.com/user-attachments/assets/937776fb-24aa-4e6f-ac18-513fbae36c0d)

</details>

---

<a id="en-settings"></a>
### ⚙️ Settings & Debug Menu

**Main Module Settings:**
* **Debug Menu** - toggle `debug` mode, configure the Changelog entry limit, rebuild the sound catalog, rebuild Roll Statistics from chat history.
* **Use new notifications** - apply the new notification style across all of Foundry or only to this module.
* **Translate actor data on import** - requires the `Babele` module.
* **"Defending" removed before turn** - automatically removes the effect at the start of the actor's turn.
* **Skills for "Defending"** - *Combat (Dodge and Melee)* / *All skills* / *Custom* (right-click the selector to edit).
* **Sound Effects** - enable/disable toggle, volume multiplier, "Funny" mode, and path to the sounds folder.

<details align="center">
<summary>📷 Screenshots</summary>
  
![Debug Menu](https://github.com/user-attachments/assets/14f178f0-e264-4565-a2a7-437853c509d9)

</details>

---

<a id="en-modules"></a>
### 🧩 Supported Modules
List of modules with full compatibility:

* **[WFRP4e - Assistant\*](https://github.com/nPocToI4eJI/wfrp4e-assistant)** - allows the GM to diversify NPCs and their roleplay using built-in automation tools.
* **[WFRP4e - Looting\* \*\*](https://github.com/nPocToI4eJI/wfrp4e-looting)** - helps the GM streamline the process of creating unique loot.
* **[WFRP4e - Sounds\* \*\*](https://github.com/nPocToI4eJI/wfrp4e-sounds)** - contains sound files tailored for the [Audio System](#en-audio).

\* These modules do not work without **WFRP4e - Tools**.  
\*\* These modules have not yet been adapted for **WFRP4e - Tools**, and their functionality is not confirmed.
