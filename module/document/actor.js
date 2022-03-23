
export class InsaneActor extends Actor {

  prepareData() {
    super.prepareData();

  }

  /** @override */
  async _preUpdate(data, options, userId) {
    if ('talent' in data.data) {
      let table = JSON.parse(JSON.stringify(this.data.data.talent.table));
      let gap = JSON.parse(JSON.stringify(this.data.data.talent.gap));

      if ('table' in data.data.talent) {
        let i = Object.keys(data.data.talent.table)[0];
        let j = Object.keys(data.data.talent.table[i])[0];
        let key = Object.keys(data.data.talent.table[i][j])[0];

        table[i][j][key] = data.data.talent.table[i][j][key];
      }

      if ('gap' in data.data.talent) {
        let i = Object.keys(data.data.talent.gap)[0];

        gap[i] = data.data.talent.gap[i];
      }

      data.data.talent.table = this._getTalentTable(table, gap);
    }

    super._preUpdate(data, options, userId);
  }

  _getTalentTable(table, gap) {
    let nodes = [];
    
    for (var i = 0; i < 6; ++i)
    for (var j = 0; j < 11; ++j) {
      if (table[i][j].state == true) {
        nodes.push({x: i, y: j});
        table[i][j].num = "5";
      } else
        table[i][j].num = "12";
    }

    let dx = [0, 0, 1, -1];
    let dy = [1, -1, 0, 0];
    let move = [1, 1, 2, 2];
    for (var i = 0; i < nodes.length; ++i) {
      let queue = [nodes[i]];

      while (queue.length != 0) {
        let now = queue[0];
        queue.shift();
        
        if (+table[now.x][now.y].num == 12)
          continue;

        for (var d = 0; d < 4; ++d) {
          var nx = now.x + dx[d];
          var ny = now.y + dy[d];
          var m = move[d];
          
          if (nx < 0 || nx >= 6 || ny < 0 || ny >= 11)
            continue;

          let g = ( (now.x == 0 && nx == 5) || (now.x == 5 && nx == 0) ) ? gap[0] : gap[(nx > now.x) ? nx : now.x];
          if (m == 2 && g)
            m = 1;

          if (Number(table[nx][ny].num) > Number(table[now.x][now.y].num) + m) {
            table[nx][ny].num = String(Number(table[now.x][now.y].num) + m);
            queue.push({x: nx, y: ny});
          }
        }
      }
    }

    return table;
  }


  async rollTalent(title, num, add, secret, fear = false) {
    if (!add) {
      this._onRollDice(title, null, num, secret, fear); 
      return;
    }
    
    new Dialog({
        title: "Please put the additional value",
        content: `<p><input type='text' id='add'></p><script>$("#add").focus()</script>`,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: () => this._onRollDice(title, $("#add").val(), num, secret, fear)
          }
        },
        default: "confirm"
    }).render(true);
    
  }

  async _onRollDice(title, add, num, secret, fear = false) {
    
    // GM rolls.
    let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: "<h2><b>" + title + "</b></h2>"
    };

    let rollMode = (secret) ? "gmroll" : game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    let formula = "2d6";
    if (add != null)
      formula += (add < 0) ? `${add}` : `+${add}`;
    if (fear)
      formula += "-2";
    let roll = new Roll(formula);
    await roll.roll();
    let d = roll.terms[0].total;
    
    chatData.content = await renderTemplate("systems/insane/templates/roll.html", {
        formula: roll.formula,
        flavor: null,
        user: game.user.id,
        tooltip: await roll.getTooltip(),
        total: Math.round(roll.total * 100) / 100,
        special: d == 12,
        fumble: d == 2,
        num: num
    });

    if (game.dice3d) {
        game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind).then(displayed => ChatMessage.create(chatData));;
    } else {
        chatData.sound = CONFIG.sounds.dice;
        ChatMessage.create(chatData);
    }
  }



  _echoItemDescription(itemId) {
    const item = this.items.get(itemId);

    let title = item.data.name;
    let description = item.data.data.description;

    if (item.data.type == 'ability') {
      if (item.data.img != 'icons/svg/item-bag.svg')
        title = `<img src="${item.data.img}" width="40" height="40">&nbsp&nbsp<b>${title}</b>` 

      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("INSANE.Type")}</th>
                        <th>${game.i18n.localize("INSANE.Talent")}</th>
                      </tr>

                      <tr>
                        <td>${item.data.data.type}</td>
                        <td>${item.data.data.talent}</td>
                      </tr>
                    </table>${description}
                    <button type="button" class="roll-talent" data-talent="${item.data.data.talent}">${item.data.data.talent}</button>`

    }

    else if (item.data.type == 'bond') {
      if (item.data.img != 'icons/svg/item-bag.svg')
        title = `<img src="${item.data.img}" width="40" height="40">&nbsp&nbsp<b>${title}</b>` 

      description = `<table style="text-align: center;">
                      <tr>
                        <th>${game.i18n.localize("INSANE.Residence")}</th>
                        <th>${game.i18n.localize("INSANE.Secret")}</th>
                        <th>${game.i18n.localize("INSANE.Feeling")}</th>
                      </tr>

                      <tr>
                        <td>${(item.data.data.residence) ? "O" : "X"}</td>
                        <td>${(item.data.data.secret) ? "O" : "X"}</td>
                        <td>${item.data.data.feeling}</td>
                      </tr>
                    </table>${description}`
    }
    
    else if (item.data.type == "item") {
      if (item.data.img != 'icons/svg/item-bag.svg')
        title = `<img src="${item.data.img}" width="40" height="40">&nbsp&nbsp<b>${title}</b>` 
    }
    
    // GM rolls.
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: "<h2>" + title + "</h2>" + description
    };

    ChatMessage.create(chatData);

  }

}
