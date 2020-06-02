module.exports = {
	getClient: async function(redis, host, port){
		const client = redis.createClient(port, host);
		
		return new Promise((res, rej) => {
			client.on('connect', () => res(client));
			client.on('error', rej);
		});
	},

	incrNumAsString: async function(client, key, value){
		return new Promise((res, rej) => {
			client.incrby(key, value, function(err, newValue) {
			    if(err)
			    	rej(err);
			    else
			    	res(newValue);
			});
		});
	},

	getString: async function(client, key){
		return new Promise((res, rej) => {
			client.get(key, function(err, value) {
			    if(err)
			    	rej(err);
			    else
			    	res(value);
			});
		});
	},
	setString: async function(client, key, value){
		return new Promise((res, rej) => {
			client.set(key, value, function(err, reply) {
				if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},


	getHM: async function(client, key){
		return new Promise((res, rej) => {
			client.hgetall(key, function(err, object) {
			    if(err)
			    	rej(err);
			    else
			    	res(object);
			});
		});
	},
	setHM: async function(client, key, object){
		return new Promise((res, rej) => {
			client.hmset(key, object, function(err) {
			    if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},


	addList: async function(client, key, item){
		return new Promise((res, rej) => {
			client.rpush(key, item, function(err, object) {
			    if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},
	getList: async function(client, key, indexStart, indexEnd){
		return new Promise((res, rej) => {
			client.lrange(key, indexStart, indexEnd, function(err, arr) {
			    if(err)
			    	rej(err);
			    else
			    	res(arr);
			});
		});
	},
	removeList: async function(client, key){
		return new Promise((res, rej) => {
			client.lpop(key, function(err, arr) {
			    if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},


	addSortedList: async function(client, key, item, itemValue){
		return new Promise((res, rej) => {
			client.zadd(key, itemValue, item, function(err, object) {
			    if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},
	getSortedList: async function(client, key, indexStart, indexEnd){
		return new Promise((res, rej) => {
			client.zrange(key, indexStart, indexEnd, function(err, arr) {
			    if(err)
			    	rej(err);
			    else
			    	res(arr);
			});
		});
	},
	readRevSortedList: async function(client, key, indexStart, indexEnd){
		return new Promise((res, rej) => {
			client.zrevrange(key, indexStart, indexEnd, function(err, arr) {
			    if(err)
			    	rej(err);
			    else
			    	res(arr);
			});
		});
	},
	removeMinSortedList: async function(client, key){
		return new Promise((res, rej) => {
			client.zpopmin(key, function(err, elem) {
			    if(err)
			    	rej(err);
			    else
			    	res(elem);
			});
		});
	},
	countSortedList: async function(client, key){
		return new Promise((res, rej) => {
			client.zcard(key, function(err, count) {
			    if(err)
			    	rej(err);
			    else
			    	res(count);
			});
		});
	},
	incrValueSortedList: async function(client, key, item, valueDiff){
		return new Promise((res, rej) => {
			client.zincrby(key, valueDiff, item, function(err, newVal) {
			    if(err)
			    	rej(err);
			    else
			    	res(newVal);
			});
		});
	},


	addSet: async function(client, key, item){
		return new Promise((res, rej) => {
			client.sadd(key, item, function(err, object) {
			    if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},
	containsSet: async function(client, key, item){
		return new Promise((res, rej) => {
			client.sismember(key, item, function(err, contains) {
			    if(err)
			    	rej(err);
			    else
			    	res(contains === 1);
			});
		});
	},
	readSet: async function(client, key){
		return new Promise((res, rej) => {
			client.smembers(key, function(err, list) {
			    if(err)
			    	rej(err);
			    else
			    	res(list);
			});
		});
	},
	removeSet: async function(client, key, item){
		return new Promise((res, rej) => {
			client.srem(key, item, function(err, arr) {
			    if(err)
			    	rej(err);
			    else
			    	res();
			});
		});
	},

	
	getKeyList: async function(client, pattern){
		return new Promise((res, rej) => {
			client.keys(pattern, function(err, arr) {
			    if(err)
			    	rej(err);
			    else
			    	res(arr);
			});
		});
	},
	keyExists: async function(client, key){
		return new Promise((res, rej) => {
			client.exists(key, function(err, reply) {
			    if(err)
			    	rej(err);
			    else
			    	res(reply === 1);
			});
		});
	},

	getMovieKey: (name) => "MOVIE_"+name
};

