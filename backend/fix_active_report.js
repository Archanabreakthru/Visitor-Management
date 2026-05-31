const fs = require('fs');
let f = fs.readFileSync('../frontend/vms_fixed.html', 'utf8');

// Restore the search icon if missing
if (!f.includes('search:')) {
  f = f.replace(
    '      dl: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,',
    '      search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,\n      dl: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,'
  );
}

// Now replace the Report button in Checked-In section
// I will split by lines and look for initiateHamCheckout to find the active section

const lines = f.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('initiateHamCheckout(\'${s.id}\')">Checkout</button>')) {
    // If the previous line is the report button, remove it
    if (lines[i - 1].includes('downloadReport(\'${s.id}\')">Report</button>')) {
      lines.splice(i - 1, 1);
      i--; // adjust index since we removed a line
    }
  }
}

fs.writeFileSync('../frontend/vms_fixed.html', lines.join('\n'), 'utf8');
console.log('Restored search icon and removed Report button from active section.');
