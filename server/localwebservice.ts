
import express = require('express');
import * as path from 'path';

var app = express();
let rootPath = path.join(__dirname, '..', '..');
console.log('Local web resources root path: ' + rootPath);
app.use("/datatab", express.static(path.join(rootPath, "/datatab")));
app.use("/logtab", express.static(path.join(rootPath, "/logtab")));

app.listen(5555, function() { console.log("http://localhost:5555 is running");  });