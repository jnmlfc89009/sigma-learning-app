const fs = require('fs');

let content = fs.readFileSync('src/components/StoreScreen.tsx', 'utf8');

// Inject the `handleTradeGemForPowerup` function right after `tradeTrophiesGems`
const insertTarget = '  const tradeTrophiesGems = async (tier: typeof tradeTiers[0]) => {';
const newFunction = `
  const handleTradeGemForPowerup = async (gemId: string, powerupId: string, powerupName: string) => {
    setVaultError('');
    setVaultSuccess('');

    const count = user.unlockedItems?.filter(x => x === gemId).length || 0;
    const gemName = gemId.replace('trophy_gem_', '');
    if (count < 1) {
      setVaultError(\`⚠️ Insufficient funds. You need at least 1 \${gemName.toUpperCase()} to purchase this power-up.\`);
      return;
    }

    let amount = 1;
    if (gemId === 'trophy_gem_sapphire') amount = 3;
    if (gemId === 'trophy_gem_ruby') amount = 7;
    if (gemId === 'trophy_gem_obsidian') amount = 15;

    setVaultLoading('powerup_exchange');
    try {
      let finalUnlockedItems = [...(user.unlockedItems || [])];
      
      const index = finalUnlockedItems.indexOf(gemId);
      if (index > -1) {
        finalUnlockedItems.splice(index, 1);
      }

      for (let i = 0; i < amount; i++) {
        finalUnlockedItems.push(powerupId);
      }

      const updatedUser: UserProfile = {
        ...user,
        unlockedItems: finalUnlockedItems
      };

      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }
      setVaultSuccess(\`✨ Trade Executed! Consumed 1x \${gemName.toUpperCase()} and added \${amount}x \${powerupName} to your inventory!\`);
    } catch {
      setVaultError("Trade clearance failed. Resetting ledger cache.");
    } finally {
      setVaultLoading(null);
    }
  };

`;

content = content.replace(insertTarget, newFunction + insertTarget);

// Replace the Power-up UI block
const startUI = content.indexOf('{/* THE STRATEGIC POWER-UP SHOP DEPOT */}');
const endUI = content.indexOf('</div>\n\n        </div>\n\n      </div>\n\n      {/* INTERACTIVE CERTIFICATE MODAL */}');

if (startUI !== -1 && endUI !== -1) {
    const powerUpsBlock = `
          {/* THE STRATEGIC POWER-UP SHOP DEPOT */}
          <div className="lg:col-span-12 bg-white border border-slate-200 rounded-[32px] p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                ⚡ Tactical Booster Depot
              </span>
              <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                Secure Live Quiz Power-Ups
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Trade your acquired Sublime Gems to resupply your operational inventory stash! The rarer the gem used, the more high-powered quiz boosters you manifest at once.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1.5">
              
              {/* Power-up item 1 */}
              <div className="bg-slate-50 border border-slate-200 hover:border-amber-300 p-4 rounded-2xl flex flex-col justify-between transition h-full">
                <div className="space-y-2 text-left mb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">50/50 Eliminator</span>
                    <span className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 font-mono">
                      Owned: {user.unlockedItems?.filter(x => x === 'powerup_50_50').length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 min-h-[40px]">Eliminates exactly two incorrect answers from standard multiple choice quiz arrays.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_jade', 'powerup_50_50', '50/50')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_jade')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                    <span>Pay 1 Jade (x1)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_sapphire', 'powerup_50_50', '50/50')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_sapphire')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-blue-500 text-blue-500" />
                    <span>Pay 1 Sapphire (x3)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_ruby', 'powerup_50_50', '50/50')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_ruby')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-rose-200 hover:bg-rose-50 text-rose-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>Pay 1 Ruby (x7)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_obsidian', 'powerup_50_50', '50/50')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_obsidian')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-purple-200 hover:bg-purple-50 text-purple-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-purple-600 text-purple-600" />
                    <span>Pay 1 Obsidian (x15)</span>
                  </button>
                </div>
              </div>

              {/* Power-up item 2 */}
              <div className="bg-slate-50 border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl flex flex-col justify-between transition h-full">
                <div className="space-y-2 text-left mb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">Aegis Second Life</span>
                    <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 font-bold rounded border border-indigo-200 font-mono">
                      Owned: {user.unlockedItems?.filter(x => x === 'powerup_extra_life').length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 min-h-[40px]">Shield absorbs one faulty calculation entry error penalty in active level quizzes.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_jade', 'powerup_extra_life', 'Extra Life')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_jade')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                    <span>Pay 1 Jade (x1)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_sapphire', 'powerup_extra_life', 'Extra Life')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_sapphire')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-blue-500 text-blue-500" />
                    <span>Pay 1 Sapphire (x3)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_ruby', 'powerup_extra_life', 'Extra Life')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_ruby')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-rose-200 hover:bg-rose-50 text-rose-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>Pay 1 Ruby (x7)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_obsidian', 'powerup_extra_life', 'Extra Life')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_obsidian')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-purple-200 hover:bg-purple-50 text-purple-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-purple-600 text-purple-600" />
                    <span>Pay 1 Obsidian (x15)</span>
                  </button>
                </div>
              </div>

              {/* Power-up item 3 */}
              <div className="bg-slate-50 border border-slate-200 hover:border-emerald-300 p-4 rounded-2xl flex flex-col justify-between transition h-full">
                <div className="space-y-2 text-left mb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">Temporal Hourglass</span>
                    <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200 font-mono">
                      Owned: {user.unlockedItems?.filter(x => x === 'powerup_extra_time').length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 min-h-[40px]">Increments exam limits or cancels stress so you can deliberate with ease.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_jade', 'powerup_extra_time', 'Extra Time')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_jade')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-emerald-200 hover:bg-emerald-50 text-emerald-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                    <span>Pay 1 Jade (x1)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_sapphire', 'powerup_extra_time', 'Extra Time')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_sapphire')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-blue-200 hover:bg-blue-50 text-blue-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-blue-500 text-blue-500" />
                    <span>Pay 1 Sapphire (x3)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_ruby', 'powerup_extra_time', 'Extra Time')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_ruby')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-rose-200 hover:bg-rose-50 text-rose-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>Pay 1 Ruby (x7)</span>
                  </button>
                  <button onClick={() => handleTradeGemForPowerup('trophy_gem_obsidian', 'powerup_extra_time', 'Extra Time')} disabled={vaultLoading !== null || !user.unlockedItems?.includes('trophy_gem_obsidian')} className="p-2 border rounded-xl text-[10px] font-bold font-mono transition flex flex-col items-center gap-1 bg-white border-purple-200 hover:bg-purple-50 text-purple-800 disabled:opacity-50">
                    <Gem className="w-4 h-4 fill-purple-600 text-purple-600" />
                    <span>Pay 1 Obsidian (x15)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
`;

    content = content.substring(0, startUI) + powerUpsBlock + content.substring(endUI);
} else {
    console.error('Could not find power ups block');
}

// Notice that the block I replaced had "lg:col-span-7" on it, and the sibling (mystery box) had "lg:col-span-5"
// Since layout is changing, let's break them into two rows to make them fit beautifully.
// Or wait, they were in a single row? Yes, "grid grid-cols-1 lg:grid-cols-12". The mystery box can stay lg:col-span-12 or I can keep the grid wrapper and just enlarge it.
// To keep it clean, I'll close the 12-col grid early.
const gachaEnd = content.indexOf('</div>\n\n          {/* THE STRATEGIC POWER-UP SHOP DEPOT */}');
if (gachaEnd !== -1) {
    // I can change the gacha box to lg:col-span-12 and close the grid.
    content = content.replace(
        '<div className="lg:col-span-5 bg-gradient-to-b from-indigo-950', 
        '<div className="lg:col-span-12 max-w-2xl mx-auto w-full bg-gradient-to-b from-indigo-950'
    );
}

fs.writeFileSync('src/components/StoreScreen.tsx', content);
console.log('UI updated');
