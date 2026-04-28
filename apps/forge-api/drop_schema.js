const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://forge:forge@localhost:5432/forge'
});
client.connect()
  .then(() => client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;'))
  .then(() => console.log('Schema dropped and recreated'))
  .catch(err => console.error(err))
  .finally(() => client.end());
