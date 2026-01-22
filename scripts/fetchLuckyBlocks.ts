import fs from 'fs';
import path from 'path';

// --- Configuration ---
const API_URL = 'https://api.tzkt.io/v1/rights';
const BATCH_SIZE = 1000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'lucky_blocks.jsonl');
const CURSOR_FILE = path.join(DATA_DIR, 'cursor.json');
const DELAY_MS = 1000; // 1 second delay between requests

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- Types ---
interface BakingRight {
    cycle: number;
    level: number;
    timestamp: string;
    round: number;
    baker: {
        address: string;
        name?: string;
    };
}

// --- Helpers ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const loadCursor = (): number => {
    if (fs.existsSync(CURSOR_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf-8'));
            return data.lastLevel || 0;
        } catch (e) {
            console.error('Error reading cursor file, starting from 0', e);
            return 0;
        }
    }
    return 0;
};

const saveCursor = (lastLevel: number) => {
    fs.writeFileSync(CURSOR_FILE, JSON.stringify({ lastLevel, timestamp: new Date().toISOString() }, null, 2));
};

const appendData = (rights: BakingRight[]) => {
    const lines = rights.map(r => JSON.stringify(r)).join('\n');
    fs.appendFileSync(DATA_FILE, lines + '\n');
};

// --- Main Loop ---
const main = async () => {
    let lastLevel = loadCursor();
    console.log(`Starting Lucky Blocks Indexer from Level: ${lastLevel}`);
    console.log(`Saving data to: ${DATA_FILE}`);

    while (true) {
        try {
            const params = new URLSearchParams({
                'type': 'baking',
                'status': 'realized',
                'round.gt': '0',        // Only lucky blocks
                'sort.asc': 'level',    // Ascending order by Level
                'level.gt': lastLevel.toString(), 
                'limit': BATCH_SIZE.toString(),
                'select': 'cycle,level,timestamp,round,baker'
            });

            const url = `${API_URL}?${params.toString()}`;
            // console.log(`Fetching: ${url}`);
            
            const start = Date.now();
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error(`API Error: ${response.status} ${response.statusText}`);
                console.log('Retrying in 5 seconds...');
                await sleep(5000);
                continue;
            }

            const data: BakingRight[] = await response.json();
            const duration = Date.now() - start;

            if (data.length === 0) {
                console.log('No more data found. Waiting for new blocks...');
                await sleep(60000); // Wait 1 minute before checking again
                continue;
            }

            // Process data
            appendData(data);
            
            // Update cursor
            const maxLevel = Math.max(...data.map(r => r.level));
            lastLevel = maxLevel;
            saveCursor(lastLevel);

            console.log(`Fetched ${data.length} lucky blocks. Last Level: ${lastLevel}. Speed: ${(data.length / (duration/1000)).toFixed(1)}/s`);

            // Rate limiting
            await sleep(DELAY_MS);

        } catch (error) {
            console.error('Unexpected error:', error);
            console.log('Retrying in 10 seconds...');
            await sleep(10000);
        }
    }
};

main().catch(console.error);
