var fs = require('fs'),
	nodegit = require('nodegit'),
	rimraf = require('rimraf'),
	chordprojs = require('chordprojs');

const GITHUB_USER = 'tvdavies';
const GITHUB_REPO = 'chords';
const GITHUB_BRANCH = 'master';
const LOCAL_DIR = 'songs';
const REPO_URL = 'https://github.com/' + GITHUB_USER + '/' + GITHUB_REPO + '.git';
const SONG_FILE_EXTENSION = '.chordpro';

var songs = [];
var commitSha = '';

/**
 * Sync with the song file repository
 * @param  {Function} callback
 */
function sync(callback) {
	// Update the git repository, or if not yet created
	// clone it to the local disk.
	var repo;
	var index;

	nodegit.Repository.open(LOCAL_DIR)
		.then(r => {
			// Repo already exists locally
			repo = r;
			return repo.fetch('origin');
		}, () => {
			// Can't open local repo, so we will clone the remote repo
			// Remove the songs directory if it exists before cloning
			try {
				if (fs.lstatSync(LOCAL_DIR).isDirectory()) {
					rimraf.sync(LOCAL_DIR);
				}
			} finally {
				return nodegit.Clone(REPO_URL, LOCAL_DIR)
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
		.then(originHeadCommit => {
			commitSha = originHeadCommit.sha();
			return nodegit.Reset.reset(repo, originHeadCommit, nodegit.Reset.TYPE.HARD)
		})
		.then(() => repo.fetchAll({	credentials: (url, username) => nodegit.Cred.sshKeyFromAgent(username) }))
		.then(() => repo.mergeBranches('master', 'origin/master'))
		.done(scanFiles);
}

/**
 * Scan .chordpro files in the working directory and add songs to the database.
 */
function scanFiles() {
	fs.readdir(LOCAL_DIR, (err, files) => {
		// Read each file (with song file extention) and parse the contents as song data
		files.filter(file => file.endsWith(SONG_FILE_EXTENSION)).forEach(file => {
			fs.readFile(LOCAL_DIR + '/' + file, 'utf8', (err, data) => parseSong(file, data))
		});
	});
}

/**
 * Parse the song text and add to the songs array
 * @param  {[string]} songText [description]
 */
function parseSong(fileName, songText) {
	var song = chordprojs.parse(songText);
	song.fileName = fileName;
	songs.push(song);
}

function getSongs() {
	return songs.map(song => getSongData(song));
}

function getSongData(song) {
	return {
		title: song.title,
		subtitle: song.subtitle,
		author: song.author,
		key: song.chords.transposeProperties.origKey,
		url: 'https://cdn.rawgit.com/' 	+ GITHUB_USER + '/'
								   		+ GITHUB_REPO + '/'
								   		+ GITHUB_BRANCH + '/'
								   		+ encodeURIComponent(song.fileName)
								   		+ '?c=' + commitSha
	};
}

sync();

module.exports = {
	sync: sync,
	getSongs: getSongs
};