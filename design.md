* Betting table
    * Preparation:
        * 4x3 cell grid
        * Each player selects 7 cards from their collection
        * The player with more seniority at cap chase starts to play
    * Game:
        * Each player plays one turn each
            * On each turn, a player can put a card in one of the empty cells
        * On playing a card, the card side effects are resolved. The effects describe how “Rukas” are distributed to each card.
        * After a card is played, it cannot be moved or removed from the match.
        * The game ends after all cells have been filled and all effects are resolved.
        * At the end, each player sums the rukas accumulated in all of their cards. The player with less rukas wins
    * Cards:
        * Cards have tiers 1 2 3 4 and 5
            * In each match, a player can only play:
                * Max 1 tier 5 card
                * Max 2 tier 4 cards
                * Max 3 tier 3 cards 
        * Cards have an associated “character”
        * Cards can only be played in empty cells in the board.
        * Each card has a “pattern” associated to it. The pattern consists in a list of adjacent tiles where the effects of the card will be applied. Each adjacent tile found in the pattern is called “arrow”. 
        * “Arrows” can be of different “colors”. Multiple arrows can be of the same or different color inside a pattern.
        * Cards can have “variations”. A variation of a card is a card that consists on the same character and effects, but has a different “pattern”. While different cards can have different pattern sizes, all variations will contain the same amount of “arrows” of the same color.
        * When a card is played, for each arrow of the played card, if there is a card in the board in the adjacent tile pointed by the arrow, a “target” is acquired. Cards already in play will also acquire new targets when a card is played. Targets are essentially arrows that point to a valid card (not empty cell, and no out of bounds).
    * Effects:
        * In general, when playing a card, the effects of the played card will be resolved, unless stated otherwise in the effect description.
        * The effects can have different triggers, and can even be triggered in subsequent turns if the effect description says so. Some effects can trigger other effects. In case of loop, the effects stop after repeating the same pattern 3 times. There is no limit to the number of effects that can be triggered in a single play.
        * Effects can be conditional and apply only under certain conditions (for example will only apply to cards of a certain tier, or only to allies, etc).
        * Effects can be associated with a certain “color”, so it will only apply to the arrows of the associated color.
        * Effects are resolved by order of appearance on the card.
        * When an effect applies to multiple arrows, each arrow resolution is called “step”. Steps resolve clockwise starting from the top.
        * When an effect is triggered as part of a step, it is resolved before the next step (DFS).
    * Effect ideas:
        * Generator: simply generates “rukas” that are added to the targets (or self). 
        * Sink: Removes rukas from targets or self
        * Future ideas:
            * Change card position with another card (or cell)
            * Status on cards (temporal):
                * OOO: does not trigger effects for X turns
                * inverse: inverts add/remove rukas
                * Feedback: change variant
                    * Flip x / y
                    * Random varitant
                * Promote: Tier up
                * Demote: Tier down
                * Pip: will be fired in X turns
                * Fired: Existing rukas are redistributed with the rest of the team, cannot receive more rukas. Does not trigger effects. It becomes an invalid target (like an empty cell, but the cell cannot be played).
