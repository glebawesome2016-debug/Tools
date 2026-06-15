const sliderIds = ['health', 'melee', 'grenade', 'super', 'class', 'weapons'];

// Current weighting strategy (can be changed by user)
let currentWeighting = 1.5;

// Track disabled archetypes for filtering
const disabledArchetypes = new Set();

// Stat abbreviations
const statAbbreviations = {
    'health': 'HP',
    'melee': 'ML',
    'grenade': 'GR',
    'super': 'SP',
    'class': 'CL',
    'weapons': 'WP'
};

// Armor archetypes data
const archetypes = [
    { name: 'Siegebreaker', primary: 'health', secondary: 'grenade' },
    { name: 'Bulwark', primary: 'health', secondary: 'class' },
    { name: 'Brawler', primary: 'melee', secondary: 'health' },
    { name: 'Skirmisher', primary: 'melee', secondary: 'weapons' },
    { name: 'Grenadier', primary: 'grenade', secondary: 'super' },
    { name: 'Demolitionist', primary: 'grenade', secondary: 'class' },
    { name: 'Colossus', primary: 'super', secondary: 'health' },
    { name: 'Paragon', primary: 'super', secondary: 'melee' },
    { name: 'Reaver', primary: 'class', secondary: 'melee' },
    { name: 'Specialist', primary: 'class', secondary: 'weapons' },
    { name: 'Gunner', primary: 'weapons', secondary: 'grenade' },
    { name: 'Powerhouse', primary: 'weapons', secondary: 'super' }
];

const armorSlots = ['helmet', 'gauntlets', 'chest', 'legs', 'class'];

sliderIds.forEach(id => {
    const slider = document.getElementById(`slider-${id}`);
    const valueDisplay = document.getElementById(`sliderValue-${id}`);
    
    slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value;
    });
});

// Fragment bonus inputs
sliderIds.forEach(id => {
    const input = document.getElementById(`fragment-${id}`);
    const valueDisplay = document.getElementById(`fragmentValue-${id}`);
    
    input.addEventListener('input', function() {
        valueDisplay.textContent = this.value;
    });
});

// Weighting strategy buttons
document.getElementById('weighting-aggressive').addEventListener('click', function() {
    currentWeighting = 2.0;
    document.getElementById('weighting-aggressive').classList.add('active');
    document.getElementById('weighting-balanced').classList.remove('active');
    document.getElementById('weightingStatus').textContent = 'Current: 2x (Aggressive)';
    // Trigger search if results are already shown
    if (document.getElementById('resultsContainer').style.display === 'block') {
        document.getElementById('searchButton').click();
    }
});

document.getElementById('weighting-balanced').addEventListener('click', function() {
    currentWeighting = 1.5;
    document.getElementById('weighting-balanced').classList.add('active');
    document.getElementById('weighting-aggressive').classList.remove('active');
    document.getElementById('weightingStatus').textContent = 'Current: 1.5x (Balanced)';
    // Trigger search if results are already shown
    if (document.getElementById('resultsContainer').style.display === 'block') {
        document.getElementById('searchButton').click();
    }
});

// Function to recommend archetypes based on stat spread
function recommendArchetypes(stats) {
    // Filter archetypes to only include available ones (not disabled)
    const availableArchetypes = archetypes.filter(archetype => !disabledArchetypes.has(archetype.name));
    
    // Generate combinations of 5 archetypes to test
    // Test pure combinations (5x of one), mixed combinations, and smart heuristics
    const combinations = [];
    
    // Test 1: Pure combinations (5x of each archetype)
    availableArchetypes.forEach(archetype => {
        combinations.push(Array(5).fill(archetype.name));
    });
    
    // Test 2: Binary combinations (4x + 1x of different archetypes)
    for (let i = 0; i < availableArchetypes.length; i++) {
        for (let j = i + 1; j < availableArchetypes.length; j++) {
            const a1 = availableArchetypes[i].name;
            const a2 = availableArchetypes[j].name;
            combinations.push([a1, a1, a1, a1, a2]);
            combinations.push([a1, a1, a1, a2, a2]);
            combinations.push([a1, a1, a2, a2, a2]);
            combinations.push([a2, a2, a2, a2, a1]);
            combinations.push([a2, a2, a2, a1, a1]);
            combinations.push([a2, a2, a1, a1, a1]);
        }
    }
    
    // Test 3: Triple combinations (3x + 1x + 1x)
    for (let i = 0; i < availableArchetypes.length; i++) {
        for (let j = i + 1; j < availableArchetypes.length; j++) {
            for (let k = j + 1; k < availableArchetypes.length; k++) {
                const a1 = availableArchetypes[i].name;
                const a2 = availableArchetypes[j].name;
                const a3 = availableArchetypes[k].name;
                combinations.push([a1, a1, a1, a2, a3]);
                combinations.push([a2, a2, a2, a1, a3]);
                combinations.push([a3, a3, a3, a1, a2]);
                combinations.push([a1, a2, a2, a2, a3]);
                combinations.push([a1, a3, a3, a3, a2]);
            }
        }
    }
    
    // Evaluate each combination with enhanced scoring that considers achievable final stats
    let bestCombination = null;
    let bestScore = Infinity;
    
    combinations.forEach(combination => {
        try {
            // Calculate stats from this combination
            const resultStats = {
                'health': 0,
                'melee': 0,
                'grenade': 0,
                'super': 0,
                'class': 0,
                'weapons': 0
            };
            
            combination.forEach(archetypeName => {
                const archetype = archetypes.find(a => a.name === archetypeName);
                if (archetype) {
                    resultStats[archetype.primary] += 30;
                    resultStats[archetype.secondary] += 25;
                }
            });
            
            // Calculate base error score as fallback
            let baseErrorScore = 0;
            sliderIds.forEach(statId => {
                const diff = resultStats[statId] - stats[statId];
                
                if (stats[statId] === 0) {
                    baseErrorScore += Math.abs(diff) * 0.3;
                } else {
                    if (diff < 0) {
                        baseErrorScore += Math.abs(diff) * 2;
                    } else {
                        baseErrorScore += Math.abs(diff) * 0.5;
                    }
                }
            });
            
            // Try to get real final stats, but fallback to base if it fails
            let finalErrorScore = baseErrorScore;
            
            try {
                // **REAL SCORING: Simulate actual tertiary/mod/upgrade assignments**
                const { tertiary: tertiaries, mods: mods, upgrades: upgrades, tuning: tunings } = calculateTertiaryModsAndUpgrades(stats, combination);
                
                // Calculate what the ACTUAL final stats would be with these assignments
                const actualStats = { ...resultStats };
                
                // Add tertiary contributions (+20 each)
                tertiaries.forEach((statId) => {
                    if (statId) actualStats[statId] += 20;
                });
                
                // Add mod contributions (+10 each)
                mods.forEach((statId) => {
                    if (statId) actualStats[statId] += 10;
                });
                
                // Add upgrade contributions (+5 each)
                upgrades.forEach((statId) => {
                    if (statId) actualStats[statId] += 5;
                });
                
                // Add tuning contributions
                tunings.forEach((tuning) => {
                    if (tuning && typeof tuning === 'string') {
                        const parts = tuning.split('/');
                        if (parts.length === 2) {
                            const match1 = parts[0].match(/([+-])(\d+)\s*([A-Z]+)/);
                            if (match1) {
                                const sign = match1[1] === '+' ? 1 : -1;
                                const amount = parseInt(match1[2]);
                                const abbrev = match1[3];
                                const statId = sliderIds.find(id => statAbbreviations[id] === abbrev);
                                if (statId) actualStats[statId] += sign * amount;
                            }
                            
                            const match2 = parts[1].match(/([+-])(\d+)\s*([A-Z]+)/);
                            if (match2) {
                                const sign = match2[1] === '+' ? 1 : -1;
                                const amount = parseInt(match2[2]);
                                const abbrev = match2[3];
                                const statId = sliderIds.find(id => statAbbreviations[id] === abbrev);
                                if (statId) actualStats[statId] += sign * amount;
                            }
                        }
                    }
                });
                
                // Recalculate score based on actual stats
                finalErrorScore = 0;
                sliderIds.forEach(statId => {
                    const diff = actualStats[statId] - stats[statId];
                    
                    if (stats[statId] === 0) {
                        finalErrorScore += Math.abs(diff) * 0.3;
                    } else {
                        finalErrorScore += Math.abs(diff) * 1.0;
                        if (diff < -10) {
                            finalErrorScore += 500;
                        }
                    }
                });
            } catch (innerErr) {
                // If real calculation fails, use base score
                finalErrorScore = baseErrorScore * 1.2; // Slightly penalize to prefer ones that work
            }
            
            if (finalErrorScore < bestScore) {
                bestScore = finalErrorScore;
                bestCombination = combination;
            }
        } catch (e) {
            console.error('Error scoring combination:', combination, e);
        }
    });
    
    return bestCombination || [availableArchetypes[0].name, availableArchetypes[0].name, availableArchetypes[0].name, availableArchetypes[0].name, availableArchetypes[0].name];
}

// Function to calculate tertiary stats, mods, and upgrades for each armor piece
function calculateTertiaryModsAndUpgrades(desiredStats, recommendations) {
    // Calculate current stats from all recommendations
    const currentStats = {
        'health': 0,
        'melee': 0,
        'grenade': 0,
        'super': 0,
        'class': 0,
        'weapons': 0
    };
    
    // Track which stats each piece has
    const pieceStats = [];
    
    recommendations.forEach((archetypeName, index) => {
        const archetype = archetypes.find(a => a.name === archetypeName);
        if (archetype) {
            currentStats[archetype.primary] += 30;
            currentStats[archetype.secondary] += 25;
            pieceStats[index] = {
                primary: archetype.primary,
                secondary: archetype.secondary,
                name: archetypeName
            };
        }
    });
    
    // Calculate gaps for each stat
    const gaps = {};
    sliderIds.forEach(id => {
        gaps[id] = Math.max(0, desiredStats[id] - currentStats[id]);
    });
    
    // Assign tertiary stats and mods
    const tertiaryAssignments = new Array(5);
    const modAssignments = new Array(5);
    const upgradeAssignments = new Array(5);
    
    // Initialize all to null
    for (let i = 0; i < 5; i++) {
        tertiaryAssignments[i] = null;
        modAssignments[i] = null;
        upgradeAssignments[i] = null;
    }
    
    // Phase 1: Assign tertiary stats with smart compensation
    // Keep assigning tertiaries but stop when gap gets small enough for mods to handle
    let remainingTertiarySlots = 5;
    const assignedPieces = new Set();
    const assignedStats = new Set(); // Track which stats we've already tried and failed on
    
    while (remainingTertiarySlots > 0) {
        let highestGapStat = null;
        let highestGapValue = 0;
        
        // Find stat with highest remaining gap that we haven't already failed to assign
        sliderIds.forEach(statId => {
            if (gaps[statId] > highestGapValue && !assignedStats.has(statId)) {
                highestGapValue = gaps[statId];
                highestGapStat = statId;
            }
        });
        
        if (!highestGapStat || highestGapValue === 0) {
            break;
        }
        
        // Lookahead check: only assign tertiary if gap is >= 20
        // This ensures we don't stop prematurely when gap is exactly at the boundary
        if (highestGapValue < 20) {
            // If gap is less than 20, stop and let mods/tuning handle it precisely
            break;
        }
        
        // Find a piece where this stat isn't primary or secondary and isn't already assigned
        let foundPiece = -1;
        for (let index = 0; index < 5; index++) {
            if (!assignedPieces.has(index) && tertiaryAssignments[index] === null && pieceStats[index]) {
                const piece = pieceStats[index];
                if (highestGapStat !== piece.primary && highestGapStat !== piece.secondary) {
                    foundPiece = index;
                    break;
                }
            }
        }
        
        if (foundPiece === -1) {
            // Couldn't find a piece for this stat, mark it and try the next one
            assignedStats.add(highestGapStat);
            continue;
        }
        
        // Assign tertiary
        tertiaryAssignments[foundPiece] = highestGapStat;
        gaps[highestGapStat] -= 20;
        if (gaps[highestGapStat] < 0) gaps[highestGapStat] = 0;
        assignedPieces.add(foundPiece);
        remainingTertiarySlots--;
    }
    
    // Phase 2: Assign mods - be smart about not overshooting
    // For each piece, assign the +10 mod to whichever stat has the HIGHEST remaining gap
    for (let index = 0; index < 5; index++) {
        if (!pieceStats[index]) {
            modAssignments[index] = null;
            continue;
        }
        
        // Find the stat with the highest gap that we can safely assign a mod to
        let bestModStat = null;
        let bestModGap = -1;
        
        sliderIds.forEach(statId => {
            // Only assign +10 mod to stats with actual gaps >= 10
            if (gaps[statId] >= 10 && gaps[statId] > bestModGap) {
                bestModGap = gaps[statId];
                bestModStat = statId;
            }
        });
        
        // Assign mod to the stat with highest gap
        if (bestModStat && bestModGap >= 10) {
            // Extra check: avoid assigning if it would create excessive overshoot
            // but allow it if the gap is very small (close to filling)
            if (bestModGap < 5) {
                modAssignments[index] = null;
            } else {
                modAssignments[index] = bestModStat;
                gaps[bestModStat] -= 10;
                if (gaps[bestModStat] < 0) gaps[bestModStat] = 0;
            }
        } else {
            modAssignments[index] = null;
        }
    }
    
    // Phase 3: Assign upgrades (bonus stats) immediately when tertiary stats are found
    // Each upgrade can add 5 points to a stat per armor piece
    for (let index = 0; index < 5; index++) {
        // If a tertiary stat is assigned to this piece, immediately assign a bonus stat
        if (tertiaryAssignments[index] !== null && upgradeAssignments[index] === null && pieceStats[index]) {
            const piece = pieceStats[index];
            const usedStats = [piece.primary, piece.secondary, tertiaryAssignments[index]];
            
            // Don't use a stat that already has a mod assigned
            if (modAssignments[index]) {
                usedStats.push(modAssignments[index]);
            }
            
            // Find the stat with the highest gap among the remaining 3 upgradeable stats
            let bestUpgradeStat = null;
            let bestUpgradeGap = -1;
            
            const upgradeableStats = sliderIds.filter(stat => !usedStats.includes(stat));
            upgradeableStats.forEach(statId => {
                if (gaps[statId] > bestUpgradeGap) {
                    bestUpgradeGap = gaps[statId];
                    bestUpgradeStat = statId;
                }
            });
            
            // Assign the bonus stat to the stat with the highest gap (or first available if no gaps)
            if (!bestUpgradeStat && upgradeableStats.length > 0) {
                bestUpgradeStat = upgradeableStats[0];
            }
            
            if (bestUpgradeStat) {
                upgradeAssignments[index] = bestUpgradeStat;
                gaps[bestUpgradeStat] -= 5;
                if (gaps[bestUpgradeStat] < 0) gaps[bestUpgradeStat] = 0;
            }
        }
    }
    
    // Phase 3b: Continue assigning remaining upgrades if there are still gaps
    let remainingUpgradeSlots = 5;
    for (let index = 0; index < 5; index++) {
        if (upgradeAssignments[index] !== null) {
            remainingUpgradeSlots--;
        }
    }
    
    while (remainingUpgradeSlots > 0) {
        let highestGapStat = null;
        let highestGapValue = 0;
        
        sliderIds.forEach(statId => {
            if (gaps[statId] > highestGapValue) {
                highestGapValue = gaps[statId];
                highestGapStat = statId;
            }
        });
        
        if (!highestGapStat || highestGapValue === 0) {
            break;
        }
        
        // Calculate how many pieces we need to assign this stat to
        const piecesNeeded = Math.ceil(highestGapValue / 5);
        const maxPiecesAvailable = remainingUpgradeSlots;
        const piecesToAssign = Math.min(piecesNeeded, maxPiecesAvailable);
        
        let assignedCount = 0;
        
        for (let index = 0; index < 5 && assignedCount < piecesToAssign; index++) {
            // Only assign upgrades to pieces that have a tertiary stat
            if (upgradeAssignments[index] === null && pieceStats[index] && tertiaryAssignments[index] !== null) {
                const piece = pieceStats[index];
                const usedStats = [piece.primary, piece.secondary];
                if (tertiaryAssignments[index]) usedStats.push(tertiaryAssignments[index]);
                
                // Can only assign upgrade if this stat isn't already used as primary/secondary/tertiary
                // AND if this stat doesn't already have a mod assigned (to avoid redundant coverage)
                if (!usedStats.includes(highestGapStat) && modAssignments[index] !== highestGapStat) {
                    upgradeAssignments[index] = highestGapStat;
                    gaps[highestGapStat] -= 5;
                    if (gaps[highestGapStat] < 0) gaps[highestGapStat] = 0;
                    remainingUpgradeSlots--;
                    assignedCount++;
                }
            }
        }
        
        if (assignedCount === 0) {
            break;
        }
    }
    
    // Phase 4: Assign tuning slots (+5 to a needy stat, -5 from an excess stat)
    // Tuning should ONLY be used when there are actual gaps that upgrades/mods can't fill
    const tuningAssignments = new Array(5);
    for (let i = 0; i < 5; i++) {
        tuningAssignments[i] = null;
    }
    
    // First, calculate total stats from ALL pieces (without tuning) to see if we already meet all targets
    const globalCurrentTotals = {
        'health': 0,
        'melee': 0,
        'grenade': 0,
        'super': 0,
        'class': 0,
        'weapons': 0
    };
    
    recommendations.forEach((archetypeName, i) => {
        const archetype = archetypes.find(a => a.name === archetypeName);
        if (archetype) {
            globalCurrentTotals[archetype.primary] += 30;
            globalCurrentTotals[archetype.secondary] += 25;
        }
        
        if (tertiaryAssignments[i]) {
            globalCurrentTotals[tertiaryAssignments[i]] += 20;
        }
        if (modAssignments[i]) {
            globalCurrentTotals[modAssignments[i]] += 10;
        }
        if (upgradeAssignments[i]) {
            globalCurrentTotals[upgradeAssignments[i]] += 5;
            const archetype = archetypes.find(a => a.name === archetypeName);
            const usedStats = [archetype.primary, archetype.secondary];
            if (tertiaryAssignments[i]) usedStats.push(tertiaryAssignments[i]);
            const upgradeableStats = sliderIds.filter(stat => !usedStats.includes(stat));
            const otherUpgradeStats = upgradeableStats.filter(stat => stat !== upgradeAssignments[i]);
            otherUpgradeStats.forEach(stat => {
                globalCurrentTotals[stat] += 5;
            });
        }
    });
    
    // Check if we already meet all desired stats - if so, skip ALL tuning
    let allTargetsMet = true;
    sliderIds.forEach(statId => {
        if (desiredStats[statId] !== globalCurrentTotals[statId]) {
            allTargetsMet = false;
        }
    });
    
    if (allTargetsMet) {
        return {
            tertiary: tertiaryAssignments,
            mods: modAssignments,
            upgrades: upgradeAssignments,
            tuning: tuningAssignments
        };
    }
    
    // Find which stats still have gaps globally
    const globalGaps = {};
    sliderIds.forEach(statId => {
        globalGaps[statId] = Math.max(0, desiredStats[statId] - globalCurrentTotals[statId]);
    });
    
    // Track which stat gaps have been filled by tuning (to avoid redundant assignments)
    const filledByTuning = {};
    sliderIds.forEach(statId => {
        filledByTuning[statId] = 0;  // How much of the gap has been filled
    });
    
    for (let index = 0; index < 5; index++) {
        if (!pieceStats[index]) {
            continue;
        }
        
        // Check global gaps - only proceed if there are still unfilled gaps
        let hasUnfilledGap = false;
        let highestGapStat = null;
        let highestGapValue = 0;
        
        sliderIds.forEach(statId => {
            const remainingGap = globalGaps[statId] - filledByTuning[statId];
            if (remainingGap > 0) {
                hasUnfilledGap = true;
                if (remainingGap > highestGapValue) {
                    highestGapValue = remainingGap;
                    highestGapStat = statId;
                }
            }
        });
        
        // Skip if no gaps remain
        if (!hasUnfilledGap || !highestGapStat) {
            continue;
        }
        
        // Find a stat to nerf: PRIORITIZE stats with desiredStats === 0 (throwaway stats)
        let bestNerfStat = null;
        
        // FIRST: Find a stat with 0 on the slider (throwaway stat)
        sliderIds.forEach(statId => {
            if (statId !== highestGapStat && desiredStats[statId] === 0 && !bestNerfStat) {
                bestNerfStat = statId;
            }
        });
        
        // If no 0-slider stat exists, pick any stat that isn't the target
        if (!bestNerfStat) {
            sliderIds.forEach(statId => {
                if (statId !== highestGapStat && !bestNerfStat) {
                    bestNerfStat = statId;
                }
            });
        }
        
        if (bestNerfStat) {
            tuningAssignments[index] = {
                add: highestGapStat,
                subtract: bestNerfStat
            };
            // Mark that we've filled 5 points of this gap
            filledByTuning[highestGapStat] += 5;
            // Update global totals
            globalCurrentTotals[highestGapStat] += 5;
            globalCurrentTotals[bestNerfStat] -= 5;
        }
    }
    
    return {
        tertiary: tertiaryAssignments,
        mods: modAssignments,
        upgrades: upgradeAssignments,
        tuning: tuningAssignments
    };
}

// Function to calculate totals WITHOUT upgrade stats (for "Before Bonus" column)
function calculateTotalStatsBeforeBonus(recommendations, tertiaryRecommendations, modRecommendations, tuningRecommendations) {
    const totals = {
        'health': 0,
        'melee': 0,
        'grenade': 0,
        'super': 0,
        'class': 0,
        'weapons': 0
    };
    
    // For each armor piece
    armorSlots.forEach((slot, index) => {
        const archetypeName = recommendations[index];
        if (!archetypeName) return;
        
        const archetype = archetypes.find(a => a.name === archetypeName);
        if (archetype) {
            // Add primary stat (30 points)
            totals[archetype.primary] += 30;
            
            // Add secondary stat (25 points)
            totals[archetype.secondary] += 25;
        }
        
        // Add tertiary stat (20 points)
        if (tertiaryRecommendations[index]) {
            totals[tertiaryRecommendations[index]] += 20;
        }
        
        // Add mod recommendation (+10 points)
        if (modRecommendations[index]) {
            totals[modRecommendations[index]] += 10;
        }
        
        // Add tuning slot (+5 to one stat, -5 from another)
        if (tuningRecommendations[index]) {
            totals[tuningRecommendations[index].add] += 5;
            totals[tuningRecommendations[index].subtract] -= 5;
        }
    });
    
    return totals;
}

// Function to parse stat values from display text and calculate totals
function calculateTotalStats(recommendations, tertiaryRecommendations, modRecommendations, upgradeRecommendations, tuningRecommendations) {
    const totals = {
        'health': 0,
        'melee': 0,
        'grenade': 0,
        'super': 0,
        'class': 0,
        'weapons': 0
    };
    
    // For each armor piece
    armorSlots.forEach((slot, index) => {
        const archetypeName = recommendations[index];
        if (!archetypeName) return;
        
        const archetype = archetypes.find(a => a.name === archetypeName);
        if (archetype) {
            // Add primary stat (30 points)
            totals[archetype.primary] += 30;
            
            // Add secondary stat (25 points)
            totals[archetype.secondary] += 25;
        }
        
        // Add tertiary stat (20 points)
        if (tertiaryRecommendations[index]) {
            totals[tertiaryRecommendations[index]] += 20;
        }
        
        // Add mod recommendation (+10 points)
        if (modRecommendations[index]) {
            totals[modRecommendations[index]] += 10;
        }
        
        // Add upgrade stats (bonus stats)
        if (upgradeRecommendations[index]) {
            const upgradeStat = upgradeRecommendations[index];
            totals[upgradeStat] += 5;
            
            // Add 5 points to the other 2 upgradeable stats
            const archetype = archetypes.find(a => a.name === archetypeName);
            const usedStats = [archetype.primary, archetype.secondary];
            if (tertiaryRecommendations[index]) usedStats.push(tertiaryRecommendations[index]);
            
            const upgradeableStats = sliderIds.filter(stat => !usedStats.includes(stat));
            const otherUpgradeStats = upgradeableStats.filter(stat => stat !== upgradeStat);
            
            otherUpgradeStats.forEach(stat => {
                totals[stat] += 5;
            });
        }
        
        // Add tuning slot (+5 to one stat, -5 from another)
        if (tuningRecommendations[index]) {
            totals[tuningRecommendations[index].add] += 5;
            totals[tuningRecommendations[index].subtract] -= 5;
        }
    });
    
    return totals;
}

// Function to generate stat breakdown string for each stat
function generateStatBreakdown(recommendations, tertiaryRecommendations, modRecommendations, upgradeRecommendations, tuningRecommendations, fragmentBonuses) {
    const breakdowns = {
        'health': [],
        'melee': [],
        'grenade': [],
        'super': [],
        'class': [],
        'weapons': []
    };
    
    // For each armor piece, track its contributions to each stat
    armorSlots.forEach((slot, index) => {
        const archetypeName = recommendations[index];
        if (!archetypeName) return;
        
        const archetype = archetypes.find(a => a.name === archetypeName);
        
        if (archetype) {
            // Primary stat: 30 points
            breakdowns[archetype.primary].push(`30`);
            
            // Secondary stat: 25 points
            breakdowns[archetype.secondary].push(`25`);
            
            // Tertiary stat: 20 points
            if (tertiaryRecommendations[index]) {
                breakdowns[tertiaryRecommendations[index]].push(`20`);
            }
            
            // Mod (+10)
            if (modRecommendations[index]) {
                breakdowns[modRecommendations[index]].push(`10`);
            }
            
            // Upgrades (+5 each)
            if (upgradeRecommendations[index]) {
                const upgradeStat = upgradeRecommendations[index];
                breakdowns[upgradeStat].push(`5`);
                
                // Add 5 points to the other 2 upgradeable stats
                const usedStats = [archetype.primary, archetype.secondary];
                if (tertiaryRecommendations[index]) usedStats.push(tertiaryRecommendations[index]);
                
                const upgradeableStats = sliderIds.filter(stat => !usedStats.includes(stat));
                const otherUpgradeStats = upgradeableStats.filter(stat => stat !== upgradeStat);
                
                otherUpgradeStats.forEach(stat => {
                    breakdowns[stat].push(`5`);
                });
            }
            
            // Tuning slot
            if (tuningRecommendations[index]) {
                breakdowns[tuningRecommendations[index].add].push(`5`);
                breakdowns[tuningRecommendations[index].subtract].push(`-5`);
            }
        }
    });
    
    // Format each stat's breakdown as HTML, including fragments in red
    const formattedBreakdowns = {};
    sliderIds.forEach(statId => {
        let breakdownHtml = '';
        if (breakdowns[statId].length > 0) {
            breakdownHtml = breakdowns[statId].join(' + ');
        } else {
            breakdownHtml = '0';
        }
        
        // Add fragment bonus in red if present
        if (fragmentBonuses[statId] && fragmentBonuses[statId] !== 0) {
            const fragmentValue = fragmentBonuses[statId];
            const fragmentSign = fragmentValue >= 0 ? '+ ' : '';
            breakdownHtml += ` <span style="color: rgb(255, 50, 50);">+ ${fragmentValue}</span>`;
        }
        
        formattedBreakdowns[statId] = breakdownHtml;
    });
    
    return formattedBreakdowns;
}

// Handle Search Combos button
document.getElementById('searchButton').addEventListener('click', function() {
    const resultsContainer = document.getElementById('resultsContainer');
    const armorWrapper = document.getElementById('armorWrapper');
    const armorContainer = document.getElementById('armorContainer');
    const summaryResultsContainer = document.getElementById('summaryResultsContainer');
    let total = 0;
    let stats = {};
    let desiredStats = {};
    
    // Get desired stats from sliders
    sliderIds.forEach(id => {
        const value = parseInt(document.getElementById(`slider-${id}`).value);
        document.getElementById(`result-${id}`).textContent = value;
        stats[id] = value;
        desiredStats[id] = value;
        total += value;
    });
    
    // Get fragment bonuses
    const fragmentBonuses = {};
    sliderIds.forEach(id => {
        const fragmentInput = document.getElementById(`fragment-${id}`);
        fragmentBonuses[id] = fragmentInput ? parseInt(fragmentInput.value) || 0 : 0;
    });
    
    // Calculate effective stats (what armor needs to provide, subtracting fragments)
    const effectiveStats = {};
    sliderIds.forEach(id => {
        effectiveStats[id] = Math.max(0, desiredStats[id] - fragmentBonuses[id]);
    });
    
    document.getElementById('totalPoints').textContent = total;
    resultsContainer.style.display = 'block';
    
    // Get archetype recommendations based on EFFECTIVE stats (what armor needs to provide)
    // This ensures archetypes are chosen based on actual gaps after accounting for fragments
    const recommendations = recommendArchetypes(effectiveStats);
    
    // Calculate tertiary stats, mods, upgrades, and tuning based on EFFECTIVE stats
    // This ensures we only fill gaps that armor actually needs to cover
    const { tertiary: tertiaryRecommendations, mods: modRecommendations, upgrades: upgradeRecommendations, tuning: tuningRecommendations } = calculateTertiaryModsAndUpgrades(effectiveStats, recommendations);
    
    // Display recommendations in armor container
    armorSlots.forEach((slot, index) => {
        const archetypeElement = document.getElementById(`archetype-${slot}`);
        const statsElement = document.getElementById(`stats-${slot}`);
        const tertiaryElement = document.getElementById(`tertiary-${slot}`);
        const upgradeElement = document.getElementById(`upgrade-${slot}`);
        const modElement = document.getElementById(`mod-${slot}`);
        const archetypeName = recommendations[index];
        
        if (archetypeElement) {
            archetypeElement.textContent = archetypeName;
        }
        
        // Display stat details
        if (statsElement && archetypeName) {
            const archetype = archetypes.find(a => a.name === archetypeName);
            if (archetype) {
                const primaryAbbr = statAbbreviations[archetype.primary];
                const secondaryAbbr = statAbbreviations[archetype.secondary];
                statsElement.textContent = `30 ${primaryAbbr} | 25 ${secondaryAbbr}`;
            }
        }
        
        // Display tertiary stat
        if (tertiaryElement && tertiaryRecommendations[index]) {
            const tertiaryStat = tertiaryRecommendations[index];
            const tertiaryAbbr = statAbbreviations[tertiaryStat];
            tertiaryElement.textContent = `20 ${tertiaryAbbr}`;
        } else if (tertiaryElement) {
            tertiaryElement.textContent = '';
        }
        
        // Display upgrade stats only if upgrades are assigned to this piece
        if (upgradeElement && upgradeRecommendations[index]) {
            const archetype = archetypes.find(a => a.name === archetypeName);
            if (archetype) {
                // Find the 3 stats not used for primary, secondary, or tertiary (these are the upgrade slots)
                const usedStats = [archetype.primary, archetype.secondary];
                if (tertiaryRecommendations[index]) usedStats.push(tertiaryRecommendations[index]);
                
                const upgradeableStats = sliderIds.filter(stat => !usedStats.includes(stat));
                
                // Find the other 2 upgradeable stats (excluding the assigned upgrade)
                const assignedStat = upgradeRecommendations[index];
                const assignedAbbr = statAbbreviations[assignedStat];
                const otherUpgradeStats = upgradeableStats.filter(stat => stat !== assignedStat);
                const otherAbbrs = otherUpgradeStats.map(stat => statAbbreviations[stat]);
                
                // Display the assigned upgrade stat with +5, and the other two with 5 each
                const upgradeDisplayText = `+5 ${assignedAbbr} | 5 ${otherAbbrs[0]} | 5 ${otherAbbrs[1]}`;
                upgradeElement.textContent = upgradeDisplayText;
            }
        } else if (upgradeElement) {
            upgradeElement.textContent = '';
        }
        
        // Display mod recommendation
        if (modElement && modRecommendations[index]) {
            const modStat = modRecommendations[index];
            const modAbbr = statAbbreviations[modStat];
            modElement.textContent = `+10 ${modAbbr}`;
        } else if (modElement) {
            modElement.textContent = '';
        }
        
        // Display tuning slot recommendation
        const tuningElement = document.getElementById(`tuning-${slot}`);
        if (tuningElement && tuningRecommendations[index]) {
            const tuning = tuningRecommendations[index];
            const addAbbr = statAbbreviations[tuning.add];
            const subtractAbbr = statAbbreviations[tuning.subtract];
            tuningElement.textContent = `+5 ${addAbbr} / -5 ${subtractAbbr}`;
        } else if (tuningElement) {
            tuningElement.textContent = '';
        }
    });
    
    // Calculate and display summary totals
    const totalStatsBeforeBonus = calculateTotalStatsBeforeBonus(recommendations, tertiaryRecommendations, modRecommendations, tuningRecommendations);
    const totalStats = calculateTotalStats(recommendations, tertiaryRecommendations, modRecommendations, upgradeRecommendations, tuningRecommendations);
    
    sliderIds.forEach(statId => {
        const summaryFragmentElem = document.getElementById(`summary-${statId}-frag`);
        const summaryBefore = document.getElementById(`summary-${statId}-before`);
        const summaryBonus = document.getElementById(`summary-${statId}-bonus`);
        const summaryAfter = document.getElementById(`summary-${statId}-after`);
        const summaryFinal = document.getElementById(`summary-${statId}-final`);
        
        const fragmentBonus = fragmentBonuses[statId];
        const beforeBonusStats = totalStatsBeforeBonus[statId];
        const bonusStatContribution = totalStats[statId] - totalStatsBeforeBonus[statId];
        const afterBonusStats = totalStats[statId];
        const finalTotal = totalStats[statId] + fragmentBonus;
        
        if (summaryFragmentElem) {
            summaryFragmentElem.textContent = fragmentBonus >= 0 ? `+${fragmentBonus}` : fragmentBonus;
        }
        if (summaryBefore) {
            summaryBefore.textContent = beforeBonusStats;
        }
        if (summaryBonus) {
            summaryBonus.textContent = bonusStatContribution >= 0 ? `+${bonusStatContribution}` : bonusStatContribution;
        }
        if (summaryAfter) {
            summaryAfter.textContent = afterBonusStats;
        }
        if (summaryFinal) {
            summaryFinal.textContent = finalTotal;
        }
    });
    
    // Generate and display stat breakdown
    const statBreakdowns = generateStatBreakdown(recommendations, tertiaryRecommendations, modRecommendations, upgradeRecommendations, tuningRecommendations, fragmentBonuses);
    
    sliderIds.forEach(statId => {
        const breakdownElement = document.getElementById(`breakdown-${statId}`);
        if (breakdownElement) {
            breakdownElement.innerHTML = statBreakdowns[statId];
        }
    });
    
    // Re-attach click listeners to newly rendered armor cells
    initializeArmorCellClickListeners();
});

// ============================================
// NAVIGATION AND SETTINGS FUNCTIONALITY
// ============================================

// Navigation Setup
const navArmorPickerLink = document.getElementById('navArmorPicker');
const navSettingsLink = document.getElementById('navSettings');
const armorPickerContainer = document.getElementById('armorPickerContainer');
const settingsContainer = document.getElementById('settingsContainer');

// Function to switch pages
function switchPage(showPage) {
    // Hide all pages
    document.querySelectorAll('.page-container').forEach(container => {
        container.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected page and activate nav link
    if (showPage === 'armorPicker') {
        armorPickerContainer.classList.add('active');
        navArmorPickerLink.classList.add('active');
    } else if (showPage === 'settings') {
        settingsContainer.classList.add('active');
        navSettingsLink.classList.add('active');
    }
}

// Navigation event listeners
navArmorPickerLink.addEventListener('click', function(e) {
    e.preventDefault();
    switchPage('armorPicker');
    window.scrollTo(0, 0);
});

navSettingsLink.addEventListener('click', function(e) {
    e.preventDefault();
    switchPage('settings');
    window.scrollTo(0, 0);
});

// Load settings from localStorage
function loadSettings() {
    // Load color theme
    const savedTheme = localStorage.getItem('colorTheme') || 'gold';
    const themeSelect = document.getElementById('colorTheme');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        
        if (savedTheme === 'custom') {
            const customPrimary = localStorage.getItem('customPrimaryColor') || '#ffae00';
            const customDark = localStorage.getItem('customDarkColor') || '#1e1e1e';
            
            const primaryPicker = document.getElementById('customPrimaryColor');
            const darkPicker = document.getElementById('customDarkColor');
            const customSection = document.getElementById('customColorSection');
            
            if (primaryPicker) primaryPicker.value = customPrimary;
            if (darkPicker) darkPicker.value = customDark;
            if (customSection) customSection.style.display = 'block';
            
            document.getElementById('customPrimaryValue').textContent = customPrimary;
            document.getElementById('customDarkValue').textContent = customDark;
            
            applyCustomColor(customPrimary, customDark);
        } else {
            const customSection = document.getElementById('customColorSection');
            if (customSection) customSection.style.display = 'none';
            applyTheme(savedTheme);
        }
    }
    
    // Load default weighting
    const savedWeighting = localStorage.getItem('defaultWeighting') || '1.5';
    const weightingSelect = document.getElementById('defaultWeighting');
    if (weightingSelect) {
        weightingSelect.value = savedWeighting;
    }
}

// Apply theme colors
// Helper function to extract RGB values from "rgb(r, g, b)" string
function extractRGBValues(rgbString) {
    const match = rgbString.match(/\d+/g);
    return match ? match.join(', ') : '0, 0, 0';
}

function applyTheme(theme) {
    const root = document.documentElement;
    const themeColors = {
        'gold': {
            primary: 'rgb(255, 174, 0)',
            dark: 'rgb(30, 30, 30)',
            medium: 'rgb(50, 50, 50)',
            light: 'rgb(200, 130, 0)'
        },
        'blue': {
            primary: 'rgb(100, 150, 255)',
            dark: 'rgb(20, 30, 50)',
            medium: 'rgb(40, 60, 100)',
            light: 'rgb(150, 180, 255)'
        },
        'red': {
            primary: 'rgb(255, 100, 100)',
            dark: 'rgb(50, 20, 20)',
            medium: 'rgb(80, 40, 40)',
            light: 'rgb(255, 150, 150)'
        },
        'green': {
            primary: 'rgb(100, 255, 100)',
            dark: 'rgb(20, 50, 20)',
            medium: 'rgb(40, 100, 40)',
            light: 'rgb(150, 255, 150)'
        },
        'purple': {
            primary: 'rgb(200, 100, 255)',
            dark: 'rgb(40, 20, 60)',
            medium: 'rgb(70, 40, 110)',
            light: 'rgb(220, 150, 255)'
        },
        'cyan': {
            primary: 'rgb(0, 255, 255)',
            dark: 'rgb(10, 40, 50)',
            medium: 'rgb(30, 80, 100)',
            light: 'rgb(100, 220, 255)'
        },
        'cyan-aero': {
            primary: 'rgb(0, 255, 255)',
            dark: 'rgb(10, 30, 50)',
            medium: 'rgb(20, 60, 100)',
            light: 'rgb(176, 224, 230)',
            glowColor: 'rgb(0, 255, 255)',
            textPrimary: '#00ffff',
            textLight: '#b0e0e6',
            gradientButton: 'linear-gradient(135deg, rgba(0, 100, 150, 0.3) 0%, rgba(0, 80, 120, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(0, 150, 200, 0.5) 0%, rgba(0, 120, 150, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(10, 30, 50, 0.7) 0%, rgba(20, 60, 100, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(0, 100, 150, 0.5) 0%, rgba(0, 80, 120, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(0, 80, 150, 0.6) 0%, rgba(0, 60, 120, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(10, 50, 80, 0.6) 0%, rgba(20, 60, 100, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(10, 40, 70, 0.8) 0%, rgba(20, 70, 120, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(15, 50, 90, 0.7) 0%, rgba(25, 80, 130, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(0, 100, 150, 0.8) 0%, rgba(0, 80, 120, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(0, 80, 150, 0.6) 0%, rgba(0, 60, 120, 0.5) 100%)'
        },
        'magenta-aero': {
            primary: 'rgb(255, 0, 255)',
            dark: 'rgb(50, 15, 50)',
            medium: 'rgb(90, 30, 90)',
            light: 'rgb(255, 100, 255)',
            glowColor: 'rgb(255, 0, 255)',
            textPrimary: '#ff00ff',
            textLight: '#ff99ff',
            gradientButton: 'linear-gradient(135deg, rgba(100, 0, 100, 0.3) 0%, rgba(80, 0, 80, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(150, 0, 150, 0.5) 0%, rgba(120, 0, 120, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(50, 15, 50, 0.7) 0%, rgba(90, 30, 90, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(100, 0, 100, 0.5) 0%, rgba(80, 0, 80, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(120, 0, 120, 0.6) 0%, rgba(100, 0, 100, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(50, 15, 50, 0.6) 0%, rgba(90, 30, 90, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(40, 10, 40, 0.8) 0%, rgba(80, 20, 80, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(60, 20, 60, 0.7) 0%, rgba(100, 40, 100, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(100, 0, 100, 0.8) 0%, rgba(80, 0, 80, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(120, 0, 120, 0.6) 0%, rgba(100, 0, 100, 0.5) 100%)'
        },
        'yellow-aero': {
            primary: 'rgb(255, 255, 0)',
            dark: 'rgb(50, 50, 15)',
            medium: 'rgb(90, 90, 30)',
            light: 'rgb(255, 255, 100)',
            glowColor: 'rgb(255, 255, 0)',
            textPrimary: '#ffff00',
            textLight: '#ffff99',
            gradientButton: 'linear-gradient(135deg, rgba(150, 150, 0, 0.3) 0%, rgba(120, 120, 0, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(180, 180, 30, 0.5) 0%, rgba(150, 150, 20, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(50, 50, 15, 0.7) 0%, rgba(90, 90, 30, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(150, 150, 0, 0.5) 0%, rgba(120, 120, 0, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(180, 180, 30, 0.6) 0%, rgba(150, 150, 20, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(50, 50, 15, 0.6) 0%, rgba(90, 90, 30, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(40, 40, 10, 0.8) 0%, rgba(80, 80, 20, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(60, 60, 20, 0.7) 0%, rgba(100, 100, 40, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(150, 150, 0, 0.8) 0%, rgba(120, 120, 0, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(180, 180, 30, 0.6) 0%, rgba(150, 150, 20, 0.5) 100%)'
        },
        'green-aero': {
            primary: 'rgb(0, 255, 100)',
            dark: 'rgb(15, 50, 30)',
            medium: 'rgb(30, 90, 60)',
            light: 'rgb(100, 255, 150)',
            glowColor: 'rgb(0, 255, 100)',
            textPrimary: '#00ff64',
            textLight: '#99ff99',
            gradientButton: 'linear-gradient(135deg, rgba(0, 100, 40, 0.3) 0%, rgba(0, 80, 30, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(0, 150, 60, 0.5) 0%, rgba(0, 120, 50, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(15, 50, 30, 0.7) 0%, rgba(30, 90, 60, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(0, 100, 40, 0.5) 0%, rgba(0, 80, 30, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(0, 120, 60, 0.6) 0%, rgba(0, 100, 50, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(15, 50, 30, 0.6) 0%, rgba(30, 90, 60, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(10, 40, 20, 0.8) 0%, rgba(20, 80, 40, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(20, 60, 35, 0.7) 0%, rgba(40, 100, 70, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(0, 100, 40, 0.8) 0%, rgba(0, 80, 30, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(0, 120, 60, 0.6) 0%, rgba(0, 100, 50, 0.5) 100%)'
        },
        'orange-aero': {
            primary: 'rgb(255, 165, 0)',
            dark: 'rgb(50, 35, 15)',
            medium: 'rgb(90, 60, 30)',
            light: 'rgb(255, 200, 100)',
            glowColor: 'rgb(255, 165, 0)',
            textPrimary: '#ffa500',
            textLight: '#ffcc99',
            gradientButton: 'linear-gradient(135deg, rgba(150, 100, 0, 0.3) 0%, rgba(120, 80, 0, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(180, 130, 30, 0.5) 0%, rgba(150, 100, 20, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(50, 35, 15, 0.7) 0%, rgba(90, 60, 30, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(150, 100, 0, 0.5) 0%, rgba(120, 80, 0, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(180, 120, 30, 0.6) 0%, rgba(150, 100, 20, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(50, 35, 15, 0.6) 0%, rgba(90, 60, 30, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(40, 30, 10, 0.8) 0%, rgba(80, 50, 20, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(60, 45, 15, 0.7) 0%, rgba(100, 75, 35, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(150, 100, 0, 0.8) 0%, rgba(120, 80, 0, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(180, 120, 30, 0.6) 0%, rgba(150, 100, 20, 0.5) 100%)'
        },
        'purple-aero': {
            primary: 'rgb(200, 100, 255)',
            dark: 'rgb(40, 20, 60)',
            medium: 'rgb(70, 40, 110)',
            light: 'rgb(220, 150, 255)',
            glowColor: 'rgb(200, 100, 255)',
            textPrimary: '#c864ff',
            textLight: '#e6b3ff',
            gradientButton: 'linear-gradient(135deg, rgba(100, 50, 150, 0.3) 0%, rgba(80, 40, 120, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(130, 60, 180, 0.5) 0%, rgba(110, 50, 150, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(40, 20, 60, 0.7) 0%, rgba(70, 40, 110, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(100, 50, 150, 0.5) 0%, rgba(80, 40, 120, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(120, 60, 180, 0.6) 0%, rgba(100, 50, 150, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(40, 20, 60, 0.6) 0%, rgba(70, 40, 110, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(30, 15, 50, 0.8) 0%, rgba(60, 30, 100, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(50, 25, 75, 0.7) 0%, rgba(90, 45, 130, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(100, 50, 150, 0.8) 0%, rgba(80, 40, 120, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(120, 60, 180, 0.6) 0%, rgba(100, 50, 150, 0.5) 100%)'
        },
        'custom-aero': {
            primary: 'rgb(0, 255, 255)',
            dark: 'rgb(15, 30, 50)',
            medium: 'rgb(30, 60, 90)',
            light: 'rgb(100, 220, 255)',
            gradientButton: 'linear-gradient(135deg, rgba(0, 100, 150, 0.3) 0%, rgba(0, 80, 120, 0.2) 100%)',
            gradientButtonHover: 'linear-gradient(135deg, rgba(0, 150, 200, 0.5) 0%, rgba(0, 120, 150, 0.3) 100%)',
            gradientTable: 'linear-gradient(135deg, rgba(15, 30, 50, 0.7) 0%, rgba(30, 60, 90, 0.5) 100%)',
            gradientTh: 'linear-gradient(135deg, rgba(0, 100, 150, 0.5) 0%, rgba(0, 80, 120, 0.4) 100%)',
            gradientTrHover: 'linear-gradient(135deg, rgba(0, 80, 150, 0.6) 0%, rgba(0, 60, 120, 0.5) 100%)',
            gradientInput: 'linear-gradient(135deg, rgba(15, 50, 80, 0.6) 0%, rgba(30, 60, 100, 0.4) 100%)',
            gradientContainer: 'linear-gradient(135deg, rgba(10, 25, 40, 0.8) 0%, rgba(20, 50, 80, 0.6) 100%)',
            gradientArmorItem: 'linear-gradient(135deg, rgba(20, 40, 60, 0.7) 0%, rgba(40, 80, 120, 0.5) 100%)',
            gradientArmorItemHover: 'linear-gradient(135deg, rgba(0, 100, 150, 0.8) 0%, rgba(0, 80, 120, 0.6) 100%)',
            gradientH1: 'linear-gradient(135deg, rgba(0, 80, 150, 0.6) 0%, rgba(0, 60, 120, 0.5) 100%)'
        },
        'orange': {
            primary: 'rgb(255, 140, 0)',
            dark: 'rgb(50, 30, 10)',
            medium: 'rgb(100, 70, 20)',
            light: 'rgb(255, 200, 100)'
        },
        'pink': {
            primary: 'rgb(255, 100, 200)',
            dark: 'rgb(50, 20, 40)',
            medium: 'rgb(100, 40, 80)',
            light: 'rgb(255, 150, 220)'
        },
        'teal': {
            primary: 'rgb(0, 200, 150)',
            dark: 'rgb(10, 40, 35)',
            medium: 'rgb(30, 80, 70)',
            light: 'rgb(100, 255, 200)'
        },
        // Destiny Faction Themes
        'vex': {
            primary: 'rgb(200, 160, 80)',
            dark: 'rgb(15, 25, 35)',
            medium: 'rgb(35, 45, 55)',
            light: 'rgb(255, 200, 100)'
        },
        'cabal': {
            primary: 'rgb(220, 60, 40)',
            dark: 'rgb(35, 15, 10)',
            medium: 'rgb(70, 25, 20)',
            light: 'rgb(255, 100, 80)'
        },
        'hive': {
            primary: 'rgb(150, 200, 80)',
            dark: 'rgb(30, 25, 40)',
            medium: 'rgb(50, 45, 70)',
            light: 'rgb(200, 255, 120)'
        },
        'taken': {
            primary: 'rgb(150, 80, 200)',
            dark: 'rgb(20, 10, 35)',
            medium: 'rgb(40, 25, 70)',
            light: 'rgb(200, 150, 255)'
        },
        'dreaming': {
            primary: 'rgb(180, 120, 200)',
            dark: 'rgb(25, 15, 40)',
            medium: 'rgb(50, 35, 75)',
            light: 'rgb(220, 180, 255)'
        },
        'gambit': {
            primary: 'rgb(200, 100, 40)',
            dark: 'rgb(35, 25, 15)',
            medium: 'rgb(60, 40, 25)',
            light: 'rgb(255, 150, 80)'
        },
        'lightbearer': {
            primary: 'rgb(200, 220, 255)',
            dark: 'rgb(15, 25, 45)',
            medium: 'rgb(35, 50, 80)',
            light: 'rgb(240, 250, 255)'
        }
    };
    
    const colors = themeColors[theme];
    if (colors) {
        root.style.setProperty('--primary-color', colors.primary);
        root.style.setProperty('--dark-bg', colors.dark);
        root.style.setProperty('--medium-bg', colors.medium);
        root.style.setProperty('--light-color', colors.light);
        
        // Also set RGB component variables for rgba() support
        root.style.setProperty('--primary-rgb', extractRGBValues(colors.primary));
        root.style.setProperty('--dark-rgb', extractRGBValues(colors.dark));
        root.style.setProperty('--medium-rgb', extractRGBValues(colors.medium));
        root.style.setProperty('--light-rgb', extractRGBValues(colors.light));
        
        // Set gradient variables if they exist
        if (colors.gradientButton) {
            root.style.setProperty('--gradient-button', colors.gradientButton);
            root.style.setProperty('--gradient-button-hover', colors.gradientButtonHover);
            root.style.setProperty('--gradient-table', colors.gradientTable);
            root.style.setProperty('--gradient-th', colors.gradientTh);
            root.style.setProperty('--gradient-tr-hover', colors.gradientTrHover);
            root.style.setProperty('--gradient-input', colors.gradientInput);
            root.style.setProperty('--gradient-container', colors.gradientContainer);
            root.style.setProperty('--gradient-armor-item', colors.gradientArmorItem);
            root.style.setProperty('--gradient-armor-item-hover', colors.gradientArmorItemHover);
            root.style.setProperty('--gradient-h1', colors.gradientH1);
            
            // Set glow and text colors for Aero themes
            if (colors.glowColor) {
                const glowRgb = extractRGBValues(colors.glowColor);
                root.style.setProperty('--glow-color-rgb', glowRgb);
                console.log(`Applied glow color: ${colors.glowColor} -> ${glowRgb}`);
            }
            if (colors.textPrimary) {
                root.style.setProperty('--text-primary-color', colors.textPrimary);
            }
            if (colors.textLight) {
                root.style.setProperty('--text-light-color', colors.textLight);
            }
        }
        
        localStorage.setItem('colorTheme', theme);
    }
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : null;
}

// Helper function to lighten a color (for the --light-color variant)
function lightenColor(hex, percent) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Apply custom color theme with primary and dark background
function applyCustomColor(hexPrimary, hexDark) {
    const root = document.documentElement;
    const primaryRgb = hexToRgb(hexPrimary);
    const darkRgb = hexToRgb(hexDark);
    const mediumRgb = blendColors(darkRgb, 'rgb(100, 100, 100)', 0.6); // Medium is blend of dark and gray
    const lightRgb = lightenColor(hexPrimary, 40);
    
    if (primaryRgb && darkRgb) {
        root.style.setProperty('--primary-color', primaryRgb);
        root.style.setProperty('--dark-bg', darkRgb);
        root.style.setProperty('--medium-bg', mediumRgb);
        root.style.setProperty('--light-color', lightRgb);
        
        // Also set RGB component variables for rgba() support
        root.style.setProperty('--primary-rgb', extractRGBValues(primaryRgb));
        root.style.setProperty('--dark-rgb', extractRGBValues(darkRgb));
        root.style.setProperty('--medium-rgb', extractRGBValues(mediumRgb));
        root.style.setProperty('--light-rgb', extractRGBValues(lightRgb));
        
        localStorage.setItem('colorTheme', 'custom');
        localStorage.setItem('customPrimaryColor', hexPrimary);
        localStorage.setItem('customDarkColor', hexDark);
    }
}

// Helper to blend two RGB colors
function blendColors(rgb1, rgb2, weight) {
    const match1 = rgb1.match(/\d+/g);
    const match2 = rgb2.match(/\d+/g);
    
    if (!match1 || !match2) return rgb1;
    
    const r = Math.round(parseInt(match1[0]) * weight + parseInt(match2[0]) * (1 - weight));
    const g = Math.round(parseInt(match1[1]) * weight + parseInt(match2[1]) * (1 - weight));
    const b = Math.round(parseInt(match1[2]) * weight + parseInt(match2[2]) * (1 - weight));
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Theme change handler
const themeSelect = document.getElementById('colorTheme');
if (themeSelect) {
    themeSelect.addEventListener('change', function() {
        const customSection = document.getElementById('customColorSection');
        
        // Only show custom section if not in aero mode
        if (this.value === 'custom' && !isInAeroMode) {
            // Show custom color picker section
            if (customSection) customSection.style.display = 'block';
            
            const primaryPicker = document.getElementById('customPrimaryColor');
            const darkPicker = document.getElementById('customDarkColor');
            if (primaryPicker && darkPicker) {
                applyCustomColor(primaryPicker.value, darkPicker.value);
            }
        } else {
            // Hide custom color picker section
            if (customSection) customSection.style.display = 'none';
            applyTheme(this.value);
        }
    });
}

// Apply custom Aero theme colors with glow effects
function applyCustomAeroColor(hexPrimary, hexDark, hexGlow, hexTextPrimary, hexTextLight) {
    const root = document.documentElement;
    const primaryRgb = hexToRgb(hexPrimary);
    const darkRgb = hexToRgb(hexDark);
    const mediumRgb = blendColors(darkRgb, 'rgb(100, 150, 180)', 0.7); // Lighter medium for Aero
    const lightRgb = lightenColor(hexPrimary, 50); // Brighter light for Aero glow
    const glowRgb = hexToRgb(hexGlow || hexPrimary);
    
    if (primaryRgb && darkRgb && glowRgb) {
        root.style.setProperty('--primary-color', primaryRgb);
        root.style.setProperty('--dark-bg', darkRgb);
        root.style.setProperty('--medium-bg', mediumRgb);
        root.style.setProperty('--light-color', lightRgb);
        
        // Also set RGB component variables for rgba() support
        root.style.setProperty('--primary-rgb', extractRGBValues(primaryRgb));
        root.style.setProperty('--dark-rgb', extractRGBValues(darkRgb));
        root.style.setProperty('--medium-rgb', extractRGBValues(mediumRgb));
        root.style.setProperty('--light-rgb', extractRGBValues(lightRgb));
        
        // Set glow color and text color variables
        root.style.setProperty('--glow-color-rgb', extractRGBValues(glowRgb));
        root.style.setProperty('--text-primary-color', hexTextPrimary || hexPrimary);
        root.style.setProperty('--text-light-color', hexTextLight || lightenColor(hexPrimary, 40));
        
        // Generate and set gradient variables based on custom colors
        const darkRgbStr = extractRGBValues(darkRgb);
        const mediumRgbStr = extractRGBValues(mediumRgb);
        const primaryRgbStr = extractRGBValues(primaryRgb);
        
        // Lighter gradient colors for blending effects
        const lightenedMedium = lightenColor(hexDark, 30);
        const lightenedMediumRgb = extractRGBValues(lightenedMedium);
        const lightenedDark = lightenColor(hexDark, 15);
        const lightenedDarkRgb = extractRGBValues(lightenedDark);
        
        root.style.setProperty('--gradient-button', `linear-gradient(135deg, rgba(${lightenedMediumRgb}, 0.3) 0%, rgba(${lightenedDarkRgb}, 0.2) 100%)`);
        root.style.setProperty('--gradient-button-hover', `linear-gradient(135deg, rgba(${primaryRgbStr}, 0.5) 0%, rgba(${lightenedMediumRgb}, 0.3) 100%)`);
        root.style.setProperty('--gradient-table', `linear-gradient(135deg, rgba(${darkRgbStr}, 0.7) 0%, rgba(${mediumRgbStr}, 0.5) 100%)`);
        root.style.setProperty('--gradient-th', `linear-gradient(135deg, rgba(${lightenedMediumRgb}, 0.5) 0%, rgba(${lightenedDarkRgb}, 0.4) 100%)`);
        root.style.setProperty('--gradient-tr-hover', `linear-gradient(135deg, rgba(${lightenedMediumRgb}, 0.6) 0%, rgba(${lightenedDarkRgb}, 0.5) 100%)`);
        root.style.setProperty('--gradient-input', `linear-gradient(135deg, rgba(${darkRgbStr}, 0.6) 0%, rgba(${mediumRgbStr}, 0.4) 100%)`);
        root.style.setProperty('--gradient-container', `linear-gradient(135deg, rgba(${darkRgbStr}, 0.8) 0%, rgba(${mediumRgbStr}, 0.6) 100%)`);
        root.style.setProperty('--gradient-armor-item', `linear-gradient(135deg, rgba(${darkRgbStr}, 0.7) 0%, rgba(${mediumRgbStr}, 0.5) 100%)`);
        root.style.setProperty('--gradient-armor-item-hover', `linear-gradient(135deg, rgba(${lightenedMediumRgb}, 0.8) 0%, rgba(${lightenedDarkRgb}, 0.6) 100%)`);
        root.style.setProperty('--gradient-h1', `linear-gradient(135deg, rgba(${lightenedMediumRgb}, 0.6) 0%, rgba(${lightenedDarkRgb}, 0.5) 100%)`);
        
        localStorage.setItem('aeroTheme', 'custom-aero');
        localStorage.setItem('customAeroPrimaryColor', hexPrimary);
        localStorage.setItem('customAeroDarkColor', hexDark);
        localStorage.setItem('customAeroGlowColor', hexGlow || hexPrimary);
        localStorage.setItem('customAeroTextPrimary', hexTextPrimary || hexPrimary);
        localStorage.setItem('customAeroTextLight', hexTextLight || lightenColor(hexPrimary, 40));
    }
}

// Page style change handler
const styleSelect = document.getElementById('pageStyle');
if (styleSelect) {
    styleSelect.addEventListener('change', function() {
        const body = document.body;
        // Remove all style classes
        body.classList.remove('style-default', 'style-vex', 'style-cabal', 'style-hive', 'style-taken', 'style-dreaming', 'style-gambit', 'style-guardian');
        // Add new style class
        if (this.value !== 'default') {
            body.classList.add('style-' + this.value);
        } else {
            body.classList.add('style-default');
        }
        // Save preference to localStorage
        localStorage.setItem('pageStyle', this.value);
    });
}

// Load saved page style on page load
function loadPageStyle() {
    const savedStyle = localStorage.getItem('pageStyle') || 'default';
    const styleSelect = document.getElementById('pageStyle');
    if (styleSelect) {
        styleSelect.value = savedStyle;
        const body = document.body;
        body.classList.remove('style-default', 'style-vex', 'style-cabal', 'style-hive', 'style-taken', 'style-dreaming', 'style-gambit', 'style-guardian');
        body.classList.add('style-' + savedStyle);
    }
}

// Track previous theme for aesthetic toggle
let previousTheme = 'gold';
let isInAeroMode = false;

// Aesthetic style change handler
const aestheticSelect = document.getElementById('aestheticStyle');
if (aestheticSelect) {
    aestheticSelect.addEventListener('change', function() {
        const body = document.body;
        const themeSelect = document.getElementById('colorTheme');
        const colorThemeContainer = document.getElementById('colorThemeContainer');
        const aeroThemeContainer = document.getElementById('aeroThemeContainer');
        const customColorSection = document.getElementById('customColorSection');
        const customAeroColorSection = document.getElementById('customAeroColorSection');
        
        // Remove all aesthetic classes
        body.classList.remove('aesthetic-frutiger-aero');
        
        // Handle Frutiger Aero aesthetic
        if (this.value === 'frutiger-aero') {
            body.classList.add('aesthetic-frutiger-aero');
            isInAeroMode = true;
            
            // Hide Color Theme, show Aero Theme
            colorThemeContainer.style.display = 'none';
            aeroThemeContainer.style.display = 'block';
            // Hide custom color section
            if (customColorSection) customColorSection.style.display = 'none';
            
            // Store current theme before switching
            previousTheme = themeSelect.value;
            
            // Restore saved aero theme or default to cyan-aero
            const savedAeroTheme = localStorage.getItem('aeroTheme') || 'cyan-aero';
            const aeroThemeSelect = document.getElementById('aeroTheme');
            if (aeroThemeSelect) {
                aeroThemeSelect.value = savedAeroTheme;
            }
            
            // Apply the saved aero theme
            if (savedAeroTheme === 'custom-aero') {
                const customAeroPrimary = localStorage.getItem('customAeroPrimaryColor') || '#00ffff';
                const customAeroDark = localStorage.getItem('customAeroDarkColor') || '#0f1e32';
                const customAeroGlow = localStorage.getItem('customAeroGlowColor') || '#00ffff';
                const customAeroTextPrimary = localStorage.getItem('customAeroTextPrimary') || '#00ffff';
                const customAeroTextLight = localStorage.getItem('customAeroTextLight') || '#b0e0e6';
                if (customAeroColorSection) customAeroColorSection.style.display = 'block';
                
                // Update color pickers with saved values
                const primaryPicker = document.getElementById('customAeroPrimaryColor');
                const darkPicker = document.getElementById('customAeroDarkColor');
                const glowPicker = document.getElementById('customAeroGlowColor');
                const textPrimaryPicker = document.getElementById('customAeroTextColor');
                const textLightPicker = document.getElementById('customAeroLightTextColor');
                if (primaryPicker) primaryPicker.value = customAeroPrimary;
                if (darkPicker) darkPicker.value = customAeroDark;
                if (glowPicker) glowPicker.value = customAeroGlow;
                if (textPrimaryPicker) textPrimaryPicker.value = customAeroTextPrimary;
                if (textLightPicker) textLightPicker.value = customAeroTextLight;
                
                // Update display text values
                const primaryValue = document.getElementById('customAeroPrimaryValue');
                const darkValue = document.getElementById('customAeroDarkValue');
                const glowValue = document.getElementById('customAeroGlowValue');
                const textValue = document.getElementById('customAeroTextValue');
                const lightValue = document.getElementById('customAeroLightTextValue');
                if (primaryValue) primaryValue.textContent = customAeroPrimary;
                if (darkValue) darkValue.textContent = customAeroDark;
                if (glowValue) glowValue.textContent = customAeroGlow;
                if (textValue) textValue.textContent = customAeroTextPrimary;
                if (lightValue) lightValue.textContent = customAeroTextLight;
                
                applyCustomAeroColor(customAeroPrimary, customAeroDark, customAeroGlow, customAeroTextPrimary, customAeroTextLight);
            } else {
                if (customAeroColorSection) customAeroColorSection.style.display = 'none';
                applyTheme(savedAeroTheme);
            }
        } else if (this.value !== 'none') {
            body.classList.add('aesthetic-' + this.value);
            isInAeroMode = false;
            
            // Show Color Theme, hide Aero Theme
            colorThemeContainer.style.display = 'block';
            aeroThemeContainer.style.display = 'none';
            // Hide custom aero section
            if (customAeroColorSection) customAeroColorSection.style.display = 'none';
        } else {
            // Show Color Theme, hide Aero Theme
            colorThemeContainer.style.display = 'block';
            aeroThemeContainer.style.display = 'none';
            // Hide custom aero section
            if (customAeroColorSection) customAeroColorSection.style.display = 'none';
            
            // Restore previous theme when aesthetic is turned off
            if (isInAeroMode) {
                isInAeroMode = false;
                
                if (previousTheme === 'custom') {
                    // Restore custom colors from localStorage
                    const customPrimary = localStorage.getItem('customPrimaryColor') || '#ffae00';
                    const customDark = localStorage.getItem('customDarkColor') || '#1e1e1e';
                    
                    // Update color pickers with saved values
                    const primaryPicker = document.getElementById('customPrimaryColor');
                    const darkPicker = document.getElementById('customDarkColor');
                    if (primaryPicker) primaryPicker.value = customPrimary;
                    if (darkPicker) darkPicker.value = customDark;
                    
                    applyCustomColor(customPrimary, customDark);
                    if (customColorSection) customColorSection.style.display = 'block';
                } else {
                    applyTheme(previousTheme);
                }
                
                themeSelect.value = previousTheme;
            }
        }
        // Save preference to localStorage
        localStorage.setItem('aestheticStyle', this.value);
    });
}

// Aero theme change handler
const aeroThemeSelect = document.getElementById('aeroTheme');
if (aeroThemeSelect) {
    aeroThemeSelect.addEventListener('change', function() {
        const customAeroSection = document.getElementById('customAeroColorSection');
        
        if (this.value === 'custom-aero') {
            // Show custom aero color picker
            if (customAeroSection) customAeroSection.style.display = 'block';
            
            // Load saved custom aero colors or use defaults
            const customAeroPrimary = localStorage.getItem('customAeroPrimaryColor') || '#00ffff';
            const customAeroDark = localStorage.getItem('customAeroDarkColor') || '#0f1e32';
            const customAeroGlow = localStorage.getItem('customAeroGlowColor') || '#00ffff';
            const customAeroTextPrimary = localStorage.getItem('customAeroTextPrimary') || '#00ffff';
            const customAeroTextLight = localStorage.getItem('customAeroTextLight') || '#b0e0e6';
            
            // Update color pickers with saved values
            const primaryPicker = document.getElementById('customAeroPrimaryColor');
            const darkPicker = document.getElementById('customAeroDarkColor');
            const glowPicker = document.getElementById('customAeroGlowColor');
            const textPrimaryPicker = document.getElementById('customAeroTextColor');
            const textLightPicker = document.getElementById('customAeroLightTextColor');
            if (primaryPicker) primaryPicker.value = customAeroPrimary;
            if (darkPicker) darkPicker.value = customAeroDark;
            if (glowPicker) glowPicker.value = customAeroGlow;
            if (textPrimaryPicker) textPrimaryPicker.value = customAeroTextPrimary;
            if (textLightPicker) textLightPicker.value = customAeroTextLight;
            
            // Update display text values
            const primaryValue = document.getElementById('customAeroPrimaryValue');
            const darkValue = document.getElementById('customAeroDarkValue');
            const glowValue = document.getElementById('customAeroGlowValue');
            const textValue = document.getElementById('customAeroTextValue');
            const lightValue = document.getElementById('customAeroLightTextValue');
            if (primaryValue) primaryValue.textContent = customAeroPrimary;
            if (darkValue) darkValue.textContent = customAeroDark;
            if (glowValue) glowValue.textContent = customAeroGlow;
            if (textValue) textValue.textContent = customAeroTextPrimary;
            if (lightValue) lightValue.textContent = customAeroTextLight;
            
            applyCustomAeroColor(customAeroPrimary, customAeroDark, customAeroGlow, customAeroTextPrimary, customAeroTextLight);
        } else {
            // Hide custom aero color picker for predefined themes
            if (customAeroSection) customAeroSection.style.display = 'none';
            applyTheme(this.value);
        }
        
        // Save aero theme preference
        localStorage.setItem('aeroTheme', this.value);
    });
}
function loadAestheticStyle() {
    const savedAesthetic = localStorage.getItem('aestheticStyle') || 'none';
    const aestheticSelect = document.getElementById('aestheticStyle');
    const themeSelect = document.getElementById('colorTheme');
    const colorThemeContainer = document.getElementById('colorThemeContainer');
    const aeroThemeContainer = document.getElementById('aeroThemeContainer');
    
    if (aestheticSelect) {
        aestheticSelect.value = savedAesthetic;
        const body = document.body;
        body.classList.remove('aesthetic-frutiger-aero');
        
        if (savedAesthetic !== 'none') {
            body.classList.add('aesthetic-' + savedAesthetic);
            // If Frutiger Aero was saved, apply aero theme and show Aero Theme container
            if (savedAesthetic === 'frutiger-aero') {
                isInAeroMode = true;
                
                // Load saved aero theme or default to cyan-aero
                const savedAeroTheme = localStorage.getItem('aeroTheme') || 'cyan-aero';
                const aeroThemeSelect = document.getElementById('aeroTheme');
                if (aeroThemeSelect) {
                    aeroThemeSelect.value = savedAeroTheme;
                }
                
                // Apply the aero theme
                if (savedAeroTheme === 'custom-aero') {
                    const customAeroPrimary = localStorage.getItem('customAeroPrimaryColor') || '#00ffff';
                    const customAeroDark = localStorage.getItem('customAeroDarkColor') || '#0f1e32';
                    const customAeroGlow = localStorage.getItem('customAeroGlowColor') || '#00ffff';
                    const customAeroTextPrimary = localStorage.getItem('customAeroTextPrimary') || '#00ffff';
                    const customAeroTextLight = localStorage.getItem('customAeroTextLight') || '#b0e0e6';
                    const customAeroSection = document.getElementById('customAeroColorSection');
                    if (customAeroSection) customAeroSection.style.display = 'block';
                    
                    // Update color pickers with saved values
                    const primaryPicker = document.getElementById('customAeroPrimaryColor');
                    const darkPicker = document.getElementById('customAeroDarkColor');
                    const glowPicker = document.getElementById('customAeroGlowColor');
                    const textPrimaryPicker = document.getElementById('customAeroTextColor');
                    const textLightPicker = document.getElementById('customAeroLightTextColor');
                    if (primaryPicker) primaryPicker.value = customAeroPrimary;
                    if (darkPicker) darkPicker.value = customAeroDark;
                    if (glowPicker) glowPicker.value = customAeroGlow;
                    if (textPrimaryPicker) textPrimaryPicker.value = customAeroTextPrimary;
                    if (textLightPicker) textLightPicker.value = customAeroTextLight;
                    
                    // Update display text values
                    const primaryValue = document.getElementById('customAeroPrimaryValue');
                    const darkValue = document.getElementById('customAeroDarkValue');
                    const glowValue = document.getElementById('customAeroGlowValue');
                    const textValue = document.getElementById('customAeroTextValue');
                    const lightValue = document.getElementById('customAeroLightTextValue');
                    if (primaryValue) primaryValue.textContent = customAeroPrimary;
                    if (darkValue) darkValue.textContent = customAeroDark;
                    if (glowValue) glowValue.textContent = customAeroGlow;
                    if (textValue) textValue.textContent = customAeroTextPrimary;
                    if (lightValue) lightValue.textContent = customAeroTextLight;
                    
                    applyCustomAeroColor(customAeroPrimary, customAeroDark, customAeroGlow, customAeroTextPrimary, customAeroTextLight);
                } else {
                    applyTheme(savedAeroTheme);
                }
                
                themeSelect.value = savedAeroTheme;
                colorThemeContainer.style.display = 'none';
                aeroThemeContainer.style.display = 'block';
            }
        } else {
            // Show Color Theme container by default
            isInAeroMode = false;
            colorThemeContainer.style.display = 'block';
            aeroThemeContainer.style.display = 'none';
        }
    }
}

// Call on page load
loadPageStyle();
loadAestheticStyle();

// Custom primary color picker handler
const customPrimaryPicker = document.getElementById('customPrimaryColor');
if (customPrimaryPicker) {
    customPrimaryPicker.addEventListener('input', function() {
        document.getElementById('customPrimaryValue').textContent = this.value;
        const themeSelect = document.getElementById('colorTheme');
        if (themeSelect && themeSelect.value === 'custom') {
            const darkPicker = document.getElementById('customDarkColor');
            applyCustomColor(this.value, darkPicker.value);
        }
    });
}

// Custom dark color picker handler
const customDarkPicker = document.getElementById('customDarkColor');
if (customDarkPicker) {
    customDarkPicker.addEventListener('input', function() {
        document.getElementById('customDarkValue').textContent = this.value;
        const themeSelect = document.getElementById('colorTheme');
        if (themeSelect && themeSelect.value === 'custom') {
            const primaryPicker = document.getElementById('customPrimaryColor');
            applyCustomColor(primaryPicker.value, this.value);
        }
    });
}

// Reset custom color theme button handler
const resetCustomColorButton = document.getElementById('resetCustomColorButton');
if (resetCustomColorButton) {
    resetCustomColorButton.addEventListener('click', function() {
        const defaultPrimary = '#ffae00';
        const defaultDark = '#1e1e1e';
        
        // Update color pickers
        const primaryPicker = document.getElementById('customPrimaryColor');
        const darkPicker = document.getElementById('customDarkColor');
        
        if (primaryPicker) primaryPicker.value = defaultPrimary;
        if (darkPicker) darkPicker.value = defaultDark;
        
        // Update value displays
        document.getElementById('customPrimaryValue').textContent = defaultPrimary;
        document.getElementById('customDarkValue').textContent = defaultDark;
        
        // Apply the default colors
        applyCustomColor(defaultPrimary, defaultDark);
    });
}

// Custom Aero primary color picker handler
const customAeroPrimaryPicker = document.getElementById('customAeroPrimaryColor');
if (customAeroPrimaryPicker) {
    customAeroPrimaryPicker.addEventListener('input', function() {
        document.getElementById('customAeroPrimaryValue').textContent = this.value;
        const aeroThemeSelect = document.getElementById('aeroTheme');
        if (aeroThemeSelect && aeroThemeSelect.value === 'custom-aero') {
            const darkPicker = document.getElementById('customAeroDarkColor');
            applyCustomAeroColor(this.value, darkPicker.value);
        }
    });
}

// Custom Aero dark color picker handler
const customAeroDarkPicker = document.getElementById('customAeroDarkColor');
if (customAeroDarkPicker) {
    customAeroDarkPicker.addEventListener('input', function() {
        document.getElementById('customAeroDarkValue').textContent = this.value;
        const aeroThemeSelect = document.getElementById('aeroTheme');
        if (aeroThemeSelect && aeroThemeSelect.value === 'custom-aero') {
            const primaryPicker = document.getElementById('customAeroPrimaryColor');
            const glowPicker = document.getElementById('customAeroGlowColor');
            const textPrimaryPicker = document.getElementById('customAeroTextColor');
            const textLightPicker = document.getElementById('customAeroLightTextColor');
            applyCustomAeroColor(primaryPicker.value, this.value, glowPicker.value, textPrimaryPicker.value, textLightPicker.value);
        }
    });
}

// Custom Aero glow color picker handler
const customAeroGlowPicker = document.getElementById('customAeroGlowColor');
if (customAeroGlowPicker) {
    customAeroGlowPicker.addEventListener('input', function() {
        document.getElementById('customAeroGlowValue').textContent = this.value;
        const aeroThemeSelect = document.getElementById('aeroTheme');
        if (aeroThemeSelect && aeroThemeSelect.value === 'custom-aero') {
            const primaryPicker = document.getElementById('customAeroPrimaryColor');
            const darkPicker = document.getElementById('customAeroDarkColor');
            const textPrimaryPicker = document.getElementById('customAeroTextColor');
            const textLightPicker = document.getElementById('customAeroLightTextColor');
            applyCustomAeroColor(primaryPicker.value, darkPicker.value, this.value, textPrimaryPicker.value, textLightPicker.value);
        }
    });
}

// Custom Aero text primary color picker handler
const customAeroTextPicker = document.getElementById('customAeroTextColor');
if (customAeroTextPicker) {
    customAeroTextPicker.addEventListener('input', function() {
        document.getElementById('customAeroTextValue').textContent = this.value;
        const aeroThemeSelect = document.getElementById('aeroTheme');
        if (aeroThemeSelect && aeroThemeSelect.value === 'custom-aero') {
            const primaryPicker = document.getElementById('customAeroPrimaryColor');
            const darkPicker = document.getElementById('customAeroDarkColor');
            const glowPicker = document.getElementById('customAeroGlowColor');
            const textLightPicker = document.getElementById('customAeroLightTextColor');
            applyCustomAeroColor(primaryPicker.value, darkPicker.value, glowPicker.value, this.value, textLightPicker.value);
        }
    });
}

// Custom Aero text light color picker handler
const customAeroLightTextPicker = document.getElementById('customAeroLightTextColor');
if (customAeroLightTextPicker) {
    customAeroLightTextPicker.addEventListener('input', function() {
        document.getElementById('customAeroLightTextValue').textContent = this.value;
        const aeroThemeSelect = document.getElementById('aeroTheme');
        if (aeroThemeSelect && aeroThemeSelect.value === 'custom-aero') {
            const primaryPicker = document.getElementById('customAeroPrimaryColor');
            const darkPicker = document.getElementById('customAeroDarkColor');
            const glowPicker = document.getElementById('customAeroGlowColor');
            const textPrimaryPicker = document.getElementById('customAeroTextColor');
            applyCustomAeroColor(primaryPicker.value, darkPicker.value, glowPicker.value, textPrimaryPicker.value, this.value);
        }
    });
}

// Reset custom Aero theme button handler
const resetCustomAeroButton = document.getElementById('resetCustomAeroButton');
if (resetCustomAeroButton) {
    resetCustomAeroButton.addEventListener('click', function() {
        const defaultPrimary = '#00ffff';
        const defaultDark = '#0f1e32';
        const defaultGlow = '#00ffff';
        const defaultTextPrimary = '#00ffff';
        const defaultTextLight = '#b0e0e6';
        
        // Update color pickers
        const primaryPicker = document.getElementById('customAeroPrimaryColor');
        const darkPicker = document.getElementById('customAeroDarkColor');
        const glowPicker = document.getElementById('customAeroGlowColor');
        const textPrimaryPicker = document.getElementById('customAeroTextColor');
        const textLightPicker = document.getElementById('customAeroLightTextColor');
        
        if (primaryPicker) primaryPicker.value = defaultPrimary;
        if (darkPicker) darkPicker.value = defaultDark;
        if (glowPicker) glowPicker.value = defaultGlow;
        if (textPrimaryPicker) textPrimaryPicker.value = defaultTextPrimary;
        if (textLightPicker) textLightPicker.value = defaultTextLight;
        
        // Update value displays
        document.getElementById('customAeroPrimaryValue').textContent = defaultPrimary;
        document.getElementById('customAeroDarkValue').textContent = defaultDark;
        document.getElementById('customAeroGlowValue').textContent = defaultGlow;
        document.getElementById('customAeroTextValue').textContent = defaultTextPrimary;
        document.getElementById('customAeroLightTextValue').textContent = defaultTextLight;
        
        // Apply the default colors
        applyCustomAeroColor(defaultPrimary, defaultDark, defaultGlow, defaultTextPrimary, defaultTextLight);
    });
}

// Reset button handler
const resetButton = document.getElementById('resetButton');
if (resetButton) {
    resetButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will also clear all slider and fragment values.')) {
            // Clear localStorage
            localStorage.clear();
            
            // Reset sliders to 100
            sliderIds.forEach(id => {
                const slider = document.getElementById(`slider-${id}`);
                const valueDisplay = document.getElementById(`sliderValue-${id}`);
                if (slider) {
                    slider.value = 100;
                    valueDisplay.textContent = 100;
                }
            });
            
            // Reset fragment inputs to 0
            sliderIds.forEach(id => {
                const input = document.getElementById(`fragment-${id}`);
                const valueDisplay = document.getElementById(`fragmentValue-${id}`);
                if (input) {
                    input.value = 0;
                    valueDisplay.textContent = 0;
                }
            });
            
            // Reset weighting to balanced
            currentWeighting = 1.5;
            document.getElementById('weighting-balanced').classList.add('active');
            document.getElementById('weighting-aggressive').classList.remove('active');
            document.getElementById('weightingStatus').textContent = 'Current: 1.5x (Balanced)';
            
            // Reset settings UI
            const themeSelect = document.getElementById('colorTheme');
            if (themeSelect) themeSelect.value = 'gold';
            const weightingSelect = document.getElementById('defaultWeighting');
            if (weightingSelect) weightingSelect.value = '1.5';
            
            // Apply default theme
            applyTheme('gold');
            
            // Hide results
            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) resultsContainer.style.display = 'none';
            const armorWrapper = document.getElementById('armorWrapper');
            if (armorWrapper) armorWrapper.style.display = 'flex';
            
            alert('All settings have been reset to defaults!');
        }
    });
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadPageStyle();
    loadAestheticStyle();
    switchPage('armorPicker');
    initializeArmorCellClickListeners();
    initializeArchetypeTableClickListeners();
});

// ============================================
// ARMOR CELL CLICK FUNCTIONALITY
// ============================================

let armorGridClickListenerAttached = false;
let archetypeTableClickListenerAttached = false;

function initializeArmorCellClickListeners() {
    // Only attach the listener once to avoid duplicates
    if (armorGridClickListenerAttached) return;
    
    const armorGrid = document.getElementById('armorGrid');
    if (!armorGrid) return;
    
    // Use event delegation on the armor grid
    armorGrid.addEventListener('click', function(e) {
        const clickedCell = e.target;
        
        // Check if the clicked element has a cell class
        const cellClasses = ['armor-item', 'archetype-item', 'stat-details', 'tertiary-stat', 'upgrade-stats', 'mod-recommendation', 'tuning-slot'];
        const hasClickableClass = cellClasses.some(cls => clickedCell.classList.contains(cls));
        
        if (!hasClickableClass) return;
        
        // Check if this cell is in a header row
        const row = clickedCell.closest('.armor-row');
        if (row && row.classList.contains('armor-header')) return;
        
        // Toggle active class on the clicked cell
        clickedCell.classList.toggle('active');
    });
    
    armorGridClickListenerAttached = true;
}

function initializeArchetypeTableClickListeners() {
    // Only attach the listener once to avoid duplicates
    if (archetypeTableClickListenerAttached) return;
    
    const archetypeTable = document.querySelector('table');
    if (!archetypeTable) return;
    
    // Use event delegation on the table
    archetypeTable.addEventListener('click', function(e) {
        const clickedCell = e.target.closest('td');
        if (!clickedCell) return;
        
        // Get the row
        const row = clickedCell.closest('tr');
        if (!row) return;
        
        // Don't toggle header rows
        const headerCells = row.querySelectorAll('th');
        if (headerCells.length > 0) return;
        
        // Get archetype name from first cell
        const archetypeName = row.cells[0]?.textContent.trim();
        if (!archetypeName) return;
        
        // Toggle active class on the row
        row.classList.toggle('active');
        
        // Toggle disabled status
        if (disabledArchetypes.has(archetypeName)) {
            disabledArchetypes.delete(archetypeName);
            row.classList.remove('disabled');
        } else {
            disabledArchetypes.add(archetypeName);
            row.classList.add('disabled');
        }
    });
    
    archetypeTableClickListenerAttached = true;
}
