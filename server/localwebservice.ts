
import express = require('express');
import * as path from 'path';

var app = express();
let rootPath = path.join(__dirname, '..', '..');

console.log('Local web resources root path: ' + rootPath);

// Add headers
app.use((req, res, next) => {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', "true");

    // Pass to next layer of middleware
    next();
});

app.use(express.static(rootPath));
app.use("/datatab", express.static(path.join(rootPath, "/datatab")));
app.use("/logtab", express.static(path.join(rootPath, "/logtab")));

app.listen(5555, function() { console.log("http://localhost:5555 is running");  });
