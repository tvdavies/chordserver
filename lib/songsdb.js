var fs = require('fs'),
	nodegit = require('nodegit'),
	rimraf = require('rimraf'),
	chordprojs = require('chordprojs');

var localDir = 'songs';
var repoUrl = 'https://github.com/tvdavies/chords.git';
var songFileExtension = '.chordpro';

/**
 * @param  {Function} callback
 * @return {[type]}
 */
function sync(callback) {
	// Update the git repository, or if not yet created
	// clone it to the local disk.
	var repo;
	var index;

	nodegit.Repository.open(localDir)
		.then(r => {
			repo = r;
			return repo.fetch('origin');
		}, () => {
			// Remove the songs directory if it exists before cloning
			try {
				if (fs.lstatSync(localDir).isDirectory()) {
					rimraf.sync(localDir);
				}
			} finally {
				return nodegit.Clone(repoUrl, localDir)
			}
		})
		.then(r => {
			repo = repo || r;
			return repo.refreshIndex()
		})
		.then(i => {
			index = i;
			return index.addAll();
		})
		.then(() => index.write())
		.then(() => repo.getBranchCommit('origin/master'))
		.then(originHeadCommit => nodegit.Reset.reset(repo, originHeadCommit, nodegit.Reset.TYPE.HARD))
		.then(() => repo.fetchAll({	credentials: (url, username) => nodegit.Cred.sshKeyFromAgent(username) }))
		.then(() => repo.mergeBranches('master', 'origin/master'))
		.done(callback);
}

/**
 * Scan .chordpro files in the working directory and add songs to the database.
 * @return {[type]}
 */
function scanFiles() {
	fs.readdir(localDir, (err, files) => {
		// Read each file (with song file extention) and parse the contents as song data
		files.filter(file => file.endsWith(songFileExtension)).forEach(file => {
			fs.readFile(localDir + '/' + file, 'utf8', (err, data) => parseSong(data))
		});
	});
}

function parseSong(songText) {
	var song = chordprojs.parse(songText);

	// TODO: Add this song to a database
}