const fs = require('fs');
let c = fs.readFileSync('src/components/StoreScreen.tsx', 'utf8');

let comment = '{/* ROW 2: THEMED REWARD TIERS (SUBLIME GEM VAULT) */}';

let firstIndex = c.indexOf(comment);
let secondIndex = c.indexOf(comment, firstIndex + 1);

let endIndex = c.indexOf('<div id="gamified-boutique-experience-deck"', secondIndex);

console.log("first index", firstIndex);
console.log("second index", secondIndex);
console.log("end index", endIndex);

if (secondIndex !== -1 && endIndex !== -1) {
   let newC = c.substring(0, secondIndex) + c.substring(endIndex);
   fs.writeFileSync('src/components/StoreScreen.tsx', newC);
   console.log("done");
} else {
   console.log("not found");
}
