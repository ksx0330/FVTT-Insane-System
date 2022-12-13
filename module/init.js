/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { InsaneItemSheet } from "./sheet/item-sheet.js";
import { InsaneActorSheet } from "./sheet/actor-sheet.js";
import { InsaneActor } from "./document/actor.js";
import { InsaneSettings } from "./settings.js";
import { PlotCombat } from "./combat.js";
import { PlotSettings } from "./plot.js";
import { PlotDialog } from "./dialog/plot-dialog.js";

import { ActorItemToken } from "./document/token.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
    console.log(`Initializing Simple Insane System`);

    CONFIG.Actor.documentClass = InsaneActor;
    CONFIG.Token.objectClass = ActorItemToken;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("insane", InsaneActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("insane", InsaneItemSheet, {makeDefault: true});

    CONFIG.Combat.documentClass = PlotCombat;
    CONFIG.Combat.initiative.formula = "1d6";
    InsaneSettings.init();
    
    PlotSettings.initPlot();
    
});

Hooks.once("ready", async function() {
    let basedoc = document.getElementsByClassName("vtt game system-insane");
    let hotbar = document.createElement("div");
    hotbar.className = "plot-bar";

    basedoc[0].appendChild(hotbar);
});

Hooks.on("dropCanvasData", async (canvas, data) => {
    if (data.type == "Item") {
        let item = await Item.implementation.fromDropData(data);
        if (item.type != "handout")
            return;

        const hw = canvas.grid.w / 2;
        const hh = canvas.grid.h / 2;
        const pos = canvas.grid.getSnappedPosition(data.x - hw, data.y - hh);

        const token = (await canvas.scene.createEmbeddedDocuments("Token", [{name: item.name, img: item.img, x: pos.x, y: pos.y}], {}))[0];
        await token.setFlag("insane", "uuid", data.uuid);
    }

});

Hooks.on("renderChatLog", (app, html, data) => chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => chatListeners(html));
Hooks.on("updatePlotBar", (html) => chatListeners(html));

Hooks.on("getSceneControlButtons", function(controls) {
    controls[0].tools.push({
        name: "fearRoll",
        title: game.i18n.localize("INSANE.FearRoll"),
        icon: "fas fa-dice-d6",
        visible: game.user.isGM,
        onClick: () => {
            Dialog.prompt({
              title: game.i18n.localize("INSANE.FearRoll"),
              content: `
                <h2>
                  ${game.i18n.localize("INSANE.Talent")}
                </h2>
                <p><input type="text" id="talent" /></p>
              `,
              render: () => $("#talent").focus(),
              callback: async () => {
                const talent = $("#talent").val().trim();
                let context = `
                  <h2>${game.i18n.localize("INSANE.FearRoll")}: ${talent}</h2>
                  <button type="button" class="roll-talent" data-fear="true" data-talent="${talent}">${talent}</button>
                `

                // GM rolls.
                let chatData = {
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker({ alias: "PLOT" }),
                  content: context
                };

                ChatMessage.create(chatData);
              }
            });
        },
        button: true
    });

});

async function chatListeners(html) {
    html.on('click', '.roll-talent', async ev => {
        event.preventDefault();
        const data = ev.currentTarget.dataset;
        const speaker = ChatMessage.getSpeaker();
        let actor = null;
        
        if (speaker.token != null)
            actor = canvas.tokens.objects.children.find(e => e.id == speaker.token).actor;
        else if (speaker.actor != null)
            actor = game.actors.get(speaker.actor);
        else {
            new Dialog({
                title: "alert",
                content: `You must use actor`,
                buttons: {}
            }).render(true);
            return;
        }
        
        let add = true;
        if (!event.ctrlKey && !game.settings.get("insane", "rollAddon"))
          add = false;

        let secret = false;
        if (event.altKey)
          secret = true;

        let fear = (data.fear == "true") ? true : false;
        
        for (var i = 2; i <= 12; ++i)
        for (var j = 0; j < 6; ++j) {
            let name = String.fromCharCode(65 + j);
            let title = game.settings.get("insane", `INSANE.${name}${i}`);
            title = (title !== "") ? title : game.i18n.localize(`INSANE.${name}${i}`);
            
            if (title === data.talent) {
                let num = actor.system.talent.table[j][i - 2].num;
                if (fear)
                    fear = actor.system.talent.table[j][i - 2].fear;
                
                return actor.rollTalent(title, num, add, secret, fear);
            }
        }
        
        new Dialog({
            title: "alert",
            content: `Error ${data.talent}`,
            buttons: {}
        }).render(true);
        return;
    });

    html.on('click', '.roll-dice', async ev => {
        event.preventDefault();
        const data = ev.currentTarget.dataset;
        const actor = game.actors.get(data.actorId);
        const roll = data.roll;
        const insane = data.insane
        let formula = data.formula;


        let add = true;
        if (!event.ctrlKey && !game.settings.get("insane", "rollAddon"))
            add = false;

        let secret = false;
        if (event.altKey)
            secret = true;


        const _onRollDice = async (add) => {
            if (add != null)
                formula += (add < 0) ? `${add}` : `+${add}`;
            if (roll == "damage")
                formula += `+${insane}`;

            let title = (roll == "-") ? formula : game.i18n.localize(`INSANE.Damage`);

            let chatData = {
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                flavor: "<h2><b>" + title + "</b></h2>"
            }

            let r = new Roll(formula);
            await r.roll({async:true});

            r.toMessage(chatData, {
                rollMode: (secret) ? "gmroll" : game.settings.get("core", "rollMode")
            });
        }

        if (add) {
            new Dialog({
                title: "Please put the additional value",
                content: `<p><input type='text' id='add'></p><script>$("#add").focus()</script>`,
                buttons: {
                  confirm: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Confirm",
                    callback: () => _onRollDice($("#add").val())
                  }
                },
                default: "confirm"
            }).render(true);
        } else
            _onRollDice(null);


    });


    html.on('click', '.plot-dialog', async ev => {
        event.preventDefault();
        const data = ev.currentTarget.dataset;

        let d = new PlotDialog(data.actorId, data.combatantId, data.name, data.sender).render(true);
        game.insane.plotDialogs.push(d);

    });
}



