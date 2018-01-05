
import express = require('express');
import * as path from 'path';

var app = express();
app.use("/",express.static(path.join(__dirname, '..')));

app.listen(5555, function() { console.log("http://localhost:5555 is running");  });