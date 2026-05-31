const fs = require('fs');
let f = fs.readFileSync('../frontend/vms_fixed.html', 'utf8');

const targetStr = `<div class="sess-card-actions">
          <button class="btn btn-s" onclick="event.stopPropagation();viewReport('\${s.id}')">Report</button>
          <button class="btn btn-p" onclick="event.stopPropagation();downloadReport('\${s.id}')">\${ic(I.dl, 11)} Download</button>
        </div>`;

const newStr = `<div class="sess-card-actions">
          <button class="btn btn-s" onclick="event.stopPropagation();downloadReport('\${s.id}')">Report</button>
        </div>`;

f = f.replace(targetStr, newStr);

fs.writeFileSync('../frontend/vms_fixed.html', f, 'utf8');
console.log('Fixed buttons');
