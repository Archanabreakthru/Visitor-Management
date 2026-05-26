const fs = require('fs');
const path = 'backend/routes/rfid.js';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `    const cards = ALL_10_SLOTS.map(slot => {
      const db = dbMap[slot.tag];
      if (db) {
        const linkedVisitActive = db.assigned_to_visit &&
          db.visit_status !== 'completed';
        // card is free only if: (available=true AND visit is completed) OR never assigned
        const isFree = (!db.assigned_to_visit) || (!linkedVisitActive && db.available);
        return {
          tag:              slot.tag,
          label:            slot.label,
          available:        isFree,
          assigned_to_visit:  isFree ? null  : db.assigned_to_visit,
          assigned_to_name:   isFree ? null  : db.assigned_to_name,
        };
      }`;

const newBlock = `    const cards = ALL_10_SLOTS.map(slot => {
      const db = dbMap[slot.tag];
      if (db) {
        const linkedVisitActive = db.assigned_to_visit && 
          (db.visit_status === 'active' || db.visit_status === 'registered');
        
        // Robust "isFree" logic:
        // A card is free if:
        // 1. No visit is assigned to it anymore (assigned_to_visit is NULL)
        // 2. OR the linked visit is NOT active/registered (e.g., completed, denied, or rejected)
        const isFree = (!db.assigned_to_visit) || !linkedVisitActive;

        return {
          tag:              slot.tag,
          label:            slot.label,
          available:        isFree,
          assigned_to_visit:  isFree ? null : db.assigned_to_visit,
          assigned_to_name:   isFree ? null : db.assigned_to_name,
        };
      }`;

if (content.includes('const isFree = (!db.assigned_to_visit)')) {
  // Use a more flexible search if exact match fails
  const regex = /const cards = ALL_10_SLOTS\.map\(slot => \{[\s\S]*?\}\);/m;
  content = content.replace(regex, (match) => {
      return newBlock + '\n    });';
  });
  fs.writeFileSync(path, content);
  console.log('rfid.js updated successfully');
} else {
  console.error('Could not find RFID logic block');
}
