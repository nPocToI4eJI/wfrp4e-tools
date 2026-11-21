export default async function() {
    //Базовые таблицы
    let tables = {
        item: game.wfrp4e.tables.findTable("magical-shield"),
        quality: game.wfrp4e.tables.findTable("shield-qualities")
    };
    //Определение предмета по таблице, если она существует. Если нет - прямая ссылка на обычный Щит
    let item = await fromUuid("Compendium.wfrp4e-core.items.Item.8nJ9R8tbhW42VGhr");
    if (tables.item) {
        let itemRoll = (await tables.item.roll()).results[0];
        item = await fromUuid(itemRoll.documentUuid);
    };
    //Прерывание с ошибкой, если искомый предмет не найден
    if (!item) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItem", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.Shield.Item"), comp: "WFRP4e - Core Rulebook"}));
        return;
    } else {
        if (!tables.item) {ui.notifications.warn(game.i18n.format("WFRP4E.Tools.Macros.Error.MissItemReplace", {item: game.i18n.format("WFRP4E.Tools.Macros.Create.Shield.Item"), baseItem: item.name}))};
		item = item.toObject();
	};
    //Проверка таблицы свойств
    if (!tables.quality) {
        ui.notifications.error(game.i18n.format("WFRP4E.Tools.Macros.Error.Table.Miss", {type: game.i18n.localize("WFRP4E.Tools.Macros.Create.Shield.Table"), comp: "WFRP4e - Archives of the Empire Vol. II"}));
        return;
    };
    //Определение свойств
    let quality = (await tables.quality.roll()).results[0];
    let qualityId = quality._id || quality.id;
    let changes = game.wfrp4e.config.artefactEffects[qualityId]?.change || false;
	let effects = [foundry.utils.deepClone(game.wfrp4e.config.artefactEffects[qualityId])].filter(Boolean);
    //Определение имени и текста для предмета
    let regex = /(<.+?>)/gm;
    let text = quality.text;
    Array.from(text.matchAll(regex)).forEach(match => {
        text = text.replace(match[0], "");
    });
    item.name = text.split(":")[0].trim();
    item.system.description.value = quality.text;
	//Исправление недоработок оригинальной таблицы
	if (qualityId == "ykj7wC35u3HPNeRe") {changes = "item.system.qualities.value = item.system.qualities.value.concat([{name: 'magical'}])"}
	else if (qualityId == "OOvWrQeU0SwEq0V3") {
		effects = [{
			name: item.name,
			img: "modules/wfrp4e-core/icons/equipment/trapping.png",
			system: {
				transferData: {
					documentType: "Actor",
					equipTransfer: true
				},
				scriptData: [{
					label: item.name,
					trigger: "manual",
					script: "let test = await this.actor.setupSkill(game.i18n.localize(\"NAME.Language\") + \" (\" + game.i18n.localize(\"SPEC.Magick\") + \")\", {skipDialog: true});"
						+ "\ntest.data.preData.target = 30;"
						+ "\ntest.data.context.breakdown.characteristic = \"30\";"
						+ "\nawait test.roll();",
				}]
			}
		}];
	};
    //Применение изменений от выпавших свойств, если они есть
    if (changes) {
        let func = new Function("item", changes);    
        func(item);
    };
    //Применение эффекта к объекту, если они есть
	if (effects.length) {
		item.effects.push(...effects);
	};
    //Создание предмета
    delete item._id;
    Item.implementation.create(item, {renderSheet: true});
};