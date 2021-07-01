/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { InsaneItemSheet } from "./item-sheet.js";
import { InsaneActorSheet } from "./actor-sheet.js";
import { SecretJournalSheet } from "./secret-journal.js";

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

    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
        return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifOrEquals', function(arg1, arg2, arg3, arg4, options) {
        return (arg1 == arg2 || arg3 == arg4) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifSuccess', function(arg1, arg2, options) {
        return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
    });
});



