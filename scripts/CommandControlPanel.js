export default async function() {
	//Создание массива с данными игроков.
	let users = [];
	game.users.filter(u => u.character).forEach(u => users.push({
		character: u.character,
		id: u.id,
		color: {
			value: u.color.css,
			border: u.border.css
		}
	}));
	//Создание массива с персонажами, владельцами которых являются игроки.
	let actors = [];
	users.map(u => ({character: u.character, color: u.color})).forEach(a => actors.push({character: a.character, type: "character", color: a.color}));
	game.actors.filter(a => {
		if (a.type == "character" && !users.map(u => u.character).includes(a)) {
			for (let i in a.ownership) {
				if (a.ownership[i] == 3 && users.map(u => u.id).includes(i)) {return true};
			};
		};
	}).forEach(a => actors.push({character: a, type: "henchmen"}));
	//Создание окна панели выдачи
	await new foundry.applications.api.DialogV2({
		window: {title: "WFRP4E.Tools.Macros.CommandControlPanel.Title"},
		classes: ["wfrp4eTools"],
		content: `<div class="commandControlPanel">
			<div id="settings">
				<div class="actors">
					${actors.map(a => "<label style='" + (a.color ? ("--color: " + a.color.value + "; --border: " + a.color.border) : "--color: goldenrod; --border: darkgoldenrod") + ";'>" + a.character.name + "<input hidden type='checkbox' data-id='" + a.character.id + "'" + (a.type == "henchmen" ? " data-type='henchmen'" : "") + "></label>").join("")}
				</div>
				<select id="action" style="text-align: center;" data-tooltip="${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Action.Title")}">
					<option hidden disabled selected id="none" value="none">${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Action.Title")}</option>
					<option id="credit" value="credit">${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Action.Credit")}</option>
					<option id="pay" value="pay">${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Action.Pay")}</option>
					<option id="exp" value="exp">${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Action.Exp")}</option>
					<option id="fortune" value="fortune" title="${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Homebrew")}">${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Action.Fortune")}</option>
				</select>
			</div>
			<hr>
			<div id="money">
				<div data-tooltip="${game.i18n.localize('NAME.BP')}">
					<input id="bp" type="string" step="1" min="0" value="0">
					<img src="modules/wfrp4e-core/icons/currency/brasspenny.png">
				</div>
				<div data-tooltip="${game.i18n.localize('NAME.SS')}">
					<input id="ss" type="string" step="1" min="0" value="0">
					<img src="modules/wfrp4e-core/icons/currency/silvershilling.png">
				</div>
				<div data-tooltip="${game.i18n.localize('NAME.GC')}">
					<input id="gc" type="string" step="1" min="0" value="0">
					<img src="modules/wfrp4e-core/icons/currency/goldcrown.png">
				</div>
			</div>
			<div id="exp" data-tooltip="${game.i18n.localize('Experience')}">
				<input id="henchmen" type="checkbox" checked data-tooltip="${game.i18n.localize("WFRP4E.Tools.Macros.CommandControlPanel.Experience")}">
				<input id="count" type="string" step="1" value="0">
				<input id="reason" placeholder="${game.i18n.localize('Reason')}">
			</div>
			<p id="fortune">${game.i18n.format("WFRP4E.Tools.Macros.CommandControlPanel.Fortune", {img: `<img src="modules/wfrp4e-core/icons/currency/goldcrown.png" style="display: inline-block; height: 14px;" data-tooltip="${game.i18n.localize('NAME.GC')}">`})}</p>
		</div>`,
		buttons: [
			{
				label: "WFRP4E.Tools.Macros.CommandControlPanel.Button",
				icon: "fas fa-check",
				callback: (button) => {
					//Базовый элемент
					let element = button.target.closest("dialog");
					//Определение целевых персонажей
					let targets = [];
					element.querySelectorAll("div.actors label > input:checked").forEach(i => {targets.push({id: i.dataset?.id, type: i.dataset?.type || false})});
					resolveAction(targets, element.querySelector("#action").value, {
						money: {
							bp: element.querySelector("div#money #bp").value,
							ss: element.querySelector("div#money #ss").value,
							gc: element.querySelector("div#money #gc").value
						},
						exp: {
							amount: element.querySelector("div#exp #count").value,
							henchmen: element.querySelector("div#exp #henchmen").checked,
							reason: element.querySelector("div#exp #reason").value
						}
					});
				}
			},
		]
	}).render(true);

	async function resolveAction(targets, action, data={}) {
		targets.forEach(t => {
			switch (action) {
				//Выдать деньги
				case "credit": {
					let value = data.money.bp + game.i18n.localize('MARKET.Abbrev.BP') + data.money.ss + game.i18n.localize('MARKET.Abbrev.SS') + data.money.gc + game.i18n.localize('MARKET.Abbrev.GC');
					let money = game.wfrp4e.market.creditCommand(game.wfrp4e.market.amountToString(game.wfrp4e.market.parseMoneyTransactionString(value)), game.actors.get(t.id));
					if (money) {game.actors.get(t.id).updateEmbeddedDocuments("Item", money)};
					break;
				};
				//Забрать деньги
				case "pay": {
					let value = data.money.bp + game.i18n.localize('MARKET.Abbrev.BP') + data.money.ss + game.i18n.localize('MARKET.Abbrev.SS') + data.money.gc + game.i18n.localize('MARKET.Abbrev.GC');
					let money = game.wfrp4e.market.payCommand(game.wfrp4e.market.amountToString(game.wfrp4e.market.parseMoneyTransactionString(value)), game.actors.get(t.id));
					if (money) {game.actors.get(t.id).updateEmbeddedDocuments("Item", money)};
					break;
				};
				//Изменить опыт
				case "exp": {
					let amount = data.exp.amount;
					if (data.exp.henchmen && t.type == "henchmen") {
						amount = Math.round(amount / 2 / 5) * 5;
					};
					game.actors.get(t.id).system.awardExp(parseInt(amount), data.exp.reason);
					break;
				};
				//Монета на удачу
				case "fortune": {
					let value = 1 + game.i18n.localize('MARKET.Abbrev.GC');
					let money = game.wfrp4e.market.payCommand(game.wfrp4e.market.amountToString(game.wfrp4e.market.parseMoneyTransactionString(value)), game.actors.get(t.id), {suppressMessage: true});
					if (money) {
						game.actors.get(t.id).updateEmbeddedDocuments("Item", money);
						game.actors.get(t.id).update({"system.status.fortune.value": game.actors.get(t.id).system.status.fortune.value + 1});
					};
					break;
				};
			};
		});
	};
};