const mysql = require('mysql2/promise');

async function updatePassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'monitoring'
  });
  
  const hash = '$2b$12$.xWjweB9r9HyOj1iDMxOQOIq217Z.zDzq8SkCLvkLt.BQNGBIc/Em';
  await connection.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@example.com']);
  console.log('Password updated successfully');
  await connection.end();
}

updatePassword();