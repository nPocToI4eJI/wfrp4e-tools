export default async function() {
    //Базовые таблицы
    let tables = {
        item: game.wfrp4e.tables.findTable("magical-armour"),
        sizeSpecies: game.wfrp4e.tables.findTable("armour-size", "species"),
		sizeHeight: game.wfrp4e.tables.findTable("armour-size", "height"),
		quality: game.wfrp4e.tables.findTable("armour-qualities")
    };
    //Определение предмета по таблице, если она существует. Если нет - прямая ссылка на обычная Латная кираса
    let items = [await fromUuid("Compendium.wfrp4e-core.items.Item.oBNXxRFPh1sOT4K2")].filter(Boolean);
    if (tables.item) {
        let itemRoll = (await tables.item.roll()).results[0];

		let regex = /\[(.+?)\]/gm
		let uuids = Array.from(itemRoll.text.matchAll(regex)).map(match => match[1]);
		items = (await Promise.all(uuids.map(fromUuid))).filter(Boolean);
    };
    //Прерывание с ошибкой, если искомый предмет не найден
    if (!items.length) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItem", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.Armour.Item"), comp: "WFRP4e - Core Rulebook"}));
        return;
    } else {
        if (!tables.item) {ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItemReplace", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.Armour.Item"), baseItem: items[0].name}))};
		items = items.map(i => i.toObject());
	};
	let results = {
		size: {},
		quality: []
	};
    //Проверка таблицы народа
    if (!tables.sizeSpecies) {
		let ranges = [
			{start: 1, end: 5, val: game.i18n.localize("Human")},
			{start: 6, end: 7, val: game.i18n.localize("High Elf") + " " + game.i18n.localize("SHEET.Or") + " " + game.i18n.localize("Wood Elf")},
			{start: 8, end: 9, val: game.i18n.localize("Dwarf")},
			{start: 10, end: 10, val: game.i18n.localize("Halfling")}
		];
		let table = new Array(10);
		ranges.forEach(r => {
			for (let i = r.start; i <= r.end; i++) {
				table[i - 1] = r.val;
			};
		});
		results.size.species = game.wfrp4e.tools.randomArrayElement(table);
        ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Rand", {type: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Table1"), comp: "WFRP4e - Archives of the Empire Vol. II"}));
	} else {
		results.size.species = (await tables.sizeSpecies.roll()).results[0].text;
	};
    //Проверка таблицы роста
    if (!tables.sizeHeight) {
		let ranges = [
			{start: 1, end: 1, val: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Size.EShort")},
			{start: 2, end: 3, val: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Size.Short")},
			{start: 4, end: 7, val: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Size.Average")},
			{start: 8, end: 9, val: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Size.Tall")},
			{start: 10, end: 10, val: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Size.ETall")},
		];
		let table = new Array(10);
		ranges.forEach(r => {
			for (let i = r.start; i <= r.end; i++) {
				table[i - 1] = r.val;
			};
		});
		results.size.height = game.wfrp4e.tools.randomArrayElement(table);
        ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Rand", {type: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Table2"), comp: "WFRP4e - Archives of the Empire Vol. II"}));
    } else {
		results.size.height = (await tables.sizeHeight.roll()).results[0].text;
	};
    //Проверка таблицы свойств
    if (!tables.quality) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Miss", {type: game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Table3"), comp: "WFRP4e - Archives of the Empire Vol. II"}));
        return;
    };
    //Определение свойств
    let rolls = 1;
    while (rolls >= 1) {
        let result = (await tables.quality.roll()).results[0]
        if (!results.quality.find(r => r?._id == result?._id)) {
            rolls--;
			//Исправление недоработок оригинальной таблицы
			if (result._id == "5tdATFCK5JquaKcR") {result.changes = "item.system.qualities.value = item.system.qualities.value.concat([{name: 'magical'}])"}
            results.quality.push(result);
            if (result?._id == "xBg0E3YfpQABR5io") {rolls += 2};
        };
    };
    for (let item of items) {
        item.system.description.value = `<p><strong>${game.i18n.localize("WFRP4E.Tools.Macros.Create.Armour.Size.Title")}</strong>: ${results.size.height} / ${results.size.species}</p>`;
        item.system.description.value += results.quality.map(i => i.text).join("");
		item.effects = results.quality.map(i => foundry.utils.deepClone(game.wfrp4e.config.artefactEffects[i._id || i.id])).filter(Boolean);
		let changes = results.quality.map(i => i.changes || game.wfrp4e.config.artefactEffects[i._id || i.id]?.change).filter(Boolean);
		for (let change of changes) {
			let func = new Function("item", change);
			func(item);
		};
		for (let effect of item.effects) {effect.img = item.img};
    };
    //Создание предмета
    items.forEach(i => delete i._id);
    Item.implementation.create(items, {renderSheet: true});
};