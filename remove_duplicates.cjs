const fs = require('fs');

let content = fs.readFileSync('src/components/StoreScreen.tsx', 'utf8');

const marker = '{/* ROW 2: THEMED REWARD TIERS (SUBLIME GEM VAULT) */}';
const parts = content.split(marker);

console.log("Found " + (parts.length - 1) + " vault occurrences.");

// Let's assume the vault block ends where the next main block begins, or the container ends.
// Let's print out the first few characters of each part to see what follows it.
for (let i = 1; i < parts.length; i++) {
   console.log("Part " + i + " starts with:");
   console.log(parts[i].substring(0, 100));
}
