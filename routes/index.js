var songsdb = require('../lib/songsdb');

module.exports = (app) => {
	app.get('/song', (req, res) => res.json(songsdb.getSongs()));

	app.post('/update', (req, res) => {
		songsdb.sync();
		res.send();
	});
}