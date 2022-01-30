/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { InsaneItemSheet } from "./sheet/item-sheet.js";
import { InsaneActorSheet } from "./sheet/actor-sheet.js";
import { SecretJournalSheet } from "./secret-journal.js";
import { InsaneSettings } from "./settings.js";
import { PlotCombat } from "./combat.js";
import { PlotSettings } from "./plot.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
    console.log(`Initializing Simple Insane System`);

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("insane", InsaneActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("insane", InsaneItemSheet, {makeDefault: true});
    
    CONFIG.JournalEntry.sheetClass = SecretJournalSheet;
    InsaneSettings.init();

    CONFIG.Combat.documentClass = PlotCombat;
    CONFIG.Combat.initiative.formula = "1d6";
    
    PlotSettings.initPlot();
});



