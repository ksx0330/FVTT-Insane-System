import { TalentTableForm } from "./talent-table.js";

export class InsaneSettings {
	static init() {
		game.settings.registerMenu("insane", "talentTable", {
			name: "SETTINGS.TalentTable",
			label: "SETTINGS.TalentTable",
			hint: "SETTINGS.TalentTableDesc",
			icon: "fas fa-bars",
			type: TalentTableForm,
			restricted: true
		});
		
		for (var i = 1; i <= 12; i++)
        for (var j = 0; j < 6; ++j) {			
            var name = String.fromCharCode(65 + j);
			game.settings.register("insane", `INSANE.${name}${i}`, {
				scope: 'world',
				config: false,
				type: String,
				default: ""
			});
        }
        
        
		Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
			return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
		});

		Handlebars.registerHelper('ifOrEquals', function(arg1, arg2, arg3, arg4, options) {
			return (arg1 == arg2 || arg3 == arg4) ? options.fn(this) : options.inverse(this);
		});

		Handlebars.registerHelper('ifSuccess', function(arg1, arg2, options) {
			return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
		});
		
		Handlebars.registerHelper('localTalent', function(arg1, options) {
			let title = game.settings.get("insane", arg1);
			return (title !== "") ? title : game.i18n.localize(arg1);
		});
	}
	

	
}
