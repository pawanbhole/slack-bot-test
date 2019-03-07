import assert from 'assert';
import sinon from 'sinon';

import UserManager from '../src/UserManager';

const userManager = new UserManager();

var stub = sinon.stub(userManager, '_callRest').callsFake(function(options) {
    console.log('something ', options);
    if(options && options.qs && options.qs.user == '123') {
    	return Promise.resolve({name:'mock'});
    } else {
    	return Promise.reject("Test fail");
    }
});

describe('UserManager', function() {
  describe('#get()', function() {
    it('should return mock user', function(done) {
    	userManager.get("123").then((user) => {
    		assert.equal(user.name, 'mock');
    		done();
    	}).catch((error) => {
    		done(error);
    	});
    });

    it('should return error', function(done) {
    	userManager.get("456").then((user) => {
    		done(user);
    	}).catch((error) => {
    		done();
    	});
    });
  });
});