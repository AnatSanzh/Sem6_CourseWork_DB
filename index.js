const prompt = require('./utils/prompt');
const redis = require('redis');
const redisUtils = require('./utils/redis-utils');
const terminalTitle = require('./utils/terminal-title');
const model = require('./model');
const fs = require('fs');
const path = require('path');
//const SS = require('simple-statistics');


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
		response: async function(client){
			const dumpFileName = "dump"+Math.round(new Date().getTime()/1000)+".json";
			const dbKeys = await redisUtils.getKeyList(client, redisUtils.getMovieKey("*"));

			let backup = {};

			for (var i = dbKeys.length - 1; i >= 0; i--) {
				const currentKey = dbKeys[i];
				const currentObj = await redisUtils.getHM(client, currentKey);

				backup[currentKey] = { type: "hash", value: currentObj };
			}

			await new Promise((res, rej) => fs.writeFile(
				path.join(__dirname,'dumps',dumpFileName),
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
		response: async function(client){
			/*
def statistics_total(self):
        try:
            country = self._get_str_from_list_value("Enter country", self._subsystems_controller.get_countries_list())
            key = self._get_str_from_list_value("Enter mode", ['Confirmed', 'Deaths', 'Recovered'])
            data = self._rserver.get_total_by_name(key, country)
            if len(data) == 0:
                raise Exception('no data')
            self._view.show_graph(country, data, key, 'plot')
        except Exception as e:
            self._view.show_error(str(e))

    def statistics(self):
        try:
            country = self._get_str_from_list_value("Enter country",
                                                     self._subsystems_controller.get_countries_list())
            key = self._get_str_from_list_value("Enter mode", ['Confirmed', 'Deaths', 'Recovered'])
            data = self._rserver.get_daily_by_name(key, country)
            if len(data) == 0:
                raise Exception('no data')
            self._view.show_graph(country, data, key, 'bar')
        except Exception as e:
            self._view.show_error(str(e))

    def day_statistics(self):
        country = self._get_str_from_list_value("Enter country",
                                                 self._subsystems_controller.get_countries_list())
        date_range = self._rserver.get_range_of_date_for_country(country)
        given_date = self._get_date_value("Enter date", date_range)
        data = self._rserver.get_all_day_by_country(country, str(given_date))
        self._view.show_pie("Statistics for the day", data)

    def regression(self):
        countries = self._rserver.get_countries_with_data()
        given_key = self._get_str_from_list_value("Enter mode", ['Confirmed', 'Deaths', 'Recovered'])
        keys_for_delete = []
        for key, statistics_data in countries.items():
            if 'Latitude' not in statistics_data or 'Longitude' not in statistics_data:
                keys_for_delete.append(key)

        for key in keys_for_delete:
            del countries[key]
        self._view.regression(countries, given_key)

    def countries_statistics(self):
        countries = self._rserver.get_countries_with_data()
        given_key = self._get_str_from_list_value("Enter mode", ['Confirmed', 'Deaths', 'Recovered'])
        mode = self._get_str_from_list_value("Enter mode", ['Mean', 'Median', 'Max'])
        data = {}
        for country in countries:
            values = [int(x) for x in self._rserver.get_daily_by_name(given_key, country).values()]
            if len(values) != 0:
                if mode == 'Mean':
                    data[country] = np.mean(values)
                elif mode == 'Median':
                    data[country] = np.median(values)
                elif mode == 'Max':
                    data[country] = np.max(values)
                else:
                    raise Exception('Invalid mode in countries statistics func')
        self._view.additional_task("", mode, data)

			*/

		}
	}
];


(async function(){
	const port="6379", host="127.0.0.1";
	const client = await redisUtils.getClient(redis, host, port);

	if((await redisUtils.getKeyList(client, redisUtils.getMovieKey("*"))).length == 0){
		await model.fillMovieData(client);
	}

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
			await menu[selectedOptionIdx].response(client);
		}catch(err){
			console.log(err);
		}

		await prompt("Enter to continue...");
	}
})();