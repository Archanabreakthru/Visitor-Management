const fs = require('fs');
const path = 'frontend/vms_fixed.html';
let content = fs.readFileSync(path, 'utf8');

const scripts = `  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>`;

if (!content.includes('jspdf')) {
  content = content.replace('</head>', scripts + '\n</head>');
  fs.writeFileSync(path, content);
  console.log('Scripts added successfully');
} else {
  console.log('Scripts already exist');
}
