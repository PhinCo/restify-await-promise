(function() {
	'use strict';
	const describe = require('mocha').describe;
	const assert = require('chai').assert;
	const restify = require('restify');
	const request = require('request-promise');
	const promissor = require('../index');

	describe('restify-await-promise - Integration', function(){

		const host = "127.0.0.1";
		const port = 5099;

		let serverInstance = false;

		beforeEach( done =>{
			serverInstance = restify.createServer({name: 'testServer'});
			promissor.install( serverInstance );
			serverInstance.listen( port, host );
			done();
		});

		afterEach( done =>{
			try{
				serverInstance.close( ()=>{
					done();
				});
			}catch( ex ){
				done( ex );
			}
		});

		describe('Default Handler', function(){
			it('should return the response when an object is returned', function(){
				function promiseFunction( req, res, next ){
					return { success: true };
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isTrue( body.success );
				});
			});

			it('should return the response when an object is returned', function(){
				function promiseFunction( req, res, next ){
					return { success: true };
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isTrue( body.success );
				});
			});

			it('should return the response when an object is returned with a status code', function(){
				function promiseFunction( req, res, next ){
					return { success: true, statusCode: 205 };
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 205 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isTrue( body.success );
					assert.isUndefined( body.statusCode );
				});
			});

			it('should not blow up when the response is already set', function(){
				function promiseFunction( req, res, next ){
					res.status( 205 );
					res.send( { success: false } );
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 205 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isFalse( body.success );
				});
			});

		});

		describe('Promise Handler', function(){

			it('should return the response when the promise resolves', function(){
				function promiseFunction( req, res, next ){
					return Promise.resolve( { success: true} );
				}
				serverInstance.post( '/path', promiseFunction );
				return request({
						method: 'POST',
						uri: `http://${host}:${port}/path`,
						resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isTrue( body.success );
				});
			});

			it('should return the response when the promise resolves with nothing', function(){
				function promiseFunction( req, res, next ){
					return Promise.resolve();
				}
				serverInstance.put( '/path', promiseFunction );
				return request({
					method: 'PUT',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.equal( '', result.body );
				});
			});

			it('should not blow up if the response has already been set', function(){
				function promiseFunction( req, res, next ){
					res.send( { success: false} );

					return Promise.resolve( { success: true} );
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isFalse( body.success );
				});
			});

			it('should not blow up if the response has already been set and next is called', function(){
				function promiseFunction( req, res, next ){
					res.send( { success: false} );
					next();
					return Promise.resolve();
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isFalse( body.success );
				});
			});

			it('should not blow up if the response has already been set and next has been called', function(){
				function promiseFunction( req, res, next ){
					res.send( { success: false} );
					next();
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isFalse( body.success );
				});
			});

			it('should handle the promise rejecting when the reject has a status code', function(){
				function promiseFunction( req, res, next ){
					let errToThrow = new Error('See ya!');
					errToThrow.statusCode = 415;
					return Promise.reject( errToThrow );
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				})
				.then( result =>{
					assert.fail( 'Should reject here');
				}).catch( ex =>{
					assert.equal( ex.statusCode, 415 );
					assert.notOk( JSON.parse(ex.error).message, 'Restify no longer returns messages in this way.');
				});
			});

			it('should handle the promise rejecting when the reject does not have a status code', function(){
				function promiseFunction( req, res, next ){
					let errToThrow = new Error('See ya!');
					return Promise.reject( errToThrow );
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				})
				.then( result =>{
					assert.fail( 'Should reject here');
				}).catch( ex =>{
					assert.equal( ex.statusCode, 500 );
					assert.equal( JSON.parse(ex.error).message, 'caused by Error: See ya!');
				});
			});
		});

		describe('Async Handler', function(){
			it('should return the response when the async function returns', function(){
				async function promiseFunction( req, res, next ){
					return { success: true};
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isTrue( body.success );
				});
			});

			it('should return the response when the async function returns nothing', function(){
				async function promiseFunction( req, res, next ){
					return;
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.equal( '', result.body );
				});
			});

			it('should not blow up if the response has already been set', function(){
				async function promiseFunction( req, res, next ){
					res.send( { success: false} );
					return { success: true };
				}
				serverInstance.del( '/path', promiseFunction );
				return request({
					method: 'DELETE',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isFalse( body.success );
				});
			});

			it('should not blow up if the response has already been set and next is called', function(){
				async function promiseFunction( req, res, next ){
					res.send( { success: false} );
					next();
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				}).then( result =>{
					assert.equal( result.statusCode, 200 );
					assert.ok( result.body );
					let body = JSON.parse( result.body );
					assert.isFalse( body.success );
				});
			});

			it('should handle the promise rejecting when the reject has a status code', function(){
				async function promiseFunction( req, res, next ){
					let errToThrow = new Error('See ya!');
					errToThrow.statusCode = 415;
					throw errToThrow;
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				})
					.then( result =>{
						assert.fail( 'Should reject here');
					}).catch( ex =>{
						assert.equal( ex.statusCode, 415 );
                        assert.notOk( JSON.parse(ex.error).message, 'Restify no longer returns messages in this way.');
					});
			});

			it('should handle the async throwing when the reject does not have a status code', function(){
				async function promiseFunction( req, res, next ){
					let errToThrow = new Error('See ya!');
					throw errToThrow;
				}
				serverInstance.get( '/path', promiseFunction );
				return request({
					method: 'GET',
					uri: `http://${host}:${port}/path`,
					resolveWithFullResponse: true
				})
					.then( result =>{
						assert.fail( 'Should reject here');
					}).catch( ex =>{
						assert.equal( ex.statusCode, 500 );
						assert.equal( JSON.parse(ex.error).message, 'caused by Error: See ya!');
					});
			});

		});

	});


})();