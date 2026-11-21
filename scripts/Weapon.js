export default async function() {
    //Базовые таблицы
    let tables = {
        item: game.wfrp4e.tables.findTable("magic-weapons"),
        quality: game.wfrp4e.tables.findTable("weapon-qualities"),
		history: game.wfrp4e.tables.findTable("magical-history")
    };
    //Определение предмета по таблице, если она существует. Если нет - прямая ссылка на обычное Ручное оружие
    let item = await fromUuid("Compendium.wfrp4e-core.items.Item.1zaqojk0Oq1m8vYv");
    if (tables.item) {
        let itemRoll = (await tables.item.roll()).results[0];
        item = await fromUuid(itemRoll.documentUuid);
    };
    //Прерывание с ошибкой, если искомый предмет не найден
    if (!item) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItem", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.Weapon.Item"), comp: "WFRP4e - Core Rulebook"}));
        return;
    } else {
        if (!tables.item) {ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItemReplace", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.Weapon.Item"), baseItem: item.name}))};
		item = item.toObject();
	};
    //Проверка таблицы свойств
    if (!tables.quality) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Miss", {type: game.i18n.localize("WFRP4E.Tools.Macros.Create.Weapon.Table1"), comp: "WFRP4e - Archives of the Empire Vol. II"}));
        return;
    };
    //Проверка таблицы истории
    if (!tables.history) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Miss", {type: game.i18n.localize("WFRP4E.Tools.Macros.Create.Weapon.Table2"), comp: "WFRP4e - Archives of the Empire Vol. II"}));
        return;
    };
    //Определение свойств
    let rolls = {quality: 1, history: 1};
    let results = {quality: [], history: []};
    while (rolls.quality >= 1) {
        let result = (await tables.quality.roll()).results[0]
        if (!results.quality.find(r => r?._id == result?._id)) {
            rolls.quality--;
            results.quality.push(result);
            if (result?._id == "C0hC2OTmBrFKgORm") {rolls.quality += 2};
        };
    };
    while (rolls.history >= 1) {
        let result = (await tables.history.roll()).results[0];
        if (!results.history.find(r => r?._id == result?._id)) {
            rolls.history--;
            results.history.push(result);
            if (result?._id == "C0hC2OTmBrFKgORm") {rolls.history += 2};
        };
    };
    item.effects = results.quality.map(i => foundry.utils.deepClone(game.wfrp4e.config.artefactEffects[i._id || i.id])).filter(Boolean);
    let changes = results.quality.map(i => game.wfrp4e.config.artefactEffects[i._id || i.id]?.change).filter(Boolean);
    for (let change of changes) {
        let func = new Function("item", change);
        func(item);
    };
    for (let effect of item.effects) {effect.img = item.img};
    item.system.description.value = results.quality.map(i => i.text).join("");
    item.system.gmdescription.value = results.history.map(i => i.text).join("");
    //Создание предмета
    delete item._id;
    Item.implementation.create(item, {renderSheet: true});
};