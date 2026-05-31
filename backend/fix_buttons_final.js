const fs = require('fs');
let f = fs.readFileSync('../frontend/vms_fixed.html', 'utf8');

// I will find the precise lines and remove the download button and modify the report button
const lines = f.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('viewReport(\'${s.id}\')">Report</button>')) {
    // Replace viewReport with downloadReport
    lines[i] = lines[i].replace('viewReport(\'${s.id}\')', 'downloadReport(\'${s.id}\')');
    
    // Check if the next line is the Download button and remove it
    if (i + 1 < lines.length && lines[i + 1].includes('downloadReport(\'${s.id}\')">') && lines[i + 1].includes('Download</button>')) {
      lines.splice(i + 1, 1);
    }
  }
}

fs.writeFileSync('../frontend/vms_fixed.html', lines.join('\n'), 'utf8');
console.log('Successfully replaced via line iteration');
