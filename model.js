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
    ageRestr: val => Number(val.slice(0, -1)),
    userRating: val => Number(val),
    criticRating: val => Number(val.slice(0, -1)),
    onNetflix: val => String(val !== "0"),
    onHulu: val => String(val !== "0"),
    onPrimeVid: val => String(val !== "0"),
    onDisney: val => String(val !== "0")
};

module.exports={
	fillMovieData: async (client) => {
		const csvStream = fs.createReadStream(path.join(__dirname,'dataset','tv_shows.csv'), 'utf8');

		const { data } = await new Promise((complete, error)=>{
			Papa.parse(csvStream, { header: true, dynamicTyping: true, complete, error });
		});

		const movies = data.map(rawMovie => {
			const keys = Object.keys(rawMovie);
			const unprocessedMovie = keys.reduce((acc, mk) => {
				const value = rawMovie[mk];
				return CSVHeaderMap[mk] ? {...acc, [CSVHeaderMap[mk]]: value} : {...acc};
			}, {});

			let processedMovie = {};
			Object.keys(parserMap).forEach( parserKey => {
				const keyValue = parserMap[parserKey](unprocessedMovie[parserKey]);

				if(keyValue == undefined)
					processedMovie.error = true;
				else
					processedMovie[parserKey] = keyValue;
			});

			return ("error" in processedMovie) ? undefined : processedMovie;
		}).filter(obj => !!obj);

		for (var i = movies.length - 1; i >= 0; i--) {
			const movie = movies[i];
			const title = movie.title;

			delete movie.title;

			await redisUtils.setHM(client, redisUtils.getMovieKey(title), movie);
		}
	}
};