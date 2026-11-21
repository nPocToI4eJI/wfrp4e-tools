export default async function() {
	let lore = "";
	//Добавляем в опции все магические школы
	lore += "<option value='allrand'>" + game.i18n.localize('WFRP4E.Tools.Macros.Random.Label') + "</option>";
	//Определяем таблицу магических школ
	let loreTable = game.wfrp4e.tables.findTable("scroll", "lore");
	//Если таблица магических школ найдена, добавляем её в опции
	if (loreTable) {
		lore += "<option value='rand' title='" + game.i18n.localize('WFRP4E.Tools.Macros.Random.Hint') + "'>" + game.i18n.localize('WFRP4E.Tools.Macros.Random.Table') + "</option>";
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
			<select id="lore" style="width: 69%; text-align: center; color: black; background-color: antiquewhite;" data-tooltip="${game.i18n.localize('WFRP4E.Tools.Macros.Generate.Lore')}">
				${lore}
			</select>
			<input id="cn" style="width: 29%; text-align: center; color: black; background-color: antiquewhite;" type="number" step="1" min="0" value="0" data-tooltip="${game.i18n.localize('WFRP4E.Tools.Macros.Generate.CN')}">
		</div>`,
		buttons: [{
			label: game.i18n.format("WFRP4E.Tools.Macros.Generate.Title", {name: game.i18n.localize("WFRP4E.Tools.Macros.Generate.Scroll")}),
			icon: "fas fa-scroll",
			callback: (button) => {
				generateItem(button.target.closest("dialog").querySelector("#lore").value, {cn: button.target.closest("dialog").querySelector("#cn").value});
			}
		}]
	}).render(true);

	async function generateItem(lore, select={}, {count=1, missCN=[]}={}) {
		if (count > 4) {
			ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.Scroll", {lore: lore == "arcane" ? game.i18n.localize("WFRP4E.Tools.Macros.Arcane") : game.wfrp4e.config.magicLores[lore], cn: missCN.join(", ")}));
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

		let img = "icons/sundries/scrolls/scroll-bound-black-tan.webp";
		switch (lore) {
			case "petty": {
				img = "icons/sundries/scrolls/scroll-rolled-brown.webp";
				break;
			};
			case "beasts": {
				img = "icons/sundries/scrolls/scroll-bound-gold-brown.webp";
				break;
			};
			case "death": {
				img = "icons/sundries/scrolls/scroll-bound-tan-grey.webp";
				break;
			};
			case "fire": {
				img = "icons/sundries/scrolls/scroll-bound-red-tan.webp";
				break;
			};
			case "heavens": {
				img = "icons/sundries/scrolls/scroll-bound-blue-white.webp";
				break;
			};
			case "metal": {
				img = "icons/sundries/scrolls/scroll-bound-sealed-gold-red.webp";
				break;
			};
			case "life": {
				img = "icons/sundries/scrolls/scroll-bound-green.webp";
				break;
			};
			case "light": {
				img = "icons/sundries/scrolls/scroll-bound-white-tan.webp";
				break;
			};
			case "shadow": {
				img = "icons/sundries/scrolls/scroll-bound-black-brown.webp";
				break;
			};
			case "hedgecraft": {
				img = "icons/sundries/scrolls/scroll-bound-brown-tan.webp";
				break;
			};
			case "witchcraft": {
				img = "icons/sundries/scrolls/scroll-rolled-wrap.webp";
				break;
			};
			case "daemonology": {
				img = "icons/sundries/scrolls/scroll-bound-skull-blue.webp";
				break;
			};
			case "necromancy": {
				img = "icons/sundries/scrolls/scroll-bound-skull-brown.webp";
				break;
			};
			case "greatMaw": {
				img = "icons/sundries/scrolls/scroll-bound-skull-white.webp";
				break;
			};
			case "ruin": {
				img = "icons/sundries/scrolls/scroll-runed-tan.webp";
				break;
			};
			case "plague": {
				img = "icons/sundries/scrolls/scroll-writing-brown-grey.webp";
				break;
			};
			case "stealth": {
				img = "icons/sundries/scrolls/scroll-runed-brown-green.webp";
				break;
			};
			case "little-waaagh": {
				img = "icons/sundries/scrolls/scroll-symbol-circle-white.webp";
				break;
			};
			case "big-waaagh": {
				img = "icons/sundries/scrolls/scroll-symbol-eye-brown.webp";
				break;
			};
			case "undivided": {
				lore = game.wfrp4e.tools.randomArrayElement(["tzeentch", "nurgle", "slaanesh"]);
			};
			case "nurgle":
			case "slaanesh":
			case "tzeentch": {
				img = `icons/sundries/scrolls/scroll-${game.wfrp4e.tools.randomArrayElement(["bound-diamond-brown", "bound-grey-tan", "bound-sealed-red-green", "bound-ruby-red"])}.webp`;
				break;
			};
		};

		let cn = Number(select.cn);
		if (cn == 0) {
			cn = game.wfrp4e.tables.findTable("scroll", "cn");
			if (!cn) {
				let ranges = [
					{start: 1, end: 3, val: 0},
					{start: 4, end: 25, val: 1},
					{start: 26, end: 33, val: 2},
					{start: 34, end: 41, val: 3},
					{start: 42, end: 49, val: 4},
					{start: 50, end: 65, val: 5},
					{start: 66, end: 73, val: 6},
					{start: 74, end: 81, val: 7},
					{start: 82, end: 89, val: 8},
					{start: 90, end: 90, val: 0},
					{start: 91, end: 93, val: 9},
					{start: 94, end: 96, val: 10},
					{start: 97, end: 99, val: 11},
					{start: 100, end: 100, val: 12}
				];
				let table = new Array(100);
				ranges.forEach(r => {
					for (let i = r.start; i <= r.end; i++) {
						table[i - 1] = r.val;
					};
				});
				cn = game.wfrp4e.tools.randomArrayElement(table);
				ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Rand", {type: game.i18n.format("WFRP4E.Tools.Macros.Error.CN", {type: game.i18n.localize("WFRP4E.Tools.Macros.Generate.Scroll")})}));
			} else {
				cn = Number((await cn.roll()).results[0].description.replace(/<[^>]*>/g, ""));
			};
		};
		let spells = await warhammer.utility.findAllItems("spell", game.i18n.localize("WFRP4E.Tools.Macros.Search"), true, ["uuid", "system.lore.value", "system.cn.value"]);
		spells = spells.filter(s => ((s.system.lore.value == lore || (s.system.lore.value == "" && lore == "arcane")) && s.system.cn.value <= cn));
		let spell;
		for (let i = cn; i >= 0; i--) {
			let CNSpells = spells.filter(s => s.system.cn.value == i);
			if (CNSpells.length) {
				spell = game.wfrp4e.tools.randomArrayElement(CNSpells);
				break;
			};
		};
		if (spell) {
			await Item.implementation.create({
				type: "trapping", 
				name: `${game.i18n.localize("WFRP4E.Tools.Macros.Generate.Scroll")} (${spell.name})`, 
				img: img,
				system: {
					trappingType: {
						value: "booksAndDocuments",
					},
					encumbrance: {value: 0},
					description: {
						value: `<h4>@UUID[${spell.uuid}]</h4><p><b data-tooltip="${game.i18n.localize('NAME.Lore')}">${lore == "arcane" ? game.i18n.localize("WFRP4E.Tools.Macros.Arcane") : game.wfrp4e.config.magicLores[lore]}</b>: <i data-tooltip="${game.i18n.localize('Max') + " " + game.i18n.localize('SHEET.CN')}">${cn}</i></p>`
					}
				}
			}, {renderSheet: true});
		} else {
			generateItem(lore, select, {count: count + 1, missCN: missCN.concat(cn)});
		};
	};
};