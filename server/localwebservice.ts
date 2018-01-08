
import express = require('express');
import * as path from 'path';

var app = express();
let rootPath = path.join(__dirname, '..', '..');
console.log('Local web resources root path: ' + rootPath);
app.use("/", express.static(rootPath));

app.listen(5555, function() { console.log("http://localhost:5555 is running");  });