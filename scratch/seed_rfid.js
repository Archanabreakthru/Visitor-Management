const db = require('../backend/config/db');

async function seed() {
  console.log('[Seed] Ensuring all 10 RFID cards exist and have correct labels...');
  for (let i = 1; i <= 10; i++) {
    const tag = `VISITOR-${String(i).padStart(2, '0')}`;
    const label = `Visitor ${i}`;
    
    try {
      const { rows } = await db.query('SELECT id FROM rfid_cards WHERE tag=$1', [tag]);
      if (rows.length === 0) {
        console.log(`[Seed] Inserting missing tag: ${tag}`);
        await db.query('INSERT INTO rfid_cards (tag, label, available) VALUES ($1, $2, TRUE)', [tag, label]);
      } else {
        // Update label to be clean "Visitor X"
        await db.query('UPDATE rfid_cards SET label=$1 WHERE tag=$2', [label, tag]);
      }
    } catch (err) {
      console.error(`[Seed Error] Failed for ${tag}:`, err.message);
    }
  }
  process.exit();
}

seed();
