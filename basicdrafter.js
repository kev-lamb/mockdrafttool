// strategy params stuff

//default just gets the lowest ADP player
const defaultTopCandidate = (roster, available, params) => {
    //console.log("default top candidate");
    return [available[0]];
}

//just gets the best count candidates based on ADP subject to roster constraints
const defaultGetCandidates = (roster, available, params={count:10}) => {
    let allowedPositions = getValidPositions(getPositionCounts(roster));

    let candidates = [];
    for (let player of available) {
        if (allowedPositions.has(player.defaultPositionId)) {
            candidates.push(player);
            if (candidates.length == params.count) {
                break;
            }
        }
    }

    return candidates;
}

const startersFirst = (roster, available, params={count:10}) => {
    let counts = getPositionCounts(roster);
    let allowedPositions = getValidPositions(counts);
    let needsStarter = getPositionsNeedingStarter(counts);

    //if no starter is needed, resort to default candidate method
    if (needsStarter.size == 0) {
        return defaultGetCandidates(roster, available, params);
    }

    //if starter is needed, fill one of those positions
    let candidates = [];
    for (let player of available) {
        if ((needsStarter.size == 0 && allowedPositions.has(player.defaultPositionId))|| needsStarter.has(player.defaultPositionId)) {
            candidates.push(player);
            if (candidates.length == params.count) {
                break;
            }
        }
    }

    return candidates;

}

/**
 * Given some ADP bound (only the top count candidates are to be considered), 
 * add a maximum x_i players to the candidates for position i, where
 * x_i for each position is specified in the params
 * @param {*} roster 
 * @param {*} available 
 * @param {*} params 
 */
const weightedPositionCandidatesBounded = (roster, available, params) => {
    let allowedPositions = getValidPositions(getPositionCounts(roster));
    let positionCounts = params.positionCounts;
    
    let candidateCounts = {}
    let candidates = [];
    for (let i = 0; i < params.count; i++) {
        let player = available[i];
        let position = player.defaultPositionId;
        if (allowedPositions.has(position)) {
            //valid candidate, should we add them based on player counts though?
            if ((candidateCounts[position] ? candidateCounts[position] : 0) < positionCounts[position]) {
                // position is within count, add and increment count
                candidateCounts[position] = candidateCounts[position] ? candidateCounts[position] + 1 : 1;
                candidates.push(player);
                // stop adding candidates if we're at capacity
                if (candidates.length == params.count) {
                    break;
                }
            }
        }
    }
    return candidates;

}

/**
 * add a maximum x_i players to the candidates for position i, where
 * x_i for each position is specified in the params.
 * UNBOUNDED meaning x_i candidates will be added for each position i regardless of
 * how high their adp is, given that there are a minimum x_i players at that position left
 * @param {*} roster 
 * @param {*} available 
 * @param {*} params 
 */
const weightedPositionCandidatesUnbounded = (roster, available, params) => {
    let positionCounts = params.positionCounts;
    let count = 0;
    for (let j in positionCounts) {
        count += positionCounts[j];
    }
    
    let candidateCounts = {}
    let candidates = [];
    for (let player of available) {
        let position = player.defaultPositionId;
        //valid candidate, should we add them based on player counts though?
        if ((candidateCounts[position] ? candidateCounts[position] : 0) < positionCounts[position]) {
            // position is within count, add and increment count
            candidateCounts[position] = candidateCounts[position] ? candidateCounts[position] + 1 : 1;
            candidates.push(player);
            // stop adding candidates if we're at capacity
            if (candidates.length == count) {
                break;
            }
        }
    }
    return candidates;

}

/**
 * naive implementation of the zeroRB draft strategy.
 * Team will never draft a RB in the first 6 rounds. Will draft 4 WR, 1 QB, 1 TE.
 * After round 6, will highly prioritize rbs
 * TODO: see if I can find a way to determine how old a rb is, as younger rbs w higher upside
 * should be valued more highly
 * @param {*} roster 
 * @param {*} available 
 * @param {*} params 
 */
const zeroRBNaive = (roster, available, params) => {
    //determine what round it is
    let round = roster.length + 1;

    //get roster counts
    let counts = getPositionCounts(roster);

    var weights = {};
    if (round < 7) {
        //dont draft runningbacks
        weights = {
            1: (1 - 2 * counts[1]), //qb
            2: -1, //rb
            3: (7 - 2 * counts[3]), //wr
            4: (1 - 2 * counts[4]), //te
            5: -1, //k
            16: -1, //dst
        }
    } else {
        //can draft rbs now
        weights = {
            1: (3 - 2 * counts[1]), //qb (dont draft more than 2 of these)
            2: (16 - counts[2]), //rb (high priority)
            3: (8 - counts[3]), //wr
            4: (3 - 2 * counts[4]), //te (dont draft more than 2)
            5: (1 - 2 * counts[5]), //k (only draft 1)
            16: (1 - 2 * counts[16]), //dst (only draft 1)
        }
    }

    //TODO: I dont know if this is the best way to implement this strategy,
    //but for now, just do unbounded weighted position selection w calced weights
    return weightedPositionCandidatesUnbounded(roster, available, {
        positionCounts: weights
    })
}


// picking candidate functions
const pickLowestADP = (roster, candidates, available, params) => {
    // console.log("pick lowest adp");
    // console.log(candidates);
    return candidates[0];
}

/*
each weight includes the summation of all weights of previous candidates as well.
then we can just iterate thru this weight list and pick the first candidate whose summed weight
is greater than our random number
weighting function is passed in as a parameter, default is inverseADP
*/
const weightedADPProb = (roster, candidates, available, params={lambda: (candidate) => (1/candidate.ownership.averageDraftPosition)}) => {
    // unnormalized inverse ADP prob calculation
    let lambda = params.lambda;
    let weights = [lambda(candidates[0])];
    for (let i = 1; i < candidates.length; i++) {
        weights[i] = weights[i-1] + lambda(candidates[i]);
    }

    let k = Math.random() * weights[weights.length - 1];

    for (let i = 0; i < weights.length; i++) {
        if (k <= weights[i]) {
            return candidates[i];
        }
    }
    //should never get here
    console.log("weird error?");
    return null;
}

const weightedPositionSelection = (roster, candidates, available, params) => {
    // weight multiplier to increse likelihood of drafting certain positions over others

    return weightedADPProb(roster, candidates, available, {
        lambda: (player) => {
            let positionWeights = params.positionWeights;
            return params.lambda(player) * positionWeights[player.defaultPositionId];
        }
    })
}

//HELPER FUNCTIONS

//TODO: i keep having to bend over backwards for when counts doesnt have a value for a pos.
// make it initialize all positions to 0 t
const getPositionCounts = (roster) => {
    let counts = {
        1: 0, //qb
        2: 0, //rb
        3: 0, //wr
        4: 0, //te
        5: 0, //k
        16: 0, //dst
    }
    for (let player of roster) {
        // let position = player.defaultPositionId;
        counts[player.defaultPositionId]++;
        // if (counts.hasOwnProperty(position)) {
        //     counts[position]++
        // } else {
        //     counts[position] = 1;
        // }
    }
    return counts;
}

const getValidPositions = (counts) => {
    const positionalMax = {
        1: 4, //qb
        2: 8, //rb
        3: 8, //wr
        4: 3, //te
        5: 3, //k
        16: 3, //dst
    }

    let allowedPositions = new Set()
    for (let position in positionalMax) {
        if (counts[position] != positionalMax[position]) {
            allowedPositions.add(parseInt(position));
        }
    }
    return allowedPositions;
}

const getPositionsNeedingStarter = (counts) => {
    const positionalStarters = {
        1: 1, //qb
        2: 3, //rb
        3: 3, //wr
        4: 1, //te
        5: 1, //k
        16: 1, //dst
    }

    let allowedPositions = new Set()
    for (let position in positionalStarters) {
        if (counts[position] < positionalStarters[position]) {
            allowedPositions.add(parseInt(position));
        }
    }
    return allowedPositions;
}



// DRAFT STRATEGIES
/*
basic draft bot that deterministically selects the available player with the lowest adp.
no roster contruction constraints whatsoever
*/

const draftLowestADP = (roster, available, strategyParams={}) => {
    return generalStrategy(roster, available, {
        getCandidates: defaultTopCandidate,
        candidateParmas: {},
        selectPlayer: pickLowestADP,
        selectionParams: {}
    })
}

/*
selects the available player with the lowest adp, given that there is enough room on the roster
for another one of those players
*/
const draftLowestADPwithRosterConstraints = (roster, available, strategyParams={}) => {
    return generalStrategy(roster, available, {
        getCandidates: defaultGetCandidates,
        candidateParams: {
            count: 1
        },
        selectPlayer: pickLowestADP,
        selectionParams: {}
    })
}

const draftLowestADPstartersFirst = (roster, available, strategyParams) => {
    return generalStrategy(roster, available, {
        getCandidates: startersFirst,
        candidateParams: {
            count: strategyParams.count
        },
        selectPlayer: pickLowestADP,
        selectionParams: {}
    })
}

const draftLowestXADPstartersFirst = (roster, available, strategyParams) => {
    return generalStrategy(roster, available, {
        getCandidates: startersFirst,
        candidateParams: {
            count: strategyParams.count
        },
        selectPlayer: weightedADPProb,
        selectionParams: {
            lambda: strategyParams.lambda
        }
    })
}

//randomly drafts one of the x lowest adp players available, subject to roster constraints
const draftLowestXADP = (roster, available, strategyParams={count:10}) => {
    return generalStrategy(roster, available, {
        getCandidates: defaultGetCandidates,
        candidateParams: {
            count: strategyParams.count
        },
        selectPlayer: weightedADPProb,
        selectionParams: {
            lambda: (candidate) => 1
        }
    })

}

/**
 * from the X lowest ADP players available subject to roster contraints, select
 * a player weighted by inverse ADP
 * @param {*} roster 
 * @param {*} available 
 * @param {*} strategyParams 
 * @returns 
 */
const draftLowestXADPWeighted = (roster, available, strategyParams) => {

    return generalStrategy(roster, available, {
        getCandidates: defaultGetCandidates,
        candidateParams: {
            count: strategyParams.count
        },
        selectPlayer: weightedADPProb,
        selectionParams: {
            lambda: strategyParams.lambda
        }
    })

}

/**
 * Drafts player of certain position group relative to some constant positional weight.
 * With this strategy, the positional weight stays constant throughout the draft, and we still
 * only consider the COUNT lowest ADP prospects, regardless of position
 * @param {*} roster 
 * @param {*} available 
 * @param {*} strategyParams 
 */
const draftWeightedPosition = (roster, available, strategyParams) => {
    return generalStrategy(roster, available, {
        getCandidates: defaultGetCandidates,
        candidateParams: {
            count: strategyParams.count
        },
        selectPlayer: weightedPositionSelection,
        selectionParams: {
            positionWeights: strategyParams.positionWeights,
            lambda: strategyParams.lambda
        }
    })

}

const draftZeroRBNaive = (roster, available, strategyParams) => {
    return generalStrategy(roster, available, {
        getCandidates: zeroRBNaive,
        candidateParams: {},
        selectPlayer: weightedADPProb,
        selectionParams: {
            lambda: strategyParams.lambda
        }
    })
}

/*
general format of strategyParams:
{
    getCandidates: function(roster, available, params) => candidates,
    condidateParams: {
        ...
    },
    selectPlayer: function(roster, available, candidates, params) => player,
    selectionParams: {
        ...
    }
}
*/

const generalStrategy = (roster, available, strategyParams) => {
    // step 1: get a set of candidate picks
    let candidates = strategyParams.getCandidates(roster, available, strategyParams.candidateParams);

    // step 2: apply some probability distribution to select a player
    let selection = strategyParams.selectPlayer(roster, candidates, available, strategyParams.selectionParams);

    return selection;
}

module.exports = {
    draftLowestADP,
    draftLowestADPwithRosterConstraints,
    draftLowestADPstartersFirst,
    draftLowestXADP,
    draftLowestXADPWeighted,
    draftLowestXADPstartersFirst,
    draftWeightedPosition,
    draftZeroRBNaive,
};