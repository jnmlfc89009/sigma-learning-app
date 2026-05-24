const fs = require('fs');
let content = fs.readFileSync('src/components/StoreScreen.tsx', 'utf8');

// 1. Move Sublime Vault up
const vaultStart = content.indexOf('{/* ROW 2: THEMED REWARD TIERS (SUBLIME GEM VAULT) */}');
const vaultEnd = content.indexOf('</div>\n\n      </div>\n\n      {/* INTERACTIVE CERTIFICATE MODAL */}');
const vaultBlock = content.substring(vaultStart, vaultEnd);

const row1Start = content.indexOf('{/* ROW 1: POWERUPS DIRECT STORES & GACHA MACHINE WRAPPER */}');
const row1End = vaultStart;
const row1Block = content.substring(row1Start, row1End);

let newContent = content.substring(0, row1Start) + 
  vaultBlock + 
  "\n\n        " + 
  row1Block + 
  content.substring(vaultEnd);

fs.writeFileSync('src/components/StoreScreen.tsx', newContent);
console.log('Reordered layout');
