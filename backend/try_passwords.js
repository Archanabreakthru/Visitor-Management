const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const passwords = ['8012', 'Breakthru@18', 'postgres', 'admin', 'password', ''];

async function tryPasswords() {
  for (const pw of passwords) {
    console.log(`Trying password: "${pw}"...`);
    const client = new Client({
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      user: process.env.PG_USER,
      password: pw,
      database: 'postgres'
    });

    try {
      await client.connect();
      console.log(`SUCCESS! Password is: "${pw}"`);
      await client.end();
      return pw;
    } catch (err) {
      console.log(`Failed with password: "${pw}" - ${err.message}`);
    }
  }
  console.log('All common passwords failed.');
  return null;
}

tryPasswords();
