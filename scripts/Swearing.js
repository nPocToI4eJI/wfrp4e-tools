export default async function() {
	let swear = [
		game.wfrp4e.tools.randomArrayElement(game.i18n.translations.WFRP4E.Tools.Macros.Swearing.Tables.A),
		game.wfrp4e.tools.randomArrayElement(game.i18n.translations.WFRP4E.Tools.Macros.Swearing.Tables.B),
		game.wfrp4e.tools.randomArrayElement(game.i18n.translations.WFRP4E.Tools.Macros.Swearing.Tables.C),
	].filter(Boolean).map(s => s.includes("*") ? `<span data-tooltip="${game.i18n.localize("WFRP4E.Tools.Macros.Swearing.Tables.Hint")}" data-tooltip-direction="LEFT" style="text-decoration: underline;">${s}</span>` : `<span>${s}</span>`);
	let speaker;
	if (game.user.character) {speaker = {actor: game.user.character}}
	else {speaker = {alias: `${game.user.name}`}};
	let chatData = { 
		speaker: speaker,
		flavor: game.i18n.localize("WFRP4E.Tools.Macros.Swearing.Flavor"),
		content: `<p><i>${swear.join(" ")}.</i></p>`
	};
	ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
	ChatMessage.create(chatData);
};