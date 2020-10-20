FVTT Insane System
-------------------
Multi Genre Horror TRPG Insane


Installation Instructions
-------------
To install the Insane system for Foundry Virtual Tabletop, simply paste the following URL into the Install System
dialog on the Setup menu of the application.

https://raw.githubusercontent.com/ksx0330/FVTT-Insane-System/main/system.json


Recommanded Modules
-------------------
1. Card supports
2. Secret Journal


Card Support Macro
-------------------
View Other Player's Card.
GM can view all card.
Players can view marked card.

```

var width = 150;
var height = 200;

Hooks.on('updateUser', function() {
    if (game.showCardDialog._state != -1)
        game.showCardDialog.render(true);
})


Hooks.on('updateMacro', function() {
    if (game.showCardDialog._state != -1)
        game.showCardDialog.render(true);
})



class CardDialog extends Dialog {
    constructor(options) {
        super(options);

        this.data = {
            title: "Player's Card List",
            content: "",
            buttons: {}
        };
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 800
        });
    }

    /** @override */
    getData() {
        var users = game.data.users;
        var userCards = [];

        for (let user of users) {
            var cards = [];

            if (user.flags.cardsupport != undefined) {
                var macros = user.flags.cardsupport.chbMacroMap;
                for (var i = 1; i < macros.length; ++i) {
                    var macro = game.macros.get(macros[i]);
                    cards.push({ id: macro.id, marked: macro.data.flags.world.marked, back: macro.data.flags.world.cardBack, img: macro.data.img });
                }
            }
            userCards.push({ user: user.name, cards: cards });
        }

        return {
            content: this.getContent(userCards),
            buttons: {}
        }
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.card-macro').on('mousedown', this._macroExcute.bind(this));
        
    }

    getContent(userCards) {
        var content = "<div>";

        for (let user of userCards) {
            content += "<h2>" + user.user + "</h2><div>";

            for (let card of user.cards) {
                content += '<div class="card-macro"  data-id="' + card.id + '" data-marked="' + card.marked + '" style="width: ' + width + 'px; height: ' + height + 'px; display: inline-block; position: relative;">';

                if (game.user.isGM || card.marked == 1) {
                    content += '<img width="' + width + '" height="' + height + '" src="' + card.img + '">';

                    if (game.user.isGM && card.marked == 1)
                        content += '<div style="position: absolute;top: 0;left: 0;height: 100%;width: 100%;background-color: #ff000080;"></div>'
                } else
                    content += '<img class="card-macro" data-id="' + card.id + '" width="' + width + '" height="' + height + '" src="' + card.back + '">';
                content += '</div> &nbsp &nbsp'
            }
            content += "</div>";
        }

        content += "</div>";
        return content;
    }

    _macroExcute(event) {
        var target = $(event.currentTarget)[0].dataset;
        if (game.user.isGM || target.marked == 1)
            game.macros.get(target.id).execute();
    }

}

game.showCardDialog = new CardDialog();
game.showCardDialog.render(true);
```
