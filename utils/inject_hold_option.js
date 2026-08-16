// Utility script to inject a 'Request more time (Re-hold)' option into every options array in every step of every scenario
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf-8');

function injectHoldOption(optionsBlock) {
  // Only add if not already present
  if (!optionsBlock.some(opt => opt.id === 'hold')) {
    optionsBlock.unshift({ id: 'hold', text: 'Request more time (Re-hold)', correct: null });
  }
  return optionsBlock;
}

// This script is meant to be run manually for one-off injection, not at runtime.
// It is not a persistent code change, but a developer utility.
console.log('Please manually add the following option to every options array in each scenario step:');
console.log("  { id: 'hold', text: 'Request more time (Re-hold)', correct: null }");
// For persistent automation, consider moving scenario data to a JSON file and auto-injecting on load.
