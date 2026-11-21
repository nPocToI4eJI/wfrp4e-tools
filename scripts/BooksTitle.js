export default async function() {
	let types = Object.keys(game.i18n.translations.WFRP4E.Tools.BooksTitle.Types);
	let options = `<option value="Random">${game.i18n.localize("WFRP4E.Tools.Macros.BooksTitle.Type.Random")}</option>`;
	for (let i = 0; i < types.length; i++) {options += `<option value="${types[i]}">${game.i18n.localize(`WFRP4E.Tools.BooksTitle.Types.${types[i]}`)}</option>`};
	await new foundry.applications.api.DialogV2({
		window: {title: "WFRP4E.Tools.Macros.BooksTitle.Title"},
		classes: ["wfrp4eTools"],
		content: `
			<div class="booksTitle" style="display: flex; gap: 1rem; height: 4rem; padding: 1rem;">
				<input id="count" type="number" step="1" min="1" value="1" data-tooltip="${game.i18n.localize("WFRP4E.Tools.Macros.BooksTitle.Quantity")}" style="height: auto; margin: 2px; padding: 3px; text-align: center; flex: 1;">
				<select id="type" data-tooltip="${game.i18n.localize("WFRP4E.Tools.Macros.BooksTitle.Type.Title")}" style="height: auto; margin: 2px; padding: 3px; text-align: center; flex: 4;">${options}</select>
			</div>
		`,
		buttons: [
			{
				label: "WFRP4E.Tools.Macros.BooksTitle.Roll",
				icon: "fas fa-dice",
				callback: (button) => {
					let html = button.target.closest("dialog");
					generateItem(html.querySelector("#count").value, html.querySelector("#type").value);
				}
			},
		]
	}).render(true);

	function generateItem(count, type) {
		let books = "";
		for (let i = count; i > 0; i--) {
			if (books != "") {books += "<hr>"};
			books += `<p>${game.wfrp4e.tools.generateBookTitle(type)}</p>`;
		};

		let speaker;
		if (game.user.character) {speaker = {actor: game.user.character}}
		else {speaker = {alias: `${game.user.name}`}};
		let chatData = { 
			speaker: speaker,
			flavor: game.i18n.localize("WFRP4E.Tools.Macros.BooksTitle.Flavor"),
			content: `<div class="wfrp4eTools booksTitleChat">${books}</div>`
		};
		ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
		ChatMessage.create(chatData);
	};
};