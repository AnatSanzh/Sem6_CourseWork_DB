const SS = require('simple-statistics');
const model = require('./model');
const objFromKeys = require('./utils/obj-from-keys');


module.exports = {
	analysis1: async function (client, keyClients){
		// 1) Проранжувати медіасервіси за середнім рейтингом користувачів
		//const movieServiceRatings = objFromKeys(model.getAllMovieServices(), { mean: 0, count: 0 });
		const movieServiceRatings = {
			'Netflix': { mean: 0, count: 0 },
			'Hulu': { mean: 0, count: 0 },
			'Prime Video': { mean: 0, count: 0 },
			'Disney+': { mean: 0, count: 0 }
		};

		(await model.getAllMovies(client, keyClients))
		.forEach( movie => {
			const movieServices = model.getMovieServices(movie);

			for(const key in movieServiceRatings){
				if(movieServices.includes(key)){
					const currEntry = movieServiceRatings[key];
					currEntry.mean = SS.addToMean(currEntry.mean, currEntry.count, Number(movie.userRating));
					currEntry.count++;
				}
			}
		});

		return Object.entries(movieServiceRatings);
	},
	analysis2: async function (client, keyClients){
		// 2) Проранжувати медіасервіси за середнім рейтингом критиків
		//const movieServiceRatings = objFromKeys(model.getAllMovieServices(), { mean: 0, count: 0 });
		const movieServiceRatings = {
			'Netflix': { mean: 0, count: 0 },
			'Hulu': { mean: 0, count: 0 },
			'Prime Video': { mean: 0, count: 0 },
			'Disney+': { mean: 0, count: 0 }
		};

		(await model.getAllMovies(client, keyClients))
		.forEach( movie => {
			const movieServices = model.getMovieServices(movie);

			for(const key in movieServiceRatings){
				if(movieServices.includes(key)){
					const currEntry = movieServiceRatings[key];
					currEntry.mean = SS.addToMean(currEntry.mean, currEntry.count, Number(movie.criticRating));
					currEntry.count++;
				}
			}
		});

		return Object.entries(movieServiceRatings);
	},
	analysis3: async function (client, keyClients){
		// 3) Залежність між роками та користувацьким рейтингом фільмів

		return SS.linearRegressionLine(SS.linearRegression(
			(await model.getAllMovies(client, keyClients)).map( movie => ([Number(movie.year), Number(movie.userRating)]))
			));
	},
	analysis4: async function (client, keyClients){
		// 4) Розподіл фільмів за віком для кожного медіасервісу
		const results = objFromKeys(
			model.getAllMovieServices(),
			objFromKeys(model.getAgeRestrictionCategories(), 0)
		);

		/*		const movieServiceRatings = {
			'Netflix': { mean: 0, count: 0 },
			'Hulu': { mean: 0, count: 0 },
			'Prime Video': { mean: 0, count: 0 },
			'Disney+': { mean: 0, count: 0 }
		};*/

		(await model.getAllMovies(client, keyClients))
		.forEach( movie => {
			for(const moviServiceKey in results){
				if(moviServiceKey in results){
					results[moviServiceKey][movie.ageRestr]++;
				}
			}
		});

		return results;
	},
	analysis5: async function (client, keyClients){
		// 5) Розподіл середнього рейтингу критиків по віковим категоріям
		//const results = objFromKeys(model.getAgeRestrictionCategories(), { mean: 0, count: 0 });
		const results = {
			'0': { mean: 0, count: 0 },
			'7': { mean: 0, count: 0 },
			'16': { mean: 0, count: 0 },
			'18': { mean: 0, count: 0 }
		};

		(await model.getAllMovies(client, keyClients))
		.forEach( movie => {
			model.getAgeRestrictionCategories()
			.forEach( age => {
				const currEntry = results[age];
				currEntry.mean = SS.addToMean(currEntry.mean, currEntry.count, Number(movie.criticRating));
				currEntry.count++;
			});
		});

		return results;
	},
};