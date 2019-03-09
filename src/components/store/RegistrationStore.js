import DataStore from './DataStore';

/*
 * Class to database access
 */
export default class RegistrationStore {


	constructor(logger) {
		this.logger = logger;
		this.dataStore = new DataStore('registrations', logger);
	}

	create(id, obj) {
		return this.dataStore.create(id, obj);
	}


	update(id, obj) {
		return this.dataStore.update(id, obj);
	}

	get(id) {
		return this.dataStore.get(id);
	}
}