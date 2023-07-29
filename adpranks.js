
var axios = require('axios');
var basicdrafter = require('./basicdrafter');

const espnADP_url = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leaguedefaults/3?view=kona_player_info"
const MAX_QUERY_SIZE = 50;

// got this from espn ADP table request
const fantasy_filters = {
    players: {
      filterSlotIds: { value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24] },
      sortAdp: { sortPriority: 2, sortAsc: true },
      sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' },
      limit: 50,
      offset: 0,
      filterRanksForSlotIds: { value: [0, 2, 4, 6, 17, 16] },
      filterStatsForTopScoringPeriodIds: { value: 2, additionalValue: ['002023', '102023', '002022', '022023'] }
    }
}



const get_ESPN_ADP = async (startidx=0, length=50) => {

    // got this from espn ADP table request
    let fantasy_filters = {
        players: {
            filterSlotIds: { value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24] },
            sortAdp: { sortPriority: 2, sortAsc: true },
            sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' },
            limit: Math.min(length, 50),
            offset: startidx,
            filterRanksForSlotIds: { value: [0, 2, 4, 6, 17, 16] },
            filterStatsForTopScoringPeriodIds: { value: 2, additionalValue: ['002023', '102023', '002022', '022023'] }
        }
    }


    let res = await axios.get(espnADP_url, {headers: {'X-Fantasy-Filter' : JSON.stringify(fantasy_filters)}});


    let playerlist = res.data.players.map((o) => {
        return o.player;
    });
    // console.log(playerlist.length);
    // console.log(playerlist[0].player);

    // if requesting more than 50 players, this code will handle that
    let offset = startidx + MAX_QUERY_SIZE; //can do this cuz while loop wont run if we got <= max query size first time
    let remaining = length - MAX_QUERY_SIZE;

    while (remaining > 0) {
        fantasy_filters.players.limit = Math.min(remaining, 50);
        fantasy_filters.players.offset = offset;
        // console.log(JSON.stringify(fantasy_filters))

        let resp = await axios.get(espnADP_url, {headers: {'X-Fantasy-Filter' : JSON.stringify(fantasy_filters)}});
        // console.log(resp.data.players[0].player)
        playerlist = playerlist.concat(resp.data.players.map((o) => {
            return o.player;
        }));

        //again can just use max instead of what we actually did because if it was less than max the loop would terminate anyways
        //and the loop will only continue if it should be max query size
        offset += MAX_QUERY_SIZE;
        remaining -= MAX_QUERY_SIZE;
    }

    console.log(playerlist.length);
    // console.log(playerlist);
    return playerlist;

}

const debugfxn = () => {
    const true_filter = `{"players":{"filterSlotIds":{"value":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,23,24]},"sortAdp":{"sortPriority":2,"sortAsc":true},"sortDraftRanks":{"sortPriority":100,"sortAsc":true,"value":"STANDARD"},"limit":50,"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["002023","102023","002022","022023"]}}}`

    console.log(JSON.stringify(fantasy_filters));

    if (JSON.stringify(fantasy_filters) === true_filter) {
        console.log("match")
    } else {
        console.log("no match")
    }
}

module.exports = {get_ESPN_ADP}

// get_ESPN_ADP(0, 100);

//debugfxn();