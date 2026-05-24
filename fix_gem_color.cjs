const fs = require('fs');

function replaceAmberGem(file) {
  let content = fs.readFileSync(file, 'utf8');

  // We want to replace `<Gem className="... text-amber-500 fill-amber-500..." />` with `text-blue-500 fill-blue-500` or just replace the `<Gem .../>` with the 💎 text if appropriate.
  // We can just regex replace `fill-amber-500 text-amber-500`, `text-amber-500 fill-amber-500`, `text-amber-400 fill-amber-400` ONLY on `<Gem` lines.
  
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('<Gem') || line.includes('<span className="font-bold text-amber-600 font-mono">💎')) {
       // Regular expression to catch amber classes and change to cyan/blue
       line = line.replace(/text-amber-500/g, 'text-cyan-500');
       line = line.replace(/fill-amber-500/g, 'fill-cyan-500');
       line = line.replace(/text-amber-400/g, 'text-cyan-500');
       line = line.replace(/fill-amber-400/g, 'fill-cyan-500');
       
       line = line.replace(/text-amber-600/g, 'text-cyan-600');
       // also change any amber related bg on these specific tags if they are standard gem related?
       // Let's just do text and fill.
       lines[i] = line;
    }
  }

  content = lines.join('\n');
  // There is one in `StoreScreen.tsx` where standard gems are shown:
  // "bg-amber-100 text-amber-700" etc...
  fs.writeFileSync(file, content);
}

replaceAmberGem('src/components/StoreScreen.tsx');
replaceAmberGem('src/App.tsx');
replaceAmberGem('src/components/LandingScreen.tsx');
replaceAmberGem('src/components/PathMap.tsx');

console.log("Updated Gem colors");
