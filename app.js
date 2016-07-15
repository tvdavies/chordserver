const PORT = 8080;

var express = require('express'),
	bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var routes = require('./routes')(app);

var server = app.listen(process.env.PORT || PORT, () => console.log('Listening on port %s...', server.address().port));