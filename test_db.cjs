const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function testPersistence() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'test_db.sqlite');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  let db = new SQL.Database();
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
  db.exec("INSERT INTO users VALUES (1, 'Test Accountant')");

  let data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Saved to disk:', fs.existsSync(dbPath), fs.statSync(dbPath).size, 'bytes');

  // Reload from disk
  const reloadedBuf = fs.readFileSync(dbPath);
  let db2 = new SQL.Database(reloadedBuf);
  const res = db2.exec('SELECT * FROM users');
  console.log('Reloaded data:', res[0].values);

  // Clean test
  fs.unlinkSync(dbPath);
}
testPersistence();
