const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkAndCreateDB() {
  const adminClient = new Client({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: 'postgres' // Connect to default database first
  });

  try {
    await adminClient.connect();
    console.log('Connected to postgres default DB');

    const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'vms_db'");
    if (res.rowCount === 0) {
      console.log('Database vms_db does not exist. Creating...');
      await adminClient.query('CREATE DATABASE vms_db');
      console.log('Database vms_db created successfully.');
    } else {
      console.log('Database vms_db already exists.');
    }
  } catch (err) {
    console.error('Error connecting to postgres:');
    console.dir(err);
  } finally {
    await adminClient.end();
  }
}

checkAndCreateDB();
