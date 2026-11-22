let tools = {};
let debugMessage = ["%cWFRP4e Tools %c[debug]%c.", "font-weight: bold;", "color: orange;", ""];
let nPocTo_Modules = [];
let nPocTo_Sockets = {};
let nPocTo_Debug = new Map();
let controlsRefreshScheduled = false;
tools.modules = nPocTo_Modules;
/**
 * Регистрирует сторонний или сопутствующий модуль для интеграции с WFRP4e - Tools (Меню отладки, Макросы, Сокеты, Кнопки панели управления).
 * @param {string} moduleId Идентификатор модуля из module.json.
 * @param {Object} [config] Необязательные обработчики ({sockets: {name: fn}, debug: [{form, values, listener}]}).
 */
tools.registerModule = (moduleId, config = {}) => {
	if (!moduleId || typeof moduleId !== "string") {return};
	if (!nPocTo_Modules.includes(moduleId)) {
		nPocTo_Modules.push(moduleId);
		if (game.settings.settings.has(`${moduleId}.controlButtons`) && ui.controls && !controlsRefreshScheduled) {
			controlsRefreshScheduled = true;
			queueMicrotask(() => {
				controlsRefreshScheduled = false;
				ui.controls.render({reset: true});
			});
		};
	};
	if (config?.sockets && typeof config.sockets === "object") {
		for (let [name, fn] of Object.entries(config.sockets)) {
			if (typeof fn === "function") {nPocTo_Sockets[name] = fn};
		};
	};
	if (Array.isArray(config?.debug)) {
		nPocTo_Debug.set(moduleId, config.debug);
	};
};
tools.registerSocket = (name, fn) => {
	if (name && typeof fn === "function") {nPocTo_Sockets[name] = fn};
};
//Меню отладки
class debugMenu extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		classes: ["wfrp4eTools-debug", "wfrp4eTools", "warhammer"],
		window: {
			icon: "fas fa-debug",
			title: "WFRP4E.Tools.Debug.Name",
			resizable: true
		},
		actions: {
			debugMode: this._onToggleDebug,
			rebuildSounds: this._onRebuildSounds,
			rebuildRollStats: this._onRebuildRollStats
		}
	};

	static PARTS = {
		debugMode: {
			template: "modules/wfrp4e-tools/templates/debug/debugMode.hbs"
		},
		rebuildSounds: {
			template: "modules/wfrp4e-tools/templates/debug/rebuildSounds.hbs"
		},
		auditLogsLength: {
			template: "modules/wfrp4e-tools/templates/auditLogs/auditLogsLength.hbs"
		}
	};

	async _prepareContext(options) {
		let context = await super._prepareContext(options);
		context.debug = this.debug;
		context.auditLogsLength = game.settings.get("wfrp4e-tools", "auditLogsLength");
		this.modules.map(m => m.data).flat().forEach(m => {
			if (m.values) {
				m.values.forEach(d => {context[d.key] = d.value});
			};
		});
		return context;
	};

	constructor(options) {
		//Сбор секций отладки от зарегистрированных модулей
		let modules = [];
		nPocTo_Modules.forEach(m => {
			if (game.modules.get(m)?.active && nPocTo_Debug.has(m)) {
				modules.push({
					id: m,
					title: game.modules.get(m).title,
					data: nPocTo_Debug.get(m)
				});
			};
		});
		modules.map(m => m.data).flat().forEach(m => {
			if (m.form) {
				debugMenu.PARTS[m.form.id] = {template: m.form.template};
			};
		});
		super(options);
		this.modules = modules;
		this.modules.map(m => m.data).flat().forEach(m => {
			if (m.values) {
				m.values.forEach(d => {this[d.key] = d.value});
			};
		});
		this.debug = game.settings.get("wfrp4e-tools", "debug");
		if (this.debug) {
			console.debug(...debugMessage, "debug constructor \"this\"");
			console.debug(this);
		};
	};

	async render(options={}, _options={}) {
		const existingWindow = document.querySelector("div.wfrp4eTools.wfrp4eTools-debug");
		if (existingWindow && existingWindow !== this.element) {
			existingWindow.style.zIndex = ++ApplicationV2._maxZ;
			return this;
		};
		return super.render(options, _options);
	};

	_onRender(context, options) {
		super._onRender(context, options);
		//Изменение длины лога
		let lengthInput = this.element.querySelector("input.length");
		if (lengthInput && !lengthInput.dataset.debugBound) {
			lengthInput.dataset.debugBound = "1";
			lengthInput.addEventListener("change", async (e) => {
				let val = Math.max(1, Math.trunc(Number(e.target.value)) || 50);
				e.target.value = val;
				await game.settings.set("wfrp4e-tools", "auditLogsLength", val);
				context.auditLogsLength = val;
				game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.Debug.Dialog.AuditLogsLength.Notify")}, {color: "green"});
			});
		};
		//Взаимодействия из других модулей
		this.modules.map(m => m.data).flat().forEach(m => {
			if (m.listener?.selector && typeof m.listener.func === "function") {
				this.element.querySelectorAll(m.listener.selector).forEach(el => {
					if (el.dataset.debugBound) {return};
					el.dataset.debugBound = "1";
					el.addEventListener(m.listener.action || "click", async (e) => {
						e.preventDefault();
						await m.listener.func(e, this);
					});
				});
			};
		});
	};

	static async _onToggleDebug() {
		await this.updateDebug();
	};

	static async _onRebuildSounds() {
		await Audio.buildCatalog();
		game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.Debug.Dialog.Sounds.Updated")}, {color: "green"});
	};

	static async _onRebuildRollStats() {
		let result = await RollStats.rebuildFromChat();
		if (result) {
			game.wfrp4e.tools.newNotification({text: game.i18n.format("WFRP4E.Tools.Debug.Dialog.RollStats.Updated", result)}, {color: "green"});
		};
	};

	//Обновление статуса отладки
	async updateDebug() {
		if (this.debug) {await game.settings.set("wfrp4e-tools", "debug", false)}
		else {await game.settings.set("wfrp4e-tools", "debug", true)};
		this.debug = game.settings.get("wfrp4e-tools", "debug");
		console.debug(...debugMessage, "debug updateDebug \"this.debug\"");
		console.debug(this.debug);
		//Обновление отображения надписи
		let labelEl = this.element.querySelector("span#debugMode");
		if (labelEl) {
			labelEl.textContent = this.debug ? game.i18n.localize("WFRP4E.Tools.Debug.Dialog.Mode.On") : game.i18n.localize("WFRP4E.Tools.Debug.Dialog.Mode.Off");
			labelEl.style.color = this.debug ? "green" : "red";
		};
	};
};
//Набор утилит модуля
class Utility {
	/**
	 * Этот метод возвращает случайный элемент из массива.
	 *
	 * @param {Array} array Массив, из которого нужно выбрать случайный элемент.
	 * @returns {*} Случайный элемент массива.
	 */
	static randomArrayElement(array) {
		return array[Math.floor(CONFIG.Dice.randomUniform() * array.length)];
	};

	/**
	 * Этот метод принимает объект и возвращает массив строк, являющихся путём ключей объекта.
	 *
	 * @param {Object} obj Объект, пукти которого необходимо получить.
	 * @returns {Array} Массив строк.
	 */
	static getNestedKeys(obj, prefix = "") {
		if (!obj || typeof obj !== "object") {return []};
		return Object.keys(obj).flatMap(key => {
			const currentKey = prefix ? (key.includes("-") ? `${prefix}["${key}"]` : `${prefix}.${key}`) : (key.includes("-") ? `["${key}"]` : key);
			if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
				return Utility.getNestedKeys(obj[key], currentKey);
			};
			return currentKey;
		});
	};

	/**
	 * Этот метод определяет разницу между двумя временными штампами и возвращает эту разницу в читабельном виде.
	 *
	 * @param {number} timestamp1 Первый временной штамп.
	 * @param {number} timestamp2 Второй временной штамп.
	 * @returns {Object} Объект в формате {дни, часы, минуты, секунды}.
	 */
	static timeDifference(timestamp1, timestamp2) {
		let difference = Math.abs(timestamp1 - timestamp2);
		let days = Math.floor(difference/1000/60/60/24);
		difference -= days*1000*60*60*24;
		let hours = Math.floor(difference/1000/60/60);
		difference -= hours*1000*60*60;
		let minutes = Math.floor(difference/1000/60);
		difference -= minutes*1000*60;
		let seconds = Math.floor(difference/1000);
		return {days, hours, minutes, seconds};
	};

	/**
	 * Этот метод возвращает данные, находящийся внутри текстовой ссылки Foundry.
	 *
	 * @param {string} link Ссылка, из которого нужно достать данные.
	 * @returns {Object} Объект, содержащий:
	 *                                       - text - текст ссылки;
	 *                                       - uuid - uuid из ссылки.
	 */
	static dataFromLink(link) {
		if (typeof link !== "string") return {text: "", uuid: ""};
		let text = Array.from(link.matchAll(/{(.+?)}/gm))?.[0]?.[1] || "";
		let uuid = Array.from(link.matchAll(/\[(.+?)\]/gm))?.[0]?.[1]?.split("#")[0] || "";
		return {text, uuid};
	};

	/**
	 * Этот метод генерирует случайное название для книг, в стилистике сеттинга. Варианты названий взяты у Paco's Miscellaneous Stuff и переведены мной на русский.
	 *
	 * @param {string} [type] Тема генерируемой книги. Пустое значение или значение "Random" выбирают случайную тему.
	 * @returns {string} Готовое название по заданным параметрам.
	 */
	static generateBookTitle(type) {
		let title = game.wfrp4e.tools.randomArrayElement(game.i18n.translations.WFRP4E.Tools.BooksTitle.Adjetive) + " " + game.wfrp4e.tools.randomArrayElement(game.i18n.translations.WFRP4E.Tools.BooksTitle.Main);
		if (!type || type == "Random") {
			type = game.wfrp4e.tools.randomArrayElement(Object.keys(game.i18n.translations.WFRP4E.Tools.BooksTitle.Types));
		};
		title += " " + game.wfrp4e.tools.randomArrayElement(game.i18n.translations.WFRP4E.Tools.BooksTitle[type]);
		return title;
	};

	/**
	 * Этот метод возвращает цвет, находящийся между заданными.
	 *
	 * @param {string} a Первый цвет в HEX формате.
	 * @param {string} b Первый цвет в HEX формате.
	 * @param {number} factor Процент, показывающий к какому цвету ближе будет возвращаемый цвет.
	 *                        При 0, вернёт цвет a, При 1, вернёт цвет b.
	 * @returns {string} Цвет в формате HEX.
	 */
	static colorBetween(a = "#FFF", b = "#000", factor = 0.5) {
		if (typeof a !== "string" || !/^#[0-9A-F]{3}$|^#[0-9A-F]{6}$/i.test(a)) {return};
		if (typeof b !== "string" || !/^#[0-9A-F]{3}$|^#[0-9A-F]{6}$/i.test(b)) {return};
		let shortHexToHex = (color) => {return color.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)};
		a = shortHexToHex(a);
		b = shortHexToHex(b);
		a = {
			r: parseInt(a.slice(1, 3), 16),
			g: parseInt(a.slice(3, 5), 16),
			b: parseInt(a.slice(5, 7), 16)
		};
		b = {
			r: parseInt(b.slice(1, 3), 16),
			g: parseInt(b.slice(3, 5), 16),
			b: parseInt(b.slice(5, 7), 16)
		};
		let result = {
			r: Math.round(a.r + factor * (b.r - a.r)).toString(16),
			g: Math.round(a.g + factor * (b.g - a.g)).toString(16),
			b: Math.round(a.b + factor * (b.b - a.b)).toString(16)
		};
		result = "#" + [result.r, result.g, result.b].map(c => c.padStart(2, "0")).join("");
		return result;
	};

	/**
	 * Этот метод находит предмет по оригинальному, не переведённому имени.
	 *
	 * @param {string} name Оригинальное название предмета.
	 * @param {string} [type] Тип предмета.
	 * @returns {item} Предмет.
	 */
	static async findOriginalName(name, type) {
		//Если модуля-переводчика нет, то нечего искать
		if (!game.modules.get("babele")?.active) {return};
		//Нормализация типа предмета к массиву
		if (typeof type == "string") {
			type = [type];
		};
		if (!type) {
			type = [];
		};
		//Отсеивание лишних символов
		name = name.toLowerCase().replaceAll("-", "").replaceAll(" ", "").trim();
		//Поиск среди локальных предметов
		let searchResult = game.items.contents.find(t => (type.length == 0 || type.includes(t.type)) && t.flags?.babele?.originalName?.toLowerCase().replaceAll("-", "").replaceAll(" ", "").trim() == name);
		if (!searchResult) {
			//Поиск среди библиотек, если поиск среди локальных предметов не дал результата
			for (let pack of game.wfrp4e.tags.getPacksWithTag(type)) {
				const index = pack.indexed ? pack.index : await pack.getIndex();
				let indexResult = index.find(t => (type.length == 0 || type.includes(t.type)) && t.flags?.babele?.originalName?.toLowerCase().replaceAll("-", "").replaceAll(" ", "").trim() == name);
				if (indexResult) {
					searchResult = await pack.getDocument(indexResult._id)
				};
			};
		};
		//Если предмет был найден, возвращает его
		if (searchResult) {
			let item = searchResult.clone();
			return item;
		} else {
			//Поиск среди предметов, имеющих спецификацию, указанную в (*). Спецификация отсеивается и передаётся первое же совпадение
			name = name.split("(")[0].trim();
			//Поиск среди локальных предметов
			let searchResult = game.items.contents.find(t => (type.length == 0 || type.includes(t.type)) && t.flags?.babele?.originalName?.toLowerCase().replaceAll("-", "").replaceAll(" ", "").split("(")[0].trim() == name);
			if (!searchResult) {
				//Поиск среди библиотек, если поиск среди локальных предметов не дал результата
				for (let pack of game.wfrp4e.tags.getPacksWithTag(type)) {
					const index = pack.indexed ? pack.index : await pack.getIndex();
					let indexResult = index.find(t => (type.length == 0 || type.includes(t.type)) && t.flags?.babele?.originalName?.toLowerCase().replaceAll("-", "").replaceAll(" ", "").split("(")[0].trim() == name);
					if (indexResult) {
						searchResult = await pack.getDocument(indexResult._id);
					};
				};
			};
			//Если предмет был найден, возвращает его
			if (searchResult) {
				let item = searchResult.clone();
				return item;
			};
		};
	};

	//Фикс метода по определению speaker
	static getSpeaker(speaker) {
		if (!speaker) {return null};
		let actor = game.actors.get(speaker.actor);
		if (speaker.token && speaker.scene) {
			actor = game.scenes.get(speaker.scene)?.tokens?.get(speaker.token)?.actor || actor;
		};
		return actor;
	};
};
tools.randomArrayElement = Utility.randomArrayElement;
tools.getNestedKeys = Utility.getNestedKeys;
tools.timeDifference = Utility.timeDifference;
tools.stringFromLink = Utility.dataFromLink;
tools.generateBookTitle = Utility.generateBookTitle;
tools.colorBetween = Utility.colorBetween;
//Обновление ItemDialog
class Tools_ItemDialog extends ItemDialog {
    static DEFAULT_OPTIONS = {
		position: {
			width: 400,
			height: 600
		},
        actions: {
            clickItem: {buttons: [0, 2], handler: this._onClickItem}
        }
    };
	//Обновлённый шаблон, который добавляет параметрам всмплывающий при наведении текст
    static PARTS = {
        form: {
            template: "modules/wfrp4e-tools/templates/item-dialog.hbs",
            scrollable : [".dialog-list"]
        }
    };
	//При выборе параметра, если лимит уже достигнут, отключает самый первый выбранный параметр
	//Простыми словами - теперь не нужно вручную отжимать ненужный пункт, чтобы выбрать нужный, если лимит достигнут
    static async _onClickItem(ev) {
        if (ev.button == 0) {
            let index = this._getIndex(ev);
            if (this.chosen.includes(index)) {
                this.chosen = this.chosen.filter(i => i != index);
            } else if (this.count == "unlimited" || this.chosen.length < this.count) {
                this.chosen.push(index);
            } else {
                this.chosen.push(index);
				this.chosen.shift();
			};
            this._highlightChosen();
        } else if (ev.button == 2) {
            let uuid = this._getUUID(ev);
            if (uuid) {
                let item = await fromUuid(uuid);
                item?.sheet.render(true);
            };
        };
    };
};
//Система уведомление
class Notifications {
	static #id = 1;
	static #active = {};
	static #sceneProgressNotif = null;
	// Метод форматирования текста по стандарту Foundry
	static #formatText(message, {localize=false, escape=true, clean=true, format}={}) {
		let text = String(message);
		if (format) {
			if (escape) {
				format = {...format};
				for (let key in format) {
					format[key] = foundry.utils.escapeHTML(format[key]);
				}
				if (game.i18n.has(text)) clean = false;
			}
			text = game.i18n.format(text, format);
		} else if (localize) {
			if (game.i18n.has(text)) clean = false;
			text = game.i18n.localize(text);
		}
		if (clean) text = foundry.utils.cleanHTML(text);
		return text;
	};
	//Автовосстановление контейнера уведомлений
	static #ensureContainer() {
		let ol = document.querySelector(".auditLogsNotifications > ol");
		if (ol) {return ol};
		let host = document.querySelector("#chat-notifications") || document.querySelector("#notifications") || document.body;
		let div = document.createElement("div");
		div.classList.add("auditLogsNotifications");
		ol = document.createElement("ol");
		ol.classList.add("plain");
		div.append(ol);
		host.insertAdjacentElement("afterbegin", div);
		return ol;
	};

	/**
	 * Выводит уведомление в правой части экрана.
	 *
	 * @param {Object} [data] Параметры для шаблона Handlebars.
	 * @param {string} [data.text] Текст, который будет отображать внутри уведомления, если шаблон Handlebars не будет указан.
	 * @param {boolean} [data.progress] Является ли уведомление обновляемой прогрессией.
	 * @param {Object} [options] Параметры уведомления.
	 * @param {string} [options.tooltip] Описание уведомления, появляющееся при наведении.
	 * @param {string} [options.hint] Описание взаимодействий с уведомлением, появляющееся при наведении. Отображается после Описания уведомления.
	 * @param {string} [options.template] Путь до шаблона Handlebars.
	 * @param {HTMLElement} [options.element] Заранее созданный <li> (нужно для синхронного progress).
	 * @param {number} [options.deleteTime] Время до удаления уведомления в мс. 0 - уведомление не будет удалено автоматически.
	 * @param {string} [options.color] Расцветка уведомления. Допустимые параметры: "red", "orange", "green", "blue", "black".
	 * @param {string} [options.uuid] Набор символов, который будет добавлен в HTML элемент уведомления в качестве параметра "data-uuid".
	 * @param {Object[]} [options.dataset] Массив параметров, которые необходимо добавить в HTML элемент уведомления в качестве параметра "data-".
	 * @param {string} [options.dataset[].key] Параметр для options.dataset, определяющий ключ в "data-{key}".
	 * @param {string} [options.dataset[].value] Параметр для options.dataset, определяющий значение "data-{key}".
	 * @param {Function} [options.notificationClick] Функция, срабатывающая при ЛКМ по уведомлению.
	 * 
	 * @returns {HTMLElement} HTML-элемент уведомления.
	 */
	static async newNotification(data = {}, options = {}) {
		if (!options?.tooltip) {options.tooltip = ""};
		if (!options.gmOnlyDismiss) {
			if (!options?.hint) {options.hint = game.i18n.localize("WFRP4E.Tools.Notification.Hint.RMB")}
			else {options.hint = options.hint + "<br>" + game.i18n.localize("WFRP4E.Tools.Notification.Hint.RMB")};
		} else if (!options?.hint) {options.hint = ""};
		if (!options?.template) {
			options.template = "modules/wfrp4e-tools/templates/other/notification.hbs";
			if (!data?.text) {data.text = game.i18n.localize("WFRP4E.Tools.Notification.New")};
		};
		if (!options?.deleteTime && options?.deleteTime != 0) {options.deleteTime = 5000}
		else if (options?.deleteTime != 0) {options.deleteTime = Math.max(options.deleteTime, 1000)};
		if (!options?.color || !["red", "orange", "green", "blue", "purple", "black"].includes(options?.color)) {options.color = "black"};
		let li = options.element || document.createElement("li");
		if (options.uuid) {li.dataset.uuid = options.uuid};
		li.classList.add(options.color);
		if (options.className) {
			let extra = Array.isArray(options.className) ? options.className : String(options.className).split(/\s+/);
			extra.filter(Boolean).forEach(c => li.classList.add(c));
		};
		if (data.progress) {
			li.classList.add("progress");
			li.style.setProperty("--pct", data.pct ?? "0%");
		};
		let fullTooltip = (options.tooltip && options.hint) ? `${options.tooltip}<hr>${options.hint}` : (options.tooltip || options.hint);
		if (fullTooltip) {li.dataset.tooltip = fullTooltip};
		if (options.dataset?.length) {
			options.dataset.forEach(d => li.dataset[d.key] = d.value);
		};
		li.innerHTML = await foundry.applications.handlebars.renderTemplate(options.template, data);
		let deleteTimeout;
		let removeLi = () => {
			clearTimeout(deleteTimeout);
			if (li.classList.contains("remove")) {return};
			li.classList.add("remove");
			setTimeout(() => {li.remove()}, 500);
		};
		let startTimer = () => {
			clearTimeout(deleteTimeout);
			deleteTimeout = setTimeout(removeLi, options.deleteTime);
		};
		let stopTimer = () => {clearTimeout(deleteTimeout)};
		if (options.pauseOnHover !== false) {
			li.addEventListener("mouseenter", () => {stopTimer()});
			li.addEventListener("mouseleave", () => {if (options.deleteTime != 0) {startTimer()}});
		};
		li.addEventListener("contextmenu", async (e) => {
			e.preventDefault();
			if (options.gmOnlyDismiss && !game.user.isGM) {return};
			if (typeof options.onDismiss === "function") {
				await options.onDismiss(e, li);
				return;
			};
			removeLi();
		});
		li.addEventListener("click", async (e) => {
			e.preventDefault();
			if (typeof options.notificationClick === "function") {await options.notificationClick(e, li)};
			if (options.keepOnClick || options.gmOnlyDismiss) {return};
			removeLi();
		});
		Notifications.#ensureContainer().insertAdjacentElement("beforeend", li);
		if (options.deleteTime != 0) {startTimer()};
		return li;
	};

	static prepareUIToToolsNotification() {
		ui.notifications.notify = (message, type, options={}) => {
			if (typeof type === "object" && type !== null) {
				options = type;
				type = "notify";
			};
			options.inConsole = options.console ?? true;
			return Notifications.UIToToolsNotification(message, type, options);
		};
		ui.notifications.info = (message, options={}) => {
			options.inConsole = options.console ?? true;
			return Notifications.UIToToolsNotification(message, "info", options);
		};
		ui.notifications.warn = (message, options={}) => {
			options.inConsole = options.console ?? true;
			return Notifications.UIToToolsNotification(message, "warn", options);
		};
		ui.notifications.error = (message, options={}) => {
			options.inConsole = options.console ?? true;
			return Notifications.UIToToolsNotification(message, "error", options);
		};
		ui.notifications.success = (message, options={}) => {
			options.inConsole = options.console ?? true;
			return Notifications.UIToToolsNotification(message, "success", options);
		};
		ui.notifications.update = (notification, updateData) => {
			if (typeof notification === "number") notification = Notifications.#active[notification];
			notification?.update?.(updateData);
		};
		ui.notifications.remove = (notification) => {
			if (typeof notification === "number") notification = Notifications.#active[notification];
			notification?.remove?.();
		};

		//Системный прогресс-бар
		foundry.applications.ui.SceneNavigation.displayProgressBar = ({label="", pct=0}={}) => {
			if (!Notifications.#sceneProgressNotif || !Notifications.#sceneProgressNotif.active) {
				Notifications.#sceneProgressNotif = Notifications.UIToToolsNotification(label, "info", {
					progress: true,
					inConsole: false
				});
			};
			Notifications.#sceneProgressNotif.update({
				message: label,
				pct: Number(pct) / 100
			});
		};
	};

	static UIToToolsNotification(message, type="info", {localize=false, permanent=false, progress=false, inConsole=true, escape=true, clean=true, format, color}={}) {
		let text = this.#formatText(message, {localize, escape, clean, format});
		//Присвоение стандартных параметров
		let data = {
			text: text,
			progress: progress,
			pct: "0%"
		};
		let options = {
			deleteTime: (permanent || progress) ? 0 : 5000,
			notificationClick: () => {},
			hint: game.i18n.localize("WFRP4E.Tools.Notification.Hint.LMB"),
			element: document.createElement("li")
		};
		//Выводится ли уведомление в консоль
		if (inConsole) {
			let fn = type === "warning" ? "warn" : type;
			if (!console.hasOwnProperty(fn)) {fn = "debug"};
			console[fn](data.text);
		};
		//Удаление уведомления при клике ЛКМ
		options.notificationClick = () => {/*Так как уведомление и так удаляется при клике по нему, можно указать пустую функцию*/};
		options.hint = game.i18n.localize("WFRP4E.Tools.Notification.Hint.LMB");
		//Определение цвета уведомления
		if (color) {
			options.color = color;
		} else {
			switch (type) {
				case "info":
				case "notify": options.color = "blue"; break;
				case "warning":
				case "warn": options.color = "orange"; break;
				case "error": options.color = "red"; break;
				case "success": options.color = "green"; break;
			};
		};
		//Запускаем рендер и сохраняем промис готовности
		let renderPromise = game.wfrp4e.tools.newNotification(data, options);
		//Создаем объект Notification, который ожидает Foundry VTT
		let notification = {
			id: this.#id++,
			type,
			message: data.text,
			timestamp: Date.now(),
			active: true,
			progress,
			permanent,
			console: inConsole,
			pct: 0,
			element: options.element,
			remove: () => {
				notification.active = false;
				delete this.#active[notification.id];
				options.element.classList.add("remove");
				setTimeout(() => options.element.remove(), 500);
			},
			update: (updateData = {}) => {
				//Если кто-то вызвал update(0.5) числом напрямую вместо объекта update({pct: 0.5}), преобразуем в объект
				if (typeof updateData === "number") {
					updateData = {pct: updateData};
				};
				//Определение параметров
				let {message: newMsg, localize=false, format, escape=true, clean=true, pct} = updateData;
				//Ждем завершения рендера шаблона, прежде чем менять DOM
				renderPromise.then((li) => {
					//Если есть progress и передан подходящий pct (не undefined и не NaN)
					if (notification.progress && pct !== undefined && !Number.isNaN(Number(pct))) {
						notification.pct = Number(pct);
						//Если передали дробь от 0 до 1 (0.35) — умножаем на 100. Если уже проценты (35) — оставляем как есть
						let percentValue = notification.pct <= 1 ? Math.round(notification.pct * 100) : Math.round(notification.pct);
						percentValue = Math.min(Math.max(percentValue, 0), 100);
						let pctString = `${percentValue}%`;
						li.style.setProperty("--pct", pctString);
						let pctEl = li.querySelector(".pct");
						if (pctEl) {pctEl.textContent = pctString};
						//Когда дошло до 100%, плавно закрываем через 500мс (если не permanent)
						if (percentValue >= 100 && !notification.permanent) {
							setTimeout(() => {
								notification.remove()
							}, 500);
						};
					};
					//Если меняется текст
					if (newMsg) {
						let formatted = this.#formatText(newMsg, {localize, escape, clean, format});
						notification.message = formatted;
						let textEl = li.querySelector(".notification-text") || li.querySelector("p") || li;
						textEl.innerHTML = formatted;
					};
					//Новое уведомление в консоль
					if (notification.console) {
						let fn = notification.type === "warning" ? "warn" : notification.type;
						if (!console.hasOwnProperty(fn)) fn = "debug";
						console[fn](li.textContent.trim());
					};
				});
			}
		};
		//Обновление уведомления
		this.#active[notification.id] = notification;
		return notification;
	};
};
tools.newNotification = Notifications.newNotification.bind(Notifications);
//Менеджер уведомлений и таймеров Мастера
class BroadcastManager {
	static #instances = new Map();

	static formatTime(ms) {
		let totalSec = Math.max(0, Math.ceil(ms / 1000));
		let hours = Math.floor(totalSec / 3600);
		let mins = Math.floor((totalSec % 3600) / 60);
		let secs = totalSec % 60;
		let mm = String(mins).padStart(2, "0");
		let ss = String(secs).padStart(2, "0");
		return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
	};

	static shouldDisplay(entry) {
		if (!entry) {return false};
		if (game.user.isGM) {return true};
		if (!Array.isArray(entry.recipients) || !entry.recipients.length) {return true};
		return entry.recipients.includes(game.user.id);
	};

	static getElapsed(entry, localStart) {
		if (entry.paused) {return Math.max(0, Number(entry.pausedElapsed) || 0)};
		return Math.max(0, Date.now() - localStart);
	};

	static computeView(entry, elapsedMs) {
		let mode = entry.mode || "message";
		let displayText = entry.text || "";
		let meta = "";
		let pct = 0;
		let hasProgress = false;
		let finished = Boolean(entry.finished);
		if (mode === "message") {
			let dur = Number(entry.duration) || 0;
			if (dur > 0) {
				let rem = Math.max(0, dur - elapsedMs);
				finished = rem <= 0;
				hasProgress = Boolean(entry.showBar);
				pct = hasProgress ? Math.round((rem / dur) * 100) : 0;
			};
		} else if (mode === "countdown") {
			let dur = Math.max(1000, Number(entry.duration) || 1000);
			let rem = Math.max(0, dur - elapsedMs);
			finished = rem <= 0;
			hasProgress = true;
			pct = Math.round((rem / dur) * 100);
			meta = `${entry.paused && !finished ? "⏸ " : ""}${BroadcastManager.formatTime(rem)}`;
			if (finished && entry.finishText) {displayText = entry.finishText};
		} else if (mode === "stopwatch") {
			let limit = Number(entry.duration) || 0;
			let cur = limit > 0 ? Math.min(elapsedMs, limit) : elapsedMs;
			finished = limit > 0 && elapsedMs >= limit;
			hasProgress = limit > 0;
			pct = limit > 0 ? Math.round((cur / limit) * 100) : 0;
			let tStr = BroadcastManager.formatTime(Math.floor(cur / 1000) * 1000);
			meta = `${entry.paused && !finished ? "⏸ " : ""}${tStr}${limit > 0 ? " / " + BroadcastManager.formatTime(limit) : ""}`;
			if (finished && entry.finishText) {displayText = entry.finishText};
		} else if (mode === "percent") {
			let dur = Math.max(1000, Number(entry.duration) || 1000);
			let ratio = Math.min(Math.max(elapsedMs / dur, 0), 1);
			finished = elapsedMs >= dur;
			hasProgress = true;
			pct = entry.reverse ? Math.round((1 - ratio) * 100) : Math.round(ratio * 100);
			meta = `${entry.paused && !finished ? "⏸ " : ""}${pct}%`;
			if (finished && entry.finishText) {displayText = entry.finishText};
		} else if (mode === "counter") {
			let max = Math.max(1, Number(entry.max) || 1);
			let val = Math.min(Math.max(Number(entry.value) || 0, 0), max);
			finished = val >= max;
			hasProgress = true;
			pct = Math.round((val / max) * 100);
			meta = entry.displayFormat === "percent" ? `${pct}%` : `${val} / ${max}`;
			if (finished && entry.finishText) {displayText = entry.finishText};
		} else if (mode === "rounds") {
			let max = Math.max(1, Number(entry.max) || 1);
			let val = Math.max(0, Number(entry.value) || 0);
			finished = val <= 0;
			hasProgress = true;
			pct = Math.min(100, Math.round((val / max) * 100));
			meta = game.i18n.format("WFRP4E.Tools.Broadcast.RoundsShort", {count: val});
			if (finished && entry.finishText) {displayText = entry.finishText};
		};
		return {displayText, meta, pct, hasProgress, finished};
	};

	static buildHint(entry) {
		if (!game.user.isGM) {return game.i18n.localize("WFRP4E.Tools.Broadcast.Hint.Player")};
		let lines = [];
		if (["countdown", "stopwatch", "percent"].includes(entry.mode)) {lines.push(game.i18n.localize("WFRP4E.Tools.Broadcast.Hint.GMTimer"))}
		else if (entry.mode === "counter") {lines.push(game.i18n.localize("WFRP4E.Tools.Broadcast.Hint.GMCounter"))}
		else if (entry.mode === "rounds") {lines.push(game.i18n.localize("WFRP4E.Tools.Broadcast.Hint.GMRounds"))};
		lines.push(game.i18n.localize("WFRP4E.Tools.Broadcast.Hint.GMDismiss"));
		if (Array.isArray(entry.recipients) && entry.recipients.length) {
			let names = entry.recipients.map(id => game.users.get(id)?.name).filter(Boolean);
			if (names.length) {lines.unshift(game.i18n.format("WFRP4E.Tools.Broadcast.Hint.Recipients", {list: names.join(", ")}))};
		};
		return lines.join("<br>");
	};

	static #refreshApp() {
		let app = Array.from(foundry.applications.instances.values()).find(a => a instanceof BroadcastApp);
		if (app) {app.render({parts: ["active"]})};
	};

	static #clearInstance(id, removeDom = true) {
		let inst = BroadcastManager.#instances.get(id);
		if (!inst) {return};
		if (inst.interval) {clearInterval(inst.interval)};
		if (inst.removeTimer) {clearTimeout(inst.removeTimer)};
		if (removeDom && inst.li && !inst.li.classList.contains("remove")) {
			inst.li.classList.add("remove");
			let el = inst.li;
			setTimeout(() => {el.remove()}, 500);
		};
		BroadcastManager.#instances.delete(id);
	};

	static async showLocal(entry, elapsedMs = 0) {
		if (!entry?.id || !BroadcastManager.shouldDisplay(entry)) {return};
		let existing = BroadcastManager.#instances.get(entry.id);
		if (existing) {
			BroadcastManager.updateLocal(entry, elapsedMs);
			return;
		};
		let localStart = Date.now() - Math.max(0, Number(elapsedMs) || 0);
		let view = BroadcastManager.computeView(entry, BroadcastManager.getElapsed(entry, localStart));
		if (view.finished && (entry.autoRemove || (entry.mode === "message" && Number(entry.duration) > 0))) {return};
		let escapedText = foundry.utils.escapeHTML(view.displayText).replaceAll("\n", "<br>");
		let li = await Notifications.newNotification(
			{
				text: escapedText,
				icon: entry.icon || "",
				meta: view.meta,
				progress: view.hasProgress,
				pct: `${view.pct}%`
			},
			{
				template: "modules/wfrp4e-tools/templates/broadcast/notification.hbs",
				color: entry.color || "blue",
				deleteTime: 0,
				gmOnlyDismiss: true,
				keepOnClick: true,
				pauseOnHover: false,
				className: ["gm-broadcast", entry.paused ? "paused" : "", view.finished ? "finished" : ""].filter(Boolean),
				hint: BroadcastManager.buildHint(entry),
				dataset: [{key: "broadcastId", value: entry.id}],
				onDismiss: async () => {
					if (game.user.isGM) {await BroadcastManager.dismiss(entry.id)};
				},
				notificationClick: async (e) => {
					if (!game.user.isGM) {return};
					let current = BroadcastManager.#instances.get(entry.id)?.entry;
					if (!current) {return};
					if (["countdown", "stopwatch", "percent"].includes(current.mode)) {
						await BroadcastManager.togglePause(entry.id);
					} else if (current.mode === "counter") {
						let step = Math.max(1, Number(current.step) || 1);
						await BroadcastManager.stepCounter(entry.id, e.shiftKey ? -step : step);
					} else if (current.mode === "rounds") {
						await BroadcastManager.stepRounds(entry.id, e.shiftKey ? 1 : -1);
					};
				}
			}
		);

		let inst = {entry: foundry.utils.deepClone(entry), li, interval: null, removeTimer: null, localStart};
		BroadcastManager.#instances.set(entry.id, inst);
		BroadcastManager.#startTicking(inst);
		BroadcastManager.#refreshApp();
	};

	static #applyViewToDom(inst, view) {
		let li = inst.li;
		if (!li?.isConnected) {return};
		let textEl = li.querySelector(".notification-text");
		if (textEl) {
			let htmlText = foundry.utils.escapeHTML(view.displayText).replaceAll("\n", "<br>");
			if (textEl.innerHTML !== htmlText) {textEl.innerHTML = htmlText};
		};
		let metaEl = li.querySelector(".broadcast-meta");
		if (view.meta) {
			if (!metaEl) {
				metaEl = document.createElement("span");
				metaEl.classList.add("pct", "broadcast-meta");
				li.querySelector(".broadcast-body")?.append(" ", metaEl);
			};
			if (metaEl.textContent !== view.meta) {metaEl.textContent = view.meta};
		} else if (metaEl) {metaEl.remove()};
		if (view.hasProgress) {
			li.classList.add("progress");
			li.style.setProperty("--pct", `${view.pct}%`);
		} else {li.classList.remove("progress")};
		li.classList.toggle("paused", Boolean(inst.entry.paused && !view.finished));
		li.classList.toggle("finished", Boolean(view.finished));
	};

	static #startTicking(inst) {
		if (inst.interval) {
			clearInterval(inst.interval);
			inst.interval = null;
		};
		let entry = inst.entry;
		let isTimed = ["countdown", "stopwatch", "percent"].includes(entry.mode) || (entry.mode === "message" && Number(entry.duration) > 0);
		if (!isTimed || entry.paused) {return};
		let tickMs = (entry.mode === "percent" || (entry.mode === "message" && entry.showBar)) ? 100 : 250;
		inst.interval = setInterval(() => {
			if (!inst.li?.isConnected) {
				BroadcastManager.#clearInstance(entry.id, false);
				return;
			};
			let elapsed = BroadcastManager.getElapsed(inst.entry, inst.localStart);
			let view = BroadcastManager.computeView(inst.entry, elapsed);
			BroadcastManager.#applyViewToDom(inst, view);
			if (view.finished) {
				clearInterval(inst.interval);
				inst.interval = null;
				inst.entry.finished = true;
				if (inst.entry.autoRemove || (inst.entry.mode === "message" && Number(inst.entry.duration) > 0)) {
					let delay = inst.entry.mode === "message" ? 50 : 600;
					inst.removeTimer = setTimeout(() => {
						BroadcastManager.#clearInstance(entry.id, true);
						if (game.user.isGM && game.users.activeGM?.id === game.user.id) {BroadcastManager.#pruneFromSetting(entry.id)};
						BroadcastManager.#refreshApp();
					}, delay);
				} else {BroadcastManager.#refreshApp()};
			};
		}, tickMs);
	};

	static updateLocal(entry, elapsedMs) {
		let inst = BroadcastManager.#instances.get(entry.id);
		if (!inst) {
			if (BroadcastManager.shouldDisplay(entry)) {BroadcastManager.showLocal(entry, elapsedMs ?? 0)};
			return;
		};
		inst.entry = foundry.utils.deepClone(entry);
		if (typeof elapsedMs === "number") {inst.localStart = Date.now() - Math.max(0, elapsedMs)};
		let view = BroadcastManager.computeView(inst.entry, BroadcastManager.getElapsed(inst.entry, inst.localStart));
		BroadcastManager.#applyViewToDom(inst, view);
		BroadcastManager.#startTicking(inst);
		if (view.finished && inst.entry.autoRemove && ["counter", "rounds"].includes(inst.entry.mode)) {
			if (inst.removeTimer) {clearTimeout(inst.removeTimer)};
			inst.removeTimer = setTimeout(() => {
				BroadcastManager.#clearInstance(entry.id, true);
				if (game.user.isGM && game.users.activeGM?.id === game.user.id) {BroadcastManager.#pruneFromSetting(entry.id)};
				BroadcastManager.#refreshApp();
			}, 800);
		};
		BroadcastManager.#refreshApp();
	};

	static removeLocal(id) {
		BroadcastManager.#clearInstance(id, true);
		BroadcastManager.#refreshApp();
	};

	static async #pruneFromSetting(id) {
		if (!game.user.isGM) {return};
		let list = foundry.utils.deepClone(game.settings.get("wfrp4e-tools", "activeBroadcasts") || []);
		let filtered = list.filter(b => b.id !== id);
		if (filtered.length !== list.length) {await game.settings.set("wfrp4e-tools", "activeBroadcasts", filtered)};
	};

	static async #saveEntry(entry) {
		if (!game.user.isGM) {return};
		let list = foundry.utils.deepClone(game.settings.get("wfrp4e-tools", "activeBroadcasts") || []);
		let idx = list.findIndex(b => b.id === entry.id);
		if (idx >= 0) {list[idx] = entry}
		else {list.push(entry)};
		await game.settings.set("wfrp4e-tools", "activeBroadcasts", list);
	};

	static async send(config) {
		if (!game.user.isGM) {return null};
		let entry = {
			id: foundry.utils.randomID(),
			mode: config.mode || "message",
			text: String(config.text || "").trim() || game.i18n.localize("WFRP4E.Tools.Notification.New"),
			finishText: String(config.finishText || "").trim(),
			icon: config.icon || "",
			color: ["red", "orange", "green", "blue", "purple", "black"].includes(config.color) ? config.color : "blue",
			recipients: Array.isArray(config.recipients) ? config.recipients : [],
			duration: Math.max(0, Number(config.duration) || 0),
			showBar: Boolean(config.showBar),
			reverse: Boolean(config.reverse),
			autoRemove: Boolean(config.autoRemove),
			startedAt: Date.now(),
			paused: false,
			pausedElapsed: 0,
			finished: false,
			value: Number(config.value) || 0,
			max: Math.max(1, Number(config.max) || 1),
			step: Math.max(1, Number(config.step) || 1),
			displayFormat: config.displayFormat === "percent" ? "percent" : "fraction",
			lastRound: game.combat?.round ?? 0
		};
		await BroadcastManager.#saveEntry(entry);
		game.socket.emit("module.wfrp4e-tools", {name: "broadcastShow", args: [entry, 0]});
		await BroadcastManager.showLocal(entry, 0);
		return entry;
	};

	static async togglePause(id) {
		if (!game.user.isGM) {return};
		let inst = BroadcastManager.#instances.get(id);
		if (!inst) {return};
		let entry = foundry.utils.deepClone(inst.entry);
		if (entry.finished) {return};
		let elapsed = BroadcastManager.getElapsed(entry, inst.localStart);
		if (entry.paused) {
			entry.paused = false;
			entry.startedAt = Date.now() - elapsed;
		} else {
			entry.paused = true;
			entry.pausedElapsed = elapsed;
		};
		await BroadcastManager.#saveEntry(entry);
		game.socket.emit("module.wfrp4e-tools", {name: "broadcastUpdate", args: [entry, elapsed]});
		BroadcastManager.updateLocal(entry, elapsed);
	};

	static async stepCounter(id, delta) {
		if (!game.user.isGM) {return};
		let inst = BroadcastManager.#instances.get(id);
		if (!inst) {return};
		let entry = foundry.utils.deepClone(inst.entry);
		let max = Math.max(1, Number(entry.max) || 1);
		entry.value = Math.min(Math.max((Number(entry.value) || 0) + delta, 0), max);
		entry.finished = entry.value >= max;
		await BroadcastManager.#saveEntry(entry);
		game.socket.emit("module.wfrp4e-tools", {name: "broadcastUpdate", args: [entry, 0]});
		BroadcastManager.updateLocal(entry, 0);
	};

	static async stepRounds(id, delta, newRound) {
		if (!game.user.isGM) {return};
		let inst = BroadcastManager.#instances.get(id);
		if (!inst) {return};
		let entry = foundry.utils.deepClone(inst.entry);
		entry.value = Math.max(0, (Number(entry.value) || 0) + delta);
		if (entry.value > entry.max) {entry.max = entry.value};
		if (typeof newRound === "number") {entry.lastRound = newRound};
		entry.finished = entry.value <= 0;
		await BroadcastManager.#saveEntry(entry);
		game.socket.emit("module.wfrp4e-tools", {name: "broadcastUpdate", args: [entry, 0]});
		BroadcastManager.updateLocal(entry, 0);
	};

	static async onCombatRound(round) {
		if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) {return};
		for (let [id, inst] of BroadcastManager.#instances.entries()) {
			if (inst.entry.mode !== "rounds" || inst.entry.finished) {continue};
			let last = Number(inst.entry.lastRound) || 0;
			if (round > last) {await BroadcastManager.stepRounds(id, -(round - last), round)}
			else if (round < last) {
				inst.entry.lastRound = round;
				await BroadcastManager.#saveEntry(inst.entry);
			};
		};
	};

	static async dismiss(id) {
		if (!game.user.isGM) {return};
		await BroadcastManager.#pruneFromSetting(id);
		game.socket.emit("module.wfrp4e-tools", {name: "broadcastRemove", args: [id]});
		BroadcastManager.removeLocal(id);
	};

	static async dismissAll() {
		if (!game.user.isGM) {return};
		let ids = Array.from(BroadcastManager.#instances.keys());
		await game.settings.set("wfrp4e-tools", "activeBroadcasts", []);
		for (let id of ids) {
			game.socket.emit("module.wfrp4e-tools", {name: "broadcastRemove", args: [id]});
			BroadcastManager.removeLocal(id);
		};
	};

	static getActiveList() {
		let result = [];
		for (let [id, inst] of BroadcastManager.#instances.entries()) {
			let elapsed = BroadcastManager.getElapsed(inst.entry, inst.localStart);
			let view = BroadcastManager.computeView(inst.entry, elapsed);
			result.push({
				id,
				mode: inst.entry.mode,
				color: inst.entry.color,
				icon: inst.entry.icon,
				text: view.displayText,
				meta: view.meta,
				paused: Boolean(inst.entry.paused),
				isTimer: ["countdown", "stopwatch", "percent"].includes(inst.entry.mode) && !view.finished,
				isSteppable: ["counter", "rounds"].includes(inst.entry.mode)
			});
		};
		return result;
	};

	static async restoreAll() {
		let saved = foundry.utils.deepClone(game.settings.get("wfrp4e-tools", "activeBroadcasts") || []);
		if (!saved.length) {return};
		let valid = [];
		for (let entry of saved) {
			let elapsed = entry.paused ? (Number(entry.pausedElapsed) || 0) : Math.max(0, Date.now() - (Number(entry.startedAt) || Date.now()));
			let view = BroadcastManager.computeView(entry, elapsed);
			if (view.finished && (entry.autoRemove || (entry.mode === "message" && Number(entry.duration) > 0))) {continue};
			valid.push(entry);
			await BroadcastManager.showLocal(entry, elapsed);
		};
		if (game.user.isGM && game.users.activeGM?.id === game.user.id && valid.length !== saved.length) {await game.settings.set("wfrp4e-tools", "activeBroadcasts", valid)};
	};
};
tools.BroadcastManager = BroadcastManager;
//Окно отправки сообщений и таймеров игрокам (только для Мастера)
class BroadcastApp extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		classes: ["wfrp4eTools-broadcast", "wfrp4eTools", "warhammer"],
		window: {
			icon: "fas fa-bullhorn",
			title: "WFRP4E.Tools.Broadcast.Title",
			resizable: true,
			contentClasses: ["standard-form"]
		},
		actions: {
			send: this._onSend,
			togglePause: this._onTogglePause,
			stepMinus: this._onStepMinus,
			stepPlus: this._onStepPlus,
			dismissOne: this._onDismissOne,
			dismissAll: this._onDismissAll
		}
	};

	static PARTS = {
		form: {
			template: "modules/wfrp4e-tools/templates/broadcast/form.hbs"
		},
		active: {
			template: "modules/wfrp4e-tools/templates/broadcast/active.hbs"
		}
	};

	#metaInterval = null;

	async _prepareContext(options) {
		let context = await super._prepareContext(options);
		context.players = game.users.filter(u => !u.isGM).map(u => ({
			id: u.id,
			name: u.name,
			color: u.color?.css || u.color || "#888888"
		}));
		context.active = BroadcastManager.getActiveList();
		return context;
	};

	_onRender(context, options) {
		super._onRender(context, options);
		let formEl = this.element.querySelector(".broadcast-form");
		if (formEl && !formEl.dataset.bound) {
			formEl.dataset.bound = "1";
			let updateModeVisibility = () => {
				let mode = formEl.querySelector("input[name='mode']:checked")?.value || "message";
				formEl.querySelectorAll("[data-modes]").forEach(el => {
					let modes = el.dataset.modes.split(/\s+/);
					el.hidden = !modes.includes(mode);
				});
				formEl.querySelectorAll("[data-modes-only]").forEach(el => {
					let modes = el.dataset.modesOnly.split(/\s+/);
					el.hidden = !modes.includes(mode);
				});
			};
			formEl.querySelectorAll("input[name='mode']").forEach(r => r.addEventListener("change", updateModeVisibility));
			updateModeVisibility();
		};
		if (!this.#metaInterval) {
			this.#metaInterval = setInterval(() => {
				if (!this.element?.isConnected) {return};
				let list = BroadcastManager.getActiveList();
				for (let item of list) {
					let metaEl = this.element.querySelector(`.broadcast-active-item[data-id="${item.id}"] .active-meta`);
					if (metaEl && metaEl.textContent !== item.meta) {metaEl.textContent = item.meta};
				};
			}, 500);
		};
	};

	async close(options) {
		if (this.#metaInterval) {
			clearInterval(this.#metaInterval);
			this.#metaInterval = null;
		};
		return super.close(options);
	};

	static async create() {
		if (!game.user.isGM) {return};
		let existing = Array.from(foundry.applications.instances.values()).find(a => a instanceof BroadcastApp);
		if (existing) {
			existing.bringToFront?.();
			return existing;
		};
		let app = new this();
		await app.render({force: true});
		return app;
	};

	static async _onSend() {
		let formEl = this.element.querySelector(".broadcast-form");
		if (!formEl) {return};
		let mode = formEl.querySelector("input[name='mode']:checked")?.value || "message";
		let text = formEl.querySelector("textarea[name='text']")?.value?.trim() || "";
		let finishText = formEl.querySelector("input[name='finishText']")?.value?.trim() || "";
		let color = formEl.querySelector("input[name='color']:checked")?.value || "blue";
		let icon = formEl.querySelector("select[name='icon']")?.value || "";
		let autoRemove = Boolean(formEl.querySelector("input[name='autoRemove']")?.checked);
		let showBar = Boolean(formEl.querySelector("input[name='showBar']")?.checked);
		let reverse = formEl.querySelector("select[name='reverse']")?.value === "1";
		let duration = 0;
		let value = 0;
		let max = 1;
		let step = 1;
		let displayFormat = "fraction";

		if (mode === "message") {
			let sec = Math.max(0, Number(formEl.querySelector("input[name='msgDuration']")?.value) || 0);
			duration = sec * 1000;
		} else if (["countdown", "stopwatch", "percent"].includes(mode)) {
			let mins = Math.max(0, Number(formEl.querySelector("input[name='minutes']")?.value) || 0);
			let secs = Math.max(0, Number(formEl.querySelector("input[name='seconds']")?.value) || 0);
			duration = (mins * 60 + secs) * 1000;
			if ((mode === "countdown" || mode === "percent") && duration <= 0) {
				game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.Broadcast.Dialog.DurationRequired")}, {color: "red"});
				return;
			};
		} else if (mode === "counter") {
			max = Math.max(1, Number(formEl.querySelector("input[name='counterMax']")?.value) || 6);
			value = Math.min(Math.max(0, Number(formEl.querySelector("input[name='counterValue']")?.value) || 0), max);
			step = Math.max(1, Number(formEl.querySelector("input[name='counterStep']")?.value) || 1);
			displayFormat = formEl.querySelector("select[name='displayFormat']")?.value || "fraction";
		} else if (mode === "rounds") {
			let count = Math.max(1, Number(formEl.querySelector("input[name='roundsCount']")?.value) || 3);
			value = count;
			max = count;
		};
		let playerInputs = Array.from(formEl.querySelectorAll("input[name='recipient']"));
		let checkedPlayers = playerInputs.filter(i => i.checked).map(i => i.value);
		//Если выбраны все игроки (или игроков нет) — пустой массив (= все пользователи)
		let recipients = (playerInputs.length && checkedPlayers.length < playerInputs.length) ? checkedPlayers : [];
		if (playerInputs.length && !checkedPlayers.length) {
			game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.Broadcast.Dialog.RecipientsRequired")}, {color: "red"});
			return;
		};
		await BroadcastManager.send({mode, text, finishText, icon, color, recipients, duration, showBar, reverse, autoRemove, value, max, step, displayFormat});
	};

	static async _onTogglePause(event, button) {
		await BroadcastManager.togglePause(button.dataset.id);
	};

	static async _onStepMinus(event, button) {
		let item = BroadcastManager.getActiveList().find(b => b.id === button.dataset.id);
		if (!item) {return};
		if (item.mode === "counter") {
			let saved = (game.settings.get("wfrp4e-tools", "activeBroadcasts") || []).find(b => b.id === item.id);
			await BroadcastManager.stepCounter(item.id, -(Number(saved?.step) || 1));
		} else if (item.mode === "rounds") {await BroadcastManager.stepRounds(item.id, -1)};
	};

	static async _onStepPlus(event, button) {
		let item = BroadcastManager.getActiveList().find(b => b.id === button.dataset.id);
		if (!item) {return};
		if (item.mode === "counter") {
			let saved = (game.settings.get("wfrp4e-tools", "activeBroadcasts") || []).find(b => b.id === item.id);
			await BroadcastManager.stepCounter(item.id, Number(saved?.step) || 1);
		} else if (item.mode === "rounds") {await BroadcastManager.stepRounds(item.id, 1)};
	};

	static async _onDismissOne(event, button) {
		await BroadcastManager.dismiss(button.dataset.id);
	};

	static async _onDismissAll() {
		await BroadcastManager.dismissAll();
	};
};
tools.BroadcastApp = BroadcastApp;
//Журнал изменений
class AuditLogs extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		classes: ["wfrp4eTools-auditLogs", "wfrp4eTools", "warhammer"],
		window: {
			icon: "fas fa-clock-rotate-left",
			title: "WFRP4E.Tools.AuditLogs.Title",
			resizable: true,
			controls: [
				{
					icon: "fas fa-trash",
					label: "WFRP4E.Tools.AuditLogs.Dialog.Clear",
					action: "clear",
				},
			]
		},
		actions: {
			clear: this._onClear,
			reset: this._onReset
		}
	};

	static TABS = {
		primary: {
			tabs: [],
		}
	};

	constructor(options) {
		super(options);
		//Считывание логов изменения всех пользователей
		this.users = [];
		game.users.forEach(u => this.users.push({name: u.name, character: u.character, id: u.id, log: u.flags.wfrp4eTools?.auditLogs || []}));
		//Определение изначально открытой вкладки
		this.initialTab = options.initialTab || null;
		this.debug = game.settings.get("wfrp4e-tools", "debug");
		if (this.debug) {
			console.debug(...debugMessage, "AuditLogs constructor \"this\"");
			console.debug(this);
		};
	};

	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		options.parts = ["tabs"];
		this.users.forEach(u => {
			options.parts.push(u.id);
		});
		if (this.debug) {
			console.debug(...debugMessage, "AuditLogs _configureRenderOptions \"parts\"");
			console.debug(options.parts);
		};
	};

	async _prepareContext(options) {
		let context = await super._prepareContext(options);
		//Кнопка удаления логов
		context.buttons = [{
			icon: "fas fa-trash",
			action: "clear",
			label: "WFRP4E.Tools.AuditLogs.Dialog.Clear"
		}];
		if (this.debug) {
			console.debug(...debugMessage, "AuditLogs _prepareContext \"context\"");
			console.debug(context);
		};
		return context;
	};

	async _preparePartContext(partId, context) {
		//Подготовка окон изменений пользователей
		if (partId != "tabs") {
			context.tab = context.tabs[partId];
			context.user = foundry.utils.deepClone(this.users.find(u => u.id == partId));
			context.user.log.forEach(l => {
				//Определение времени, прошедшего от внесённого изменения
				let difference = game.wfrp4e.tools.timeDifference(Date.now(), l.time);
				l.timeDifference = [difference.days ? difference.days + " " + game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.Times.Days") : null, difference.hours ? difference.hours + " " + game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.Times.Hours") : null, difference.minutes ? difference.minutes + " " + game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.Times.Minutes") : null, (difference.seconds || 0) + " " + game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.Times.Seconds")].filter(Boolean);
				l.timeString = new Date(l.time).toLocaleString();
				//Нормализация параметров
				if (l.actor) {
					let actor = l.actor.uuid ? fromUuidSync(l.actor.uuid) : null;
					if (actor) {
						l.actor = {
							name: actor.name,
							uuid: actor.uuid
						};
					} else {
						l.actor = {
							name: l.actor.name,
							uuid: ""
						};
					};
				};
				if (l.item) {
					if (l.item.uuid) {
						let item = fromUuidSync(l.item.uuid);
						if (item) {
							l.item = {
								name: item.name,
								uuid: item.uuid
							};
						} else {
							l.item = {
								name: l.item.name,
								uuid: ""
							};
						};
					} else {
						l.item = {
							name: l.item.name,
							uuid: "",
							obj: l.item
						};
					};
				};
				//Определение основанных на выполненном действии параметров
				switch (l.action) {
					case ("create"): {
						l.action = game.i18n.localize("WFRP4E.Tools.AuditLogs.Action.Create");
						l.changed = {
							oldValue: "-",
							value: "+",
							increase: false,
							path: "-"
						};
						break;
					};
					case ("update"): {
						l.action = game.i18n.localize("WFRP4E.Tools.AuditLogs.Action.Update");
						let rawPath = l.changed?.path;
						if (typeof l.changed?.oldValue === "number" && typeof l.changed?.value === "number" && l.changed.oldValue > l.changed.value) {l.changed.increase = true};
						l.changed.oldValue = AuditLogs.formatValue(l.changed?.oldValue, rawPath);
						l.changed.value = AuditLogs.formatValue(l.changed?.value, rawPath);
						l.changed.path = AuditLogs.pathToString(rawPath);
						break;
					};
					case ("delete"): {
						l.action = game.i18n.localize("WFRP4E.Tools.AuditLogs.Action.Delete");
						l.changed = {
							oldValue: "+",
							value: "-",
							increase: true,
							path: "-"
						};
						break;
					};
				};
			});
			context.user.log = context.user.log.sort((a, b) => b.time - a.time);
			if (this.debug) {
				console.debug(...debugMessage, "AuditLogs _preparePartContext \"context\"");
				console.debug(context);
			};
		};
		return context;
	}

	_getTabsConfig(group) {
		let tabs = foundry.utils.deepClone(super._getTabsConfig(group));
		this.users.forEach(u => {
			tabs.tabs.push({
				id: u.id,
				group: "primary",
				label: u.name
			});
		});
		tabs.initial = this.initialTab || tabs.tabs[0].id;
		if (this.debug) {
			console.debug(...debugMessage, "AuditLogs _getTabsConfig \"tabs\"");
			console.debug(tabs);
		};
		return tabs;
	};

	static async create(options={}) {
		//Проверка на наличие активного окна генератора
		if (document.querySelector("div.wfrp4eTools.wfrp4eTools-auditLogs")) {
			document.querySelector("div.wfrp4eTools.wfrp4eTools-auditLogs").style.zIndex = ++ApplicationV2._maxZ;
			return;
		};
		return new Promise(resolve => {
			options.resolve = resolve;
			new this(options).render({force: true});
		});
	};
	//Очистка журнала
	static async _onClear(button) {
		//Определение пользователя
		let activeTab = this.element.querySelector("nav > a.active")?.dataset?.tab;
		let user = game.users.get(activeTab);
		if (!user) {return};
		if (this.debug) {
			console.debug(...debugMessage, "AuditLogs _onClear \"user\"");
			console.debug(user);
		};
		//Обновление данных пользователя
		await user.update({"flags.wfrp4eTools.auditLogs": []});
		game.wfrp4e.tools.newNotification({text: game.i18n.format("WFRP4E.Tools.AuditLogs.Dialog.Cleared", {user: user.name})}, {color: "blue"});
		//Обновление данных о логах пользователей
		this.users = [];
		game.users.forEach(u => this.users.push({name: u.name, character: u.character, id: u.id, log: u.flags.wfrp4eTools?.auditLogs || []}));
		this.tabGroups.primary = activeTab;
		this.render();
	};
	//Откат изменений
	static async _onReset(button) {
		//Определение пользователя, внёсшего изменения
		let activeTab = button.target.closest("section")?.dataset?.tab;
		let user = this.users.find(u => u.id == activeTab);
		let index = button.target.closest("tr")?.dataset?.index;
		if (!user || index === undefined) {return};
		let sortedLogs = [...user.log].sort((a, b) => b.time - a.time);
		let rawEntry = sortedLogs[index];
		if (!rawEntry) {return};
		let data = foundry.utils.deepClone(rawEntry);
		//Реальный индекс этого события в несортированном массиве флагов пользователя
		let realLogs = game.users.get(user.id)?.flags.wfrp4eTools?.auditLogs || [];
		let realIndex = realLogs.findIndex(l => l.time === data.time && l.action === data.action);
		if (this.debug) {
			console.debug(...debugMessage, "AuditLogs _onReset \"data\"");
			console.debug(data);
		};
		let resetDone = false;
		//Откат обновления параметров
		if (data.action == "update") {
			data.action = "resetUpdate";
			let changed = foundry.utils.deepClone(data.changed);
			let rawResetPath = changed.path;
			changed.oldValue = AuditLogs.formatValue(changed.oldValue, rawResetPath);
			changed.value = AuditLogs.formatValue(changed.value, rawResetPath);
			changed.path = AuditLogs.pathToString(rawResetPath);
			data.target = {changed: [changed]};
			let target;
			if (data.item?.uuid) {
				//Если изменения внесены в Предмет
				target = await fromUuid(data.item.uuid);
				data.target.item = target;
				if (data.actor?.uuid) {data.target.actor = await fromUuid(data.actor.uuid)};
			} else if (data.actor?.uuid) {
				//Если изменения внесены в Актёра
				target = await fromUuid(data.actor.uuid);
				data.target.actor = target;
			};
			//Откат изменений, если цель этих изменений была обнаружена
			if (target) {
				await target.update({[data.changed.path.replace(/\["|'|\\"/g, ".").replace(/"\]|'\]|\\"\]/g, "")]: data.changed.oldValue}, {onReset: true});
				if (realIndex !== -1) {await game.users.get(user.id).update({"flags.wfrp4eTools.auditLogs": realLogs.toSpliced(realIndex, 1)})};
				resetDone = true;
			} else {
				game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.MissItem")}, {color: "red"});
			};
		//Откат удаления предмета или актёра
		} else if (data.action == "delete") {
			data.action = "resetDelete";
			data.target = {};
			let item, actor;
			//Определение параметров удалённого предмета
			if (data.item) {
				item = data.item;
				data.target.item = item;
			};
			//Определение актёра, у которого предмет был удалён
			if (data.actor?.uuid) {
				actor = await fromUuid(data.actor.uuid);
				data.target.actor = actor;
			};
			if (item) {
				//Проверка на наличие актёра или отсутствие данных о нём, что означает удаление предмета из общей вкладки предметов
				if (actor || !data.actor?.uuid) {
					if (actor) {
						await actor.createEmbeddedDocuments("Item", [item], {onReset: true});
					} else {
						await Item.implementation.create(item, {onReset: true, renderSheet: true});
					};
					if (realIndex !== -1) {await game.users.get(user.id).update({"flags.wfrp4eTools.auditLogs": realLogs.toSpliced(realIndex, 1)})};
					resetDone = true;
				} else {
					game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.MissActor")}, {color: "red"});
				};
			} else if (data.actor) {
				//Восстановление удалённого актёра
				data.target.actor = data.actor;
				await Actor.implementation.create(data.actor, {onReset: true, renderSheet: true});
				if (realIndex !== -1) {await game.users.get(user.id).update({"flags.wfrp4eTools.auditLogs": realLogs.toSpliced(realIndex, 1)})};
				resetDone = true;
			} else {
				game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.MissItem")}, {color: "red"});
			};
		//Откат создания предмета или актёра
		} else if (data.action == "create") {
			data.action = "resetCreate";
			data.target = {};
			let item, actor;
			//Определение параметров созданного предмета
			if (data.item?.uuid) {
				item = await fromUuid(data.item.uuid);
				data.target.item = item?.name || data.item.name;
			};
			//Определение актёра
			if (data.actor?.uuid) {
				actor = await fromUuid(data.actor.uuid);
				data.target.actor = actor?.name || data.actor.name;
			};
			//Удаление предмета или актёра
			if (data.item?.uuid) {
				if (item) {
					await item.delete({onReset: true});
					if (realIndex !== -1) {await game.users.get(user.id).update({"flags.wfrp4eTools.auditLogs": realLogs.toSpliced(realIndex, 1)})};
					resetDone = true;
				} else {
					game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.MissItem")}, {color: "red"});
				};
			} else if (data.actor?.uuid) {
				if (actor) {
					await actor.delete({onReset: true});
					if (realIndex !== -1) {await game.users.get(user.id).update({"flags.wfrp4eTools.auditLogs": realLogs.toSpliced(realIndex, 1)})};
					resetDone = true;
				} else {
					game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.AuditLogs.Dialog.MissActor")}, {color: "red"});
				};
			};
		};
		if (resetDone) {
			data.user = game.users.get(user.id);
			let options = {
				uuid: user.id,
				template: "modules/wfrp4e-tools/templates/auditLogs/notification.hbs",
				color: "blue"
			};
			await game.wfrp4e.tools.newNotification(data, options);
		};
		//Обновление данных о логах пользователей
		this.users = [];
		game.users.forEach(u => this.users.push({name: u.name, character: u.character, id: u.id, log: u.flags.wfrp4eTools?.auditLogs || []}));
		this.tabGroups.primary = activeTab;
		this.render();
	};
	/**
	 * Преобразует значение изменённого параметра в читаемую строку (в том числе массивы объектов качеств/изъянов).
	 */
	static formatValue(val, path = "") {
		if (val === null || val === undefined || val === "") {return "-"};
		if (typeof val === "boolean") {return val ? "+" : "-"};
		if (Array.isArray(val)) {
			if (!val.length) {return "-"};
			let propDict = {};
			if (path?.includes("qualities")) {propDict = game.wfrp4e?.utility?.qualityList?.() || {}}
			else if (path?.includes("flaws")) {propDict = game.wfrp4e?.utility?.flawList?.() || {}};
			return val.map(entry => {
				if (entry && typeof entry === "object") {
					let label = propDict[entry.name] || entry.label || entry.name || JSON.stringify(entry);
					return entry.value != null && entry.value !== "" ? `${label} (${entry.value})` : label;
				};
				return propDict[entry] || String(entry);
			}).join(", ");
		};
		if (typeof val === "object") {return val.label || val.name || JSON.stringify(val)};
		return val;
	};
	/**
	 * Преобразует путь до изменённого параметра в строку, описывающую этот параметр.
	 * @param {string} path Путь до изменённого параметра.
	 * @returns {string} Описание изменённого параметра.
	 */
	static pathToString(path) {
		if (!path) {return ""};
		let string = path;
		//Характеристики и их вариации
		if (path.includes("system.characteristics")) {
			string = game.i18n.localize("Characteristic");
			path = path.split("system.characteristics.")[1];
			if (path.includes("ws")) {string += ": " + game.i18n.localize("CHAR.WS")}
			else if (path.includes("bs")) {string += ": " + game.i18n.localize("CHAR.BS")}
			else if (path.includes("s")) {string += ": " + game.i18n.localize("CHAR.S")}
			else if (path.includes("t")) {string += ": " + game.i18n.localize("CHAR.T")}
			else if (path.includes("i")) {string += ": " + game.i18n.localize("CHAR.I")}
			else if (path.includes("ag")) {string += ": " + game.i18n.localize("CHAR.Ag")}
			else if (path.includes("dex")) {string += ": " + game.i18n.localize("CHAR.Dex")}
			else if (path.includes("int")) {string += ": " + game.i18n.localize("CHAR.Int")}
			else if (path.includes("wp")) {string += ": " + game.i18n.localize("CHAR.WP")}
			else if (path.includes("fel")) {string += ": " + game.i18n.localize("CHAR.Fel")};
			if (path.includes("initial")) {string += " (" + game.i18n.localize("Initial") + ")"}
			else if (path.includes("modifier")) {string += " (" + game.i18n.localize("Modifier") + ")"}
			else if (path.includes("advances")) {string += " (" + game.i18n.localize("Advances") + ")"};
		//Раны
		} else if (path.includes("system.status.wounds")) {
			string = game.i18n.localize("Wounds");
			if (path.includes("value")) {string += ": " + game.i18n.localize("Value")}
			else if (path.includes("max")) {string += ": " + game.i18n.localize("Max")};
		//Преимущество
		} else if (path.includes("system.status.advantage")) {
			string = game.i18n.localize("Advantage");
			if (path.includes("value")) {string += ": " + game.i18n.localize("Value")}
			else if (path.includes("max")) {string += ": " + game.i18n.localize("Max")};
		//Скверна
		} else if (path.includes("system.status.corruption")) {
			string = game.i18n.localize("Corruption");
			if (path.includes("value")) {string += ": " + game.i18n.localize("Value")}
			else if (path.includes("max")) {string += ": " + game.i18n.localize("Max")};
		//Амбиции
		} else if (path.includes("system.details") && path.includes("ambitions")) {
			if (path.includes("personal")) {string = game.i18n.localize("Personal Ambitions")}
			else {string = game.i18n.localize("Party Ambitions")};
			if (path.includes("short")) {string += " (" + game.i18n.localize("Short Term") + ")"}
			else {string += " (" + game.i18n.localize("Long Term") + ")"};
		//Стоимость
		} else if (path.includes("system.price")) {
			string = game.i18n.localize("Price");
			if (path.includes("gc")) {string += ": " + game.i18n.localize("NAME.GC")}
			else if (path.includes("ss")) {string += ": " + game.i18n.localize("NAME.SS")}
			else if (path.includes("bp")) {string += ": " + game.i18n.localize("NAME.BP")};
		//Прочность брони
		} else if (path.includes("system.APdamage")) {
			string = game.i18n.localize("WFRP4E.Tools.AuditLogs.pathToString.APdamage") + ": " + game.i18n.localize("WFRP4E.Locations." + path.replace("system.APdamage.", ""));
		//Порог сотворения
		} else if (path.includes("system.cn")) {
			string = game.i18n.localize("SHEET.CN");
			if (path.includes("SL")) {string += ": " + game.i18n.localize("SHEET.SL")};
		//Единичные параметры
		} else {
			switch (path) {
				//Имя
				case "name": {
					string = game.i18n.localize("Name");
					break;
				};
				//Имя токена
				case "prototypeToken.name": {
					string = game.i18n.localize("Token") + ": " + game.i18n.localize("Name");
					break;
				};
				//Судьба
				case "system.status.fate.value": {
					string = game.i18n.localize("Fate");
					break;
				};
				//Удача
				case "system.status.fortune.value": {
					string = game.i18n.localize("Fortune");
					break;
				};
				//Упорство
				case "system.status.resilience.value": {
					string = game.i18n.localize("Resilience");
					break;
				};
				//Решимость
				case "system.status.resolve.value": {
					string = game.i18n.localize("Resolve");
					break;
				};
				//Грех
				case "system.status.sin.value": {
					string = game.i18n.localize("Sin");
					break;
				};
				//Народ
				case "system.details.species.value": {
					string = game.i18n.localize("Species");
					break;
				};
				//Пол
				case "system.details.gender.value": {
					string = game.i18n.localize("Gender");
					break;
				};
				//Биография
				case "system.details.biography.value": {
					string = game.i18n.localize("Biography");
					break;
				};
				//Бог
				case "system.details.god.value": {
					string = game.i18n.localize("God");
					break;
				};
				//Возраст
				case "system.details.age.value": {
					string = game.i18n.localize("Age");
					break;
				};
				//Рост
				case "system.details.height.value": {
					string = game.i18n.localize("CharacterHeight");
					break;
				};
				//Вес
				case "system.details.weight.value": {
					string = game.i18n.localize("Weight");
					break;
				};
				//Цвет волос
				case "system.details.haircolour.value": {
					string = game.i18n.localize("Hair Colour");
					break;
				};
				//Цвет глаз
				case "system.details.eyecolour.value": {
					string = game.i18n.localize("Eye Colour");
					break;
				};
				//Созвездие
				case "system.details.distinguishingmark.value": {
					string = game.i18n.localize("Distinguishing Mark");
					break;
				};
				//Описание
				case "system.description.value": {
					string = game.i18n.localize("Description");
					break;
				};
				//Количество
				case "system.quantity.value": {
					string = game.i18n.localize("Quantity");
					break;
				};
				//Вес (предмета)
				case "system.encumbrance.value": {
					string = game.i18n.localize("Encumbrance");
					break;
				};
				//Доступность
				case "system.availability.value": {
					string = game.i18n.localize("Availability");
					break;
				};
				//Зона попадания
				case "system.location.value": {
					string = game.i18n.localize("Location");
					break;
				};
				//Урон предмету
				case "system.damageToItem.value": {
					string = game.i18n.localize("WFRP4E.Tools.AuditLogs.pathToString.DamageToItem");
					break;
				};
				//Урон предмета
				case "system.damage.value": {
					string = game.i18n.localize("Damage");
					break;
				};
				//Длина
				case "system.reach.value": {
					string = game.i18n.localize("Reach");
					break;
				};
				//Дальнобойность
				case "system.range.value": {
					string = game.i18n.localize("Range");
					break;
				};
				//Навык
				case "system.skill.value": {
					string = game.i18n.localize("WFRP4E.Tools.AuditLogs.pathToString.Skill");
					break;
				};
				//Двуручное
				case "system.twohanded.value": {
					string = game.i18n.localize("ITEM.TwoHanded");
					break;
				};
				//Тип боеприпасов
				case "system.ammunitionGroup.value": {
					string = game.i18n.localize("ITEM.AmmunitionGroup");
					break;
				};
				//Тип оружия
				case "system.weaponGroup.value": {
					string = game.i18n.localize("Weapon Group");
					break;
				};
				//Достоинства
				case "system.qualities.value": {
					string = game.i18n.localize("Qualities");
					break;
				};
				//Недостатки
				case "system.flaws.value": {
					string = game.i18n.localize("Flaws");
					break;
				};
				//Особое (в достоинтсвах и недостатках)
				case "system.special.value": {
					string = game.i18n.localize("Special");
					break;
				};
				//Экипировано
				case "system.equipped.value": {
					string = game.i18n.localize("Equipped");
					break;
				};
				//Забрало
				case "flags.wfrp4e.visor": {
					string = game.i18n.localize("PROPERTY.Visor");
					break;
				};
				//Пока перечислены только параметры character актёра и weapon предмета
			};
		};
		return string;
	};
	//При закрытии
	async close(options) {
		this.options.resolve?.();
		return super.close(options);
	};
};
tools.AuditLogsApp = AuditLogs;
//Очередь записи логов изменений, чтобы быстрые правки не перезаписывали друг друга
let auditLogsWriteQueue = Promise.resolve();
function enqueueAuditLogWrite(task) {
	auditLogsWriteQueue = auditLogsWriteQueue
		.then(task)
		.catch(err => console.warn(...debugMessage, "AuditLogs write error:", err));
	return auditLogsWriteQueue;
};
//Поиск открытого окна Журнала изменений и его перерисовка
function refreshAuditLogsApp() {
	if (!game.user.isGM) {return};
	let app = Array.from(foundry.applications.instances.values()).find(a => a instanceof AuditLogs);
	if (app && app.rendered) {
		app.users = [];
		game.users.forEach(u => app.users.push({
			name: u.name,
			character: u.character,
			id: u.id,
			log: u.flags.wfrp4eTools?.auditLogs || []
		}));
		app.render();
	};
};
//Перерисовка Журнала изменений сразу после синхронизации флагов любого пользователя
Hooks.on("updateUser", (user, changed) => {
	if (game.user.isGM && changed?.flags?.wfrp4eTools && Object.hasOwn(changed.flags.wfrp4eTools, "auditLogs")) {refreshAuditLogsApp()};
});
//Создание уведомлений при изменении в Журнале, чтобы они выводились с задержкой
//Это нужно, чтобы подобные изменения складывались в одно действие, а не выводили разными
function updateAuditLogs(rawLog, user) {
	if (!game.user.isGM || !rawLog || !user) {return};
	let log = foundry.utils.deepClone(rawLog);
	//Если окно Журнала изменений открыто, обновляет данные в нём
	refreshAuditLogsApp();
	//Инициализация буфера пользователя (на случай создания нового пользователя после ready)
	if (!game.wfrp4e.tools.auditLogs) {game.wfrp4e.tools.auditLogs = {}};
	if (!game.wfrp4e.tools.auditLogs[user]) {
		game.wfrp4e.tools.auditLogs[user] = {timer: false, logs: []};
	};
	//Проверяет предыдущий лог на подобность
	let previousLog = game.wfrp4e.tools.auditLogs[user].logs.at(-1);
	//Если лог подобен, применяет новое значение к нему, если же нет - добавляет новый лог в пул
	if (log.action == "update" && previousLog?.action == "update" && previousLog?.item?.uuid == log?.item?.uuid && previousLog?.actor?.uuid == log?.actor?.uuid && previousLog?.changed?.path == log.changed?.path) {
		previousLog.changed.value = log.changed.value;
		if (previousLog.changed.value == previousLog.changed.oldValue) {
			game.wfrp4e.tools.auditLogs[user].logs.pop();
		};
	} else {
		game.wfrp4e.tools.auditLogs[user].logs.push(log);
	};
	//Если таймер задержки уже запущен, останавливает его
	if (game.wfrp4e.tools.auditLogs[user].timer) {
		clearTimeout(game.wfrp4e.tools.auditLogs[user].timer);
	};
	//Запускает таймер задержки
	game.wfrp4e.tools.auditLogs[user].timer = setTimeout(async () => {
		let pendingLogs = game.wfrp4e.tools.auditLogs[user]?.logs || [];
		game.wfrp4e.tools.auditLogs[user] = {timer: false, logs: []};
		let logs = [];
		//Нормализация данных лога
		for (let entry of pendingLogs) {
			let target = {};
			if (entry.action == "create") {
				if (entry.item) {target.item = entry.item.name};
				if (entry.actor) {target.actor = entry.actor.name};
				logs.push({action: entry.action, target, timer: entry.time});
			} else if (entry.action == "delete") {
				if (entry.item) {target.item = entry.item};
				if (entry.actor) {target.actor = entry.actor};
				logs.push({action: entry.action, target, timer: entry.time});
			} else if (entry.action == "update" && entry.changed) {
				let changedCopy = foundry.utils.deepClone(entry.changed);
				let rawPath = changedCopy.path;
				changedCopy.oldValue = AuditLogs.formatValue(changedCopy.oldValue, rawPath);
				changedCopy.value = AuditLogs.formatValue(changedCopy.value, rawPath);
				changedCopy.path = AuditLogs.pathToString(rawPath);
				let cLog = logs.filter(l => l.action == "update").find(l =>
					(!l.target.item && !entry.item && l.target.actor?.uuid == entry.actor?.uuid) ||
					(l.target?.item?.uuid && l.target.item.uuid == entry?.item?.uuid && l.target.actor?.uuid == entry.actor?.uuid)
				);
				if (cLog) {
					cLog.target.changed.push(changedCopy);
					cLog.timer = entry.time;
				} else {
					if (entry.item) {target.item = entry.item};
					if (entry.actor) {target.actor = entry.actor};
					target.changed = [changedCopy];
					logs.push({action: entry.action, target, timer: entry.time});
				};
			};
		};
		//Вывод уведомления для каждого лога
		for (let entry of logs) {
			let data = {
				user: game.users.get(user),
				action: entry.action,
				target: entry.target
			};
			let options = {
				uuid: user,
				hint: game.i18n.localize("WFRP4E.Tools.AuditLogs.Notification.Hint"),
				template: "modules/wfrp4e-tools/templates/auditLogs/notification.hbs",
				color: "blue",
				//Функция нажатия на уведомление
				notificationClick: async () => {
					let app = Array.from(foundry.applications.instances.values()).find(a => a instanceof AuditLogs);
					//Если Журнал открыт - переключается на вкладку пользователя, совершившего изменения
					if (app) {
						app.changeTab?.(user, "primary");
						app.bringToFront?.();
					//Если закрыт, открывает его, активируя вкладку нужного пользователя
					} else {
						await AuditLogs.create({initialTab: user});
					};
				}
			};
			await game.wfrp4e.tools.newNotification(data, options);
		};
	}, 2000);
};
//Вспомогательная отправка записи в флаги пользователя и по сокету
async function recordAuditLog(log, user, mergeUpdate = false) {
	let debug = game.settings.get("wfrp4e-tools", "debug");
	let maxLen = Math.max(1, Number(game.settings.get("wfrp4e-tools", "auditLogsLength")) || 50);
	await enqueueAuditLogWrite(async () => {
		let auditLogs = foundry.utils.deepClone(game.user.flags.wfrp4eTools?.auditLogs || []);
		let previousLog = auditLogs.at(-1);
		if (
			mergeUpdate &&
			log.action == "update" &&
			previousLog?.action == "update" &&
			previousLog.time >= log.time - 2000 &&
			previousLog?.item?.uuid == log?.item?.uuid &&
			previousLog?.actor?.uuid == log?.actor?.uuid &&
			previousLog?.changed?.path == log.changed?.path
		) {
			previousLog.changed.value = log.changed.value;
			previousLog.time = log.time;
			if (previousLog.changed.value == previousLog.changed.oldValue) {
				auditLogs.pop();
			};
			await game.user.update({"flags.wfrp4eTools.auditLogs": auditLogs});
		} else {
			auditLogs.push(log);
			await game.user.update({"flags.wfrp4eTools.auditLogs": auditLogs.slice(-maxLen)});
		};
		if (debug) {
			console.debug(...debugMessage, "AuditLogs saved", log, game.user.flags.wfrp4eTools?.auditLogs);
		};
	});
	//Для сокета передаём облегчённый объект (без полного дампа embedded-документов при deleteActor)
	let socketLog = foundry.utils.deepClone(log);
	if (socketLog.action == "delete") {
		if (socketLog.actor) {socketLog.actor = {name: socketLog.actor.name, uuid: socketLog.actor.uuid || ""}};
		if (socketLog.item) {socketLog.item = {name: socketLog.item.name, uuid: socketLog.item.uuid || ""}};
	};
	game.socket.emit("module.wfrp4e-tools", {name: "updateAuditLogs", args: [socketLog, user]});
	updateAuditLogs(socketLog, user);
};
//Локальный кеш до изменения (раздельно по UUID, чтобы пакетные обновления вроде монет не перезатирали друг друга)
const auditOldDataCache = new Map();
function pushAuditOldData(uuid, snapshot) {
	if (!uuid) {return};
	let queue = auditOldDataCache.get(uuid);
	if (!queue) {
		queue = [];
		auditOldDataCache.set(uuid, queue);
	};
	queue.push(snapshot);
	if (queue.length > 20) {queue.shift()};
};
function shiftAuditOldData(uuid) {
	let queue = auditOldDataCache.get(uuid);
	if (!queue?.length) {return null};
	let snapshot = queue.shift();
	if (!queue.length) {auditOldDataCache.delete(uuid)};
	return snapshot;
};
//Считывание изменений. Подготовка к Изменению актёра
Hooks.on("preUpdateActor", (actor, args, options, user) => {
	if (user == game.user.id && !options.onReset) {pushAuditOldData(actor.uuid, actor.toObject())};
});
//Считывание изменений. Изменение актёра
Hooks.on("updateActor", async (actor, args, options, user) => {
	if (user != game.user.id) {return};
	let oldData = shiftAuditOldData(actor.uuid);
	if (options.onReset) {return};
	let keys = game.wfrp4e.tools.getNestedKeys(args).filter(k => !k.startsWith("_stats") && k !== "_id");
	if (keys.length !== 1) {return};
	let path = keys[0];
	if (!path || path.includes("sort") || path.includes("flags")) {return};
	let parts = path.replace(/\["|'|\\"/g, ".").replace(/"\]|'\]|\\"\]/g, "").split(".").filter(Boolean);
	let newData = actor.toObject();
	let newValue = parts.reduce((acc, part) => acc?.[part], newData);
	if (newValue === undefined) {newValue = parts.reduce((acc, part) => acc?.[part], args)};
	let oldValue = parts.reduce((acc, part) => acc?.[part], oldData);
	if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {return};
	let log = {
		actor: {uuid: actor.uuid, name: actor.name},
		action: "update",
		changed: {
			path,
			value: newValue,
			oldValue
		},
		time: options.modifiedTime || Date.now()
	};
	await recordAuditLog(log, user, true);
});
//Считывание изменений. Подготовка к Изменению предмета
Hooks.on("preUpdateItem", (item, args, options, user) => {
	if (user == game.user.id && !options.onReset) {pushAuditOldData(item.uuid, item.toObject())};
});
//Считывание изменений. Изменение предмета
Hooks.on("updateItem", async (item, args, options, user) => {
	if (user != game.user.id) {return};
	let oldData = shiftAuditOldData(item.uuid);
	if (options.onReset) {return};
	let keys = game.wfrp4e.tools.getNestedKeys(args).filter(k => !k.startsWith("_stats") && k !== "_id");
	if (keys.length !== 1) {return};
	let path = keys[0];
	if (!path || path.includes("sort") || path.includes("flags")) {return};
	let parts = path.replace(/\["|'|\\"/g, ".").replace(/"\]|'\]|\\"\]/g, "").split(".").filter(Boolean);
	let newData = item.toObject();
	let newValue = parts.reduce((acc, part) => acc?.[part], newData);
	if (newValue === undefined) {newValue = parts.reduce((acc, part) => acc?.[part], args)};
	let oldValue = parts.reduce((acc, part) => acc?.[part], oldData);
	if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {return};
	let log = {
		item: {uuid: item.uuid, name: item.name},
		action: "update",
		changed: {
			path,
			value: newValue,
			oldValue
		},
		time: options.modifiedTime || Date.now()
	};
	if (item.parent) {
		log.actor = {uuid: item.parent.uuid, name: item.parent.name};
	};
	await recordAuditLog(log, user, true);
});
//Считывание изменений. Удаление актёра
Hooks.on("deleteActor", async (actor, options, user) => {
	if (user == game.user.id && !options.onReset) {
		let log = {
			actor: actor.toObject(),
			action: "delete",
			time: options.modifiedTime || Date.now()
		};
		await recordAuditLog(log, user, false);
	};
});
//Считывание изменений. Удаление предмета
Hooks.on("deleteItem", async (item, options, user) => {
	if (user == game.user.id && !options.onReset) {
		let log = {
			item: item.toObject(),
			action: "delete",
			time: options.modifiedTime || Date.now()
		};
		if (item.parent) {
			log.actor = {uuid: item.parent.uuid, name: item.parent.name};
		};
		await recordAuditLog(log, user, false);
	};
});
//Считывание изменений. Создание актёра
Hooks.on("createActor", async (actor, options, user) => {
	if (user == game.user.id && !options.onReset) {
		let log = {
			actor: {uuid: actor.uuid, name: actor.name},
			action: "create",
			time: options.modifiedTime || Date.now()
		};
		await recordAuditLog(log, user, false);
	};
});
//Считывание изменений. Создание предмета
Hooks.on("createItem", async (item, options, user) => {
	if (user == game.user.id && !options.onReset) {
		let log = {
			item: {uuid: item.uuid, name: item.name},
			action: "create",
			time: options.modifiedTime || Date.now()
		};
		if (item.parent) {
			log.actor = {uuid: item.parent.uuid, name: item.parent.name};
		};
		await recordAuditLog(log, user, false);
	};
});
//Сводка амбиций персонажей игроков
class AmbitionsSummary extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		classes: ["wfrp4eTools-ambitionsSummary", "wfrp4eTools", "warhammer"],
		window: {
			icon: "fas fa-star",
			title: "WFRP4E.Tools.AmbitionsSummary.Title",
			resizable: true,
			contentClasses: ["standard-form"]
		},
		actions: {
			clickActor: this._onClickActor,
			sync: this._onSync,
			achieve: this._onAchieve
		}
	};

	static PARTS = {
		form: {
			template: "modules/wfrp4e-tools/templates/other/ambitions.hbs",
		},
	};

	constructor(options) {
		super(options);
		this.debug = game.settings.get("wfrp4e-tools", "debug");
		if (this.debug) {
			console.debug(...debugMessage, "AmbitionsSummary constructor \"this\"");
			console.debug(this);
		};
	};

	async _prepareContext(options) {
		let context = await super._prepareContext(options);
		context.debug = this.debug;
		//Берёт всех пользователей, у которых есть закреплённые актёры и возвращает этих актёров
		this.actors = game.users.filter(u => u.character).map(u => u.character);
		context.actors = this.actors;
		this.ambitions = game.settings.get("wfrp4e-tools", "ambitions");
		context.ambitions = this.ambitions;
		if (this.debug) {
			console.debug(...debugMessage, "AmbitionsSummary _prepareContext \"context\"");
			console.debug(context);
		};
		return context;
	};

	async _onRender(context) {
		this.element.querySelectorAll("input").forEach(i => {
			//Событие при внесении изменений в любой input этого приложения
			i.addEventListener("change", async (e) => {
				let uuid = e.target.closest("div").dataset.uuid;
				let type = e.target.closest("div").dataset.type;
				//Если input находится в командной области
				if (uuid == "party") {
					let data = game.settings.get("wfrp4e-tools", "ambitions");
					data[type] = e.target.value;
					await game.settings.set("wfrp4e-tools", "ambitions", data);
					this.render();
				//Если input находится в личной области
				} else {
					let actor = await fromUuid(uuid);
					let data = actor.system.details["personal-ambitions"];
					data[type + "-term"] = e.target.value;
					await actor.update({"system.details.personal-ambitions": data});
				};
				//Обновление данных актёров
				this.actors = game.users.filter(u => u.character).map(u => u.character);
			});
		});
		//Определение несинхронизированных командных амбиций
		this.element.querySelectorAll("div[data-uuid='party'] > a[data-action='sync']").forEach(a => {
			let type = a.closest("div").dataset.type;
			let value = a.closest("div").querySelector("input").value;
			let desync = [];
			//Перебираем всех актёров по их командным амбициям
			for (let [index, ambition] of this.actors.map(actor => actor.system.details["party-ambitions"][type + "-term"]).entries()) {
				//Если не соответствует общей, добавляем в массив desync
				if (ambition != value) {
					desync.push({
						actor: this.actors[index].name,
						value: ambition
					});
				};
			};
			//Если после перебора в массиве desync есть объекты, добавляет класс кнопке, делающий её красной, а в описание список несинхронизированных пользователей с их амбициями
			if (desync.length) {
				a.classList.add("desync");
				a.dataset.tooltip = "<ul>" + desync.map(d => "<li><b>" + d.actor + "</b></li>" + d.value).join("<hr>") + "</ul>"
			};
		});
	};

	static async create(options={}) {
		//Проверка на наличие активного окна
		if (document.querySelector("div.wfrp4eTools.wfrp4eTools-ambitionsSummary")) {
			document.querySelector("div.wfrp4eTools.wfrp4eTools-ambitionsSummary").style.zIndex = ++ApplicationV2._maxZ;
			return;
		};
		if (game.settings.get("wfrp4e-tools", "debug")) {
			console.debug(...debugMessage, "AmbitionsSummary create \"options\"");
			console.debug(options);
		};
		return new Promise(resolve => {
			options.resolve = resolve;
			new this(options).render({force: true});
		});
	};
	//При нажатии на имя актёра открывает его лист
	static async _onClickActor(e) {
		(await fromUuid(e.target.closest("a").dataset.uuid)).sheet.render(true);
	};
	//При нажатии на кнопку синхронизации командных амбиций
	static async _onSync(e) {
		let type = e.target.closest("div").dataset.type;
		let value = e.target.closest("div").querySelector("input").value;
		//Перебирает всех актёров
		for (let actor of this.actors) {
			//Если амбиция актёра не соответствует общей, обновляет её
			if (actor.system.details["party-ambitions"][type + "-term"] != value) {
				let data = actor.system.details["party-ambitions"];
				data[type + "-term"] = value;
				await actor.update({"system.details.party-ambitions": data});
			};
		};
		this.render();
	};
	//При нажатии кнопки Достичь
	static async _onAchieve(e) {
		let uuid = e.target.closest("div").dataset.uuid;
		let type = e.target.closest("div").dataset.type;
		let value = e.target.closest("div").querySelector("input").value;
		let actors = [];
		//Если командная
		if (uuid == "party") {
			//Перебирает всех актёров
			for (let actor of this.actors) {
				//Обнуляет значение амбиции
				let data = actor.system.details["party-ambitions"];
				data[type + "-term"] = "";
				await actor.update({"system.details.party-ambitions": data});
				//Выдаёт соответствующую амбиции награду в опыте
				actor.system.awardExp(type == "short" ? 50 : 500, game.i18n.format("WFRP4E.Tools.AmbitionsSummary.Reason", {type: type == "short" ? game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Short") : game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Long"), class: game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Party")}) + ": " + value);
				//Добавляет актёров в уведомление
				actors.push(actor.name);
			};
			//Обнуляет значение амбиции
			let data = game.settings.get("wfrp4e-tools", "ambitions");
			data[type] = "";
			await game.settings.set("wfrp4e-tools", "ambitions", data);
		} else {
			let actor = await fromUuid(uuid);
			//Обнуляет значение амбиции
			let data = actor.system.details["personal-ambitions"];
			data[type + "-term"] = "";
			await actor.update({"system.details.personal-ambitions": data});
			//Выдаёт соответствующую амбиции награду в опыте
			actor.system.awardExp(type == "short" ? 50 : 500, game.i18n.format("WFRP4E.Tools.AmbitionsSummary.Reason", {type: type == "short" ? game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Short") : game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Long"), class: game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Personal")}) + ": " + value);
			//Добавляет актёров в уведомление
			actors.push(actor.name);
		};
		game.wfrp4e.tools.newNotification({text: game.i18n.format("WFRP4E.Tools.AmbitionsSummary.Notify", {actors: actors.join(", "), action: uuid == "party" ? game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.AllAchieve") : game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.OneAchieve"), type: type == "short" ? game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Short") : game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Long"), class: uuid == "party" ? game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Party") : game.i18n.localize("WFRP4E.Tools.AmbitionsSummary.Personal")})}, {color: "green"});
		e.target.closest("div").querySelector("input").value = "";
	};
	//При закрытии
	async close(options) {
		this.options.resolve?.();
		return super.close(options);
	};
};
tools.AmbitionsSummary = AmbitionsSummary;
//Обновление журнала амбиций, если он окрыт
async function updateAmbitionsSummary(uuid) {
	if (game.user.isGM && document.querySelector("div.wfrp4eTools.wfrp4eTools-ambitionsSummary")) {
		let app = foundry.applications.instances.get(document.querySelector("div.wfrp4eTools.wfrp4eTools-ambitionsSummary").id);
		app.render();
	};
};
//При обновлении данных актёра
Hooks.on("updateActor", async (actor, args, options, user) => {
	//Если обновление вызвано этим же пользователем, цель обновления - персонаж, обновлены были параметры, связанные с амбициями или имя персонажа
	//Эта проверка нужна потому что при изменении любого актёра любым пользователем остальные пользователи так же перехватывают хук "updateActor"
	let ch = options.changed || args;
	if (user == game.user.id && actor.type == "character" && (ch?.name || ch?.system?.details?.experience || ch?.system?.details?.["party-ambitions"] || ch?.system?.details?.["personal-ambitions"])) {
		game.socket.emit("module.wfrp4e-tools", {name: "updateAmbitionsSummary", args: [actor.uuid]});
		updateAmbitionsSummary(actor.uuid);
	};
});
//При обновлении пользователей
Hooks.on("updateUser", async (user, args, options) => {
	//Если обновление вызвано этим же пользователем, был обновлён привязанный актёр, который является персонажем
	//Эта проверка нужна потому что при изменении любого пользователя любым пользователем остальные пользователи так же перехватывают хук "updateUser"
	if (user.id == game.user.id && Object.hasOwn(args, "character") && user?.character?.type == "character") {
		game.socket.emit("module.wfrp4e-tools", {name: "updateAmbitionsSummary", args: [user.character?.uuid, user.character ? false : true]});
		updateAmbitionsSummary(user.character?.uuid);
	};
});
//Статистика бросков
class RollStats extends HandlebarsApplicationMixin(ApplicationV2) {
	static #writeQueue = new Map();
	//Создание "очереди" статистики для предотвращение проблем когда кубы кидаются очень быстро
	static enqueueUpdate(userId, task) {
		let prev = this.#writeQueue.get(userId) || Promise.resolve();
		let next = prev.then(task).catch(err => console.warn(...debugMessage, "RollStats queue error:", err));
		this.#writeQueue.set(userId, next);
		return next;
	};

	static DEFAULT_OPTIONS = {
		classes: ["wfrp4eTools-rollStats", "wfrp4eTools", "warhammer"],
		window: {
			icon: "fas fa-chart-pie",
			title: "WFRP4E.Tools.RollStats.Title",
			resizable: true,
			controls: [
				{
					icon: "fas fa-trash",
					label: "WFRP4E.Tools.RollStats.Dialog.Clear",
					action: "clear",
					visible: () => game.user.isGM
				}
			]
		},
		actions: {
			clear: this._onClear,
			toggleSection: this._onToggleSection
		}
	};

	static TABS = {
		primary: {
			tabs: []
		}
	};

	constructor(options={}) {
		super(options);
		this.debug = game.settings.get("wfrp4e-tools", "debug");
		//Определение открытой вкладки
		this.initialTab = options.initialTab || (game.user.isGM ? "all" : game.user.id);
		//Определение текущих фильтров
		this.filters = options.filters || {
			period: "all",
			dateFrom: "",
			dateTo: "",
			category: "all",
			sections: {
				summary: true,
				sl: true,
				events: false,
				breakdown: false,
				history: false
			}
		};
		//Определение данных пользователей
		this._loadUsersData();
		if (this.debug) {
			console.debug(...debugMessage, "RollStats constructor \"this\"");
			console.debug(this);
		};
	};
	//Определение данных пользователей
	_loadUsersData() {
		this.users = [];
		//Мастер видит всех игроков
		if (game.user.isGM) {
			game.users.forEach(u => {
				this.users.push({
					id: u.id,
					name: u.name,
					isGM: u.isGM,
					rolls: u.flags.wfrp4eTools?.rollStats || []
				});
			});
		//Обыный игрок видит только себя
		} else {
			this.users.push({
				id: game.user.id,
				name: game.user.name,
				isGM: game.user.isGM,
				rolls: game.user.flags.wfrp4eTools?.rollStats || []
			});
		};
	};
	//Определение видимых элементов
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		//Мастер видит меню навигации со вкладками, общую статистику и статистику каждого человека
		if (game.user.isGM) {
			options.parts = ["tabs", "all", ...this.users.map(u => u.id)];
		//Игрок видит только свою статистику
		} else {
			options.parts = [game.user.id];
		};
		if (this.debug) {
			console.debug(...debugMessage, "RollStats _configureRenderOptions \"options\"");
			console.debug(options);
		};
	};
	//Определение меню навигации
	_getTabsConfig(group) {
		let tabs = foundry.utils.deepClone(super._getTabsConfig(group));
		if (game.user.isGM) {
			tabs.tabs.push({
				id: "all",
				group: "primary",
				label: game.i18n.localize("WFRP4E.Tools.RollStats.Tabs.All")
			});
		};
		this.users.forEach(u => {
			tabs.tabs.push({
				id: u.id,
				group: "primary",
				label: u.name
			});
		});
		tabs.initial = this.initialTab || tabs.tabs[0]?.id;
		if (this.debug) {
			console.debug(...debugMessage, "RollStats _getTabsConfig \"tabs\"");
			console.debug(tabs);
		};
		return tabs;
	};
	//Определение данных для вкладок
	async _preparePartContext(partId, context) {
		if (partId !== "tabs") {
			context.tab = context.tabs?.[partId];
			context.filters = foundry.utils.deepClone(this.filters);
			let rawRolls = [];
			//Вкладка "Все игроки"
			if (partId === "all") {
				let playerUsers = this.users.filter(u => !u.isGM);
				let sourceUsers = playerUsers.length ? playerUsers : this.users;
				rawRolls = sourceUsers.flatMap(u => u.rolls);
				context.user = {id: "all", name: game.i18n.localize("WFRP4E.Tools.RollStats.Tabs.All")};
			//Вкладка пользователя
			} else {
				let u = this.users.find(user => user.id === partId);
				rawRolls = u ? u.rolls : [];
				context.user = u || {id: partId, name: ""};
			};
			//Подсчёт статистики
			context.stats = RollStats.computeStats(rawRolls, this.filters);
		};
		if (this.debug) {
			console.debug(...debugMessage, "RollStats _preparePartContext \"context\"");
			console.debug(context);
		};
		return context;
	};

	_onRender(context, options) {
		//Переключение фильтров
		this.element.querySelectorAll("[data-filter]").forEach(el => {
			el.addEventListener("change", (e) => {
				let key = e.target.dataset.filter;
				this.filters[key] = e.target.value;
				let activeTab = this.element.querySelector("nav > a.active")?.dataset?.tab;
				if (activeTab) {this.tabGroups.primary = activeTab};
				this._loadUsersData();
				this.render();
			});
		});
	};

	static _onToggleSection(event, target) {
		let sec = target.dataset.section;
		if (!sec) {return};
		this.filters.sections[sec] = !this.filters.sections[sec];
		let activeTab = this.element.querySelector("nav > a.active")?.dataset?.tab;
		if (activeTab) {this.tabGroups.primary = activeTab};
		this.render();
	};
	//Очистка данных
	static async _onClear() {
		//Кнопка не видна не Мастеру, но на всякий случай проверяем
		if (!game.user.isGM) {return};
		//Определение пользователя
		let activeTab = this.element.querySelector("nav > a.active")?.dataset?.tab || "all";
		let targetLabel = activeTab === "all"
			? game.i18n.localize("WFRP4E.Tools.RollStats.Tabs.All")
			: (game.users.get(activeTab)?.name || "");
		//Подтверждение удаления
		let confirm = await foundry.applications.api.DialogV2.confirm({
			window: {title: game.i18n.localize("WFRP4E.Tools.RollStats.Dialog.Clear")},
			content: `<p>${game.i18n.format("WFRP4E.Tools.RollStats.Dialog.ClearConfirm", {user: targetLabel})}</p>`
		});
		if (!confirm) {return};
		if (this.debug) {
			console.debug(...debugMessage, "RollStats _onClear \"activeTab\", \"targetLabel\"");
			console.debug(activeTab);
			console.debug(targetLabel);
		};
		//Если удаляем для всех игроков (или всех пользователей, если в мире только ГМ)
		if (activeTab === "all") {
			let playerUsers = game.users.filter(u => !u.isGM);
			let targetUsers = playerUsers.length ? playerUsers : game.users.contents;
			for (let u of targetUsers) {
				await RollStats.enqueueUpdate(u.id, async () => {
					await u.update({"flags.wfrp4eTools.rollStats": []});
				});
				game.socket.emit("module.wfrp4e-tools", {name: "updateRollStats", args: [u.id]});
			};
		//Если удаляем для конкретного
		} else {
			let u = game.users.get(activeTab);
			if (u) {
				await RollStats.enqueueUpdate(u.id, async () => {
					await u.update({"flags.wfrp4eTools.rollStats": []});
				});
				game.socket.emit("module.wfrp4e-tools", {name: "updateRollStats", args: [u.id]});
			};
		};
		game.wfrp4e.tools.newNotification({text: game.i18n.format("WFRP4E.Tools.RollStats.Dialog.Cleared", {user: targetLabel})}, {color: "blue"});
		this.tabGroups.primary = activeTab;
		this._loadUsersData();
		this.render();
	};

	static getTypeLabel(rollClass) {
		let key = rollClass === "WomCastTest" ? "CastTest" : rollClass;
		let locKey = `WFRP4E.Tools.RollStats.Filters.Category.${key}`;
		return game.i18n.has(locKey) ? game.i18n.localize(locKey) : rollClass;
	};
	//Подсчёт статистики
	static computeStats(rawRolls, filters) {
		//Дата и определение временных фильтров
		let now = Date.now();
		let startTime = 0;
		let endTime = Infinity;
		if (filters.period === "today") {
			let d = new Date();
			d.setHours(0, 0, 0, 0);
			startTime = d.getTime();
		} else if (filters.period === "week") {
			startTime = now - 7 * 24 * 60 * 60 * 1000;
		} else if (filters.period === "month") {
			startTime = now - 30 * 24 * 60 * 60 * 1000;
		} else if (filters.period === "custom") {
			if (filters.dateFrom) {
				startTime = new Date(filters.dateFrom + "T00:00:00").getTime() || 0;
			};
			if (filters.dateTo) {
				endTime = new Date(filters.dateTo + "T23:59:59.999").getTime() || Infinity;
			};
		};
		//Применение фильтров к данным бросков
		let rolls = (rawRolls || []).filter(r => {
			if (r.t < startTime || r.t > endTime) {return false};
			let c = r.c === "WomCastTest" ? "CastTest" : r.c;
			if (filters.category === "all") {return true};
			if (filters.category === "combat") {return ["WeaponTest", "TraitTest"].includes(c)};
			if (filters.category === "skills") {return ["SkillTest", "CharacteristicTest"].includes(c)};
			if (filters.category === "magic") {return ["ChannelTest", "CastTest", "PrayerTest"].includes(c)};
			return c === filters.category;
		});
		//Если бросков нет - вывод текста
		if (!rolls.length) {return {hasRolls: false}};
		//Определение параметров статистики
		//Всего бросков
		let total = rolls.length;
		//Автоуспехи и автопровалы
		let autoSuccess = Number(game.settings.get("wfrp4e", "automaticSuccess")) || 5;
		let autoFailure = Number(game.settings.get("wfrp4e", "automaticFailure")) || 96;
		//Определение базовых параметров
		let successes = 0, sumRoll = 0, sumTarget = 0, sumExpected = 0;
		let sumSL = 0, sumSuccSL = 0, sumFailSL = 0, sumBaseSL = 0, sumBonusSL = 0;
		let sumMod = 0, sumDiff = 0, modBonus = 0, modNeutral = 0, modPenalty = 0;
		let maxSLRec = null, minSLRec = null;
		let criticals = 0, fumbles = 0, reversals = 0, misfires = 0;
		let mmin = 0, mmaj = 0, mcat = 0, wrath = 0;
		let rerolls = 0, fortuneRerolls = 0, fortuneSL = 0, darkDeals = 0;
		let deciles = new Array(10).fill(0);
		let byTest = new Map();
		//Просчёт для каждого броска. Букав много но всё предельно понятно. Берём данные броска и анализируем, изменяя выходные данные статистики
		for (let r of rolls) {
			let rollVal = Number(r.r) || 0;
			let targetVal = Number(r.tg) || 0;
			let slVal = Number(r.sl) || 0;
			let bslVal = Number(r.bsl) || 0;
			let modVal = Number(r.m) || 0;
			let diffVal = Number(r.d) || 0;
			let isSucc = Boolean(r.s);

			sumRoll += rollVal;
			sumTarget += targetVal;
			let expectedChance = Math.max(0, Math.min(autoFailure - 1, Math.max(autoSuccess, targetVal)));
			sumExpected += expectedChance;

			if (isSucc) {
				successes++;
				sumSuccSL += slVal;
			} else {
				sumFailSL += slVal;
			};

			sumSL += slVal;
			sumBaseSL += bslVal;
			sumBonusSL += (slVal - bslVal);
			sumMod += modVal;
			sumDiff += diffVal;

			if (modVal > 0) {modBonus++}
			else if (modVal < 0) {modPenalty++}
			else {modNeutral++};

			if (!maxSLRec || slVal > maxSLRec.sl) {maxSLRec = r};
			if (!minSLRec || slVal < minSLRec.sl) {minSLRec = r};

			let bucket = Math.min(9, Math.max(0, Math.floor((rollVal - 1) / 10)));
			deciles[bucket]++;

			let ev = r.ev || {};
			if (ev.crit) {criticals++};
			if (ev.fumb) {fumbles++};
			if (ev.rev) {reversals++};
			if (ev.mis) {misfires++};
			if (ev.mmin) {mmin++};
			if (ev.mmaj) {mmaj++};
			if (ev.mcat) {mcat++};
			if (ev.wrath) {wrath++};
			if (ev.reroll) {rerolls++};
			if (ev.fReroll) {fortuneRerolls++};
			if (ev.fSL) {fortuneSL++};
			if (ev.dark) {darkDeals++};

			let key = `${r.c}:${r.n}`;
			if (!byTest.has(key)) {
				byTest.set(key, {
					name: r.n,
					typeLabel: this.getTypeLabel(r.c),
					count: 0,
					succ: 0,
					sumRoll: 0,
					sumTarget: 0,
					sumMod: 0,
					sumSL: 0,
					crits: 0,
					fumbles: 0
				});
			};
			let grp = byTest.get(key);
			grp.count++;
			if (isSucc) {grp.succ++};
			grp.sumRoll += rollVal;
			grp.sumTarget += targetVal;
			grp.sumMod += modVal;
			grp.sumSL += slVal;
			if (ev.crit) {grp.crits++};
			if (ev.fumb) {grp.fumbles++};
		};

		let failures = total - successes;
		let actualRate = (successes / total) * 100;
		let expectedRate = sumExpected / total;
		let luckDiff = actualRate - expectedRate;
		let fmtSigned = (n) => {
			let num = Number(n);
			if (!Number.isFinite(num) || Object.is(num, -0) || Math.abs(num) < 1e-9) {
				return typeof n === "string" ? n.replace(/^-/, "") : "0";
			};
			return num > 0 ? `+${n}` : `${n}`;
		};

		let maxBucket = Math.max(1, ...deciles);
		let histogram = deciles.map((count, i) => ({
			label: `${i * 10 + 1}–${(i + 1) * 10}`,
			count,
			pct: ((count / total) * 100).toFixed(1),
			heightPct: Math.round((count / maxBucket) * 100)
		}));

		let avgSLNum = sumSL / total;
		let avgBonusNum = sumBonusSL / total;
		let avgModNum = sumMod / total;

		let breakdown = Array.from(byTest.values())
			.sort((a, b) => b.count - a.count)
			.map(g => {
				let sr = (g.succ / g.count) * 100;
				let asl = g.sumSL / g.count;
				let amod = g.sumMod / g.count;
				return {
					name: g.name,
					typeLabel: g.typeLabel,
					count: g.count,
					successRate: sr.toFixed(1),
					goodSuccess: sr >= 50,
					avgRoll: (g.sumRoll / g.count).toFixed(1),
					avgTarget: (g.sumTarget / g.count).toFixed(1),
					avgMod: fmtSigned(amod.toFixed(1)),
					avgSL: fmtSigned(asl.toFixed(2)),
					positiveSL: asl >= 0,
					crits: g.crits,
					fumbles: g.fumbles
				};
			});

		let history = rolls.slice(-50).reverse().map(r => {
			let ev = r.ev || {};
			let badges = [];
			if (ev.crit) {badges.push(`<i class="fas fa-star" style="color: green;" data-tooltip="${game.i18n.localize('Critical')}"></i>`)};
			if (ev.fumb) {badges.push(`<i class="fas fa-skull" style="color: red;" data-tooltip="${game.i18n.localize('Fumble')}"></i>`)};
			if (ev.rev) {badges.push(`<i class="fas fa-arrows-rotate" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.Reversals')}"></i>`)};
			if (ev.mis) {badges.push(`<i class="fas fa-bomb" style="color: darkred;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.Misfires')}"></i>`)};
			if (ev.mmin || ev.mmaj || ev.mcat) {badges.push(`<i class="fas fa-burst" style="color: purple;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.Miscasts')}"></i>`)};
			if (ev.wrath) {badges.push(`<i class="fas fa-bolt-lightning" style="color: darkorange;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.Wrath')}"></i>`)};
			if (ev.fReroll) {badges.push(`<i class="fas fa-clover" style="color: goldenrod;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.FortuneRerolls')}"></i>`)};
			if (ev.fSL) {badges.push(`<i class="fas fa-plus-circle" style="color: goldenrod;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.FortuneSL')}"></i>`)};
			if (ev.dark) {badges.push(`<i class="fas fa-eye" style="color: darkmagenta;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.RollStats.Events.DarkDeals')}"></i>`)};

			return {
				timeString: new Date(r.t).toLocaleString(),
				actor: r.actor || "-",
				name: r.n,
				typeLabel: this.getTypeLabel(r.c),
				roll: r.r,
				reversed: Boolean(ev.rev && r.or),
				originalRoll: r.or,
				target: r.tg,
				modFormatted: fmtSigned(r.m),
				slFormatted: fmtSigned(r.sl),
				baseSLFormatted: fmtSigned(r.bsl),
				succeeded: Boolean(r.s),
				flagsHTML: badges.join(" ") || "-"
			};
		});
		//Вывод проанализированных данных
		return {
			hasRolls: true,
			summary: {
				total,
				successes,
				successRate: actualRate.toFixed(1),
				failures,
				failureRate: ((failures / total) * 100).toFixed(1),
				avgRoll: (sumRoll / total).toFixed(1),
				goodRoll: (sumRoll / total) <= 50.5,
				avgTarget: (sumTarget / total).toFixed(1),
				expectedCount: (sumExpected / 100).toFixed(1),
				expectedRate: expectedRate.toFixed(1),
				luckDelta: `${luckDiff >= 0 ? "+" : ""}${luckDiff.toFixed(1)}%`,
				lucky: luckDiff >= 0,
				histogram
			},
			sl: {
				avgSL: fmtSigned(avgSLNum.toFixed(2)),
				avgSLPositive: avgSLNum >= 0,
				avgSuccessSL: successes ? fmtSigned((sumSuccSL / successes).toFixed(2)) : "0",
				avgFailSL: failures ? fmtSigned((sumFailSL / failures).toFixed(2)) : "0",
				avgBaseSL: fmtSigned((sumBaseSL / total).toFixed(2)),
				avgBonusSL: fmtSigned(avgBonusNum.toFixed(2)),
				avgBonusPositive: avgBonusNum > 0,
				maxSL: maxSLRec ? fmtSigned(maxSLRec.sl) : "0",
				maxSLTooltip: maxSLRec ? `<b>${maxSLRec.n}</b> (${maxSLRec.actor || "-"})<br>1d100: ${maxSLRec.r} / ${maxSLRec.tg}` : "",
				minSL: minSLRec ? fmtSigned(minSLRec.sl) : "0",
				minSLTooltip: minSLRec ? `<b>${minSLRec.n}</b> (${minSLRec.actor || "-"})<br>1d100: ${minSLRec.r} / ${minSLRec.tg}` : "",
				avgModifier: fmtSigned(avgModNum.toFixed(1)),
				avgModPositive: avgModNum >= 0,
				avgDifficulty: fmtSigned((sumDiff / total).toFixed(1)),
				modBonus,
				modBonusPct: ((modBonus / total) * 100).toFixed(1),
				modNeutral,
				modNeutralPct: ((modNeutral / total) * 100).toFixed(1),
				modPenalty,
				modPenaltyPct: ((modPenalty / total) * 100).toFixed(1)
			},
			events: {
				criticals,
				critRate: ((criticals / total) * 100).toFixed(1),
				fumbles,
				fumbleRate: ((fumbles / total) * 100).toFixed(1),
				reversals,
				misfires,
				miscasts: mmin + mmaj + mcat,
				miscastsTooltip: game.i18n.format("WFRP4E.Tools.RollStats.Events.MiscastsBreakdown", {minor: mmin, major: mmaj, cat: mcat}),
				wrath,
				rerolls,
				fortuneRerolls,
				fortuneSL,
				darkDeals
			},
			breakdown,
			history
		};
	};
	//Анализ данных из сообщений чата
	static extractRollData(message, {isDarkDeal = false} = {}) {
		let data = message?.system?.testData;
		//Отсеивание ошибочных
		if (!message || message.type !== "test" || !data?.result || data.result.roll === undefined || data.context?.unopposed) {return null};

		let test = null;
		try {test = message.system.test}
		//Если актёр или предмет из старого сообщения уже удалён, используем сохранённые данные testData
		catch (e) {};
		//Определение параметров
		let rollClass = data.preData?.rollClass || "TestWFRP";
		let itemName = "";
		if (rollClass === "CharacteristicTest" && game.wfrp4e.config.characteristics?.[data.preData?.item]) {itemName = game.wfrp4e.config.characteristics[data.preData.item]}
		else if (test?.item?.name) {itemName = test.item.name}
		else if (test?.skill?.name) {itemName = test.skill.name}
		else if (test?.weapon?.name) {itemName = test.weapon.name}
		else if (test?.spell?.name) {itemName = test.spell.name}
		else if (test?.prayer?.name) {itemName = test.prayer.name}
		else if (test?.trait?.name) {itemName = test.trait.name}
		else {itemName = data.context?.title || message.flavor || game.i18n.localize("Roll")};

		let diff = Number(data.preData?.testDifficulty) || 0;
		let mod = (Number(data.preData?.testModifier) || 0) + diff + (Number(data.preData?.postOpposedModifiers?.target) || 0);
		let sl = Number(data.result.SL) || 0;
		let bsl = Number(data.result.baseSL) || 0;

		let ev = {};
		if (data.result.critical) {ev.crit = 1};
		if (data.result.fumble) {ev.fumb = 1};
		if (data.result.misfire) {ev.mis = 1};
		if (data.result.minormis) {ev.mmin = 1};
		if (data.result.majormis) {ev.mmaj = 1};
		if (data.result.catastrophicmis) {ev.mcat = 1};
		if (data.result.wrath) {ev.wrath = 1};
		if (data.result.reversed) {ev.rev = 1};
		if (data.context?.reroll) {ev.reroll = 1};
		if (data.context?.fortuneUsedReroll) {ev.fReroll = 1};
		if (data.context?.fortuneAddSLUsed || (data.context?.fortuneUsedAddSL && !data.context?.fortuneUsedReroll)) {ev.fSL = 1};
		if (data.context?.darkDealUsed || isDarkDeal) {ev.dark = 1};

		return {
			id: message.id,
			t: message.timestamp || Date.now(),
			actor: test?.actor?.name || data.context?.speaker?.alias || message.alias || "",
			c: rollClass,
			n: itemName,
			r: Number(data.result.roll) || 0,
			or: data.result.reversed ? (Number(data.result.originalRoll) || 0) : 0,
			tg: Number(data.result.target) || 0,
			m: mod,
			d: diff,
			sl,
			bsl,
			s: data.result.outcome === "success" ? 1 : 0,
			ev
		};
	};

	//Сканирует всю историю чата (game.messages) и дописывает/обновляет статистику бросков пользователей. Выполняется только Мастером вручную из меню отладки
	static async rebuildFromChat() {
		//Я же сказал - только Мастером
		if (!game.user.isGM) {return null};
		//Загрузка текущей статистики каждого пользователя в Map по ID сообщения, чтобы не терять записи из ранее очищенных чатов
		let userMaps = new Map();
		game.users.forEach(u => {
			let map = new Map();
			let existing = u.flags?.wfrp4eTools?.rollStats || [];
			existing.forEach(r => {
				if (r?.id) {map.set(r.id, foundry.utils.deepClone(r))};
			});
			userMaps.set(u.id, map);
		});
		//Сортировка сообщения чата по времени
		let messages = [...game.messages.contents].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
		let darkDealTitle = game.i18n.localize("DARKDEAL.Use");
		let recentDarkDeals = [];
		//Определение параметров
		let total = 0;
		let added = 0;
		let modifiedUsers = new Set();
		//Проверка каждого сообщения
		for (let msg of messages) {
			//Отслеживаем сообщения о Тёмной сделке, чтобы распознать перебросы за Скверну
			if (msg.type !== "test" && typeof msg.content === "string" && msg.content.includes(darkDealTitle)) {
				recentDarkDeals.push({
					time: msg.timestamp || 0,
					content: msg.content
				});
				continue;
			};
			if (msg.type !== "test" || !msg.system?.testData) {continue};

			let authorId = msg.author?.id || msg.user?.id || msg.user;
			if (!authorId || !userMaps.has(authorId)) {continue};

			let data = msg.system.testData;
			let isDarkDeal = false;
			if (data.context?.reroll && !data.context?.fortuneUsedReroll && recentDarkDeals.length) {
				let msgTime = msg.timestamp || 0;
				let actorAlias = data.context?.speaker?.alias || msg.alias || "";
				let ddIdx = recentDarkDeals.findIndex(d =>
					msgTime >= d.time &&
					(msgTime - d.time) <= 10000 &&
					(!actorAlias || d.content.includes(actorAlias))
				);
				if (ddIdx !== -1) {
					isDarkDeal = true;
					recentDarkDeals.splice(ddIdx, 1);
				};
			};

			let entry = this.extractRollData(msg, {isDarkDeal});
			if (!entry) {continue};

			total++;
			let map = userMaps.get(authorId);
			let prev = map.get(entry.id);
			if (prev) {
				//Сохранение накопленные флагов (например, dark или fSL) и обновление актуальных данных
				entry.ev = Object.assign({}, prev.ev || {}, entry.ev || {});
				if (JSON.stringify(prev) !== JSON.stringify(entry)) {
					map.set(entry.id, entry);
					modifiedUsers.add(authorId);
				};
			} else {
				map.set(entry.id, entry);
				added++;
				modifiedUsers.add(authorId);
			};
		};

		//Сохранение обновлённой статистики только для затронутых пользователей
		for (let userId of modifiedUsers) {
			let u = game.users.get(userId);
			if (!u) {continue};
			let sortedList = Array.from(userMaps.get(userId).values()).sort((a, b) => a.t - b.t);
			await this.enqueueUpdate(userId, async () => {
				await u.update({"flags.wfrp4eTools.rollStats": sortedList});
			});
			game.socket.emit("module.wfrp4e-tools", {name: "updateRollStats", args: [userId]});
			updateRollStats(userId);
		};

		if (game.settings.get("wfrp4e-tools", "debug")) {
			console.debug(...debugMessage, "RollStats rebuildFromChat \"total\", \"added\", \"modifiedUsers\"");
			console.debug(total);
			console.debug(added);
			console.debug(modifiedUsers);
		};

		return {total, added};
	};

	static async create(options={}) {
		//Проверка на наличие активного окна статистики
		if (document.querySelector("div.wfrp4eTools.wfrp4eTools-rollStats")) {
			document.querySelector("div.wfrp4eTools.wfrp4eTools-rollStats").style.zIndex = ++ApplicationV2._maxZ;
			return;
		};
		return new Promise(resolve => {
			options.resolve = resolve;
			new this(options).render({force: true});
		});
	};

	async close(options) {
		this.options.resolve?.();
		return super.close(options);
	};
};
tools.RollStatsApp = RollStats;
//Обновление окна при обновлении бросков
function updateRollStats(userId) {
	let el = document.querySelector("div.wfrp4eTools.wfrp4eTools-rollStats");
	if (el && (game.user.isGM || userId === game.user.id)) {
		let app = foundry.applications.instances.get(el.id);
		if (app) {
			let activeTab = app.element?.querySelector("nav > a.active")?.dataset?.tab;
			if (activeTab) {app.tabGroups.primary = activeTab};
			app._loadUsersData();
			app.render();
		};
	};
};
//Запись нового броска в статистику
Hooks.on("createChatMessage", (message, options, userId) => {
	if (userId !== game.user.id || message.type !== "test" || !message.system?.testData) {return};
	let entry = RollStats.extractRollData(message);
	if (!entry) {return};
	let targetUser = (game.user.isGM && message.author) ? message.author : game.user;
	RollStats.enqueueUpdate(targetUser.id, async () => {
		let list = foundry.utils.deepClone(targetUser.flags?.wfrp4eTools?.rollStats || []);
		let existingIdx = list.findIndex(r => r.id === entry.id);
		if (existingIdx !== -1) {list[existingIdx] = entry}
		else {list.push(entry)};
		await targetUser.update({"flags.wfrp4eTools.rollStats": list});
		game.socket.emit("module.wfrp4e-tools", {name: "updateRollStats", args: [targetUser.id]});
		updateRollStats(targetUser.id);
	});
});
//Обновление существующего броска в статистике (при +1 УУ за Удачу или редактировании проверки)
Hooks.on("updateChatMessage", (message, changed, options, userId) => {
	if (userId !== game.user.id || message.type !== "test" || !changed?.system?.testData) {return};
	let entry = RollStats.extractRollData(message);
	if (!entry) {return};
	let targetUser = (game.user.isGM && message.author) ? message.author : game.user;
	if (!game.user.isGM && targetUser.id !== game.user.id) {return};
	RollStats.enqueueUpdate(targetUser.id, async () => {
		let list = foundry.utils.deepClone(targetUser.flags?.wfrp4eTools?.rollStats || []);
		let idx = list.findIndex(r => r.id === entry.id);
		if (idx === -1) {return};
		let old = list[idx];
		entry.t = old.t || entry.t;
		entry.ev = Object.assign({}, old.ev || {}, entry.ev || {});
		let hasChanged = old.r !== entry.r || old.tg !== entry.tg || old.sl !== entry.sl || old.bsl !== entry.bsl || old.m !== entry.m || old.s !== entry.s || JSON.stringify(old.ev) !== JSON.stringify(entry.ev);
		if (!hasChanged) {return};
		list[idx] = entry;
		await targetUser.update({"flags.wfrp4eTools.rollStats": list});
		game.socket.emit("module.wfrp4e-tools", {name: "updateRollStats", args: [targetUser.id]});
		updateRollStats(targetUser.id);
	});
});
//Исправленные макросы
class Macros extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		classes: ["wfrp4eTools-macros", "wfrp4eTools", "warhammer"],
		window: {
			icon: "fas fa-code",
			title: "WFRP4E.Tools.Macros.Title",
			resizable: true,
			contentClasses: ["standard-form"]
		},
		actions: {
			clickMacro: this._onClickMacro
		}
	};

	static PARTS = {
		form: {
			template: "modules/wfrp4e-tools/templates/other/macros.hbs",
		},
	};

	constructor(options) {
		super(options);
		this.debug = game.settings.get("wfrp4e-tools", "debug");
		if (this.debug) {
			console.debug(...debugMessage, "Macros constructor \"this\"");
			console.debug(this);
		};
	};

	async _prepareContext(options) {
		let context = await super._prepareContext(options);
		context.debug = this.debug;
		// Конструктор для асинхронных функций из строки
		let asyncFunction = Object.getPrototypeOf(async function(){}).constructor;
		//Проверка на другие мои модули для добавления параметров макросов оттуда
		let modules = {create: [], help: []};
		for (let m of nPocTo_Modules) {
			if (game.modules.get(m)?.active && game.settings.settings.has(`${m}.macrosData`)) {
				//Клонируем объект из настроек
				let data = foundry.utils.deepClone(game.settings.get(m, "macrosData"));
				for (let type of ["create", "help"]) {
					for (let macro of (data?.[type] || [])) {
						if (typeof macro.func === "string") {
							macro.func = await (new asyncFunction(`return ${macro.func}`))();
						};
						if (macro.visible === "gmOnly") {macro.visible = game.user.isGM};
						modules[type].push(macro);
					};
				};
			};
		};
		this.macros = {
			create: [
				//Создать магический посох
				{
					id: "EnchantedStaff",
					name: "WFRP4E.Tools.Macros.Create.EnchantedStaff.Title",
					icon: "fas fa-wand-magic-sparkles",
					tooltip: "",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/Enchanted Staff/Macro.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				//Создать магический щит
				{
					id: "Shield",
					name: "WFRP4E.Tools.Macros.Create.Shield.Title",
					icon: "fas fa-shield",
					tooltip: "",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/Shield.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				//Создать магический щит
				{
					id: "Weapon",
					name: "WFRP4E.Tools.Macros.Create.Weapon.Title",
					icon: "fas fa-sword",
					tooltip: "",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/Weapon.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				//Создать магический щит
				{
					id: "Armour",
					name: "WFRP4E.Tools.Macros.Create.Armour.Title",
					icon: "fas fa-helmet-battle",
					tooltip: "",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/Armour.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				//Создать свиток заклинания
				{
					id: "Scroll",
					name: "WFRP4E.Tools.Macros.Create.Scroll.Title",
					icon: "fas fa-scroll",
					tooltip: "",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/Scroll.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				//Создать случайный гримуар
				{
					id: "Grimoire",
					name: "WFRP4E.Tools.Macros.Create.Grimoire.Title",
					icon: "fas fa-book",
					tooltip: "",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/Grimoire.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				...modules.create
			],
			help: [
				//Придумать ругательство
				{
					id: "Swearing",
					name: "WFRP4E.Tools.Macros.Swearing.Title",
					icon: "fas fa-hand-middle-finger",
					tooltip: "WFRP4E.Tools.Macros.Swearing.Hint",
					visible: true,
					func: (await import("/modules/wfrp4e-tools/scripts/Swearing.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				{
					id: "BooksTitle",
					name: "WFRP4E.Tools.Macros.BooksTitle.Title",
					icon: "fas fa-book",
					tooltip: "WFRP4E.Tools.Macros.BooksTitle.Hint",
					visible: true,
					func: (await import("/modules/wfrp4e-tools/scripts/BooksTitle.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				{
					id: "CommandControlPanel",
					name: "WFRP4E.Tools.Macros.CommandControlPanel.Title",
					icon: "fas fa-sliders",
					tooltip: "WFRP4E.Tools.Macros.CommandControlPanel.Hint",
					visible: game.user.isGM,
					func: (await import("/modules/wfrp4e-tools/scripts/CommandControlPanel.js")).default,
					module: {
						id: "wfrp4e-tools",
						name: "WFRP4e - Tools"
					}
				},
				...modules.help
			]
		};
		context.macros = this.macros;
		if (this.debug) {
			console.debug(...debugMessage, "Macros _prepareContext \"context\"");
			console.debug(context);
		};
		return context;
	};

	static async create(options={}) {
		//Проверка на наличие активного окна
		if (document.querySelector("div.wfrp4eTools.wfrp4eTools-macros")) {
			document.querySelector("div.wfrp4eTools.wfrp4eTools-macros").style.zIndex = ++ApplicationV2._maxZ;
			return;
		};
		if (game.settings.get("wfrp4e-tools", "debug")) {
			console.debug(...debugMessage, "Macros create \"options\"");
			console.debug(options);
		};
		return new Promise(resolve => {
			options.resolve = resolve;
			new this(options).render({force: true});
		});
	};
	//При нажатии на макрос
	static async _onClickMacro(button) {
		let macro = this.macros[button.target.closest("div").dataset.type].find(m => m.id == button.target.closest("a").dataset.id);
		//Если был зажат Альт, создаётся макрос, содержащий функцию
		if (button.altKey) {
			//Проверка на наличие макроса
			let confirm = true;
			let oldMacro = game.macros.find(m => m.flags.wfrp4eTools?.id == macro.id);
			//Если он есть - предложить его удалить
			if (oldMacro) {
				confirm = false;
				confirm = await foundry.applications.api.DialogV2.confirm({
					window: {title: game.i18n.localize("WFRP4E.Tools.Macros.CreateMacro.Title")},
					content: `<p>${game.i18n.format("WFRP4E.Tools.Macros.CreateMacro.Content", {macro: "<a class='content-link'data-action='openMacro' data-uuid='" + oldMacro.uuid +"'><i class='fa-solid fa-code'></i>" + oldMacro.name +"</a>"})}</p>`,
					actions: {
						openMacro: async (event, target) => {
							event.stopPropagation();
							let macro = await fromUuid(target.dataset.uuid);
							macro?.sheet.render(true);
						}
					}
				});
				//Удаление старого макроса при согласии
				if (confirm) {oldMacro.delete()}
				//При отказе - убираем у него ключ во флагах
				else {oldMacro.update({"flags.-=wfrp4eTools": null})};
			};
			//Создание макроса
			await Macro.create({
				name: game.i18n.localize(macro.name),
				type: "script",
				flags: {
					wfrp4eTools: {id: macro.id}
				},
				img: "icons/svg/dice-target.svg",
				command: `if (!game.modules.get("${macro.module.id}")?.active) {ui.notifications.error(${JSON.stringify(game.i18n.format("WFRP4E.Tools.Macros.CreateMacro.MissModule", {module: macro.module.name}))})};`
					+ `\nawait (${macro.func.toString()})();`
			}, {displaySheet: false});
			game.wfrp4e.tools.newNotification({text: game.i18n.format("WFRP4E.Tools.Macros.CreateMacro.Complete", {name: game.i18n.localize(macro.name)})}, {color: "green"});
		//Если нет, функция макроса выполняется
		} else {macro.func()};
	};
	//При закрытии
	async close(options) {
		this.options.resolve?.();
		return super.close(options);
	};
};
tools.Macros = Macros;
//Переработка звуковой системы
class Audio {
	static #supportedExtensions = [".mp3", ".ogg", ".wav", ".webm", ".flac", ".m4a"];
	static #categories = ["combat", "weapon", "opposed", "hit", "magic", "prayer", "skill", "item"];
	static #cooldowns = new Map();
	static #pendingMissTimers = new Map();
	static #audioCache = new Map();
	static #audioCtx = null;
	static #compressor = null;
	static #targetRMS = 0.10; //Целевая средняя громкость (можно менять от 0.10 до 0.25)

	/**
	 * Сканирует папки со звуками и сохраняет структуру файлов в настройку мира ("soundsCatalog"), чтобы игроки без прав "FILES_BROWSE" могли проигрывать звуки
	 */
	static async buildCatalog() {
		//Делается ГМ
		if (!game.user.isGM) {return};
		//Путь ко звукам
		let basePath = game.settings.get("wfrp4e-tools", "soundsPath")?.replace(/\/$/, "");
		if (!basePath) {return};
		let catalog = {};
		//Поиск файлов
		let browseSafe = async (path) => {
			try {
				let res = await foundry.applications.apps.FilePicker.implementation.browse("data", path);
				return (res?.files || []).filter(f =>
					this.#supportedExtensions.some(ext => f.toLowerCase().endsWith(ext))
				);
			} catch (e) {return []};
		};
		//Наполнение объекта по категориям имеющимися звуками
		for (let category of this.#categories) {
			catalog[category] = {
				normal: await browseSafe(`${basePath}/${category}`),
				funny: await browseSafe(`${basePath}/${category}/funny`)
			};
		};
		//Сохранение итогового объекта
		await game.settings.set("wfrp4e-tools", "soundsCatalog", catalog);
		if (game.settings.get("wfrp4e-tools", "debug")) {
			console.debug(...debugMessage, "Audio buildCatalog \"catalog\"", catalog);
		};
		//Сброс кэша громкости
		this.#audioCache.clear();
	};

	/**
	 * Мгновенный поиск подходящего звукового файла по категории, массиву ключей приоритета и клиентской настройке "смешных" звуков
	 *
	 * @param {string} category Имя категории ("weapon", "opposed", "hit", "skill", "magic", "prayer", "item", "combat").
	 * @param {string|string[]} keys Ключ или массив ключей от самого точного к общему.
	 * @returns {string|null} Путь к файлу или null.
	 */
	static resolveSoundFile(category, keys) {
		//Отсеивание пустых или неверных запросов
		if (!category || !keys) {return null};
		let keyList = Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);
		if (!keyList.length) {return null};
		//Каталог имеющихся звуков
		let catalog = game.settings.get("wfrp4e-tools", "soundsCatalog") || {};
		//Звуки из каталога согласно категории
		let catData = catalog[category];
		//Отсеивание отсутствующей категории
		if (!catData) {return null};
		//"Смешной" режим
		let isFunny = game.settings.get("wfrp4e-tools", "soundsFunnyMode");
		//"Нормальные" звуки из категории
		let normalFiles = catData.normal || [];
		//"Смешные" звуки из категории
		let funnyFolderFiles = isFunny ? (catData.funny || []) : [];
		//Проверка соответствия имени файла ключу: поддерживает "key.mp3", "key_1.mp3", "key-1.mp3", "key (1).mp3"
		let matchKey = (filePath, targetKey) => {
			//Преобразование имени файла в нормальную строку
			let fileName = decodeURIComponent(filePath.split("/").pop()).replace(/\.[^/.]+$/, "").toLowerCase().trim();
			//Нормализация искомого ключа
			let k = targetKey.toLowerCase().trim();
			//Если имя файла совпадает с таргетом
			if (fileName === k) {return true};
			//Если имя файла содержит таргет
			if (fileName.startsWith(k)) {
				let rest = fileName.slice(k.length);
				return /^[_-\s]?\(?\d+\)?$/.test(rest);
			};
			//В ином случае ничего
			return false;
		};
		//Поиск по списку приоритетов ключей (смешные звуки добавляются в общий пул к обычным)
		for (let key of keyList) {
			let matched = normalFiles.filter(f => matchKey(f, key));
			if (isFunny) {matched.push(...funnyFolderFiles.filter(f => matchKey(f, key)))};
			//Если файлы определены, передача случайного
			if (matched.length) {return Utility.randomArrayElement(matched)};
		};
		//В случае не нахождения - возврат ничего
		return null;
	};

	/**
	 * Инициализируем Web Audio API контекст и защитный лимитер-компрессор
	 */
	static #getAudioOutput() {
		if (!this.#audioCtx) {
			let AudioContextClass = window.AudioContext || window.webkitAudioContext;
			this.#audioCtx = foundry.audio?.AudioHelper?.context || new AudioContextClass();

			//Лимитер для предотвращения клиппинга и резких ударов по ушам при усилении тихих звуков
			this.#compressor = this.#audioCtx.createDynamicsCompressor();
			this.#compressor.threshold.setValueAtTime(-6, this.#audioCtx.currentTime); //Срабатывает около пика (-6 dB)
			this.#compressor.knee.setValueAtTime(6, this.#audioCtx.currentTime);
			this.#compressor.ratio.setValueAtTime(12, this.#audioCtx.currentTime);     //Жесткое лимитирование пиков
			this.#compressor.attack.setValueAtTime(0.003, this.#audioCtx.currentTime); //Мгновенная реакция (3 мс)
			this.#compressor.release.setValueAtTime(0.15, this.#audioCtx.currentTime);
			this.#compressor.connect(this.#audioCtx.destination);
		};
		if (this.#audioCtx.state === "suspended") {this.#audioCtx.resume()};
		return {ctx: this.#audioCtx, destination: this.#compressor};
	};

	/**
	 * Загружает аудиофайл, вычисляет его громкость без учета тишины и возвращает буфер вместе с коэффициентом выравнивания громкости
	 *
	 * @param {string} src Путь к аудиофайлу.
	 * @returns {Promise<{buffer: AudioBuffer, normGain: number}|null>}
	 */
	static async #getNormalizedAudio(src) {
		//Если файл уже есть в кэше, прерываем
		if (this.#audioCache.has(src)) {return this.#audioCache.get(src)};

		try {
			//Определение параметров
			let {ctx} = this.#getAudioOutput();
			let response = await fetch(src);
			if (!response.ok) {return null};
			let arrayBuffer = await response.arrayBuffer();
			let audioBuffer = await ctx.decodeAudioData(arrayBuffer);
			//Анализируем сэмплы всех каналов для расчета Gated RMS (игнорируя тишину)
			let sumSquares = 0;
			let activeSamples = 0;
			let peak = 0;
			let silenceThreshold = 0.008; //Порог отсечения фоновой тишины (-42 dB)
			for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
				let data = audioBuffer.getChannelData(ch);
				//Ускоряем анализ в 4 раза без потери точности
				for (let i = 0; i < data.length; i += 4) {
					let abs = Math.abs(data[i]);
					if (abs > peak) {peak = abs};
					if (abs > silenceThreshold) {
						sumSquares += data[i] * data[i];
						activeSamples++;
					};
				};
			};
			let normGain = 1.0;
			if (activeSamples > 0) {
				let rms = Math.sqrt(sumSquares / activeSamples);
				//Вычисляем множитель для доведения звука до эталона #targetRMS
				normGain = this.#targetRMS / rms;
				//Ограничиваем усиление (от 0.15x для очень громких до 4.5x для очень тихих), а также не даем пикам превышать 1.35x (остальное мягко сгладит компрессор)
				let maxPeakGain = peak > 0 ? (1.35 / peak) : 4.5;
				normGain = Math.min(Math.max(normGain, 0.15), Math.min(4.5, maxPeakGain));
			};
			let entry = {buffer: audioBuffer, normGain};
			this.#audioCache.set(src, entry);
			if (game.settings.get("wfrp4e-tools", "debug")) {
				console.debug(...debugMessage, `Audio getNormalizedAudio [${src.split("/").pop()}]: gain = x${normGain.toFixed(2)}`);
			};
			return entry;
		} catch (err) {
			console.warn(...debugMessage, "Audio getNormalizedAudio failed, fallback to standard play:", src, err);
			return null;
		};
	};

	/**
	 * Локальное воспроизведение звука на клиенте текущего пользователя с защитой от спама/клиппинга
	 *
	 * @param {Object} context Контекст звука { category, keys, delay, volume }
	 */
	static playLocal(context) {
		try {
			//Если контекста нет или звуки отключены предотвращает выполнение
			if (!context || !game.settings.get("wfrp4e-tools", "enableSounds")) {return};
			//Выполнение звука
			let executePlay = async () => {
				//Текущее время
				let now = Date.now();
				//Определение отсрочек воспроизведения для предотвращения наложения звуков
				let cooldownKey = `${context.category}:${Array.isArray(context.keys) ? context.keys[0] : context.keys}`;
				let lastTime = this.#cooldowns.get(cooldownKey) || 0;
				//Если звук был раньше 120 мс назад, новый не воспроизводится
				if (now - lastTime < 120) {return};
				//Звук добовляется в список текущих
				this.#cooldowns.set(cooldownKey, now);
				//Определение звукового файла
				let file = this.resolveSoundFile(context.category, context.keys);
				if (!file) {
					if (game.settings.get("wfrp4e-tools", "debug")) {
						console.debug(...debugMessage, `${game.i18n.localize("WFRP4E.Tools.Sounds.Miss")}: [${context.category}]`, context.keys);
					};
					return;
				};
				//Учитываем ползунок громкости модуля И глобальный ползунок «Интерфейс» самого Foundry
				let baseVolume = Math.min(Math.max((context.volume ?? 1) * (game.settings.get("wfrp4e-tools", "soundsVolume") ?? 0.8) * (game.settings.get("core", "globalInterfaceVolume") ?? 1.0), 0), 1);
				if (baseVolume <= 0) {return};
				//Нормализация громкости
				let normalized = await this.#getNormalizedAudio(file);
				if (normalized) {
					//Определение параметров
					let {ctx, destination} = this.#getAudioOutput();
					let source = ctx.createBufferSource();
					let gainNode = ctx.createGain();
					//Нормализация громкости
					source.buffer = normalized.buffer;
					//Итоговая громкость = базовая громкость ползунков * коэффициент выравнивания файла
					gainNode.gain.setValueAtTime(baseVolume * normalized.normGain, ctx.currentTime);
					source.connect(gainNode);
					gainNode.connect(destination);
					source.start(0);
				} else {
					//Возврат на стандартный плеер, если файл не удалось декодировать
					await foundry.audio.AudioHelper.play({src: file, volume: baseVolume, autoplay: true, loop: false}, false);
				};
			};
			//Если указано воспроизведение с задержкой
			if (context.delay && context.delay > 0) {
				setTimeout(executePlay, context.delay);
			//Если не указано воспроизведение с задержкой
			} else {
				executePlay();
			};
		} catch (err) {
			console.warn(...debugMessage, "Audio playLocal Error:", err);
		}
	};

	/**
	 * Запуск звука локально и рассылка контекста остальным клиентам через сокет модуля
	 *
	 * @param {Object|Object[]} contexts Один или массив контекстов воспроизведения.
	 */
	static playContextAudio(contexts) {
		//Если контекста нет предотвращает выполнение
		if (!contexts) {return};
		//Преобразование контекста в массив
		let list = Array.isArray(contexts) ? contexts : [contexts];

		for (let ctx of list) {
			//Пропуск при отсутствии контекста или его параметров
			if (!ctx || !ctx.category || !ctx.keys) {continue};
			//Запуск звука локально
			this.playLocal(ctx);
			//Если звук глобальный - вызов его по сокету
			if (ctx.global !== false) {
				game.socket.emit("module.wfrp4e-tools", { name: "playContextAudio", args: [ctx] });
			};
		};
	};

	//ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ АНАЛИЗА ПРЕДМЕТОВ И БРОНИ
	//Проверка на встречную проверку защиты
	static #isDefendingTest(test) {
		return Boolean(test?.actor?.isOpposing || test?.context?.defending);
	};
	//Проверка на наличие свойства
	static #hasQuality(item, qualityName) {
		//Отмена, если предмет не передан
		if (!item) {return false};
		//Поиск свойства по прямому имени или по значению value в объекте
		if (item.properties?.qualities?.[qualityName]) {return true};
		if (Array.isArray(item.system?.qualities?.value)) {
			return item.system.qualities.value.some(q => q.name === qualityName);
		};
		return false;
	};
	//Определение параметров оружия
	static #getWeaponAudioProfile(weapon) {
		//Если оружия нету
		if (!weapon) {return {subtype: "melee", damageType: "blunt"}};
		//Определение базовых параметров и наличия свойств
		let group = weapon.weaponGroup?.value || weapon.system?.weaponGroup?.value || "basic";
		let special = (weapon.special?.value ?? weapon.special ?? weapon.system?.special?.value ?? "").toLowerCase();
		let hasPummel = this.#hasQuality(weapon, "pummel");
		let hasHack = this.#hasQuality(weapon, "hack");
		let hasImpale = this.#hasQuality(weapon, "impale");
		let hasImpact = this.#hasQuality(weapon, "impact");
		//Для стрелкового оружия
		if (weapon.isRanged) {
			if (group === "blackpowder") {return {subtype: "gun", damageType: "bullet"}};
			if (group === "engineering") {return {subtype: "engineering", damageType: "bullet"}};
			if (group === "crossbow") {return {subtype: "crossbow", damageType: "pierce"}};
			if (group === "bow") {return {subtype: "bow", damageType: "pierce"}};
			if (group === "sling") {return {subtype: "sling", damageType: "blunt"}};
			if (group === "explosives") {return {subtype: "bomb", damageType: "blunt"}};
			if (group === "throwing") {
				if (hasHack) {return {subtype: "throw_axe", damageType: "slash"}};
				if (hasPummel) {return {subtype: "throw_hammer", damageType: "blunt"}};
				return {subtype: "throw", damageType: "pierce"};
			};
			return {subtype: "ranged", damageType: "pierce"};
		};
		//Для обычного оружия
		if (special === "warhammer" || hasPummel) {return {subtype: "hammer", damageType: "blunt"}};
		if (hasHack) {return {subtype: "axe", damageType: "slash"}};
		if (group === "brawling" || weapon.system?.isUnarmed) {return {subtype: "brawling", damageType: "blunt"}};
		if (group === "flail") {return {subtype: hasImpact ? "flail_impact" : "flail", damageType: "blunt"}};
		if (group === "twohanded") {return {subtype: "twohanded", damageType: hasImpale ? "pierce" : "slash"}};
		if (group === "polearm") {return {subtype: "polearm", damageType: hasImpale ? "pierce" : "blunt"}};
		if (group === "cavalry") {return {subtype: "lance", damageType: "pierce"}};
		if (group === "fencing") {return {subtype: "fencing", damageType: "pierce"}};
		if (group === "parry") {return {subtype: "dagger", damageType: "pierce"}};
		if (group === "entangling") {return {subtype: "whip", damageType: "slash"}};
		//Базовая заглушка для неучтённых параметров
		return {subtype: "sword", damageType: hasImpale ? "pierce" : "slash"};
	};
	//Определение зоны и типа брони
	static #getLocationArmorType(actor, hitloc = "body") {
		let locData = actor?.system?.status?.armour?.[hitloc];
		//Если локация не задана принимает как "плоть"
		if (!locData) {return "flesh"};
		//Определение типа брони
		if (locData.plate > 0 || locData.otherMetal > 0) {return "plate"};
		if (locData.mail > 0) {return "mail"};
		if (locData.boiledLeather > 0 || locData.softLeather > 0) {return "leather"};
		if (locData.total > 0) {return "natural"};
		return "flesh";
	};

	//БОЕВЫЕ ПРОВЕРКИ, ВСТРЕЧНЫЕ ПРОВЕРКИ И УРОН
	//Проверка оружия
	static onRollWeaponTest(test) {
		let weapon = test?.weapon || test?.item;
		//Если оружия нет или это проверка защиты, прерываем
		if (!weapon || this.#isDefendingTest(test)) {return};
		//Запуск звука из очереди ожидания, если он там есть
		let testKey = test.context?.messageId || test.actor?.id || "last";
		if (this.#pendingMissTimers.has(testKey)) {
			clearTimeout(this.#pendingMissTimers.get(testKey));
			this.#pendingMissTimers.delete(testKey);
		};
		//Тип оружия
		let {subtype} = this.#getWeaponAudioProfile(weapon);
		//Определение осечки
		let isMisfire = Boolean(test.result?.misfire);
		//Определение крит провала
		let isFumble = Boolean(test.result?.fumble);
		//Определение ключей для файла
		//Если осечка
		if (isMisfire) {
			//Определение ключей осечки в зависимости от типа оружия
			let misfireKeys = [`${subtype}_misfire`, "weapon_misfire"];
			if (subtype === "gun" || subtype === "engineering") {misfireKeys = ["gun_misfire", "weapon_misfire"]}
			else if (subtype === "bow" || subtype === "crossbow" || subtype === "sling") {misfireKeys = ["bow_misfire", "weapon_misfire"]}
			else if (subtype === "bomb" || subtype.startsWith("throw")) {misfireKeys = ["bomb_misfire", "weapon_misfire"]};
			//Проигрывание звука
			return this.playContextAudio({category: "weapon", keys: misfireKeys, global: true});
		};
		//Для дальнобойного в зависимости от типа оружия
		if (weapon.isRanged) {
			let fireKeys = [];
			if (subtype === "throw_axe") {fireKeys.push("throw_axe", "throw_fire", "ranged_fire")}
			else if (subtype === "throw_hammer") {fireKeys.push("throw_hammer", "throw_fire", "ranged_fire")}
			else if (subtype === "bomb") {fireKeys.push("bomb_throw", "throw_fire", "ranged_fire")}
			else if (subtype === "engineering") {fireKeys.push("engineering_fire", "gun_fire", "ranged_fire")}
			else if (subtype === "crossbow") {fireKeys.push("crossbow_fire", "bow_fire", "ranged_fire")}
			else {fireKeys.push(`${subtype}_fire`, "ranged_fire")};
			//Проигрывание звука
			this.playContextAudio({category: "weapon", keys: fireKeys, global: true});
			//Если промах
			if (test.failed) {
				//Определение ключа осечки в зависимости от типа оружия
				let missKeys = ["ranged_miss"];
				if (subtype === "bow" || subtype === "crossbow") {missKeys = ["arrow_miss", "bow_miss", "ranged_miss"]}
				else if (subtype === "gun" || subtype === "engineering") {missKeys = ["bullet_miss", "gun_miss", "ranged_miss"]}
				else if (subtype === "bomb") {missKeys = ["bomb_miss", "throw_miss", "ranged_miss"]}
				else {missKeys = ["throw_miss", "ranged_miss"]};
				//Проигрывание звука спустя случайную задержку
				let timerId = setTimeout(() => {
					this.#pendingMissTimers.delete(testKey);
					this.playContextAudio({category: "weapon", keys: missKeys, global: true});
				}, Math.floor(CONFIG.Dice.randomUniform() * 700) + 1100);
				//Добавление звука в очередь ожидания
				this.#pendingMissTimers.set(testKey, timerId);
			};
			return;
		};
		//Звук замаха
		let swingKeys = [];
		//Если крит провал
		if (isFumble) {swingKeys.push(`${subtype}_fumble`, "melee_fumble")};
		//Определение ключей в зависимости от типа оружия
		if (subtype === "hammer" || subtype === "twohanded") {swingKeys.push(`${subtype}_swing`, "heavy_swing", "sword_swing", "melee_swing")}
		else if (subtype === "flail_impact") {swingKeys.push("flail_impact_swing", "flail_swing", "melee_swing")}
		else if (subtype === "axe" || subtype === "fencing" || subtype === "dagger") {swingKeys.push(`${subtype}_swing`, "sword_swing", "melee_swing")}
		else if (subtype === "lance") {swingKeys.push("lance_swing", "polearm_swing", "melee_swing")}
		else {swingKeys.push(`${subtype}_swing`, "melee_swing")};
		//Проигрывание звука
		this.playContextAudio({category: "weapon", keys: swingKeys, global: true});
	};

	/**
	 * Получает массив ключевых слов из файла локализации по ключу (разделённых запятой)
	 * @param {string} i18nKey Ключ локализации.
	 * @returns {string[]} Массив подстрок в нижнем регистре.
	 */
	static #getLocalizedKeywords(i18nKey) {
		//Проверка на наличие ключа
		if (!game.i18n.has(i18nKey)) {return []};
		return game.i18n.localize(i18nKey)
			.toLowerCase()
			.split(",")
			.map(s => s.trim())
			.filter(Boolean);
	};
	//Проверка черты (укусы, когди и пр.)
	static onRollTraitTest(test) {
		let trait = test?.trait || test?.item;
		//Если черты нет или это проверка защиты, прерываем
		if (!trait || this.#isDefendingTest(test)) {return};
		//Характеристика для проверки
		let rollChar = trait.system?.rollable?.rollCharacteristic;
		//Определение атакующая ли эта проверка
		let isCombatTrait = Boolean(
			rollChar === "ws" ||
			rollChar === "bs" ||
			trait.system?.rollable?.damage ||
			trait.system?.rollable?.attackType
		);
		//Если нет, прерываем
		if (!isCombatTrait) {return};
		//Собираем и локализованное, и оригинальное имя (если есть Babele), чтобы сработало в любом случае
		let namesToCheck = [
			(trait.name || "").toLowerCase().trim(),
			(trait.flags?.babele?.originalName || "").toLowerCase().trim()
		].filter(Boolean);
		//Функция нахождения имени
		let matchesAny = (keywords) => keywords.some(kw => namesToCheck.some(name => name.includes(kw)));
		//Ключи для укуса
		let biteKeywords = this.#getLocalizedKeywords("WFRP4E.Tools.Sounds.Traits.Bite");
		//Ключи для дыхания
		let breathKeywords = this.#getLocalizedKeywords("WFRP4E.Tools.Sounds.Traits.Breath");
		//Ключи для когтей
		let clawKeywords = [
			...this.#getLocalizedKeywords("WFRP4E.Tools.Sounds.Traits.Claw"),
			game.i18n.localize("NAME.Stomp").toLowerCase().trim()
		];
		//Ключи для стрельбы через черту
		let rangedKeywords = [
			...this.#getLocalizedKeywords("WFRP4E.Tools.Sounds.Traits.Ranged"),
			game.i18n.localize("NAME.TraitRanged").toLowerCase().trim()
		];
		//Определение итоговых ключей
		let keys = [];
		if (matchesAny(biteKeywords)) {keys.push("trait_bite", "monster_attack", "brawling_swing")}
		else if (matchesAny(breathKeywords)) {keys.push("trait_breath", "monster_attack")}
		else if (matchesAny(clawKeywords)) {keys.push("trait_claw", "monster_attack", "brawling_swing")}
		else if (rollChar === "bs" || matchesAny(rangedKeywords)) {keys.push("trait_ranged", "bow_fire", "ranged_fire")}
		else {keys.push("monster_attack", "brawling_swing", "melee_swing")};
		//Проигрывание звука
		this.playContextAudio({category: "weapon", keys, global: true});
	};
	//Встречная проверка
	static onOpposedTestResult(opposedTest, attackerTest, defenderTest) {
		//Если результат проверки или тест атакующего не определён, прерываем
		if (!opposedTest?.result || !attackerTest) {return};
		//Проверка на физическую атаку, а не просто встречную проверку
		let attackerItem = attackerTest.weapon || attackerTest.trait || attackerTest.item;
		let isPhysicalCombat = Boolean(
			attackerTest.weapon ||
			(attackerTest.trait && (
				attackerItem?.system?.rollable?.damage ||
				attackerItem?.system?.rollable?.rollCharacteristic === "ws" ||
				attackerItem?.system?.rollable?.rollCharacteristic === "bs"
			))
		);
		if (!isPhysicalCombat) {return};
		//Определение параметров
		let winner = opposedTest.result.winner;
		let isRangedAttack = Boolean(attackerTest.weapon?.isRanged || attackerItem?.system?.rollable?.rollCharacteristic === "bs");
		let delay = 250;
		//Если победа защитника
		if (winner === "defender") {
			//Если атака стрелковая и стрелок промахнулся, прерываем. Звук самого выстрела проигрывается в проверке атаки, а попадания как такого нет, поэтому и звука попадания или отбития нет
			if (isRangedAttack && attackerTest.failed) {return};
			//Если атакующий провалил проверку, запускаем звук уклонения.
			if (!isRangedAttack && attackerTest.failed) {
				return this.playContextAudio({category: "opposed", keys: ["dodge", "melee_miss"], delay, global: true});
			};
			//Определение параметров
			let defWeapon = defenderTest?.weapon || (defenderTest?.item?.type === "weapon" ? defenderTest.item : null);
			let isCritDefense = Boolean(defenderTest?.result?.critical);
			//Определение итоговых ключей
			let keys = [];
			//Если защитник использовал оружие
			if (defWeapon) {
				let hasShield = this.#hasQuality(defWeapon, "shield");
				let {subtype: defSubtype} = this.#getWeaponAudioProfile(defWeapon);
				if (hasShield) {
					//От стрелковой атаки
					if (isRangedAttack) {keys.push("block_shield_ranged", "block_shield", "parry")}
					//Не от стрелковой атаки
					else {keys.push("block_shield_melee", "block_shield", "parry")};
				} else if (defSubtype === "brawling") {keys.push("parry_unarmed", "dodge")}
				else if (defSubtype === "polearm") {keys.push("parry_wood", "parry_metal", "parry")}
				else if (defSubtype === "twohanded" || defSubtype === "hammer" || defSubtype.startsWith("flail")) {
					if (isCritDefense) {keys.push("parry_crit")};
					keys.push("parry_heavy", "parry_metal", "parry");
				} else {
					if (isCritDefense) {keys.push("parry_crit")};
					keys.push("parry_metal", "parry");
				};
			//Если не использовал
			} else {
				if (isCritDefense) {keys.push("dodge_crit")};
				keys.push("dodge");
				if (isRangedAttack) {keys.push("arrow_miss", "ranged_miss")};
			};
			//Проигрывание звука
			return this.playContextAudio({category: "opposed", keys, delay, global: true});
		};
		//Если победа атакующего
		if (winner === "attacker") {
			//Определение параметров
			let rawDefender = defenderTest?.actor || opposedTest.defenderTest?.actor || opposedTest.defender;
			let defenderActor = rawDefender?.actor || rawDefender;
			let hitloc = opposedTest.result.hitloc?.value || "body";
			let armorType = this.#getLocationArmorType(defenderActor, hitloc);
			let {damageType} = this.#getWeaponAudioProfile(attackerTest.weapon);
			let isCrit = Boolean(attackerTest.result?.critical || opposedTest.result?.crit);
			let hasImpale = this.#hasQuality(attackerTest.weapon, "impale");
			//Определение итоговых ключей
			let keys = [];
			if (isCrit) {
				if (hasImpale) {keys.push("crit_impale")};
				keys.push("crit_normal");
			};
			//Сопоставление ключей с параметрами
			keys.push(
				`hit_${armorType}_${damageType}`,
				`hit_${armorType}`,
				`hit_${damageType}`,
				"hit_flesh"
			);
			//Проигрывание звука
			return this.playContextAudio({category: "hit", keys, delay, global: true});
		};
	};
	//При нанесении урона (через карточку в чате)
	static onApplyDamage(args) {
		//Если актёр не определён, прерываем
		if (!args?.actor) {return};
		//Определение параметров
		let woundLoss = Number(args.totalWoundLoss ?? 0);
		let currentWounds = Number(args.actor.system?.status?.wounds?.value ?? 1);
		//Если ран не осталось
		if (currentWounds === 0) {
			return this.playContextAudio({category: "hit", keys: ["zero_wounds", "damage_heavy", "hit_flesh"], global: true});
		};
		//Если урона очень мало
		if (woundLoss <= 1) {
			//Проигрывание звука
			return this.playContextAudio({category: "hit", keys: ["damage_soaked_armour", "damage_soaked", "block_shield"], global: true});
		};
		//Если урона очень много
		if (woundLoss >= 5) {
			return this.playContextAudio({category: "hit", keys: ["damage_heavy", "damage_flesh"], global: true});
		};
	};

	//МАГИЯ, КОНЦЕНТРАЦИЯ И МОЛИТВЫ
	//Проверка концентрации
	static onRollChannelTest(test) {
		//Если проверка запущена не из заклинания, прерываем
		let spell = test?.spell || test?.item;
		if (!spell) {return};
		//Определение параметров
		let lore = (spell.system?.lore?.value || "arcane").replaceAll("-", "_");
		let hasMiscast = Boolean(test.result?.minormis || test.result?.majormis || test.result?.catastrophicmis);
		//Если мискаст
		if (hasMiscast) {
			return this.playContextAudio({category: "magic", keys: ["channel_miscast", "miscast_minor", "miscast"], global: true});
		};
		//Если проверка успешна
		if (test.succeeded) {
			this.playContextAudio({category: "magic", keys: [`channel_${lore}`, "channel_success", "cast_generic"], global: true});
		//Если проверка провальна
		} else {
			this.playContextAudio({category: "magic", keys: ["channel_fail", "cast_fail"], global: true});
		};
	};
	//Проверка сотворения
	static onRollCastTest(test) {
		//Если проверка запущена не из заклинания, прерываем
		let spell = test?.spell || test?.item;
		if (!spell) {return};
		//Определение параметров
		let lore = (spell.system?.lore?.value || "petty").replaceAll("-", "_");
		let isDamage = Boolean(spell.damage || spell.system?.damage?.value);
		let isSuccess = test.result?.castOutcome === "success";
		let isCatastrophic = Boolean(test.result?.catastrophicmis);
		let isMajorMis = Boolean(test.result?.majormis);
		let isMinorMis = Boolean(test.result?.minormis);
		//Определение итоговых значений
		let contexts = [];
		//Если успешно
		if (isSuccess) {
			let castKeys = [];
			//Если наносит урон
			if (isDamage) {castKeys.push(`cast_${lore}_damage`, `cast_${lore}`, "cast_damage", "cast_generic")}
			//Если не наносит урон
			else {castKeys.push(`cast_${lore}`, "cast_generic")};
			//Добавление ключей
			contexts.push({category: "magic", keys: castKeys, global: true});
		//Если провальна, но не критично
		} else if (!isCatastrophic && !isMajorMis && !isMinorMis) {
			contexts.push({category: "magic", keys: ["cast_fail"], global: true});
		};
		//Если критический бросок
		if (isCatastrophic || isMajorMis || isMinorMis) {
			let misKeys = [];
			if (isCatastrophic) {misKeys.push("miscast_catastrophic", "miscast_major", "miscast_minor", "miscast")}
			else if (isMajorMis) {misKeys.push("miscast_major", "miscast_minor", "miscast")}
			else {misKeys.push("miscast_minor", "miscast")};
			//Добавление ключей
			contexts.push({category: "magic", keys: misKeys, delay: isSuccess ? 600 : 0, global: true});
		};
		//Проигрывание звука
		this.playContextAudio(contexts);
	};
	//Проверка молитвы
	static onRollPrayerTest(test) {
		//Если проверка запущена не из молитвы, прерываем
		let prayer = test?.prayer || test?.item;
		if (!prayer) {return};
		//Определение параметров
		let prayerType = prayer.system?.type?.value || "blessing";
		let isDamage = Boolean(prayer.damage || prayer.system?.damage?.value);
		let isSuccess = test.result?.outcome === "success";
		let hasWrath = Boolean(test.result?.wrath);
		//Определение итоговых значений
		let contexts = [];
		//Если успешно
		if (isSuccess) {
			let prayKeys = [];
			//Если наносит урон
			if (isDamage) {prayKeys.push(`pray_${prayerType}_damage`, "pray_damage")};
			prayKeys.push(`pray_${prayerType}`, "pray_cast");
			//Добавление ключей
			contexts.push({category: "prayer", keys: prayKeys, global: true});
		//Если провальна, но не критично
		} else if (!hasWrath) {
			contexts.push({category: "prayer", keys: ["pray_fail"], global: true});
		};
		//Если критический бросок
		if (hasWrath) {
			contexts.push({category: "prayer", keys: ["pray_wrath", "pray_fail"], delay: isSuccess ? 600 : 0, global: true});
		};
		//Проигрывание звука
		this.playContextAudio(contexts);
	};

	//ПРОВЕРКИ НАВЫКОВ
	//Список скилов по ключам локализации
	static #skillMatchers = [
		{id: "consumeAlcohol", i18n: ["NAME.ConsumeAlcohol"]},
		{id: "stealth", i18n: ["NAME.Stealth"]},
		{id: "pickLock", i18n: ["NAME.PickLock"]},
		{id: "gamble", i18n: ["NAME.Gamble"]},
		{id: "gossip", i18n: ["NAME.Gossip"]},
		{id: "row", i18n: ["NAME.Row"]},
		{id: "swim", i18n: ["NAME.Swim"]},
		{id: "heal", i18n: ["NAME.Heal"]},
		{id: "athletics", i18n: ["NAME.Athletics"]},
		{id: "climb", i18n: ["NAME.Climb"]},
		{id: "sleightOfHand", i18n: ["NAME.SleightOfHand"]},
		{id: "entertain", i18n: ["NAME.Entertain", "NAME.Play", "NAME.Perform"]},
		{id: "perception", i18n: ["NAME.Perception", "NAME.Track"]},
		{id: "charm", i18n: ["NAME.Charm", "NAME.CharmAnimal"]},
		{id: "intimidate", i18n: ["NAME.Intimidate"]},
		{id: "bribery", i18n: ["NAME.Bribery", "NAME.Haggle"]},
		{id: "ride", i18n: ["NAME.Ride", "NAME.Drive"]}
	];
	//Определение id навыка
	static #resolveSkillId(skill) {
		//Если навык не определён, прерываем
		if (!skill) {return null};
		//Определение параметров
		let localName = (skill.name || "").toLowerCase().split("(")[0].trim();
		let origName = (skill.flags?.babele?.originalName || "").toLowerCase().split("(")[0].trim();
		//Сопоставление названий со списком скилов по ключам локализации
		for (let matcher of this.#skillMatchers) {
			for (let key of matcher.i18n) {
				//Проверяем локализованное название навыка на текущем языке мира
				let localizedTarget = game.i18n.localize(key).toLowerCase().split("(")[0].trim();
				if (localizedTarget && (localName === localizedTarget || localName.startsWith(localizedTarget))) {
					return matcher.id;
				};
				//Если стоит Babele, проверяем также базовое (английское) значение ключа из game.i18n
				let fallbackTarget = foundry.utils.getProperty(game.i18n._fallback, key)?.toLowerCase()?.split("(")[0]?.trim();
				if (fallbackTarget && (origName === fallbackTarget || localName === fallbackTarget)) {
					return matcher.id;
				};
			};
		};
		return null;
	};
	//Проверка навыка
	static onRollSkillTest(test) {
		//Если проверка нет или это проверка оружия / заклинания / молитвы / черты, прерываем. Эти проверки обрабатываются в onRollWeaponTest / onRollChannelTest, onRollCastTest / onRollPrayerTest / onRollTraitTest
		if (!test || test.weapon || test.spell || test.prayer || test.trait) {return};
		//Если это проверка защиты, прерываем. Эти проверки обрабатываются в onOpposedTestResult
		if (this.#isDefendingTest(test)) {return};
		//Если навык не определён, прерываем
		let skill = test.skill || (test.item?.type === "skill" ? test.item : null);
		if (!skill) {return};
		//Определение параметров
		let skillId = this.#resolveSkillId(skill);
		let isSuccess = test.result?.outcome === "success";
		let isCrit = Boolean(test.result?.critical);
		let isFumble = Boolean(test.result?.fumble);
		let outcomeSuffix = isSuccess ? "success" : "fail";
		//Определение итоговых ключей
		let keys = [];
		//Если id навыка был определён, добавляем соответствующие ему ключи
		if (skillId) {
			if (isCrit && isSuccess) {keys.push(`${skillId}_crit`)};
			if (isFumble && !isSuccess) {keys.push(`${skillId}_fumble`)};
			keys.push(`${skillId}_${outcomeSuffix}`, skillId);
		};
		//Определение критического результата
		if (isCrit && isSuccess) {keys.push("generic_crit")}
		else if (isFumble && !isSuccess) {keys.push("generic_fumble")};
		//Проигрывание звука, если ключи были определены
		if (keys.length) {
			this.playContextAudio({category: "skill", keys, global: true});
		};
	};

	//ВЗАИМОДЕЙСТВИЕ С ПРЕДМЕТАМИ: ЭКИПИРОВКА, ПЕРЕЗАРЯДКА, ПОЛОМКА, ЗАКЛИНАНИЯ, ДЕНЬГИ
	static onUpdateItem(item, changed, options, userId) {
		//Только для взаимодействующего игрока, при определённом предмете, если изменения присутствуют. Иначе, прерываем
		if (userId !== game.user.id || !item || !changed) {return};
		//Перезарядка
		if (changed.system?.loaded?.value === true && item.type === "weapon") {
			//Определение параметров
			let group = item.weaponGroup?.value || item.system?.weaponGroup?.value;
			//Определение итоговых ключей
			let keys = [];
			if (group === "crossbow") {keys.push("crossbow_load", "weapon_load")}
			else if (group === "blackpowder" || group === "engineering") {keys.push("gun_load", "weapon_load")}
			else {keys.push("weapon_load")};
			//Проигрывание звука
			return this.playContextAudio({category: "weapon", keys, global: true});
		};
		//Урон оружию
		if (changed.system?.damageToItem?.value !== undefined && item.type === "weapon") {
			//Определение параметров
			let isShield = this.#hasQuality(item, "shield");
			//Определение итоговых ключей
			let keys = isShield
				? ["damage_shield", "damage_weapon", "block_shield"]
				: ["damage_weapon", "parry_metal"];
			//Проигрывание звука
			return this.playContextAudio({category: "item", keys, global: true});
		};
		//Урон броне
		if (changed.system?.APdamage && item.type === "armour") {
			//Проигрывание звука
			return this.playContextAudio({category: "item", keys: ["damage_armour", "damage_weapon"], global: true});
		};
		//Экипировка / снятие предмета. Это действие запускает локальный звук, т.е. только для вызвавшего его пользователя
		if (changed.system?.equipped?.value !== undefined) {
			//Определение параметров
			let isEquipped = Boolean(changed.system.equipped.value);
			let prefix = isEquipped ? "equip" : "unequip";
			//Определение итоговых ключей
			let keys = [];
			//Для оружия
			if (item.type === "weapon") {
				//Для щита
				if (this.#hasQuality(item, "shield")) {keys.push(`${prefix}_shield`, `${prefix}_weapon`, prefix)}
				//Для остального
				else {
					let {subtype} = this.#getWeaponAudioProfile(item);
					keys.push(`${prefix}_${subtype}`, `${prefix}_weapon`, prefix);
				};
			//Для брони
			} else if (item.type === "armour") {
				//Определение ключей для разных типов брони
				let armorType = (item.armorType?.value || item.system?.armorType?.value || "").toLowerCase();
				if (armorType.includes("plate")) {keys.push(`${prefix}_plate`)}
				else if (armorType.includes("mail")) {keys.push(`${prefix}_mail`)}
				else if (armorType.includes("leather")) {keys.push(`${prefix}_leather`)};
				keys.push(`${prefix}_armour`, prefix);
			//Для остального имущества
			} else if (item.type === "trapping" || item.type === "container") {
				let trapType = (item.trappingType?.value || item.system?.trappingType?.value || "").toLowerCase();
				//Для одежды
				if (trapType.includes("clothing")) {keys.push(`${prefix}_cloth`)};
				keys.push(`${prefix}_item`, prefix);
			};
			//Проигрывание звука, если ключи были определены
			if (keys.length) {
				return this.playContextAudio({category: "item", keys, global: false});
			};
		};
		//Запоминание заклинаний. Это действие запускает локальный звук, т.е. только для вызвавшего его пользователя
		if (changed.system?.memorized?.value !== undefined && item.type === "spell") {
			//Проигрывание звука
			let action = changed.system.memorized.value ? "memorize" : "unmemorize";
			return this.playContextAudio({category: "item", keys: [`spell_${action}`, "equip_item"], global: false});
		};
		//Изменение количества денег. Это действие запускает локальный звук, т.е. только для вызвавшего его пользователя
		if (changed.system?.quantity?.value !== undefined && item.type === "money") {
			return this.playContextAudio({category: "item", keys: ["money_coins", "money"], global: false});
		};
	};
};
tools.Audio = Audio;
//Перехват событий для звуковой системы
Hooks.on("wfrp4e:rollWeaponTest", (test) => {Audio.onRollWeaponTest(test)});
Hooks.on("wfrp4e:rollTraitTest", (test) => {Audio.onRollTraitTest(test)});
Hooks.on("wfrp4e:opposedTestResult", (opposedTest, attackerTest, defenderTest) => {Audio.onOpposedTestResult(opposedTest, attackerTest, defenderTest)});
Hooks.on("wfrp4e:applyDamage", (args) => {Audio.onApplyDamage(args)});
Hooks.on("wfrp4e:rollChannelTest", (test) => {Audio.onRollChannelTest(test)});
Hooks.on("wfrp4e:rollCastTest", (test) => {Audio.onRollCastTest(test)});
Hooks.on("wfrp4e:rollPrayerTest", (test) => {Audio.onRollPrayerTest(test)});
Hooks.on("wfrp4e:rollTest", (test) => {Audio.onRollSkillTest(test)});
Hooks.on("updateItem", (item, changed, options, userId) => {Audio.onUpdateItem(item, changed, options, userId)});
//При получении травм
Hooks.on("createItem", (item, options, userId) => {
	if (userId === game.user.id && item.parent?.documentName === "Actor" && (item.type === "critical" || item.type === "injury")) {
		Audio.playContextAudio({category: "hit", keys: [`injury_${item.type}`, "injury_critical", "crit_normal"], global: true});
	};
});
//Начало боя
Hooks.on("combatStart", () => {
	if (game.user.isGM) {Audio.playContextAudio({category: "combat", keys: ["combat_start", "round_start", "round"], global: true})};
});
//Смена раунда
Hooks.on("updateCombat", (combat, changed) => {
	if (game.user.isGM && changed.round && changed.round > 1) {
		Audio.playContextAudio({category: "combat", keys: ["round_start", "round"], global: true});
	};
	if (Object.hasOwn(changed, "round") && typeof changed.round === "number") {
		BroadcastManager.onCombatRound(changed.round);
	};
});
//Уход в защиту
Hooks.on("createActiveEffect", (effect, options, userId) => {
	if (userId === game.user.id && effect.statuses?.has("defensive")) {
		Audio.playContextAudio({category: "combat", keys: ["defensive_on", "block_shield"], global: true});
	};
});
//Перевод актёров при импорте из библиотеки
Hooks.on("createActor", async (actor, options) => {
	if (game.modules.get("babele")?.active && game.settings.get("wfrp4e-tools", "translateImportedActors") && options.fromCompendium) {
		game.babele.translateActor(actor);
	};
});
//Свойство "Уход в защиту"
Hooks.on("renderActorSheetV2", (app, html, sheet) => {
	if (sheet.document.type == "character" || sheet.document.type == "npc" || sheet.document.type == "creature") {
		let button;
		//Определение наличия эффекта
		let effects = sheet.document.effects.filter(e => e.name.includes(game.wfrp4e.utility.getSystemEffects().defensive.name));
		if (effects.length) {
			button = `<a class="list-button" data-tooltip="${effects[0].name}" data-uuid="${sheet.document.uuid}" style="color: var(--color-level-success-bg);" data-action="defensive"><i class="fas fa-shield"></i></a>`;
		} else {
			button = `<a class="list-button" data-tooltip="${game.i18n.localize("EFFECT.OnDefensive")}" data-uuid="${sheet.document.uuid}" style="color: var(--color-level-error-bg);" data-action="defensive"><i class="fas fa-shield"></i></a>`;
		};
		let toggleDefensive = function() {
			let actor = fromUuidSync(this.dataset.uuid);
			if (!actor) {return};
			let effects = actor.effects.filter(e => e.name.includes(game.wfrp4e.utility.getSystemEffects().defensive.name));
			if (effects.length) {
				actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
			} else {
				actor.createEmbeddedDocuments("ActiveEffect", [game.wfrp4e.utility.getSystemEffects().defensive]);
			};
		};
		//Добавление кнопки
		let combatHeader = html.querySelector("section[data-tab='combat']>.sheet-list>.list-header>.list-name");
		if (combatHeader) {
			combatHeader.insertAdjacentHTML("beforeend", button);
			combatHeader.querySelector("a[data-action='defensive']")?.addEventListener("click", toggleDefensive);
		};
		//Добавление дополнительной кнопки для существ
		if (sheet.document.type == "creature") {
			let mainHeader = html.querySelector("section[data-tab='main']>.sheet-list>.list-header>.list-name");
			if (mainHeader) {
				mainHeader.insertAdjacentHTML("beforeend", button);
				mainHeader.querySelector("a[data-action='defensive']")?.addEventListener("click", toggleDefensive);
			};
		};
	};
});
//Исправление оригинальных скриптов
async function fixScripts() {
	systemConfig().effectScripts["s6eZXfZkC1My6EXl"] = await fetch("/modules/wfrp4e-tools/scripts/Enchanted Staff/Staff of Lore.js").then(c => c.text());
	systemConfig().effectScripts["R6SnyF3y4Vsq6oga"] = await fetch("/modules/wfrp4e-tools/scripts/Robes/Dialog 1.js").then(c => c.text());
	systemConfig().effectScripts["BHbFqhJPzZI2txLs"] = await fetch("/modules/wfrp4e-tools/scripts/Robes/Dialog 2.js").then(c => c.text());
	systemConfig().effectScripts["Wo4wQKUxSItAhRzZ"] = await fetch("/modules/wfrp4e-tools/scripts/Robes/Dialog 3.js").then(c => c.text());
	systemConfig().effectScripts["UsuwsmU1TUQLQVM2"] = await fetch("/modules/wfrp4e-tools/scripts/Robes/Dialog (hide).js").then(c => c.text());
};
//Функция перенаправления для реализации сокетов
//Сокет вызывает функцию следующим кодом: game.socket.emit("module.wfrp4e-tools", {name: имя, args: [аргументы, передающиеся функции]})
async function resolveSocket(func) {
	if (!func?.name) {return};
	let args = Array.isArray(func.args) ? func.args : [];
	switch (func.name) {
		case "updateAuditLogs": {
			updateAuditLogs(...args);
			return;
		};
		case "updateAmbitionsSummary": {
			updateAmbitionsSummary(...args);
			return;
		};
		case "playContextAudio": {
			Audio.playLocal(...args);
			return;
		};
		case "updateRollStats": {
			updateRollStats(...args);
			return;
		};
		case "broadcastShow": {
			BroadcastManager.showLocal(...args);
			return;
		};
		case "broadcastUpdate": {
			BroadcastManager.updateLocal(...args);
			return;
		};
		case "broadcastRemove": {
			BroadcastManager.removeLocal(...args);
			return;
		};
	};
	//Проверка зарегистрированных runtime-обработчиков сокетов
	if (typeof nPocTo_Sockets[func.name] === "function") {
		await nPocTo_Sockets[func.name](...args);
		return;
	};
};
//Фикс отображения случайных изображений токенов (*) и рендера карточек при удалённом токене/актёре
Hooks.once("setup", () => {
	//Фикс метода по определению speaker
	if (typeof WFRP_Utility !== "undefined") {WFRP_Utility.getSpeaker = Utility.getSpeaker};
	let isWildcard = (p) => typeof p === "string" && (p.includes("*") || p.includes("?") || /\{[^}]*,[^}]*\}/.test(p));
	let patched = new Set();
	for (let model of Object.values(CONFIG.ChatMessage.dataModels || {})) {
		let proto = model?.prototype;
		if (!proto || typeof proto.getHeaderToken !== "function" || patched.has(proto)) {continue};
		patched.add(proto);
		proto.getHeaderToken = async function() {
			let speaker = this.testData?.context?.speaker || this.parent?.speaker;
			//Ищем реальный TokenDocument напрямую в сценах (работает до прогрузки canvas и на других сценах)
			let token = (speaker?.scene && speaker?.token)
				? game.scenes.get(speaker.scene)?.tokens?.get(speaker.token)
				: null;
			let actor = token?.actor || (speaker?.actor ? game.actors.get(speaker.actor) : null);
			if (!actor) {try {actor = this.test?.actor} catch (e) {}};
			//Ищем активный токен актёра только если бросок не был привязан к конкретному (уже удалённому) токену
			if (!token && !speaker?.token && actor) {token = actor.token || (canvas?.ready ? actor.getActiveTokens?.()?.[0]?.document : null) || null};
			let path;
			if (token) {path = token.hidden ? "systems/wfrp4e/tokens/unknown.png" : token.texture?.src}
			//Если токен уже удалён со сцены, берём сохранённый при броске путь, иначе прототип
			else {path = this.parent?.flags?.wfrp4eTools?.tokenImg || actor?.prototypeToken?.texture?.src};
			//Если в пути всё равно осталась маска случайного изображения, заменяем на портрет актёра
			if (!path || isWildcard(path)) {path = (actor?.img && !isWildcard(actor.img)) ? actor.img : "systems/wfrp4e/tokens/unknown.png"};
			if (foundry.helpers?.media?.VideoHelper?.hasVideoExtension?.(path)) {path = await game.video.createThumbnail(path, {width: 50, height: 50})};
			return path;
		};
		if (typeof proto.onRender === "function") {
			proto.onRender = async function(html) {
				let header = html.querySelector(".message-header");
				if (!header) {return};
				let div = document.createElement("div");
				div.classList.add("message-token");
				let image = document.createElement("img");
				image.src = await this.getHeaderToken();
				image.style.zIndex = 1;
				div.appendChild(image);
				let test = null;
				try {test = this.test} catch (e) {};
				let actor = test?.actor;
				if (actor?.isMounted && actor.mount) {
					let mountToken = canvas?.ready ? actor.mount.getActiveTokens?.()?.[0]?.document : null;
					let mountSrc = mountToken?.texture?.src || actor.mount.prototypeToken?.texture?.src;
					if (!mountSrc || isWildcard(mountSrc)) {mountSrc = (actor.mount.img && !isWildcard(actor.mount.img)) ? actor.mount.img : "systems/wfrp4e/tokens/unknown.png"};
					div.classList.add("mounted");
					let mount = document.createElement("img");
					mount.src = mountSrc;
					mount.style.zIndex = 0;
					div.appendChild(mount);
				};
				header.insertBefore(div, header.firstChild);
				try {warhammer.utility.replacePopoutTokens(html)} catch (e) {};
			};
		};
	};
});
//Сохранение фактической иконки токена при создании сообщения проверки (на случай последующего удаления токена со сцены)
Hooks.on("preCreateChatMessage", (message) => {
	if (message.type !== "test") {return};
	let speaker = message.system?.testData?.context?.speaker || message.speaker;
	let token = (speaker?.scene && speaker?.token)
		? game.scenes.get(speaker.scene)?.tokens?.get(speaker.token)
		: null;
	if (!token && !speaker?.token && speaker?.actor && canvas?.ready) {token = game.actors.get(speaker.actor)?.getActiveTokens?.()?.[0]?.document};
	let isWildcard = (p) => typeof p === "string" && (p.includes("*") || p.includes("?") || /\{[^}]*,[^}]*\}/.test(p));
	let src = (token && !token.hidden) ? token.texture?.src : null;
	if (!src || isWildcard(src)) {
		let actor = token?.actor || (speaker?.actor ? game.actors.get(speaker.actor) : null);
		if (actor?.img && !isWildcard(actor.img)) {src = actor.img};
	};
	if (src && !isWildcard(src)) {message.updateSource({"flags.wfrp4eTools.tokenImg": src})};
});
//Выполняется единожды при инициализации мира
Hooks.once("init", () => {
	game.settings.register("wfrp4e-tools", "debug", {
		scope: "user",
		config: false,
		default: false,
		type: Boolean
	});
	game.settings.registerMenu("wfrp4e-tools", "debugMenu", {
		restricted: true,
		name: game.i18n.localize("WFRP4E.Tools.Debug.Name"),
		label: game.i18n.localize("WFRP4E.Tools.Debug.Label"),
		hint: game.i18n.localize("WFRP4E.Tools.Debug.Hint"),
		icon: "fas fa-debug",
		type: debugMenu
	});
	game.settings.register("wfrp4e-tools", "updateNotification", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.updateNotification.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.updateNotification.Hint"),
		scope: "user",
		config: true,
		default: true,
		requiresReload: true,
		type: Boolean
	});
	game.settings.register("wfrp4e-tools", "translateImportedActors", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.translateImportedActors.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.translateImportedActors.Hint"),
		scope: "world",
		config: true,
		default: game.modules.get("babele")?.active ? true : false,
		type: Boolean
	});
	game.settings.register("wfrp4e-tools", "defensiveSkillsList", {
		scope: "user",
		config: false,
		type: Array,
		default: []
	});
	game.settings.register("wfrp4e-tools", "defensiveRemove", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.defensiveRemove.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.defensiveRemove.Hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register("wfrp4e-tools", "defensiveList", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Hint"),
		scope: "user",
		config: true,
		choices: {
			1: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Combat"),
			2: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.All"),
			3: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Name")
		},
		default: 1,
		type: Number
	});
	game.settings.register("wfrp4e-tools", "auditLogsLength", {
		scope: "world",
		config: false,
		type: Number,
		default: 50
	});
	game.settings.register("wfrp4e-tools", "ambitions", {
		scope: "world",
		config: false,
		default: {short: "", long: ""},
		type: Object
	});
	game.settings.register("wfrp4e-tools", "activeBroadcasts", {
		scope: "world",
		config: false,
		default: [],
		type: Array
	});
	game.settings.register("wfrp4e-tools", "soundsCatalog", {
		scope: "world",
		config: false,
		default: {},
		type: Object
	});
	game.settings.register("wfrp4e-tools", "enableSounds", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.enableSounds.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.enableSounds.Hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register("wfrp4e-tools", "soundsVolume", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.soundsVolume.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.soundsVolume.Hint"),
		scope: "client",
		config: true,
		range: {
			min: 0,
			max: 1,
			step: 0.05
		},
		default: 0.25,
		type: Number
	});
	game.settings.register("wfrp4e-tools", "soundsFunnyMode", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.soundsFunnyMode.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.soundsFunnyMode.Hint"),
		scope: "client",
		config: true,
		default: false,
		type: Boolean
	});
	game.settings.register("wfrp4e-tools", "soundsPath", {
		name: game.i18n.localize("WFRP4E.Tools.Settings.soundsPath.Name"),
		hint: game.i18n.localize("WFRP4E.Tools.Settings.soundsPath.Hint"),
		scope: "world",
		config: true,
		default: "modules/wfrp4e-sounds/sounds/",
		filePicker: "folder",
		type: String,
		onChange: () => {if (game.user.isGM) {Audio.buildCatalog()}}
	});
});
//Выполняется каждый раз после полной загрузки мира
Hooks.on("ready", async () => {
	game.wfrp4e.tools = tools;
	//Восстановление переводов магии Великой Пасти
	if (game.modules.get("wfrp4e-archives2")?.active) {
		WFRP4E.magicLores["greatMaw"] = game.i18n.localize("WFRP4E.MagicLores.greatMaw");
		WFRP4E.magicWind["greatMaw"] = game.i18n.localize("WFRP4E.MagicWind.greatMaw");
		WFRP4E.loreEffectDescriptions["greatMaw"] = game.i18n.localize("WFRP4E.greatMaw.descriptions");
	};
	//Восстановление переводов магии Вааагх!
	if (game.modules.get("wfrp4e-tribes")?.active) {
		WFRP4E.magicLores["little-waaagh"] = game.i18n.localize("WFRP4E.MagicLores.little-waaagh");
		WFRP4E.magicWind["little-waaagh"] = game.i18n.localize("WFRP4E.MagicWind.little-waaagh");
		WFRP4E.loreEffectDescriptions["little-waaagh"] = game.i18n.localize("WFRP4E.little-waaagh.descriptions");
		WFRP4E.magicLores["big-waaagh"] = game.i18n.localize("WFRP4E.MagicLores.big-waaagh");
		WFRP4E.magicWind["big-waaagh"] = game.i18n.localize("WFRP4E.MagicWind.big-waaagh");
		WFRP4E.loreEffectDescriptions["big-waaagh"] = game.i18n.localize("WFRP4E.big-waaagh.descriptions");
	};
	//Исправление скриптов системы
	await fixScripts();
	//Свойство "Уход в защиту"
	let defensive = {
		img: "modules/wfrp4e-tools/icons/defensive.png",
		id: "defensive",
		statuses: ["defensive"],
		name: game.i18n.localize("EFFECT.OnDefensive"),
		description: "WFRP4E.Tools.Defensive.Description",
		system: {
			condition: {
				value: null,
				numbered: false
			},
			scriptData: [
				{
					label: "@effect.name",
					trigger: "immediate",
					script: await fetch("/modules/wfrp4e-tools/scripts/Defensive/Immediate.js").then(c => c.text())
				},
				{
					label: "@effect.name",
					trigger: "startTurn",
					script: `if (game.settings.get("wfrp4e-tools", "defensiveRemove")) {this.effect.delete()}`
				},
				{
					label: "@effect.name",
					trigger: "dialog",
					script: "args.prefillModifiers.modifier += 20",
					options: {
						hideScript: "return !this.actor.isOpposing",
						activateScript: await fetch("/modules/wfrp4e-tools/scripts/Defensive/Dialog.js").then(c => c.text())
					}
				}
			]
		}
	};
	game.wfrp4e.config.systemEffects.defensive = defensive;
	CONFIG.statusEffects.push(defensive);
	//Замена ItemDialog на Обновлённый
	warhammer.apps.ItemDialog = Tools_ItemDialog;
	ItemDialog = Tools_ItemDialog;
	//Добавление вкладок в Журнал изменений, в соответствии с количеством пользователей
	game.wfrp4e.tools.AuditLogsApp.PARTS = Object.assign(
		{tabs: {template: "templates/generic/tab-navigation.hbs"}},
		...game.users.map(u => ({[u.id]: {template: "modules/wfrp4e-tools/templates/auditLogs/app.hbs"}}))
	);
	//Добавление вкладок в Статистику бросков (ГМ видит всех и общую вкладку, обычный игрок — только свою)
	if (game.user.isGM) {
		game.wfrp4e.tools.RollStatsApp.PARTS = Object.assign(
			{tabs: {template: "templates/generic/tab-navigation.hbs"}},
			{all: {template: "modules/wfrp4e-tools/templates/rollStats/app.hbs"}},
			...game.users.map(u => ({[u.id]: {template: "modules/wfrp4e-tools/templates/rollStats/app.hbs"}}))
		);
	} else {
		game.wfrp4e.tools.RollStatsApp.PARTS = {
			[game.user.id]: {template: "modules/wfrp4e-tools/templates/rollStats/app.hbs"}
		};
	};
	//Отслеживание использования Тёмных сделок и +1 УУ за Удачу
	if (game.wfrp4e?.rolls?.TestWFRP) {
		let origDarkDeal = game.wfrp4e.rolls.TestWFRP.prototype.useDarkDeal;
		game.wfrp4e.rolls.TestWFRP.prototype.useDarkDeal = function(...args) {
			this._pendingDarkDeal = true;
			return origDarkDeal.apply(this, args);
		};
		let origUseFortune = game.wfrp4e.rolls.TestWFRP.prototype.useFortune;
		game.wfrp4e.rolls.TestWFRP.prototype.useFortune = function(type, ...args) {
			if (type === "reroll") {
				this._pendingFortuneReroll = true;
			} else if (type === "addSL") {
				this.context.fortuneAddSLUsed = true;
			};
			return origUseFortune.call(this, type, ...args);
		};
		let origReroll = game.wfrp4e.rolls.TestWFRP.prototype.reroll;
		game.wfrp4e.rolls.TestWFRP.prototype.reroll = function(...args) {
			this.context.darkDealUsed = Boolean(this._pendingDarkDeal);
			if (!this._pendingFortuneReroll) {
				this.context.fortuneUsedReroll = false;
			};
			this.context.fortuneAddSLUsed = false;
			this._pendingDarkDeal = false;
			this._pendingFortuneReroll = false;
			return origReroll.apply(this, args);
		};
	};
	//Добавление функции поиска предмета по оригинальному имени
	game.wfrp4e.utility.findOriginalName = Utility.findOriginalName;
	//Учёт контейнеров с уведомлениями об изменениях, вносимых другими пользователями
	game.wfrp4e.tools.auditLogs = {};
	game.users.forEach(u => {
		game.wfrp4e.tools.auditLogs[u.id] = {
			timer: false,
			logs: []
		};
	});
	let auditLogsNotifications = () => {
		let div = document.createElement("div");
		div.classList.add("auditLogsNotifications");
		let ol = document.createElement("ol");
		ol.classList.add("plain");
		div.append(ol);
		return div;
	};
	document.querySelector("#chat-notifications")?.insertAdjacentElement("afterbegin", auditLogsNotifications());
	//Переопределение стандартных уведомление
	if (game.settings.get("wfrp4e-tools", "updateNotification")) {Notifications.prepareUIToToolsNotification()};
	//Индексация звуковых файлов
	if (game.user.isGM) {await Audio.buildCatalog()};
	//Отключение стандартного WFRP_Audio
	if (typeof WFRP_Audio !== "undefined") {
		WFRP_Audio.PlayContextAudio = () => {};
		WFRP_Audio.FindContext = () => undefined;
		WFRP_Audio.MatchContextAudio = async () => ({});
	};
	//Создание сокета модуля для возможности вызова функций у других пользователей
	game.socket.on('module.wfrp4e-tools', resolveSocket);
	//Восстановление активных сообщений и таймеров Мастера
	await BroadcastManager.restoreAll();
	//Запуск хука о готовности модуля
	Hooks.callAll("wfrp4e:toolsReady");
});
//Выполняется каждый раз при открытии настроек
Hooks.on("renderSettingsConfig", (app, html) => {
	//Добавить изменение навыков при выборе пункта в графе "Навыки для ухода в защиту"
	html.querySelector("[name='wfrp4e-tools.defensiveList']")?.addEventListener("change", async (e) => {
		game.settings.set("wfrp4e-tools", "defensiveList", e.target.value);
		if (e.target.value == 3) {
			let confirm = true;
			if (game.settings.get("wfrp4e-tools", "defensiveSkillsList").length) {
				confirm = false;
				confirm = await foundry.applications.api.DialogV2.confirm({
					window: {title: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Confirm.Label")},
					content: `<p>${game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Confirm.Hint")}</p><p><b>${game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Confirm.List")}:</b> ${game.settings.get("wfrp4e-tools", "defensiveSkillsList").join(", ")}</p>`
				});
			};
			if (confirm) {
				let array = [];
				if (game.user.character != null) {
					array = game.user.character.itemTypes.skill;
				} else {
					array = await warhammer.utility.findAllItems("skill", game.i18n.localize("WFRP4E.Tools.Search"), false);
				};
				let choice = await ItemDialog.create(array.sort((a, b) => a.name > b.name ? 1 : -1), array.length, {text: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Hint"), title: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Label")});
				array = [];
				for (let i = 0; i < choice.length; i++) {array.push(choice[i].name)};
				game.settings.set("wfrp4e-tools", "defensiveSkillsList", array);
			};
		};
	});
	//Обновление пользовательских навыков при нажатии ПКМ
	html.querySelector("[name='wfrp4e-tools.defensiveList']")?.addEventListener("contextmenu", async (e) => {
		if (e.target.value == 3) {
			let confirm = true;
			if (game.settings.get("wfrp4e-tools", "defensiveSkillsList").length) {
				confirm = false;
				confirm = await foundry.applications.api.DialogV2.confirm({
					window: {title: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Confirm.Label")},
					content: `<p>${game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Confirm.Hint")}</p><p><b>${game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Confirm.List")}:</b> ${game.settings.get("wfrp4e-tools", "defensiveSkillsList").join(", ")}</p>`
				});
			};
			if (confirm) {
				let array = [];
				if (game.user.character != null) {
					array = game.user.character.itemTypes.skill;
				} else {
					array = await warhammer.utility.findAllItems("skill", game.i18n.localize("WFRP4E.Tools.Search"), false);
				};
				let choice = await ItemDialog.create(array.sort((a, b) => a.name > b.name ? 1 : -1), array.length, {text: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Hint"), title: game.i18n.localize("WFRP4E.Tools.Settings.defensiveList.Custom.Label")});
				array = [];
				for (let i = 0; i < choice.length; i++) {array.push(choice[i].name)};
				game.settings.set("wfrp4e-tools", "defensiveSkillsList", array);
			};
		};
	});
});
//Создание кнопок в левой панели управления
Hooks.on("getSceneControlButtons", (controls) => {
	let debug = game.settings.get("wfrp4e-tools", "debug");
	if (debug) {
		console.debug(...debugMessage, "getSceneControlButtons \"controls\"");
		console.debug(controls);
	};
	controls.wfrp4eTools = {
		name: "wfrp4eTools",
		activeTool: "select",
		title: "WFRP4E.Tools.Control",
		icon: "fas fa-handshake-angle",
		layer: "tokens",
		tools: {
			select: controls.tokens.tools.select,
			auditLogs: {
				name: "auditLogs",
				title: "WFRP4E.Tools.AuditLogs.Title",
				icon: "fas fa-clock-rotate-left",
				visible: game.user.isGM,
				button: true,
				onChange: () => {game.wfrp4e.tools.AuditLogsApp.create()}
			},
			ambitionsSummary: {
				name: "ambitionsSummary",
				title: "WFRP4E.Tools.AmbitionsSummary.Title",
				icon: "fas fa-star",
				visible: game.user.isGM,
				button: true,
				onChange: () => {game.wfrp4e.tools.AmbitionsSummary.create()}
			},
			rollStats: {
				name: "rollStats",
				title: "WFRP4E.Tools.RollStats.Title",
				icon: "fas fa-chart-pie",
				visible: true,
				button: true,
				onChange: () => {game.wfrp4e.tools.RollStatsApp.create()}
			},
			broadcast: {
				name: "broadcast",
				title: "WFRP4E.Tools.Broadcast.Title",
				icon: "fas fa-bullhorn",
				visible: game.user.isGM,
				button: true,
				onChange: () => {game.wfrp4e.tools.BroadcastApp.create()}
			},
			macros: {
				name: "macros",
				title: "WFRP4E.Tools.Macros.Title",
				icon: "fas fa-code",
				visible: true,
				button: true,
				onChange: () => {game.wfrp4e.tools.Macros.create()}
			}
		}
	};
	//Проверка на другие мои модули для добавления параметров оттуда
	nPocTo_Modules.forEach(m => {
		if (game.modules.get(m)?.active && game.settings.settings.has(`${m}.controlButtons`)) {
			foundry.utils.deepClone(game.settings.get(m, "controlButtons")).forEach(b => {
				controls.wfrp4eTools.tools[b.name] = b;
				if (controls.wfrp4eTools.tools[b.name].visible == "gmOnly") {controls.wfrp4eTools.tools[b.name].visible = game.user.isGM};
				if (controls.wfrp4eTools.tools[b.name].onChange) {controls.wfrp4eTools.tools[b.name].onChange = new Function("event", "active", b.onChange)};
			});
		};
	});
	if (debug) {
		console.debug(...debugMessage, "getSceneControlButtons \"controls.wfrp4eTools\"");
		console.debug(controls.wfrp4eTools);
	};
});