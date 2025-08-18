function calculateBattingPoints(percent) {
    if (percent > 50 && percent <= 60) return 1;
    if (percent > 60 && percent <= 70) return 2;
    if (percent > 70 && percent <= 80) return 3;
    if (percent > 80 && percent <= 90) return 4;
    if (percent > 90 && percent < 100) return 5;
    return 0;
}

function calculateBowlingPoints(wickets) {
    if (wickets >= 7) return 5;
    if (wickets == 6) return 4;
    if (wickets == 5) return 3;
    if (wickets >= 3) return 2;
    if (wickets >= 1) return 1;
    return 0;
}

function formatOver(balls) {
    return Math.floor(balls / 6) + '.' + (balls % 6);
}

function calculateTotalPoints(battingPts, bowlingPts, firstInningsBowlingPts) {
    return battingPts + bowlingPts + firstInningsBowlingPts;
}

// Winning scenario with Planned Wickets to Lose
function generateWinning(firstRuns, firstOvers, secondRuns, secondWickets, secondOvers, secondBalls, plannedWickets) {
    const target = firstRuns;
    const opponentRunRate = firstRuns / firstOvers;
    const currentBalls = secondOvers * 6 + secondBalls;
    const firstInningsBowlingPts = calculateBowlingPoints(firstRuns); 

    let thresholds = [];
    const effectiveWickets = plannedWickets; // use planned wickets to calculate opponent bowling points
    const opponentBowlingPts = calculateBowlingPoints(effectiveWickets);

    for (let battingPts = 1; battingPts <= 5; battingPts++) {
        const lowerPercent = 50 + (battingPts - 1) * 10;
        let ballsExactFloat = 6 * target / (opponentRunRate / (lowerPercent / 100));
        let ballsExact = Math.floor(ballsExactFloat) + 1;

        if (ballsExact < currentBalls) continue;

        const ourPoints = 30 - (battingPts + opponentBowlingPts);

        if (thresholds.length === 0 || thresholds[thresholds.length - 1].ourPoints !== ourPoints) {
            thresholds.push({
                ballsExact,
                ourPoints,
                opponentBattingPoints: battingPts,
                opponentBowlingPoints: opponentBowlingPts
            });
        }
    }

    for (let i = 0; i < thresholds.length; i++) {
        const startBalls = thresholds[i].ballsExact;
        const endBalls = i + 1 < thresholds.length ? thresholds[i + 1].ballsExact - 1 : firstOvers * 6;
        thresholds[i].overRange = formatOver(startBalls) + ' - ' + formatOver(endBalls);
    }

    return thresholds;
}

// Losing scenario
function generateLosing(firstRuns, secondRuns, secondWickets, secondOvers, secondBalls) {
    const target = firstRuns;
    const firstInningsBowlingPts = calculateBowlingPoints(firstRuns);
    const effectiveWickets = secondWickets;
    const bowlingPts = calculateBowlingPoints(effectiveWickets);

    let thresholds = [];
    let prevPts = -1;

    for (let runs = secondRuns; runs <= target; runs++) {
        const percent = (runs / target) * 100;
        const battingPts = calculateBattingPoints(percent);
        const totalPts = calculateTotalPoints(battingPts, bowlingPts, firstInningsBowlingPts);

        if (totalPts !== prevPts) {
            if (thresholds.length > 0) thresholds[thresholds.length - 1].endRun = runs - 1;
            thresholds.push({ startRun: runs, battingPts, totalPts, notes: "Threshold change" });
            prevPts = totalPts;
        }
    }
    if (thresholds.length > 0) thresholds[thresholds.length - 1].endRun = target;

    return thresholds;
}

// Main function
function generateScenario() {
    const firstRuns = parseInt(document.getElementById('firstRuns').value);
    const firstOvers = parseInt(document.getElementById('firstOvers').value);
    const secondRuns = parseInt(document.getElementById('secondRuns').value);
    const secondWickets = parseInt(document.getElementById('secondWickets').value);
    const secondOvers = parseInt(document.getElementById('secondOvers').value);
    const secondBalls = parseInt(document.getElementById('secondBalls').value);
    const scenario = document.getElementById('scenario').value;
    const plannedWickets = parseInt(document.getElementById('plannedWickets').value);

    const container = document.getElementById('tables');
    container.innerHTML = "";

    if (scenario === "winning" || scenario === "both") {
        const winningData = generateWinning(firstRuns, firstOvers, secondRuns, secondWickets, secondOvers, secondBalls, plannedWickets);
        let html = `<h2>Winning Scenario</h2>`;
        html += `<p class="info">Planned Wickets to Lose: ${plannedWickets} → Opponent Bowling Points: ${calculateBowlingPoints(plannedWickets)}</p>`;
        html += `<table><tr><th>Overs Range</th><th>Opponent Batting / Our Points</th></tr>`;
        winningData.forEach(row => {
            html += `<tr class="threshold-change"><td>${row.overRange}</td><td>${row.opponentBattingPoints} / ${row.ourPoints}</td></tr>`;
        });
        html += `</table>`;
        container.innerHTML += html;
    }

    if (scenario === "losing" || scenario === "both") {
        const losingData = generateLosing(firstRuns, secondRuns, secondWickets, secondOvers, secondBalls);
        let html = `<h2>Losing Scenario</h2>`;
        html += `<p class="info">Wickets Lost: ${secondWickets} → Bowling Points: ${calculateBowlingPoints(secondWickets)}</p>`;
        html += `<table><tr><th>Runs Range</th><th>Batting / Total Points</th><th>Notes</th></tr>`;
        losingData.forEach(row => {
            html += `<tr class="threshold-change"><td>${row.startRun} - ${row.endRun}</td><td>${row.battingPts} / ${row.totalPts}</td><td>${row.notes}</td></tr>`;
        });
        html += `</table>`;
        container.innerHTML += html;
    }
}
