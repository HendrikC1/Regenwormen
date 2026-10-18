var players = [{ id: 1, tiles: [] }, { id: 2, tiles: [] }];
var savedDice = [];
var currentRoll = [];

function init() {
    renderPlayers();
    updateSavedUI();
}

function fetchOpenTableTiles() {
    var openTiles = [];
    for (var v = 21; v <= 36; v++) {
        var element = document.getElementById('t' + v);
        if (element && !element.className.includes('disabled')) {
            openTiles.push(v);
        }
    }
    return openTiles;
}

function getWormsForTile(tileNum) {
    if (tileNum >= 21 && tileNum <= 24) return 1;
    if (tileNum >= 25 && tileNum <= 28) return 2;
    if (tileNum >= 29 && tileNum <= 32) return 3;
    if (tileNum >= 33 && tileNum <= 36) return 4;
    return 0;
}

function updatePlayers(delta) {
    var currentCount = players.length;
    var newCount = Math.max(2, currentCount + delta);
    if (newCount > currentCount) {
        players.push({ id: players.length + 1, tiles: [] });
    } else if (newCount < currentCount) {
        var removed = players.pop();
        removed.tiles.forEach(function(t) {
            var el = document.getElementById('t' + t);
            if (el) el.className = "tile";
        });
    }
    document.getElementById('playerCount').innerText = players.length - 1;
    renderPlayers();
}
function renderPlayers() {
    var container = document.getElementById('playersContainer');
    container.innerHTML = '';
    for (var i = 1; i < players.length; i++) {
        var p = players[i];
        var div = document.createElement('div');
        div.className = "flex-between";
        div.style.border = "1px solid #000000";
        div.style.padding = "6px";
        div.style.backgroundColor = "#f9fafb";
        var topTile = p.tiles.length > 0 ? p.tiles[p.tiles.length - 1] : '-';
        var topWorms = p.tiles.length > 0 ? ' (' + getWormsForTile(topTile) + ')' : '';
        
        div.innerHTML = '<span style="font-weight: bold;">P' + p.id + ' (Top: <span style="text-decoration: underline;">' + topTile + '</span>' + topWorms + ')</span>' +
            '<div style="display: flex; align-items: center; gap: 4px;">' +
            '<span style="color: #6b7280; font-size: 11px; margin-right: 4px;">[' + p.tiles.join(',') + ']</span>' +
            '<button onclick="modPlayerTile(' + i + ', -1)" class="btn" style="padding: 2px 6px;">-</button>' +
            '<button onclick="modPlayerTile(' + i + ', 1)" class="btn" style="padding: 2px 6px;">+</button>' +
            '<button onclick="handleBust(' + i + ')" class="btn" style="border-color: #dc2626; color: #dc2626; padding: 2px 4px; font-size: 10px; text-transform: uppercase; margin-left: 4px;">Mislukt</button>' +
                    '</div>';
        container.appendChild(div);
    }
    var p1 = players[0];
    var p1Top = p1.tiles.length > 0 ? p1.tiles[p1.tiles.length - 1] : '-';
    var p1Worms = p1.tiles.length > 0 ? ' (' + getWormsForTile(p1Top) + ')' : '';
    document.getElementById('p1Top').innerText = p1Top + p1Worms;
    document.getElementById('p1History').innerText = '[' + p1.tiles.join(',') + ']';
}

function modPlayerTile(pIdx, action) {
    var activeTableTiles = fetchOpenTableTiles();
    if (action === 1) {
        var tile = prompt('Voer een beschikbare tegel in van de tafel (' + activeTableTiles.join(', ') + '):');
        var val = parseInt(tile);
        if (activeTableTiles.includes(val)) {
            players[pIdx].tiles.push(val);
            document.getElementById('t' + val).className = "tile disabled";
        } else {
            alert('Fout: Deze tegel ligt niet op tafel of invoer is ongeldig!');
        }
    } else {
        if (players[pIdx].tiles.length > 0) {
            var removed = players[pIdx].tiles.pop();
            document.getElementById('t' + removed).className = "tile";
        }
    }
    renderPlayers();
}

function handleBust(pIdx) {
    var activeTarget = pIdx === 0 ? players[0] : players[pIdx];
    var activeTableTiles = fetchOpenTableTiles();
    if (activeTarget.tiles.length > 0) {
        var returnedTile = activeTarget.tiles.pop();
        document.getElementById('t' + returnedTile).className = "tile";
        activeTableTiles.push(returnedTile);
        activeTableTiles.sort(function(a, b) { return a - b; });
        var maxTable = Math.max.apply(null, activeTableTiles);
        if (maxTable !== returnedTile && activeTableTiles.length > 0) {
            document.getElementById('t' + maxTable).className = "tile disabled";
        }
    } else {
        if (activeTableTiles.length > 0) {
            var maxTable = Math.max.apply(null, activeTableTiles);
            document.getElementById('t' + maxTable).className = "tile disabled";
        }
    }
    renderPlayers();
    savedDice = [];
    updateSavedUI();
}

function getScore(diceArray) {
    return diceArray.reduce(function(acc, die) { return acc + (die === 'W' ? 5 : parseInt(die)); }, 0);
}

function calculateNextRollBustChance(simSaved, remDice) {
    if (remDice <= 0) return 100;
    var busts = 0;
    var sides = ['1','2','3','4','5','W'];
    for (var i = 0; i < 10000; i++) {
        var rolled = [];
        for (var d = 0; d < remDice; d++) { rolled.push(sides[Math.floor(Math.random() * 6)]); }
        var hasValidOption = rolled.some(function(s) { return !simSaved.includes(s); });
        if (!hasValidOption) busts++;
    }
    return Math.round((busts / 10000) * 100);
}
function liveAnalyze() {
    var input = document.getElementById('csvInput').value.trim().toUpperCase();
    var adviceBlock = document.getElementById('adviceBlock');
    var actionButtons = document.getElementById('actionButtons');
    var activeTableTiles = fetchOpenTableTiles();
    adviceBlock.style.display = "none";
    actionButtons.innerHTML = '';
    if(!input) return;
    
    currentRoll = input.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return ['1','2','3','4','5','W'].includes(s); });
    
    var maxAllowedInHand = 8 - savedDice.length;
    if (currentRoll.length > maxAllowedInHand) {
        alert("Fout: Je werpt met meer stenen (" + currentRoll.length + ") dan je in je hand hebt (" + maxAllowedInHand + ")!");
        return;
    }

    var currentScore = getScore(savedDice);
    var hasWormAlready = savedDice.includes('W');
    var uniqueSymbols = Array.from(new Set(currentRoll)).filter(function(s) { return !savedDice.includes(s); });

    if(uniqueSymbols.length === 0) {
        adviceBlock.className = "advice-box advice-red";
        adviceBlock.innerText = "DOODGEGOOID";
        adviceBlock.style.display = "block";
        return;
    }

    var enemyTopTiles = [];
    for(var i = 1; i < players.length; i++) {
        if(players[i].tiles.length > 0) {
            enemyTopTiles.push({ pIdx: i, tile: players[i].tiles[players[i].tiles.length - 1] });
        }
    }

    var bestChoice = null;
    var highestWeight = -1;

    uniqueSymbols.forEach(function(symbol) {
        var count = currentRoll.filter(function(s) { return s === symbol; }).length;
        var scoreGain = symbol === 'W' ? 5 * count : parseInt(symbol) * count;
        var potentialScore = currentScore + scoreGain;
        var potentialHasWorm = hasWormAlready || symbol === 'W';
        var remDice = maxAllowedInHand - count;

        var actionText = "";
        var subText = "";
        var weight = 0;
        var targetTile = null;
        var isSteal = false;
        var stealFromIdx = null;

        var simSaved = savedDice.slice();
        for(var i=0; i<count; i++) simSaved.push(symbol);
        var nextBustChance = calculateNextRollBustChance(simSaved, remDice);

        if (potentialHasWorm && potentialScore >= 21) {
            var matchSteal = enemyTopTiles.find(function(e) { return e.tile === potentialScore; });
            if (matchSteal) {
                weight = 10000; 
                actionText = "STOP & STEEL " + potentialScore;
                subText = "Directe winst via diefstal.";
                targetTile = potentialScore;
                isSteal = true;
                stealFromIdx = matchSteal.pIdx;
            } else {
                var validTable = activeTableTiles.filter(function(t) { return t <= potentialScore; });
                if (validTable.length > 0) {
                    var highestTable = Math.max.apply(null, validTable);
                    weight = 5000 + (highestTable * 10) - nextBustChance;
                    actionText = "STOP & PAK TAFEL " + highestTable;
                    subText = "Veilig stoppen. Risico bij doorrollen: " + nextBustChance + "%.";
                    targetTile = highestTable;
                } else {
                    weight = 100 - nextBustChance;
                    actionText = "ROL DOOR (SCORE " + potentialScore + ")";
                    subText = "Worm binnen, maar geen vrije tegel op tafel. Risico: " + nextBustChance + "%.";
                }
            }
        } else {
            weight = (scoreGain * 5) + (8 - remDice) - (nextBustChance * 2);
            if (symbol === 'W') weight += 100; 
            actionText = "ROL DOOR (SCORE " + potentialScore + ")";
            subText = "Nieuw totaal: " + potentialScore + " pt. Risico volgende worp: " + nextBustChance + "%.";
        }

        if (weight > highestWeight) {
            highestWeight = weight;
            bestChoice = { symbol: symbol, count: count, text: actionText, targetTile: targetTile, isSteal: isSteal, stealFromIdx: stealFromIdx };
        }

        var btn = document.createElement('button');
        btn.className = "btn-action";
        btn.innerHTML = '<div class="flex-between" style="width:100%;">' +
            '<span>KIES ' + count + 'x' + (symbol === 'W' ? '🪱' : symbol) + '</span>' +
                    '<span style="font-size:11px; color:#000000; text-transform:uppercase; font-weight:bold;">' + actionText + '</span>' +
            '</div>' +
            '<div style="font-size:10px; color:#4b5563; font-weight:normal; margin-top:4px; text-align:left;">' + subText + '</div>';
        
        btn.onclick = function() { executeChoice(symbol, count, targetTile, isSteal, stealFromIdx); };
        actionButtons.appendChild(btn);
    });

    if (bestChoice) {
        var isStop = bestChoice.targetTile !== null;
        adviceBlock.className = isStop ? "advice-box advice-green" : "advice-box advice-yellow";
        adviceBlock.innerText = "ADVIES: " + bestChoice.text;
        adviceBlock.style.display = "block";
    }
}

function executeChoice(symbol, count, targetTile, isSteal, stealFromIdx) {
    for(var i=0; i<count; i++) savedDice.push(symbol);
    currentRoll = []; 
    
    if (targetTile) {
        if (isSteal && stealFromIdx !== null) {
            players[stealFromIdx].tiles = players[stealFromIdx].tiles.filter(function(t) { return t !== targetTile; });
        } else {
            document.getElementById('t' + targetTile).className = "tile disabled";
        }
        players[0].tiles.push(targetTile);
        savedDice = []; 
    }
    
    document.getElementById('csvInput').value = '';
    document.getElementById('adviceBlock').style.display = "none";
    document.getElementById('actionButtons').innerHTML = '';
    renderPlayers();
    updateSavedUI();
}

function updateSavedUI() {
    var container = document.getElementById('savedDiceContainer');
    container.innerHTML = '';
    savedDice.forEach(function(die) {
        var span = document.createElement('span');
        span.className = "saved-die";
        span.innerText = die === 'W' ? '🪱' : die;
        container.appendChild(span);
    });
    document.getElementById('currentScore').innerText = getScore(savedDice);
    var hasWormSpan = document.getElementById('hasWorm');
    if (savedDice.includes('W')) {
        hasWormSpan.innerText = 'WORM BINNEN';
        hasWormSpan.className = "text-green";
    } else {
        hasWormSpan.innerText = 'GEEN WORM';
        hasWormSpan.className = "text-red";
    }
}

function resetGame() {
    document.getElementById('csvInput').value = '';
    document.getElementById('adviceBlock').style.display = "none";
    document.getElementById('actionButtons').innerHTML = '';
}
window.onload = init;
