// strategy params stuff

//default just gets the lowest ADP player
const defaultTopCandidate = (roster, available, params) => {
    //console.log("default top candidate");
    return [available[0]];
}

//just gets the best 10 candidates based on ADP subject to roster constraints
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

//HELPER FUNCTIONS

const getPositionCounts = (roster) => {
    let counts = {}
    for (let player of roster) {
        let position = player.defaultPositionId;
        if (counts.hasOwnProperty(position)) {
            counts[position]++
        } else {
            counts[position] = 1;
        }
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
        if ((counts[position] ? counts[position] : 0) < positionalStarters[position]) {
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
};