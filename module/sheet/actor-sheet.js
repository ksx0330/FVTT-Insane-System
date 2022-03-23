/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class InsaneActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["insane", "sheet", "actor"],
      width: 850,
      height: 830,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skill"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/insane/templates/actor";
    return `${path}/${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    let isOwner = false;
    let isEditable = this.isEditable;
    let data = super.getData(options);
    let items = {};
    let actorData = {};

    isOwner = this.document.isOwner;
    isEditable = this.isEditable;
    
    data.lang = game.i18n.lang;
    data.userId = game.user.id

    // The Actor's data
    actorData = this.actor.data.toObject(false);
    data.actor = actorData;
    data.data = actorData.data;
    data.data.isOwner = isOwner;

    // Owned Items
    data.items = Array.from(this.actor.items.values());
    data.items = data.items.map( i => {
      i.data.id = i.id;
      return i.data;
    });

    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    
    data.dtypes = ["String", "Number", "Boolean"];
    data.isGM = game.user.isGM;

    data.data.tables = [];
    for (var i = 2; i <= 12; ++i) {
        data.data.tables.push({line: [], number: i});
        for (var j = 0; j < 6; ++j) {
            var name = String.fromCharCode(65 + j);
            data.data.tables[i - 2].line.push({ id: `col-${j}-${i-2}`, title: `INSANE.${name}${i}`, name: `data.talent.table.${j}.${i - 2}`, state: data.data.talent.table[j][i - 2].state, num: data.data.talent.table[j][i - 2].num, fear: data.data.talent.table[j][i - 2].fear });
        }
    }

    actorData.abilityList = [];
    actorData.bondList = [];
    actorData.itemList = [];
    actorData.handoutList = [];

    for (let i of data.items) {
        if (i.type === 'ability')
            actorData.abilityList.push(i);
        else if (i.type == 'bond')
            actorData.bondList.push(i);
        else if (i.type == 'item')
            actorData.itemList.push(i);
        else if (i.type == 'handout')
            actorData.handoutList.push(i);
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Talent
    html.find('.item-label').click(this._showItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find(".talent-name").on('mousedown', this._onRouteTalent.bind(this));

    // Owned Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let item = this.actor.items.get(li.data("itemId"));
      item.delete();
    });

    // Use Item
    html.find(".use-item").click(this._useItem.bind(this));
    html.find('.quantity-change').click(this._changeItemQuantity.bind(this));

    html.find(".evasion-roll").click(this._evationDialog.bind(this));

    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });

    }

  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height;
    sheetBody.css("height", bodyHeight - 300);
    return position;
  }

  /* -------------------------------------------- */

  async _onRouteTalent(event) {
    if (event.button == 2 || event.which == 3)
      this._setFearTalent(event);
    else
      this._onRollTalent(event);
  }
  
  async _setFearTalent(event) {
    event.preventDefault();
    let table = duplicate(this.actor.data.data.talent.table);
    
    let dataset = event.currentTarget.dataset;
    let id = dataset.id.split("-");
    
    table[id[1]][id[2]].fear = !table[id[1]][id[2]].fear;
    await this.actor.update({"data.talent.table": table});
  }
  
  async _onRollTalent(event) {
    event.preventDefault();
    let dataset = event.currentTarget.dataset;
    let num = dataset.num;
    let title = dataset.title;
    let add = true;
    let secret = false;
  
    if (!event.ctrlKey && !game.settings.get("insane", "rollAddon"))
      add = false;

    if (event.altKey)
      secret = true;
    
    await this.actor.rollTalent(title, num, add, secret);
  }

  /* -------------------------------------------- */
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;

    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type
    };
    await this.actor.createEmbeddedDocuments('Item', [itemData], {});
  }

  _showItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  _echoItemDescription(event) {
    event.preventDefault();
    const li = $(event.currentTarget).parents('.item');

    this.actor._echoItemDescription(li[0].dataset.itemId);
  }

  async _useItem(event) {
    event.preventDefault();
    const useButton = $(event.currentTarget);
    const item = this.actor.items.get(useButton.parents('.item')[0].dataset.itemId);

    if (item.data.data.quantity > 0) {
      await item.update({'data.quantity': item.data.data.quantity - 1});
  
      // GM rolls.
      let chatData = {
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: "<h2>" + game.i18n.localize("INSANE.UseItem") + ": " + item.data.name + "</h2>" + item.data.data.description
      };
  
      ChatMessage.create(chatData);

    }
  }

  async _changeItemQuantity(event) {
    event.preventDefault();

    const chargeButton = $(event.currentTarget);
    const item = this.actor.items.get(chargeButton.parents('.item')[0].dataset.itemId);

    let add = Number(event.currentTarget.dataset.add);
    let num = Number(item.data.data.quantity);

    if (num + add < 0)
      return;

    await item.update({"data.quantity": num + add});

    add = (add > 0) ? "+" + add : add

    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: "<h3>" + item.data.name + ": " + add + "</h3>"
    };

    ChatMessage.create(chatData);
  }

  async _evationDialog(event) {
    event.preventDefault();

    if (!this.actor.isToken) {
      new Dialog({
          title: "Alert",
          content: game.i18n.localize("INSANE.NotToken"),
          buttons: {}
      }).render(true);
      return;
    }

    if (!this.actor.token.inCombat) {
      new Dialog({
          title: "Alert",
          content: game.i18n.localize("INSANE.NotCombat"),
          buttons: {}
      }).render(true);
      return;
    }

    if (this.actor.token.combatant.data.initiative == null) {
      new Dialog({
          title: "Alert",
          content: game.i18n.localize("INSANE.NonInit"),
          buttons: {}
      }).render(true);
      return;
    }

    Dialog.prompt({
      title: game.i18n.localize("INSANE.Evasion"),
      content: `
        <h2>
          ${game.i18n.localize("INSANE.Fear")} 
          <input id='fear' type="checkbox" style="float: right" /> 
        </h2>
        
      `,
      render: () => $("#fear").focus(),
      callback: async () => {
        const fear = $("#fear").is(":checked");

        let num = this.actor.token.combatant.data.initiative + 4;
        let secret = false;

        let title = game.i18n.localize("INSANE.Evasion");
        let add = true;
      
        if (!event.ctrlKey && !game.settings.get("insane", "rollAddon"))
          add = false;

        if (event.altKey)
          secret = true;
        
        await this.actor.rollTalent(title, num, add, secret, fear);

      }
    });



  } 


}