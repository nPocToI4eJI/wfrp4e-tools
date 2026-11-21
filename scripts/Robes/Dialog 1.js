let lore = warhammer.utility.findKey(this.effect.name.split("(")[1].split(")")[0], game.wfrp4e.config.magicLores);
if (args.type == "channelling" && args.spell.system.lore.value == lore) {
	args.prefillModifiers.slBonus  += 1;
} else if (args.spell.system.lore.value != lore && args.spell.system.lore.value != "petty") {
	args.prefillModifiers.slBonus  -= 1;
};