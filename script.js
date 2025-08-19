function round2(num) {
    return Math.round(num * 100) / 100;
}

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

// --- WINNING SCENARIO (optimized with approx-ball ±2 search, RR rounded to 2dp) ---
function generateWinning(firstRuns, firstOvers, secondRuns, secondWickets, secondOvers, secondBalls, plannedWickets) {
    const target = firstRuns + 1;
    const rr1 = round2(firstRuns / firstOvers);                 // first innings RR rounded to 2dp
    const currentBalls = Math.max(0, secondOvers * 6 + secondBalls);
    const maxBalls = firstOvers * 6;

    const opponentBowlingPts = calculateBowlingPoints(plannedWickets);

    // helper: percent at finish ball b (rounded run rates)
    function percentAt(balls) {
        const rr2 = round2(target / (balls / 6));              // required RR to finish at 'balls'
        return round2((rr1 / rr2) * 100);                      // losing team's RR% vs required
    }

    // find minimal b >= currentBalls such that percent > p (strict), using approx ±2 then tiny forward scan
    function findBoundaryBall(p) {
        if (currentBalls >= maxBalls) return null;

        // approx b from equation: rr1 * (b/6) / target * 100 = p  =>  b = (p * target * 6) / (100 * rr1)
        let approx = Math.round((p * target * 6) / (100 * rr1));

        // clamp a small window around approx; ensure it covers currentBalls if approx is behind
        let start = Math.max(currentBalls, approx - 2);
        let end = Math.min(maxBalls, approx + 2);
        if (end < start) end = Math.min(maxBalls, start + 4);

        // search window
        for (let b = Math.max(1, start); b <= end; b++) {
            if (percentAt(b) > p) return b;
        }
        // small forward safety net (handles rounding edges cleanly without scanning whole innings)
        const forwardLimit = Math.min(maxBalls, end + 10);
        for (let b = end + 1; b <= forwardLimit; b++) {
            if (percentAt(b) > p) return b;
        }

        // if approx was long before currentBalls, check currentBalls+few
        if (approx + 2 < currentBalls) {
            const checkLimit = Math.min(maxBalls, currentBalls + 10);
            for (let b = Math.max(1, currentBalls); b <= checkLimit; b++) {
                if (percentAt(b) > p) return b;
            }
        }

        return null; // boundary not reachable within remaining balls
    }

    // boundaries where opponent batting points step up: >50, >60, >70, >80, >90
    const percents = [50, 60, 70, 80, 90];
    const boundaries = percents.map(p => findBoundaryBall(p)); // minimal ball where percent > p

    // build contiguous ranges for batting points 1..5 starting at each boundary until nextBoundary-1
    const thresholds = [];
    for (let i = 0; i < percents.length; i++) {
        const startBall = boundaries[i];                         // first ball where > (50+10*i)
        if (startBall === null) continue;                        // not achievable from current state
        if (startBall > maxBalls) continue;

        // find next boundary that exists
        let nextBall = null;
        for (let j = i + 1; j < boundaries.length; j++) {
            if (boundaries[j] !== null) { nextBall = boundaries[j]; break; }
        }
        const endBall = (nextBall !== null ? nextBall - 1 : maxBalls);
        if (startBall > endBall) continue;

        const battingPts = i + 1;                                // 1..5 corresponds to >50..>90 buckets
        const ourPoints = 30 - (battingPts + opponentBowlingPts);

        thresholds.push({
            ballsExactStart: startBall,
            ballsExactEnd: endBall,
            overRange: `${formatOver(startBall)} - ${formatOver(endBall)}`,
            opponentBattingPoints: battingPts,
            opponentBowlingPoints: opponentBowlingPts,
            ourPoints
        });
    }

    return thresholds;
}

// --- LOSING SCENARIO  ---
function generateLosing(firstRuns, firstWickets, secondRuns, secondWickets, secondOvers, secondBalls) {
    const target = firstRuns;
    const firstInningsBowlingPts = calculateBowlingPoints(firstWickets);

    let thresholds = [];
    let prevPts = -1;

    for (let runs = secondRuns; runs <= target; runs++) {
        const percent = (runs / target) * 100;
        const battingPts = calculateBattingPoints(percent);
        const totalPts = battingPts + firstInningsBowlingPts;

        if (totalPts !== prevPts) {
            if (thresholds.length > 0) thresholds[thresholds.length - 1].endRun = runs - 1;
            thresholds.push({ startRun: runs, battingPts, totalPts, notes: "Threshold change" });
            prevPts = totalPts;
        }
    }
    if (thresholds.length > 0) thresholds[thresholds.length - 1].endRun = target;

    return thresholds;
}

function generateScenario() {
    const firstRuns = parseInt(document.getElementById('firstRuns').value);
    const firstOvers = parseInt(document.getElementById('firstOvers').value);
    const firstWickets = parseInt(document.getElementById('firstWickets').value);
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
        const losingData = generateLosing(firstRuns, firstWickets, secondRuns, secondWickets, secondOvers, secondBalls);
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
