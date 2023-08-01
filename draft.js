var ds = require('./draftStrategy');

//DRAFT class
class Draft {
    constructor(size=12, rounds=10, available=[], strategies=[] /* TODO: figure out the rest of the arguments*/) {
        //general info about draft
        this.size = size;
        this.cpus = strategies.filter(x => x != null).length;

        // team objects for each slot
        this.teams = initializeTeams(strategies);

        // info to keep draft running smooth
        this.currentTeam = 0;
        this.round = 1; //might add a way to initialize a draft not from the beginning, this will need to change
        this.totalRounds = rounds;

        // set of all undrafted players
        // (do i also want to maintain a set of all players?)
        // its prolly fine cuz one could be constructed from all rosters + available
        this.available = available;
    }

    /**
     * Returns the team that will make the next selection.
     * Useful for determining if the team is a bot or human.
     */
    nextUp() {
        return this.teams[this.currentTeam];
    }

    makeSelection() {

        let team = this.teams[this.currentTeam];
        
        // use teams draft strategy to make selection (if team has a draft strategy)
        let selection = team.draft(this.available);

        //remove selected player from list of available players
        this.available = this.available.filter( player => player.id !== selection.id);

        
        // adjust round and current team as needed
        if (endOfRound(this)) {
            // round over, current team stays same but round increments
            this.round++;
        } else {
            // round not over, change current team
            this.currentTeam += this.round % 2 == 1 ? 1 : -1
        }
    }
}

//draft helper methods
/*
the content of the strategies array may need to change depending on how much
customization I want to add to the strategy selections, but for now
well just consider it a string that specifies a specific strategy
TODO: somewhere along the way, add the ability to just pick random strategies for all teams
*/
const initializeTeams = (strategies=[]) => {
    let teams = [];
    for (let i = 0; i < strategies.length; i++) {
        // find corresponding strategy and create new team with that strategy
        // strategy will be null if team is meant not to be a bot
        let strategyObj = ds.getStrategy(strategies[i]); // TODO: implement
        teams.push(new Team('team' + i, strategyObj.strategy, strategyObj.strategyParams))
    }

    return teams;

}

const endOfRound = (draft) => {
    return (draft.currentTeam == 0 && draft.round % 2 == 0) || 
            (draft.currentTeam == draft.size - 1 && draft.round % 2 == 1);
}


// TEAM class
class Team {

    constructor(name, draftStrategy, strategyParams={}) {
        this.name = name; // Team name
        // a draftStrategy of null means that this team is not controlled by a bot
        this.draftStrategy = draftStrategy; // fxn responsible for dictating how this team will decide who to draft
        this.strategyParams = strategyParams // for draft strategies that require extra, unique params
        this.players = []; // An array to store drafted players
    }

    // given the list of available players, apply the draft strategy and pick the player to draft,
    // returns the name of the player drafted
    draft (available) {
        let selection = this.draftStrategy(this.players, available, this.strategyParams);
        // add selection to the team
        this.players.push(selection);
        
        //return seelction so it can be removed from available players
        //TODO: maybe only want to return the key for the selection?
        return selection;
    }

    // for use when the team is controlled by a human
    manualDraft (selection) {
        this.players.push(selection);
        return selection;
    }

    // for when a pick is being manually changed from one player to another
    // TODO: implement
    resetPick (oldSelection, newSelection) {

    }

    // tells user if this team is being controlled by a preprogrammed draft strategy or not
    isBot () {
        return this.draftStrategy != null;
    }
  
    // Method to get the drafted players
    getPlayers() {
      return this.players;
    }

    // Returns a list of just player names for printing
    prettyTeam() {
        var playerNames = [];
        for (let player of this.players) {
            playerNames.push(player.fullName);
        }
        return playerNames;
    }
}


// just for my own testing of how all these classes would work
const dummyImpl = () => {
    var myDraft = new Draft();

    while (myDraft.nextUp().isBot()) {

    }

}

module.exports = {
    Draft,
    Team,
}