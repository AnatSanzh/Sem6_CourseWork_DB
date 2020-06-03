const prompt = require('./utils/prompt');
const RedisCluster = require('redis-clustr');
const redis = require('redis');
const redisUtils = require('./utils/redis-utils');
const terminalTitle = require('./utils/terminal-title');
const model = require('./model');
const fs = require('fs');
const path = require('path');
const npl = require('nodeplotlib');
const dataProcessing = require('./data-processing');


const menu = [
	{
		title: "Exit",
		response: async function(client){
			process.exit();
		}
	},
	{
		title: "Data recovery",
		response: async function(client){
			const files = await new Promise((res, rej) => fs.readdir(
				path.join(__dirname, 'dumps'),
				(err, files) => {
					if(err)
						rej(err);
					else
						res(files);
				}
			)).filter( fileName => /\.json$/m.test(fileName) );

			let querryText = "Choose dump file:\n";
			files.forEach( dumpFileName => querryText+="- "+dumpFileName+"\n" );
			console.log(querryText+"\n");

			let chosenDumpFileName = "";

			while(true){
				chosenDumpFileName = await prompt("> ");
			
				if(files.includes(chosenDumpFileName)){
					break;
				}

				console.log("File with name '"+chosenDumpFileName+"' not found!");
			}

			const dbEntries = Object.entries(JSON.parse(await new Promise((res,rej) => fs.readFile(
				path.join(__dirname,'dumps',chosenDumpFileName),
				"utf8",
				(err, text) => {
					if(err)
						rej(err);
					else
						res(text);
				}
			))));

			for (var i = dbEntries.length - 1; i >= 0; i--) {
				[ key, { type, value }] = dbEntries[i];

				if(type === "hash"){
					await redisUtils.setHM(client, key, value);
				}
			}
		}
	},
	{
		title: "Data backup",
		response: async function(client, keyClients){
			const dumpFileName = "dump"+Math.round(new Date().getTime()/1000)+".json";
			const dbKeys = await redisUtils.getClusterKeyList(keyClients, redisUtils.getMovieKey("*"));

			let backup = {};

			for (var i = dbKeys.length - 1; i >= 0; i--) {
				const currentKey = dbKeys[i];
				const currentObj = await redisUtils.getHM(client, currentKey);

				backup[currentKey] = { type: "hash", value: currentObj };
			}

			await new Promise((res, rej) => fs.writeFile(
				path.join(__dirname,'dumps',dumpFileName),
				JSON.stringify(backup),
				'utf8',
				(err) => {
					if(err)
						rej(err);
					else
						res();
				}
			));
		}
	},
	{
		title: "Statistics",
		response: async function(client, keyClients){
			{
				let labels = [];
				let values = [];

				(await dataProcessing.analysis1(client, keyClients))
				.forEach( ([mediaName, {mean}]) => {
					labels.push(mediaName);
					values.push(mean);
				});

				npl.stack(
					[{
						x: labels,
						y: values,
						type: 'bar',
						name: "Середній рейтинг користувачів",
						text: values.map(String),
						textposition: 'auto'
					}],
					{
						showlegend: true,
						legend: { x: 0.95, y: 0.95 },
						title: "Медіасервіси за середнім рейтингом користувачів"
						//xaxis: {},
						//yaxis: {}	
					}
				);
			}
			{
				let labels = [];
				let values = [];

				(await dataProcessing.analysis2(client, keyClients))
				.forEach( ([mediaName, {mean}]) => {
					labels.push(mediaName);
					values.push(mean);
				});

				npl.stack(
					[{
						x: labels,
						y: values,
						type: 'bar',
						name: "Середній рейтинг критиків",
						text: values.map(String),
						textposition: 'auto'
					}],
					{
						showlegend: true,
						legend: { x: 0.95, y: 0.95 },
						title: "Медіасервіси за середнім рейтингом критиків"
						//xaxis: {},
						//yaxis: {}	
					}
				);
			}
			{
				let xValues = [];
				let yValues = [];
				let xValuesFunc = [Infinity,-Infinity];

				const movies = await model.getAllMovies(client, keyClients);

				movies.forEach( movie => {
					const year = Number(movie.year);
					xValues.push(year);
					yValues.push(Number(movie.userRating));
					
					if(xValuesFunc[0] > year)
						xValuesFunc[0] = year;
					if(xValuesFunc[1] < year)
						xValuesFunc[1] = year;
				});

				const yFunc = await dataProcessing.analysis3(client, keyClients);
				

				npl.stack(
					[{
						x: xValues,
						y: yValues,
						mode: 'markers',
						type: 'scatter',
						name: "рейтинг фільмів"
					},{
						x: xValuesFunc,
						y: [yFunc(xValuesFunc[0]),yFunc(xValuesFunc[1])],
						type: 'line',
						name: "регресія"
					}],
					{
						showlegend: true,
						legend: { x: 0.95, y: 0.95 },
						title: "Залежність між роками та користувацьким рейтингом"
						//xaxis: {},
						//yaxis: {}	
					}
				);
			}
			{
				npl.stack(
					Object.entries(await dataProcessing.analysis4(client, keyClients))
					.map(([key, ageCategoryValues], index) => ({
						labels: Object.keys(ageCategoryValues).map(t => t+'+'),
						values: Object.values(ageCategoryValues),
						type: 'pie',
						domain: {
							row: Math.floor(index % 2),
							column: Math.floor(index / 2)
						},
						name: key,
						hoverinfo: 'percent+name'
					})),
					{
						showlegend: true,
						legend: { x: 0.95, y: 0.95 },
						title: "Розподіл фільмів за віком для кожного медіасервісу",
						grid: {rows: 2, columns: 2}
					}
				);
			}
			{
				const data = await dataProcessing.analysis5(client, keyClients);

				npl.stack(
					[{
						labels: Object.keys(data).map(t => t+'+'),
						values: Object.values(data).map(({mean}) => mean),
						type: 'pie',
						hoverinfo: 'percent'
					}],
					{
						showlegend: true,
						legend: { x: 0.95, y: 0.95 },
						title: "Розподіл середнього рейтингу критиків по віковим категоріям"
					}
				);
			}

			npl.plot();
		}
	}
];


(async function(){
	const host="127.0.0.1";
	const servers = [
		{ host, port: 7000 },
		{ host, port: 7001 },
		{ host, port: 7002 }
	];
	const client = await redisUtils.getClusterClient(RedisCluster, servers);
	const keyClients = await redisUtils.getClusterKeyClients(redis, servers);

	const myArgs = process.argv.slice(2);

	if(myArgs.length == 1 && myArgs[0] === "--generation"){
		if((await redisUtils.getClusterKeyList(keyClients, redisUtils.getMovieKey("*"))).length === 0){
			await model.fillMovieData(client, keyClients);
		}

		process.exit();
	}else if(myArgs.length == 1 && myArgs[0] === "--erasure"){
		await redisUtils.keyDelete(client, await redisUtils.getClusterKeyList(keyClients, redisUtils.getMovieKey("*")));

		process.exit();
	}else{
		while(true){
			console.clear();

			console.log("Options:");

			menu.forEach( ({title},idx) => console.log((idx+1) + ") " + title) );

			const selectedOptionIdx = new Number(await prompt("\n> ")) - 1;

			if(selectedOptionIdx == undefined || selectedOptionIdx < 0 || selectedOptionIdx >= menu.length){
				await prompt("Selected invalid option!");
				continue;
			}

			try{
				await menu[selectedOptionIdx].response(client, keyClients);
			}catch(err){
				console.log(err);
			}

			await prompt("Enter to continue...");
		}
	}
})();