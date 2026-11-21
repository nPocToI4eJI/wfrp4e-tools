let array;
if (game.settings.get("wfrp4e-tools", "defensiveList") == 1) {
	array = this.actor.itemTypes.skill.filter(s => s.name.includes(game.i18n.localize("NAME.Melee")) || s.name.includes("Melee") || s.name.includes(game.i18n.localize("NAME.Dodge")) || s.name.includes("Dodge"));
} else if (game.settings.get("wfrp4e-tools", "defensiveList") == 2) {
	array = this.actor.itemTypes.skill;
} else if (game.settings.get("wfrp4e-tools", "defensiveList") == 3) {
	array = this.actor.itemTypes.skill.filter(s => game.settings.get("wfrp4e-tools", "defensiveSkillsList").some(sl => s.name.includes(sl)));
};
if (!array.length && game.settings.get("wfrp4e-tools", "defensiveList") != 2) {
	array = this.actor.itemTypes.skill;
	if (array.length) {
		game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.Defensive.UndefinedFilter")}, {color: "orange"});
	} else {
		game.wfrp4e.tools.newNotification({text: game.i18n.localize("WFRP4E.Tools.Defensive.Undefined")}, {color: "red"});
		return false;
	};
};
let choice;
if (array.length == 1) {choice = array} else {
	array.sort((a, b) => a.name > b.name ? 1 : -1);
	choice = await ItemDialog.create(array, 1, {text: game.i18n.localize("WFRP4E.Tools.Defensive.Hint"), title: game.i18n.localize("WFRP4E.Tools.Defensive.Label"), defaultValue: array[0].id});
};
if (choice.length) {this.effect.updateSource({name: this.effect.name + " [" +  choice[0]?.name + "]"})}
else {return false};