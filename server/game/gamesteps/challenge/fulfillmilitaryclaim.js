const BaseStep = require('../basestep.js');
const KillCharacterPrompt = require('../killcharacterprompt.js');

class FulfillMilitaryClaim extends BaseStep {
    constructor(game, player, claim) {
        super(game);
        this.player = player;
        this.claim = claim;
    }

    continue() {
        if(this.claim > 0) {
            this.game.queueStep(this.createKillPrompt());
            return false;
        }

        return true;
    }

    createKillPrompt() {
        var events = {
            onKill: () => this.fulfillClaim(),
            onCancel: () => this.cancelClaim()
        };
        return new KillCharacterPrompt(this.game, this.player, card => this.allowedToKill(card), events);
    }

    allowedToKill(card) {
        return card.controller === this.player;
    }

    fulfillClaim() {
        this.claim -= 1;
    }

    cancelClaim() {
        this.claim = 0;
        this.game.addMessage('{0} has cancelled claim effects', this.player);
    }
}

module.exports = FulfillMilitaryClaim;
