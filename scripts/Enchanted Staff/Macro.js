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
	//Добавляем в опции каждую магическую школу отдельно
	for (let i = 0; i < Object.keys(game.wfrp4e.config.magicLores).length; i++) {
		if (Object.keys(game.wfrp4e.config.magicLores)[i] != "petty") {
			lore += "<option value='" + Object.keys(game.wfrp4e.config.magicLores)[i] + "'>" + Object.values(game.wfrp4e.config.magicLores)[i] + "</option>";
		};
	};
	//Диалоговое окно на выбор магической школы
	await new foundry.applications.api.DialogV2({
		window: {title: "NAME.Lore"},
		content: `<div class="wfrp4eTools" style="display: flex; align-items: center; width: 100%;">
			<select id="lore" style="width: 100%; text-align: center; color: black; background-color: antiquewhite;">
				${lore}
			</select>
		</div>`,
		buttons: [{
			label: game.i18n.format("WFRP4E.Tools.Macros.Generate.Title", {name: game.i18n.localize("WFRP4E.Tools.Macros.Generate.Staff")}),
			icon: "fas fa-wand-magic-sparkles",
			callback: async (button) => {
				let lore = button.target.closest("dialog").querySelector("#lore").value;
				let staff = await fromUuid("Compendium.wfrp4e-core.items.Item.GkeMJrsqxQIek1xK");
				if (!staff) {
					ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItem", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.EnchantedStaff.Item"), comp: "WFRP4e - Core Rulebook"}));
					return;
				} else {staff = staff.toObject()};
				if (lore == "rand") {
					do {
						lore = Array.from((await loreTable.roll()).results[0].description.matchAll(/\[(.+?)\]/gm))[0][1].split("#")[1];
					} while (lore == "petty-spells" || lore == "arcane-spells");
					switch (lore) {
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
					let keys = Object.keys(game.wfrp4e.config.magicLores).filter(k => k != "petty");
					lore = game.wfrp4e.tools.randomArrayElement(keys);
				};

				let quirk = null;
				if (game.wfrp4e.tables.findTable("quirks-curses") && (["hedgecraft", "witchcraft", "necromancy", "daemonology"].includes(lore) || lore.includes("chaos-magic"))) {
					do {
						quirk = (await game.wfrp4e.tables.rollTable("quirks-curses", {modifier: 40}));
					} while (quirk?.total >= 36 && quirk?.total <= 40);
				};
				quirk = quirk?.result;
				if (quirk) {staff.system.description.value = quirk};

				if (lore.includes("chaos-magic")) {
					lore = game.wfrp4e.tools.randomArrayElement(["tzeentch", "nurgle", "slaanesh", "undivided"]);
				};
				let img = "icons/weapons/staves/staff-ornate.webp";
				switch (lore) {
					case "beasts": {
						img = "icons/weapons/staves/staff-ornate-bird.webp";
						break;
					};
					case "death": {
						img = "icons/weapons/staves/staff-orb-purple.webp";
						break;
					};
					case "fire": {
						img = "icons/weapons/staves/staff-ornate-red.webp";
						break;
					};
					case "heavens": {
						img = "icons/weapons/staves/staff-ornate-cross.webp";
						break;
					};
					case "metal": {
						img = "icons/weapons/staves/staff-ornate-gold-jeweled.webp";
						break;
					};
					case "life": {
						img = "icons/weapons/staves/staff-forest-jewel.webp";
						break;
					};
					case "light": {
						img = "icons/weapons/staves/staff-ornate-blue-jewel.webp";
						break;
					};
					case "shadow": {
						img = "icons/weapons/staves/staff-hooked-banded.webp";
						break;
					};
					case "hedgecraft": {
						img = "icons/weapons/staves/staff-animal-skull-feathers.webp";
						break;
					};
					case "witchcraft": {
						img = "icons/weapons/staves/staff-animal-skull-horned.webp";
						break;
					};
					case "daemonology": {
						img = "icons/weapons/staves/staff-metal-mask.webp";
						break;
					};
					case "necromancy": {
						img = "icons/weapons/staves/staff-ornate-wood-red.webp";
						break;
					};
					case "greatMaw": {
						img = "icons/weapons/staves/staff-simple-spiral-brown.webp";
						break;
					};
					case "ruin": {
						img = "icons/weapons/staves/staff-engraved-wood.webp";
						break;
					};
					case "plague": {
						img = "icons/weapons/staves/staff-forest-hooked.webp";
						break;
					};
					case "stealth": {
						img = "icons/weapons/staves/staff-simple-spiral-green.webp";
						break;
					};
					case "little-waaagh": {
						img = "icons/weapons/staves/staff-simple-spiral-grey.webp";
						break;
					};
					case "big-waaagh": {
						img = "icons/weapons/staves/staff-simple-hooked.webp";
						break;
					};
					case "undivided": {
						lore = game.wfrp4e.tools.randomArrayElement(["tzeentch", "nurgle", "slaanesh"]);
					};
					case "nurgle":
					case "slaanesh":
					case "tzeentch": {
						img = `icons/weapons/staves/staff-${game.wfrp4e.tools.randomArrayElement(["ornate-eye", "simple-knotted", "ornate-purple"])}.webp`;
						break;
					};
				};
				staff.name += " (" + game.wfrp4e.config.magicLores[lore] + ")";
				staff.img = img;

				let effect = {
					name: staff.name,
					img: img,
					system: {
						transferData: {
							equipTransfer: true
						},
						scriptData: [{
							label: staff.name,
							trigger: "prepareItem",
							script: "[Script.s6eZXfZkC1My6EXl]"
						}]
					}
				};
				staff.effects.push(effect);

				delete staff._id;
				Item.implementation.create(staff, {renderSheet: true});
			}
		}]
	}).render(true);
};