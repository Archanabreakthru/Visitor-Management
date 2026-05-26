const fs = require('fs');
const path = 'frontend/vms_fixed.html';
let content = fs.readFileSync(path, 'utf8');

const newDownloadReport = `    async function downloadReport(sessionId) {
      const s = Store.findSession(sessionId);
      if (!s) { toast('Session not found', 'err'); return; }
      
      const { jsPDF } = window.jspdf;
      const toastId = toast('Generating PDF...', 'ok', 0); // Keep toast visible
      
      try {
        const dur = s.duration ?? Math.round((Date.now() - s.inTime) / 60000);
        
        // Create a hidden container for PDF rendering
        const printWrap = document.createElement('div');
        printWrap.style.position = 'absolute';
        printWrap.style.left = '-9999px';
        printWrap.style.width = '620px';
        printWrap.style.padding = '40px';
        printWrap.style.background = 'white';
        printWrap.style.color = '#1e293b';
        printWrap.style.fontFamily = 'Arial, sans-serif';
        
        printWrap.innerHTML = \`
          <div style="background: #0a1628; color: #fff; padding: 20px; border-radius: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px;">breakthru.ai Visitor Report</h2>
            <span style="font-size: 11px; opacity: .6;">Confidential Document</span>
          </div>
          
          <div style="display: flex; gap: 20px; margin-bottom: 30px; align-items: center;">
            \${s.photo ? \`<img src="\${s.photo}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #bfdbfe;">\` : '<div style="width: 100px; height: 100px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #94a3b8;">👤</div>'}
            <div>
              <h1 style="margin: 0; font-size: 28px; color: #0f172a;">\${s.name}</h1>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Visit on \${fmtD(s.inTime)} · Session ID: \${s.id}</p>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tbody>
              \${[
                ['Visitor', '<strong>' + s.name + '</strong>'],
                ['Company', s.company || '—'],
                ['Purpose', s.purpose || '—'],
                ['Host', s.host || '—'],
                ['Visitor Type', s.visitorType || 'Individual'],
                ...(s.visitorType === 'Team' ? [
                  ['Team Name', s.teamName || '—'],
                  ['Team Count', s.teamCount || 0],
                  ['Team Members', (s.teamMembers || []).filter(Boolean).join(', ') || '—']
                ] : []),
                ['ID Type', s.idType || '—'],
                ['RFID Tag', \`<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px;">\${s.rfid}</code>\`],
                ['Check-in', \`\${fmtT(s.inTime)}, \${fmtD(s.inTime)}\`],
                ['Check-out', s.outTime ? \`\${fmtT(s.outTime)}, \${fmtD(s.outTime)}\` : '<span style="color:#2563eb">Still Active</span>'],
                ['Duration', dur + ' minutes'],
                ['Status', \`<span style="color: \${s.status === 'completed' ? '#d97706' : '#16a34a'}; font-weight: bold;">\${s.status === 'active' ? 'Active' : 'Completed'}</span>\`]
              ].map(([lbl, val]) => \`
                <tr>
                  <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; width: 160px; font-weight: 500;">\${lbl}</td>
                  <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">\${val}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Generated: \${new Date().toLocaleString('en-IN')} · Breakthru.ai Visitor Management System
          </div>
        \`;
        
        document.body.appendChild(printWrap);
        
        // Wait for image to load if present
        const img = printWrap.querySelector('img');
        if (img) await new Promise(res => { if(img.complete) res(); else img.onload = res; img.onerror = res; });

        const canvas = await html2canvas(printWrap, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(\`visit-report-\${s.name.replace(/\\s+/g, '-').toLowerCase()}-\${s.id}.pdf\`);
        
        document.body.removeChild(printWrap);
        toast('PDF Report downloaded.', 'ok');
      } catch (err) {
        console.error('[PDF Error]', err);
        toast('Failed to generate PDF.', 'err');
      }
    }`;

// Find the old downloadReport function and replace it
// The old function starts with "function downloadReport(sessionId) {" and ends with "}"
// We need to find the matching closing brace.

const startIndex = content.indexOf('function downloadReport(sessionId) {');
if (startIndex !== -1) {
  let braceCount = 0;
  let endIndex = -1;
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + newDownloadReport + content.substring(endIndex);
    fs.writeFileSync(path, content);
    console.log('downloadReport updated successfully');
  } else {
    console.error('Could not find closing brace for downloadReport');
  }
} else {
  console.error('Could not find downloadReport function');
}
