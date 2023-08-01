var bd = require('./basicdrafter');

const getStrategy = (strat) => {
    switch (strat) {
        case 'basic':
            return {
                strategy: bd.draftLowestXADPWeighted,
                strategyParams: {
                    count: 5,
                    lambda: (candidate) => (1/candidate.ownership.averageDraftPosition)
                }
            }
        case 'zeroRB':
            return {
                strategy: bd.draftZeroRBNaive,
                strategyParams: {
                    count: 5,
                    lambda: (candidate) => (1/candidate.ownership.averageDraftPosition)
                }
            }
        case null:
            return {
                strategy: null,
                strategyParams: {}
            }
    }
}

module.exports = {
    getStrategy,
}