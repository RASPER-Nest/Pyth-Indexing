// copyIdl.js
const fs = require('fs');
const idl = require('./target/idl/pyth_indexing.json');

fs.writeFileSync('./app/src/idl.json', JSON.stringify(idl));