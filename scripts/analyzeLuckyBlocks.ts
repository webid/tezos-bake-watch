import fs from 'fs';
import path from 'path';
import readline from 'readline';

// --- Configuration ---
const INPUT_FILE = path.join(__dirname, 'data', 'lucky_blocks.jsonl');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'lucky_stats.json');

// --- Types ---
interface LuckyBlock {
    cycle: number;
    level: number;
    timestamp: string;
    round: number;
    baker: {
        address: string;
        alias?: string;
    };
}

interface BakerStat {
    address: string;
    alias: string | null;
    count: number;
    totalLuckScore: number;
    maxRound: number;
}

interface BakerAgg {
    count: number;
    alias: string | null;
    totalLuckScore: number;
    maxRound: number;
}

interface YearStats {
    totalLuckyBlocks: number;
    luckiestBaker: BakerStat | null;
    topBakers: BakerStat[];
    bakerMap: Map<string, BakerAgg>; // Helper for aggregation
}

interface CycleStats {
    cycle: number;
    luckyBlockCount: number;
    totalRoundSum: number;
    maxRound: number;
}

interface OutputCycleStats {
    cycle: number;
    luckyBlockCount: number;
    averageRound: number;
    maxRound: number;
}

interface GlobalStats {
    totalLuckyBlocks: number;
    luckiestBaker: BakerStat | null;
    topBakers: BakerStat[];
    bakerMap: Map<string, BakerAgg>; // Helper for aggregation
    topHighestRoundBlocks: LuckyBlock[]; // Top blocks by round
    worstCycles: OutputCycleStats[];
}

// --- Main Analysis Function ---
const analyzeLuckyBlocks = async () => {
    console.log(`Analyzing data from: ${INPUT_FILE}`);

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.log(`Creating output directory: ${OUTPUT_DIR}`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    // Aggregation Structures
    const globalStats: GlobalStats = {
        totalLuckyBlocks: 0,
        luckiestBaker: null,
        topBakers: [],
        bakerMap: new Map(),
        topHighestRoundBlocks: [],
        worstCycles: []
    };

    const yearStatsMap: Map<string, YearStats> = new Map();
    const cycleStatsMap: Map<number, CycleStats> = new Map();

    // Process line by line
    for await (const line of rl) {
        if (!line.trim()) continue;

        try {
            const block: LuckyBlock = JSON.parse(line);
            const bakerAddress = block.baker.address;
            const bakerAlias = block.baker.alias || null;
            const year = new Date(block.timestamp).getFullYear().toString();
            const round = block.round;
            const cycle = block.cycle;

            // --- Global Aggregation ---
            globalStats.totalLuckyBlocks++;
            const globalBaker = globalStats.bakerMap.get(bakerAddress) || { 
                count: 0, 
                alias: bakerAlias,
                totalLuckScore: 0,
                maxRound: 0
            };
            
            globalBaker.count++;
            globalBaker.totalLuckScore += round;
            if (round > globalBaker.maxRound) globalBaker.maxRound = round;
            
            // Update alias if we found one
            if (bakerAlias && !globalBaker.alias) globalBaker.alias = bakerAlias; 
            
            globalStats.bakerMap.set(bakerAddress, globalBaker);

            // --- Track Top Highest Round Blocks ---
            globalStats.topHighestRoundBlocks.push(block);
            if (globalStats.topHighestRoundBlocks.length > 200) {
                 globalStats.topHighestRoundBlocks.sort((a, b) => b.round - a.round);
                 globalStats.topHighestRoundBlocks = globalStats.topHighestRoundBlocks.slice(0, 100);
            }

            // --- Cycle Aggregation ---
            const cStats = cycleStatsMap.get(cycle) || {
                cycle,
                luckyBlockCount: 0,
                totalRoundSum: 0,
                maxRound: 0
            };
            cStats.luckyBlockCount++;
            cStats.totalRoundSum += round;
            if (round > cStats.maxRound) cStats.maxRound = round;
            cycleStatsMap.set(cycle, cStats);


            // --- Year Aggregation ---
            if (!yearStatsMap.has(year)) {
                yearStatsMap.set(year, {
                    totalLuckyBlocks: 0,
                    luckiestBaker: null,
                    topBakers: [],
                    bakerMap: new Map(),
                });
            }
            const yStats = yearStatsMap.get(year)!;
            yStats.totalLuckyBlocks++;
            
            const yearBaker = yStats.bakerMap.get(bakerAddress) || {
                count: 0,
                alias: bakerAlias,
                totalLuckScore: 0,
                maxRound: 0
            };

            yearBaker.count++;
            yearBaker.totalLuckScore += round;
            if (round > yearBaker.maxRound) yearBaker.maxRound = round;
             // Update alias if we found one (local to year stats map too)
            if (bakerAlias && !yearBaker.alias) yearBaker.alias = bakerAlias; 

            yStats.bakerMap.set(bakerAddress, yearBaker);

        } catch (e) {
            console.warn(`Skipping invalid line: ${line.substring(0, 50)}...`);
        }
    }

    console.log(`Finished reading. Calculating top lists...`);

    // --- Finalize Global Stats ---
    const sortedGlobalBakers = Array.from(globalStats.bakerMap.entries())
        .map(([address, data]) => ({
            address,
            alias: data.alias,
            count: data.count,
            totalLuckScore: data.totalLuckScore,
            maxRound: data.maxRound
        }))
        .sort((a, b) => b.totalLuckScore - a.totalLuckScore); // Sort by Score

    globalStats.luckiestBaker = sortedGlobalBakers.length > 0 ? sortedGlobalBakers[0] : null;
    globalStats.topBakers = sortedGlobalBakers.slice(0, 10);
    
    // Final sort and slice for Top Blocks
    globalStats.topHighestRoundBlocks.sort((a, b) => b.round - a.round);
    globalStats.topHighestRoundBlocks = globalStats.topHighestRoundBlocks.slice(0, 100);

    // --- Finalize Worth Cycles ---
    const sortedCycles = Array.from(cycleStatsMap.values())
        .sort((a, b) => b.luckyBlockCount - a.luckyBlockCount) // Sort by count descending
        .slice(0, 10)
        .map(c => ({
            cycle: c.cycle,
            luckyBlockCount: c.luckyBlockCount,
            averageRound: Number((c.totalRoundSum / c.luckyBlockCount).toFixed(2)),
            maxRound: c.maxRound
        }));
    globalStats.worstCycles = sortedCycles;
    
    // --- Finalize Year Stats ---
    const finalYears: Record<string, any> = {};
    const sortedYears = Array.from(yearStatsMap.keys()).sort().reverse(); 

    for (const year of sortedYears) {
        const yStats = yearStatsMap.get(year)!;
        
        // Convert map to array for sorting
        const sortedYearBakers = Array.from(yStats.bakerMap.entries())
            .map(([address, data]) => {
                // Prefer year-specific alias, fallback to global
                const globalAlias = globalStats.bakerMap.get(address)?.alias;
                return { 
                    address, 
                    alias: data.alias || globalAlias || null, 
                    count: data.count,
                    totalLuckScore: data.totalLuckScore,
                    maxRound: data.maxRound
                };
            })
            .sort((a, b) => b.totalLuckScore - a.totalLuckScore); // Sort by Score

        finalYears[year] = {
            totalLuckyBlocks: yStats.totalLuckyBlocks,
            luckiestBaker: sortedYearBakers.length > 0 ? sortedYearBakers[0] : null,
            topBakers: sortedYearBakers.slice(0, 10)
        };
    }

    // --- Construct Output ---
    const outputData = {
        updatedAt: new Date().toISOString(),
        global: {
            totalLuckyBlocks: globalStats.totalLuckyBlocks,
            luckiestBaker: globalStats.luckiestBaker,
            topBakers: globalStats.topBakers,
            topHighestRoundBlocks: globalStats.topHighestRoundBlocks,
            worstCycles: globalStats.worstCycles
        },
        years: finalYears
    };

    // --- Save Output ---
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
    console.log(`Analysis complete. Stats saved to: ${OUTPUT_FILE}`);
    console.log(`Global Lucky Blocks: ${globalStats.totalLuckyBlocks}`);
    console.log(`Unique Bakers: ${globalStats.bakerMap.size}`);
};

analyzeLuckyBlocks().catch(console.error);
