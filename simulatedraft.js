var basicdrafter = require('./basicdrafter');
var adp = require('./adpranks');

class Team {

    constructor(name, draftStrategy, strategyParams={}) {
        this.name = name; // Team name
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
        return selection
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


//simulates a draft with only bots, for now all doing the basic draft strategy
const simulate = async (numteams=12, rounds=16, strategy='basic') => {

    // create teams
    var teams = []
    for (let i = 0; i < numteams; i++) {
        let strategyParams = {
            count: 5,
            lambda: (candidate) => (1/candidate.ownership.averageDraftPosition)
        };
        let team = new Team('team' + i, basicdrafter.draftLowestXADPstartersFirst, strategyParams);
        teams.push(team);
    }

    // get the list of all players
    var players = await adp.get_ESPN_ADP(0, 240);

    //create a deep copy so we can keep list of not drafted players while maintaining list of all players
    var available = JSON.parse(JSON.stringify(players))


    // simulate snake draft for specified number of rounds
    let draftDirectionForward = true;
    for (let i = 0; i < rounds; i++) {
        //in each round (using ternary operator to switch direction every other round)
        for (let j = draftDirectionForward ? 0 : numteams-1; draftDirectionForward ? j < numteams : j >= 0; j += draftDirectionForward ? 1 : -1) {
            // use teams draft strategy to make a selection
            let selection = teams[j].draft(available);

            //remove selected player from list of available players
            available = available.filter( player => player.id !== selection.id);

            //print a message to acknowledge the player has been drafted
            console.log(`${teams[j].name} has drafted ${selection.fullName}.`);
        }
        //flip draft direction at end of each round
        draftDirectionForward = !draftDirectionForward;

    }


    //print out the each of the teams
    for (let team of teams) {
        console.log(`${team.name}: ${team.prettyTeam()}`);
    }

}


// for now just run the simulate function
simulate();