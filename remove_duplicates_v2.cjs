const fs = require('fs');

let content = fs.readFileSync('src/components/StoreScreen.tsx', 'utf8');
const marker = '{/* ROW 2: THEMED REWARD TIERS (SUBLIME GEM VAULT) */}';
const parts = content.split(marker);

// The vault should appear exactly once. 
// Its correct location is as the "second last table".
// Currently we have parts[1], parts[2], parts[3].

// Let's find exactly what text constitutes ONE instance of the vault.
// The vault block starts with marker, and ends at `          </div>\n        \n\n        </div>\n\n      </div>`
// Let's just write a regex to find all instances and remove all but the one we want.
// BUT it's easier to just find the vault block, save it, delete all instances from original text, 
// and then insert it in the desired spot.

// Let's find the vault block by looking for `<div id="sublime-themed-vault-card"` and ending with the closing tags before `{/* ROW 1: POWERUPS DIRECT STORES & GACHA MACHINE WRAPPER */}` or `{/* INTERACTIVE CERTIFICATE MODAL */}`

let vaultRegex = /\{\/\*\s*ROW 2: THEMED REWARD TIERS \(SUBLIME GEM VAULT\)\s*\*\/\}\s*<div id="sublime-themed-vault-card"[\s\S]*?(?=\{\/\* ROW 1: POWERUPS|\{\/\* THE STRATEGIC POWER-UP SHOP DEPOT|<div className="lg:col-span-12 bg-white|\{\/\* INTERACTIVE CERTIFICATE MODAL)/g;

let matches = content.match(vaultRegex);
console.log("Found matches: ", matches ? matches.length : 0);

if (matches && matches.length > 0) {
    let theVault = matches[0];
    
    // Actually wait, let's grab the best representation of vault block
    // We'll clean `content` by replacing `vaultRegex` with empty string.
    let cleanedContent = content.replace(vaultRegex, '');
    
    // Now we want to insert 'theVault' right before `{/* INTERACTIVE CERTIFICATE MODAL */}` ? Wait, user asked: 
    // "Then move the Sublime Gem Trade-Up Vault up as the second last table."
    // What is the last table? What is the structure? Let's check `cleanContent`.
    
    fs.writeFileSync('src/components/StoreScreen.tsx', cleanedContent);
    fs.writeFileSync('vault_block.txt', theVault);
}

