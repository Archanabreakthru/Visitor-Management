const fs = require('fs');
let f = fs.readFileSync('../frontend/api-bridge.js', 'utf8');

const targetRegex = /\} else if \(status === 'denied'\) \{[\s\S]*?\}/;
const newCode = `} else if (status === 'denied' || status === 'rejected') {
          if (S.poller) clearInterval(S.poller);
          S.approved = false;
          if (typeof toast === 'function') toast('Host has rejected the meeting request', 'err');
          if (typeof setStatus === 'function') setStatus('Visitor request denied by host', 'err');
        }`;

f = f.replace(targetRegex, newCode);
fs.writeFileSync('../frontend/api-bridge.js', f, 'utf8');
console.log('Successfully updated rejection handler');
