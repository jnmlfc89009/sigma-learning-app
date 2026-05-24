const fs = require('fs');

let content = fs.readFileSync('src/components/StoreScreen.tsx', 'utf8');
const marker = '{/* ROW 2: THEMED REWARD TIERS (SUBLIME GEM VAULT) */}';
const parts = content.split(marker);

// Part 0: Everything before the first vault
// Part 1: The first vault block (which seems to just end with `\n        \n\n        `)
// Part 2: The second vault block plus powerups block? No, let's see. Let's just output the indices and content.
fs.writeFileSync('parts_debug.json', JSON.stringify({
    part1: parts[1],
    part2: parts[2],
    part3: parts[3]
}, null, 2));

