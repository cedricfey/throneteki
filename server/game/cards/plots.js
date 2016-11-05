var _ = require('underscore');

var plots = {};

function hasTrait(card, trait) {
    return card.traits.indexOf(trait + '.') !== -1;
}

// 01001 - A Clash Of Kings
plots['01001'] = {
    register(game, player) {
        this.player = player;
        this.afterChallenge = this.afterChallenge.bind(this);

        game.on('afterChallenge', this.afterChallenge);
    },
    unregister(game) {
        game.removeListener('afterChallenge', this.afterChallenge);
    },
    afterChallenge: function(game, challengeType, winner, loser) {
        if(winner === this.player && challengeType === 'power' && loser.power > 0) {
            loser.power--;
            winner.power++;

            game.addMessage(winner.name + ' uses ' + winner.activePlot.card.label + ' to move 1 power from ' + loser.name + '\'s faction card');
        }
    }
};

// 01002 - A Feats For Crows
plots['01002'] = {
    register(game, player) {
        this.player = player;
        this.afterDominance = this.afterDominance.bind(this);

        game.on('afterDominance', this.afterDominance);
    },
    unregister(game) {
        game.removeListener('afterDominance', this.afterDominance);
    },
    afterDominance: function(game, winner) {
        if(winner !== this.player) {
            return;
        }

        winner.power += 2;

        game.addMessage(winner.name + ' uses ' + winner.activePlot.card.label + ' to gain 2 power');
    }
};

// 01003 - A Game Of Thrones
plots['01003'] = {
    register(game, player) {
        this.player = player;
        this.beforeChallenge = this.beforeChallenge.bind(this);

        game.on('beforeChallenge', this.beforeChallenge);
    },
    unregister(game) {
        game.removeListener('beforeChallenge', this.beforeChallenge);
    },
    beforeChallenge: function(game, player, challengeType) {
        if((challengeType === 'power' || challengeType === 'military') && player.challenges['intrigue'].won <= 0) {
            game.cancelChallenge = true;
        }
    }
};

// 01004 - A Noble Cause
plots['01004'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);
        this.beforeCardPlayed = this.beforeCardPlayed.bind(this);

        game.on('plotRevealed', this.revealed);
        game.on('beforeCardPlayed', this.beforeCardPlayed);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
        game.removeListener('beforeCardPlayed', this.beforeCardPlayed);
    },
    revealed: function(game, player) {
        if(player !== this.player) {
            return;
        }

        this.abilityUsed = false;
    },
    beforeCardPlayed: function(game, player, card) {
        if(player !== this.player) {
            return;
        }

        if(!this.abilityUsed && (hasTrait(card, 'Lord') || hasTrait(card, 'Lady')) && card.cost > 0) {
            this.card = card;
            card.cost -= 2;
            this.cost = card.cost;

            if(card.cost < 0) {
                card.cost = 0;
            }

            this.abilityUsed = true;

            game.addMessage(player.name + ' uses ' + player.activePlot.card.label + ' to reduce the cost of ' + card.label + ' by 2');
        }
    },
    afterCardPlayed: function(game, player, card) {
        if(this.card !== card) {
            return;
        }

        card.cost = this.cost;
    }
};

// 01005 - A Storm Of Swords
plots['01005'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);

        game.on('plotRevealed', this.revealed);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
    },
    revealed(game, player) {
        if(player !== this.player) {
            return;
        }

        player.challenges['military'].max++;

        game.addMessage(player.name + ' uses ' + player.activePlot.card.label + ' to gain an additional military challenge this round');
    }
};

// 01006 - Building Orders
plots['01006'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);
        this.cardSelected = this.cardSelected.bind(this);

        game.on('plotRevealed', this.revealed);
        game.on('customCommand', this.cardSelected);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
        game.removeListener('customCommand', this.cardSelected);
    },
    revealed(game, player) {
        if(this.player !== player) {
            return;
        }

        var top10 = _.first(player.drawDeck, 10);
        var attachmentsAndLocations = _.reject(top10, card => {
            return card.type_code !== 'attachment' && card.type_code !== 'location';
        });

        var buttons = _.map(attachmentsAndLocations, card => {
            return { text: card.label, command: 'custom', arg: card.code };
        });

        buttons.push({ text: 'Done', command: 'custom', arg: 'done' });

        player.buttons = buttons;
        player.menuTitle = 'Select a card to add to your hand';

        game.pauseForPlot = true;
    },
    cardSelected(game, player, arg) {
        if(this.player !== player) {
            return;
        }

        if(arg === 'done') {
            game.revealDone(player);
        }

        var card = _.find(player.drawDeck, c => {
            return c.code === arg;
        });

        if(!card) {
            return;
        }

        player.drawDeck = _.reject(player.drawDeck, c => {
            return c.code === card.code;
        });

        player.hand.push(card);
        player.shuffleDrawDeck();

        game.addMessage(player.name + ' uses ' + player.activePlot.card.label + ' to reveal ' + card.label + ' and add it to their hand');

        game.revealDone(player);
    }
};

// 01007 - Calling The Banners
plots['01007'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);

        game.on('plotRevealed', this.revealed);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
    },
    revealed(game, player) {
        if(this.player !== player) {
            return;
        }

        var otherPlayer = _.find(game.players, p => {
            return p.id !== player.id;
        });

        if(!otherPlayer) {
            return;
        }

        var characterCount = _.reduce(otherPlayer.cardsInPlay, (memo, card) => {
            var count = memo;

            if(card.card.type_code === 'character') {
                count++;
            }

            return count;
        }, 0);

        game.addMessage(player.name + ' uses ' + player.activePlot.card.label + ' to gain ' + characterCount + ' gold');
        player.gold += characterCount;
    }
};

// 01008 - Calm Over Westeros
plots['01008'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);
        this.challengeTypeSelected = this.challengeTypeSelected.bind(this);
        this.beforeClaim = this.beforeClaim.bind(this);
        this.afterClaim = this.afterClaim.bind(this);

        game.on('plotRevealed', this.revealed);
        game.on('customCommand', this.challengeTypeSelected);
        game.on('beforeClaim', this.beforeClaim);
        game.on('afterClaim', this.afterClaim);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
        game.removeListener('customCommand', this.challengeTypeSelected);
        game.removeListener('beforeClaim', this.beforeClaim);
        game.removeListener('afterClaim', this.afterClaim);
    },
    revealed: function(game, player) {
        if(player !== this.player) {
            return;
        }

        player.menuTitle = 'Select a challenge type';
        player.buttons = [
            { text: 'Military', command: 'custom', arg: 'military' },
            { text: 'Intrigue', command: 'custom', arg: 'intrigue' },
            { text: 'Power', command: 'custom', arg: 'power' }
        ];

        game.pauseForPlot = true;
    },
    challengeTypeSelected: function(game, player, arg) {
        if(player !== this.player) {
            return;
        }

        this.challengeType = arg;

        game.revealDone(player);
    },
    beforeClaim: function(game, challengeType, winner, loser) {
        if(winner === this.player) {
            return;
        }

        if(challengeType !== this.challengeType) {
            return;
        }

        this.claim = winner.activePlot.card.claim;
        winner.activePlot.card.claim--;

        game.addMessage(loser.name + ' uses ' + loser.activePlot.card.label + ' to reduce the claim value of ' +
            winner.name + '\'s ' + challengeType + 'challenge to ' + winner.activePlot.card.claim);
    },
    afterClaim: function(game, challengeType, winner) {
        if(winner === this.player) {
            return;
        }

        if(challengeType !== this.challengeType) {
            return;
        }

        winner.activePlot.card.claim = this.claim;
    }
};

// 01009 - Confiscation
plots['01009'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);
        this.cardClicked = this.cardClicked.bind(this);

        game.on('plotRevealed', this.revealed);
        game.on('cardClicked', this.cardClicked);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
        game.removeListener('cardClicked', this.cardClicked);
    },
    revealed: function(game, player) {
        if(player !== this.player) {
            return;
        }

        if(!_.any(game.players, p => {
            return _.any(p.cardsInPlay, card => {
                return card.attachments.length > 0;
            });
        })) {
            return;
        }

        player.menuTitle = 'Select attachment to discard';
        player.buttons = [];

        player.selectCard = true;
        game.pauseForPlot = true;
    },

    cardClicked: function(game, player, clicked) {
        if(player !== this.player) {
            return;
        }

        if(clicked.type_code !== 'attachment') {
            return;
        }

        var attachmentPlayer = player;

        var card = _.find(player.cardsInPlay, c => {
            var attachment = _.find(c.attachments, a => {
                return a.code === clicked.code;
            });

            return !!attachment;
        });

        if(!card) {
            var otherPlayer = _.find(game.players, p => {
                return p.id !== player.id;
            });
            card = _.find(otherPlayer.cardsInPlay, c => {
                var attachment = _.find(c.attachments, a => {
                    return a.code === clicked.code;
                });

                return !!attachment;
            });

            if(!card) {
                game.revealDone(player);

                return;
            }

            attachmentPlayer = otherPlayer;
        }

        card.attachments = _.reject(card.attachments, a => {
            return a.code === clicked.code;
        });

        attachmentPlayer.discardPile.push(clicked);

        game.addMessage(player.name + ' uses ' + player.activePlot.card.label + ' to discard ' + clicked.label);

        player.selectCard = false;
        game.clickHandled = true;

        game.revealDone(player);
    }
};

// 01010 - Counting coppers
plots['01010'] = {
    register: function(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);

        game.on('plotRevealed', this.revealed);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
    },
    revealed: function(game, player) {
        if(player !== this.player) {
            return;
        }

        player.drawCardsToHand(3);

        game.addMessage(player.name + ' draws 3 cards from ' + player.activePlot.card.label);
    }
};

// 01011 - Filthy Accusations
plots['01011'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);
        this.cardClicked = this.cardClicked.bind(this);

        game.on('plotRevealed', this.revealed);
        game.on('cardClicked', this.cardClicked);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
    },
    revealed(game, player) {
        if(this.player !== player) {
            return;
        }

        player.menuTitle = 'Select character to kneel';
        player.buttons = [];
        player.selectCard = true;

        game.pauseForPlot = true;

        this.waitingForClick = true;
    },
    cardClicked: function(game, player, clicked) {
        if(this.player !== player || !this.waitingForClick) {
            return;
        }

        this.waitingForClick = false;
        player.selectCard = false;

        var card = _.find(player.cardsInPlay, c => {
            return c.card.code === clicked.code;
        });

        var targetPlayer = player;

        if(!card) {
            var otherPlayer = _.find(game.players, p => {
                return p.id !== player.id;
            });

            if(!otherPlayer) {
                game.revealDone(player);

                return;                
            }

            card = _.find(otherPlayer.cardsInPlay, c => {
                return c.card.code === clicked.code;
            });

            if(!card) {
                game.revealDone(player);

                return;
            }

            targetPlayer = otherPlayer;
        }

        if(card.card.type_code !== 'character' || card.kneeled) {
            game.revealDone(player);
            return;
        }

        card.kneeled = true;

        game.addMessage(player.name + ' uses ' + player.activePlot.card.label + ' to kneel ' + card.card.label);

        game.revealDone(player);
    }
};

// 01021 - Sneak Attack
plots['01021'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);

        game.on('plotRevealed', this.revealed);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
    },
    revealed: function(game, player) {
        if(player !== this.player) {
            return;
        }

        player.challenges.maxTotal = 1;

        game.addMessage(player.name + ' uses ' + player.activePlot.card.label +
            ' to make the maximum number of challenges able to be initiated by ' + player.name + ' this round be 1');
    }
};

// 02039 - Trading with the Pentoshi
plots['02039'] = {
    register(game, player) {
        this.player = player;
        this.revealed = this.revealed.bind(this);

        game.on('plotRevealed', this.revealed);
    },
    unregister(game) {
        game.removeListener('plotRevealed', this.revealed);
    },
    revealed: function(game, player) {
        if(player !== this.player) {
            return;
        }

        var otherPlayer = _.find(game.players, p => {
            return p.id !== player.id;
        });

        if(otherPlayer) {
            otherPlayer.gold += 3;

            game.addMessage(otherPlayer.name + ' gains 3 gold from ' + player.activePlot.card.label);
        }
    }
};

module.exports = plots;