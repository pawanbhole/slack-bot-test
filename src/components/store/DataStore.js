import admin from 'firebase-admin';
import serviceAccountKey from '../../service-account.json';

/*
 * Class to firebase database access
 */
export default class DataStore {

	/*
	 * First argument is name of the table in databse
	 */
	constructor(store, logger) {
		this.logger = logger;
		this.store = store;
		admin.initializeApp({
		  credential: admin.credential.cert(serviceAccountKey)
		});
		this.db = admin.firestore();
	}

	/*
	 * Create new document
	 */
	create(id, obj) {
		return this.db.collection(this.store).doc(id).set(obj);
	}


	/*
	 * Update existing document 
	 */
	update(id, obj) {
		return this.db.collection(this.store).doc(id).update(obj);
	}

	/*
	 * Get all documents
	 */
	getAll() {
		return new Promise((resolve, reject)=> {
			const objects = {};
			this.db.collection(this.store).get().then((snapshot) => {
				snapshot.forEach((doc) => {
					objects[doc.id] =  doc.data();
				});
				resolve(objects);
			})
			.catch((err) => {
				reject(err);
			});
		});
	}

	/*
	 * Get specific document
	 */
	get(id) {
		return new Promise((resolve, reject)=> {
			const objects = {};
			this.db.collection(this.store).doc(id).get().then((doc) => {
				if(doc.exists) {
					resolve(doc.data());
				} else {
					resolve(null);
				}
			})
			.catch((err) => {
				reject(err);
			});
		});
	}

	/*
	 * Delete specific document
	 */
	delete(id) {
		return new Promise((resolve, reject)=> {
			const objects = {};
			this.db.collection(this.store).doc(id).delete().then((res) => {
				resolve(res);
			})
			.catch((err) => {
				reject(err);
			});
		});
	}

}