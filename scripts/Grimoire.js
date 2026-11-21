export default async function() {
	let missTables = false;
	if (!game.wfrp4e.tables.findTable("random-grimoire") || game.wfrp4e.tables.findTable("random-grimoire")?.columns?.length < 6) {
		missTables = true;
		ui.notifications.warn(game.i18n.localize("WFRP4E.Tools.Macros.Error.Grimoire.Tables"));
	};
	let lore = "";
	//Добавляем в опции все магические школы
	lore += "<option value='allrand'>" + game.i18n.localize('WFRP4E.Tools.Macros.Random.Label') + "</option>";
	//Определяем таблицу магических школ. Используется таблица для создания свитков, потому что таблица гримуаров нормально не адаптирована
	let loreTable = game.wfrp4e.tables.findTable("scroll", "lore");
	if (!missTables) {
		//Если таблица магических школ найдена, добавляем её в опции
		if (loreTable) {
			lore += "<option value='rand' title='" + game.i18n.localize('WFRP4E.Tools.Macros.Random.Hint') + " " + game.i18n.localize('WFRP4E.Tools.Macros.Random.GrimoireHint') + "'>" + game.i18n.localize('WFRP4E.Tools.Macros.Random.Table') + "</option>";
		};
	};
	//Добавляем в опции Arcane заклинания
	lore += "<option value='arcane'>" + game.i18n.localize('WFRP4E.Tools.Macros.Arcane') + "</option>";
	//Добавляем в опции каждую магическую школу отдельно
	for (let i = 0; i < Object.keys(game.wfrp4e.config.magicLores).length; i++) {
		lore += "<option value='" + Object.keys(game.wfrp4e.config.magicLores)[i] + "'>" + Object.values(game.wfrp4e.config.magicLores)[i] + "</option>";
	};
	//Диалоговое окно на выбор магической школы
	await new foundry.applications.api.DialogV2({
		window: {title: "NAME.Lore"},
		content: `<div class="wfrp4eTools" style="display: flex; align-items: center; width: 100%; gap: 2%;">
			<select id="lore" style="width: 48%; text-align: center; color: black; background-color: antiquewhite;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.Macros.Generate.Lore')}">
				${lore}
			</select>
			<input id="cn" style="width: 24%; text-align: center; color: black; background-color: antiquewhite;" type="number" step="1" min="0" value="0" data-tooltip="${game.i18n.localize('WFRP4E.Tools.Macros.Generate.CN')}">
			<input id="count" style="width: 24%; text-align: center; color: black; background-color: antiquewhite;" type="number" step="1" min="0" value="0" data-tooltip="${game.i18n.localize('WFRP4E.Tools.Macros.Generate.Count')}">
		</div>`,
		buttons: [{
			label: game.i18n.format("WFRP4E.Tools.Macros.Generate.Title", {name: game.i18n.localize("WFRP4E.Tools.Macros.Generate.Grimoire")}),
			icon: "fas fa-book",
			callback: (button) => {
				generateItem(button.target.closest("dialog").querySelector("#lore").value, {cn: button.target.closest("dialog").querySelector("#cn").value, count: button.target.closest("dialog").querySelector("#count").value});
			}
		}]
	}).render(true);

	async function generateItem(lore, select={}, {count=1, missCN=[]}={}) {
		if (count > 4) {
			ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.Grimoire.MissCN", {lore: lore == "arcane" ? game.i18n.localize("WFRP4E.Tools.Macros.Arcane") : game.wfrp4e.config.magicLores[lore], cn: missCN.join(", ")}));
			return;
		};
		if (lore == "rand") {
			lore = Array.from((await loreTable.roll()).results[0].description.matchAll(/\[(.+?)\]/gm))[0][1].split("#")[1];
			switch (lore) {
				case "petty-spells": {
					lore = "petty";
					break;
				};
				case "arcane-spells": {
					lore = "arcane";
					break;
				};
				case "the-lore-of-beasts": {
					lore = "beasts";
					break;
				};
				case "the-lore-of-death": {
					lore = "death";
					break;
				};
				case "the-lore-of-fire": {
					lore = "fire";
					break;
				};
				case "the-lore-of-heavens": {
					lore = "heavens";
					break;
				};
				case "the-lore-of-metal": {
					lore = "metal";
					break;
				};
				case "the-lore-of-life": {
					lore = "life";
					break;
				};
				case "the-lore-of-light": {
					lore = "light";
					break;
				};
				case "the-lore-of-shadow": {
					lore = "shadow";
					break;
				};
				case "the-lore-of-hedgecraft": {
					lore = "hedgecraft";
					break;
				};
				case "the-lore-of-witchcraft": {
					lore = "witchcraft";
					break;
				};
				case "the-lore-of-daemonology": {
					lore = "daemonology";
					break;
				};
				case "the-lore-of-necromancy": {
					lore = "necromancy";
					break;
				};
			};
		} else if (lore == "allrand") {
			let keys = Object.keys(game.wfrp4e.config.magicLores).concat("arcane");
			lore = game.wfrp4e.tools.randomArrayElement(keys);
		};
		if (lore.includes("chaos-magic")) {
			lore = game.wfrp4e.tools.randomArrayElement(["tzeentch", "nurgle", "slaanesh", "undivided"]);
		};

		let img = "icons/sundries/books/book-tooled-gold-purple.webp";
		switch (lore) {
			case "petty": {
				img = "icons/sundries/books/book-tooled-gold-brown.webp";
				break;
			};
			case "beasts": {
				img = "icons/sundries/books/book-tooled-blue-yellow.webp";
				break;
			};
			case "death": {
				img = "icons/sundries/books/book-purple-glyph.webp";
				break;
			};
			case "fire": {
				img = "icons/sundries/books/book-symbol-fire-gold-orange.webp";
				break;
			};
			case "heavens": {
				img = "icons/sundries/books/book-symbol-lightning-silver-blue.webp";
				break;
			};
			case "metal": {
				img = "icons/sundries/books/book-backed-blue-gold.webp";
				break;
			};
			case "life": {
				img = "icons/sundries/books/book-clasp-spiral-green.webp";
				break;
			};
			case "light": {
				img = "icons/sundries/books/book-embossed-blue.webp";
				break;
			};
			case "shadow": {
				img = "icons/sundries/books/book-black-grey.webp";
				break;
			};
			case "hedgecraft": {
				img = "icons/sundries/books/book-simple-brown.webp";
				break;
			};
			case "witchcraft": {
				img = "icons/sundries/books/book-worn-brown.webp";
				break;
			};
			case "daemonology": {
				img = "icons/sundries/books/book-face-black.webp";
				break;
			};
			case "necromancy": {
				img = "icons/sundries/books/book-symbol-bat-red.webp";
				break;
			};
			case "greatMaw": {
				img = "icons/sundries/books/book-backed-wood-tan.webp";
				break;
			};
			case "ruin": {
				img = "icons/sundries/books/book-symbol-skull-grey.webp";
				break;
			};
			case "plague": {
				img = "icons/sundries/books/book-reye-reptile-brown.webp";
				break;
			};
			case "stealth": {
				img = "icons/sundries/books/book-symbol-yellow-grey.webp";
				break;
			};
			case "little-waaagh": {
				img = "icons/sundries/books/book-symbol-triangle-silver-brown.webp";
				break;
			};
			case "big-waaagh": {
				img = "icons/sundries/books/book-embossed-jewel-silver-green.webp";
				break;
			};
			case "undivided": {
				lore = game.wfrp4e.tools.randomArrayElement(["tzeentch", "nurgle", "slaanesh"]);
			};
			case "nurgle":
			case "slaanesh":
			case "tzeentch": {
				img = `icons/sundries/books/book-${game.wfrp4e.tools.randomArrayElement(["eye-pink", "embossed-jewel-gold-purple", "face-blue", "mimic"])}.webp`;
				break;
			};
		};

		let cn = Number(select.cn);
		if (cn == 0) {
			cn = game.wfrp4e.tables.findTable("scroll", "cn");
			if (!cn) {
				let ranges = [
					{start: 1, end: 30, val: 3},
					{start: 31, end: 50, val: 4},
					{start: 51, end: 60, val: 5},
					{start: 61, end: 70, val: 6},
					{start: 71, end: 80, val: 7},
					{start: 81, end: 85, val: 8},
					{start: 86, end: 90, val: 9},
					{start: 91, end: 95, val: 10},
					{start: 96, end: 100, val: 12}
				];
				let table = new Array(100);
				ranges.forEach(r => {
					for (let i = r.start; i <= r.end; i++) {
						table[i - 1] = r.val;
					};
				});
				cn = game.wfrp4e.tools.randomArrayElement(table);
				if (!missTables) {ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Rand", {type: game.i18n.format("WFRP4E.Tools.Macros.Error.CN", {type: game.i18n.localize("WFRP4E.Tools.Macros.Generate.Grimoire")})}))};
			} else {
				cn = Number((await cn.roll()).results[0].description.replace(/<[^>]*>/g, ""));
			};
		};
		let spells = await warhammer.utility.findAllItems("spell", game.i18n.localize("WFRP4E.Tools.Macros.Search"), true, ["uuid", "system.lore.value", "system.cn.value"]);
		spells = spells.filter(s => ((s.system.lore.value == lore || (s.system.lore.value == "" && lore == "arcane")) && s.system.cn.value <= cn));
		let resultSpells = [];
		let spellsCount = Number(select.count);
		if (spellsCount == 0) {
			spellsCount = game.wfrp4e.tables.findTable("random-grimoire", "spells");
			if (!spellsCount) {
				let ranges = [
					{start: 1, end: 40, val: 3},
					{start: 41, end: 80, val: 4},
					{start: 81, end: 95, val: 5},
					{start: 96, end: 100, val: 6}
				];
				let table = new Array(100);
				ranges.forEach(r => {
					for (let i = r.start; i <= r.end; i++) {
						table[i - 1] = r.val;
					};
				});
				spellsCount = game.wfrp4e.tools.randomArrayElement(table);
				if (!missTables) {ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Rand", {type: game.i18n.localize("WFRP4E.Tools.Macros.Error.Count")}))};
			} else {
				spellsCount = Number((await spellsCount.roll()).results[0].description);
			};
		};
		for (let i = Math.min(spellsCount, spells.length); i > 0; i--) {
			let result = game.wfrp4e.tools.randomArrayElement(spells);
			resultSpells.push(`<li><h6>@UUID[${result.uuid}]</h6></li>`);
			spells = spells.filter(s => s != result);
		};
		if (spellsCount > resultSpells.length) {
			ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.Grimoire.MissCount", {lore: lore == "arcane" ? game.i18n.localize("WFRP4E.Tools.Macros.Arcane") : game.wfrp4e.config.magicLores[lore], cn, count: spellsCount - resultSpells.length}));
			spells = await warhammer.utility.findAllItems("spell", game.i18n.localize("WFRP4E.Tools.Macros.Search"), true, ["uuid", "system.lore.value", "system.cn.value"]);
			spells = spells.filter(s => (s.system.lore.value == "" && s.system.cn.value <= cn));
			for (let i = Math.min(spellsCount - resultSpells.length, spells.length); i > 0; i--) {
				let result = game.wfrp4e.tools.randomArrayElement(spells);
				resultSpells.push(`<li><h6>@UUID[${result.uuid}]</h6></li>`);
				spells = spells.filter(s => s != result);
			};
		};
		if (resultSpells.length) {
			await Item.implementation.create({
				type: "trapping", 
				name: game.wfrp4e.tools.generateBookTitle("Magic"), 
				img: img,
				system: {
					trappingType: {
						value: "booksAndDocuments",
					},
					encumbrance: {value: 1},
					description: {
						value: `<p><b>${game.i18n.localize("WFRP4E.Tools.Macros.Create.Grimoire.Spells")}:</b></p>`
							+ `\n<ul>${resultSpells.join("")}</ul>`
							+ (!missTables ?
								`\n<p><b>${game.i18n.localize("WFRP4E.Tools.Macros.Create.Grimoire.Appearance")}:</b> <i>${(await game.wfrp4e.tables.findTable("random-grimoire", "type").roll()).results[0].description}</i></p>`
								+ `\n<p><b>${game.i18n.localize("WFRP4E.Tools.Macros.Create.Grimoire.Features")}:</b></p>`
								+ `\n<ul><li>${(await game.wfrp4e.tables.findTable("random-grimoire", "characteristic1").roll()).results[0].description}</li><li>${(await game.wfrp4e.tables.findTable("random-grimoire", "characteristic2").roll()).results[0].description}</li></ul>`
							: "")
							+ `\n<p><b data-tooltip="${game.i18n.localize('NAME.Lore')}">${Math.min(spellsCount, resultSpells.length)}x ${lore == "arcane" ? game.i18n.localize("WFRP4E.Tools.Macros.Arcane") : game.wfrp4e.config.magicLores[lore]}</b>: <i data-tooltip="${game.i18n.localize('Max') + " " + game.i18n.localize('SHEET.CN')}">${cn}</i></p>`
					}
				}
			}, {renderSheet: true});
		} else {
			generateItem(lore, select, {count: count + 1, missCN: missCN.concat(cn)});
		}
	};
};