import DataStore from './DataStore';

/*
 * Class to access registration data
 */
export default class RegistrationStore extends DataStore {

	constructor(logger) {
		super('registrations', logger);
		this.logger = logger;
	}
}