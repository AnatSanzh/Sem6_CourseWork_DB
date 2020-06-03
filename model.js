const redisUtils = require('./utils/redis-utils');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');


const CSVHeaderMap = {
	Title: 'title',
	Year: 'year',
	Age: 'ageRestr',
	IMDb: 'userRating',
	'Rotten Tomatoes': 'criticRating',
	Netflix:'onNetflix',
	Hulu: 'onHulu',
	'Prime Video': 'onPrimeVid',
	'Disney+': 'onDisney'
};

const parserMap = {
    title: val => String(val),
    year: val => Number(val),
    ageRestr: val => val === "all" ? 0 : Number(val.slice(0, -1)),
    userRating: val => Number(val),
    criticRating: val => Number(val.slice(0, -1)),
    onNetflix: val => String(val !== 0),
    onHulu: val => String(val !== 0),
    onPrimeVid: val => String(val !== 0),
    onDisney: val => String(val !== 0)
};

async function fillMovieData(client, keyClients) {
	const csvStream = fs.readFileSync(path.join(__dirname,'dataset','tv_shows.csv'), 'utf8');

	const { data } = await new Promise((complete, error)=>{
		Papa.parse(csvStream, { header: true, dynamicTyping: true, complete, error });
	});

	const movies = data.map(rawMovie => {
		const keys = Object.keys(rawMovie);
		let unfiltered = false;

		const unprocessedMovie = keys.reduce((acc, mk) => {
			const value = rawMovie[mk];
			if(value === null || value === undefined)
				unfiltered = true;
			return CSVHeaderMap[mk] ? {...acc, [CSVHeaderMap[mk]]: value} : {...acc};
		}, {});

		if(unfiltered)
			return undefined;

		let processedMovie = {};
		Object.keys(parserMap).forEach( parserKey => {
			const keyValue = parserMap[parserKey](unprocessedMovie[parserKey]);

			if(keyValue == undefined)
				unfiltered = true;
			else
				processedMovie[parserKey] = keyValue;
		});

		if(unfiltered)
			return undefined;

		return processedMovie;
	}).filter(obj => obj != undefined);

	console.log(movies.length);

	for (var i = movies.length - 1; i >= 0; i--) {
		const movie = movies[i];
		const title = movie.title;

		delete movie.title;

		await redisUtils.setHM(client, redisUtils.getMovieKey(title), movie);
	}
	
	console.log((await getAllMovies(client, keyClients)).length);
}

async function getAllMovies(client, keyClients){
	const movieKeys = await redisUtils.getClusterKeyList(keyClients, redisUtils.getMovieKey("*"));
	
	return Promise.all(movieKeys.map(key => redisUtils.getHM(client, key)));
}

module.exports={
	fillMovieData,
	getAllMovies,
	getMovieServices: function(movieData){
		let result = [];

		if(movieData.onNetflix === "true") result.push('Netflix');
		if(movieData.onHulu === "true") result.push('Hulu');
		if(movieData.onPrimeVid === "true") result.push('Prime Video');
		if(movieData.onDisney === "true") result.push('Disney+');		

		return result;
	},
	getAllMovieServices: () => ['Netflix','Hulu','Prime Video','Disney+'],
	getAgeRestrictionCategories: () => [0,7,16,18]
};