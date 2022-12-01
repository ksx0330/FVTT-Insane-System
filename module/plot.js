import { ActorListDialog } from "./dialog/actor-list-dialog.js";
import { PlotDialog } from "./dialog/plot-dialog.js";

export class PlotSettings {
    static initPlot() {
        game.insane = {
            plot: [],
            plotDialogs: []
        }
        
        game.socket.on("system.insane", ({id, sender, receiver, data}) => {
            if (id === "release")
                Hooks.call("releasePlot");
            
            if (game.user.id != receiver)
                return;
                
            if (id === "req") {
                let d = new PlotDialog(data.actorId, data.combatantId, data.name, sender).render(true);
                game.insane.plotDialogs.push(d);

                Hooks.call("setPlotBar", data.actorId, data.combatantId, data.name, sender);
                
            } else if (id === "resp") {
                let plot = game.insane.plot.find(a => (a.actorId === data.actorId && a.combatant === data.combatantId));
                plot.ready = data.ready;
                plot.dice = data.dice;
                
                Hooks.call("checkPlot");
            }
        
        });
        
        Hooks.on("initPlot", (list) => {
            game.insane.plot = [];
            list.forEach( i => game.insane.plot.push({ actorId: i.actorId,  name: i.name, ready: false, combatant: i.combatantId, dice: [] }) );
        });
        
        Hooks.on("spreadPlot", () => {
            let plots = game.insane.plot;
            for (let plot of plots) {
                let share = game.user.id;
                for (let user of game.users)
                    if (user.active && user.character != null && user.character.id === plot.actorId) {
                        share = user.id;
                        break;
                    }

                if (share == game.user.id) {
                    let d = new PlotDialog(plot.actorId, plot.combatant, plot.name, game.user.id).render(true);
                    game.insane.plotDialogs.push(d);

                    Hooks.call("setPlotBar", plot.actorId, plot.combatant, plot.name, game.user.id);
                } else
                    game.socket.emit("system.insane", {id: "req", sender: game.user.id, receiver: share, data: { actorId: plot.actorId, combatantId: plot.combatant, name: plot.name } });
            }
            
        });

        Hooks.on("setPlotBar", (actorId, combatantId, name, sender) => {
            let plotBar = $(document).find(".plot-bar");
            if (plotBar == null)
                return;

            let content = `
                <h2>${name}</h2>
                <button type="button" class="plot-dialog" 
                    data-actor-id="${actorId}" 
                    data-combatant-id="${combatantId}"
                    data-name="${name}"
                    data-sender="${sender}"
                    >PLOT</button>
                `

            let plot = $(`
                <div class="chat-message message flexcol item">
                  <span class="remove-bar"><a class="remove-btn"><i class="fas fa-trash"></i></a></span>
                  ${content}
                </div>`);

            plot.on("click", ".remove-btn", ev => {
                event.preventDefault();
                const target = ev.currentTarget.closest(".chat-message");
                target.remove();
            });

            plotBar.append(plot);
            Hooks.call("updatePlotBar", plot);
        });
        
        Hooks.on("checkPlot", () => {
            for (let plot of game.insane.plot.values())
                if (!plot.ready)
                    return;
                    
            let reveal = async () => {
                Hooks.call("releasePlot");
                game.socket.emit("system.insane", {id: "release"});
                
                let content = `<table><colgroup><col style="width: 30%"><col style="width: 70%"></colgroup>`;
                for (let l of game.insane.plot) {
                    content += `<tr><th>${l.name}</th><td class="dice-lists dice-lists-sm">`;
                    for (let [index, d] of l.dice.entries()) {
                        if (d == "?") {
                            d = new Roll("1d6");
                            await d.roll({async: true});
                            l.dice[index] = d.total;
                            content += `<div class="random">${d.total}</div> `
                        } else
                            content += `<div>${d}</div> `
                    }
                    content += `</td></tr>`;
                }
                content += `</table>`;
                
                let chatData = {"content": content, "speaker": ChatMessage.getSpeaker({ alias: "PLOT" })};
                ChatMessage.create(chatData);
                
                let updates = [];
                for (let l of game.insane.plot) {
                    if (l.combatant != null)
                        updates.push({_id: l.combatant, initiative: (game.actors.get(l.actorId).type == "commoner") ? 0 : l.dice[0]});
                }
                if (updates.length != 0)
                    await game.combat.updateEmbeddedDocuments("Combatant", updates);
            };

            new Dialog({
                title: "Reveal?",
                content: "",
                buttons: {
                    "confirm": {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Confirm",
                        callback: reveal
                    }
                }
            }).render(true);
            
        });
        
        Hooks.on("releasePlot", () => {
           for (let d of game.insane.plotDialogs)
                d.close();
            game.insane.plotDialogs = [];
            $(document).find(".plot-bar").empty();
        });
        
        Hooks.on("getSceneControlButtons", function(controls) {
            controls[0].tools.push({
                name: "setPlot",
                title: game.i18n.localize("INSANE.SetPlot"),
                icon: "fas fa-dice",
                visible: game.user.isGM,
                onClick: () => {
                    var actors = game.data.actors.filter(element => (element.permission['default'] == 3 || element.permission[game.user.id] == 3) );

                    let dialog = new ActorListDialog(actors)
                    dialog.render(true);
                },
                button: true
            });

        });
    }
}
