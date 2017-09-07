(function() {
	'use strict';
	const describe = require('mocha').describe;
	const sinon = require('sinon');
	const assert = require('chai').assert;
	const promissor = require('../index');

	describe('restify-await-promise - Unit', () => {

		function getRestInterface(){
			return {
				send: function(){},
				status: function(){}
			};
		}

		function getLogger(){
			return {
				error: function(){}
			}
		}

		function getErrorTransformer(){
			return {
				transform: function(someErr){
					return new Error('transformedError');
				}
			}
		}

		describe('Promise and Async', ()=>{
			it('should do shit to shit', ()=>{

			});

		});

		describe('Callback based routes', ()=>{
			const req = undefined; //Expect failures because we don't want req to be used in the scenario

			it('should support default restify behavior when passed no options', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					res.send({property: "value"});
					next();
				}
				const resInterface = getRestInterface();


				const resSendSpy = sinon.spy( resInterface, 'send' );
				const resStatusSpy = sinon.spy( resInterface, 'status' );
				const nextSpy = sinon.spy();


				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap );
				wrappedFunction( req, resInterface, nextSpy );

				assert( nextSpy.calledOnce );

				assert( resSendSpy.calledOnce );
				assert.isFalse( resStatusSpy.called );
			});

			it('should support the route returning an object with no options', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					return { property: "value" };
				}

				const resInterface = getRestInterface();
				const resSendSpy = sinon.spy( resInterface, 'send' );
				const resStatusSpy = sinon.spy( resInterface, 'status' );
				const nextSpy = sinon.spy();

				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap );
				wrappedFunction( req, resInterface, nextSpy );

				assert( nextSpy.calledOnce );

				assert( resSendSpy.calledOnce );
				assert( resSendSpy.calledWith({property: "value"}) );
				assert( resStatusSpy.calledWith( 200 ) );
			});

			it('should support the route returning an object with a status code and no options', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					return { property: "value", statusCode: 499 };
				}

				const resInterface = getRestInterface();
				const resSendSpy = sinon.spy( resInterface, 'send' );
				const resStatusSpy = sinon.spy( resInterface, 'status' );
				const nextSpy = sinon.spy();

				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap );
				wrappedFunction( req, resInterface, nextSpy );

				assert( nextSpy.calledOnce );

				assert( resSendSpy.calledOnce );
				assert( resSendSpy.calledWith( { property: "value" } ) );
				assert( resStatusSpy.calledWith( 499 ) );
			});

			it('should error when returning a function in the callback path', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					return function someFunc(){ };
				}

				const resInterface = getRestInterface();
				const resSendSpy = sinon.spy( resInterface, 'send' );
				const resStatusSpy = sinon.spy( resInterface, 'status' );
				const nextSpy = sinon.spy();

				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap );
				wrappedFunction( req, resInterface, nextSpy );

				assert( nextSpy.calledOnce );
				assert.equal( nextSpy.firstCall.args[0].message, 'Functions should not be returned from route invocations.');

				assert.isFalse( resStatusSpy.called );
				assert.isFalse( resSendSpy.called );
			});

			it('should call next with the error when the function throws', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					throw new Error('Foo bar');
				}

				const resInterface = getRestInterface();
				const resSendSpy = sinon.spy( resInterface, 'send' );
				const resStatusSpy = sinon.spy( resInterface, 'status' );
				const nextSpy = sinon.spy();

				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap );
				wrappedFunction( req, resInterface, nextSpy );

				assert( nextSpy.calledOnce );
				assert.equal( nextSpy.firstCall.args[0].message, 'Foo bar');

				assert.isFalse( resStatusSpy.called );
				assert.isFalse( resSendSpy.called );
			});

			it('should call next with the error when the function throws and log if given a logger', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					throw new Error('Foo bar');
				}

				const resStub = getRestInterface();
				const resSendSpy = sinon.spy( resStub, 'send' );
				const resStatusSpy = sinon.spy( resStub, 'status' );
				const nextSpy = sinon.spy();

				const loggerStub = getLogger();
				const errorSpy = sinon.spy( loggerStub, 'error' );


				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap, { logger: loggerStub} );
				wrappedFunction( req, resStub, nextSpy );

				assert( nextSpy.calledOnce );
				assert.equal( nextSpy.firstCall.args[0].message, 'Foo bar');

				assert.isFalse( resStatusSpy.called );
				assert.isFalse( resSendSpy.called );

				assert( errorSpy.calledOnce );
				let errorSpyArgs = errorSpy.firstCall.args;
				assert.equal( errorSpyArgs[0], 'HANDLED ERROR: ');
				assert.equal( errorSpyArgs[1].message, 'Foo bar');
			});

			it('should call next with the error from the transformer when the function throws and log if given a logger', ()=>{
				function routeFunctionToWrap ( req,res,next ){
					throw new Error('Foo bar');
				}

				const resStub = getRestInterface();
				const resSendSpy = sinon.spy( resStub, 'send' );
				const resStatusSpy = sinon.spy( resStub, 'status' );
				const nextSpy = sinon.spy();

				const loggerStub = getLogger();
				const loggerErrorSpy = sinon.spy( loggerStub, 'error' );

				const transformerStub = getErrorTransformer();
				const transformerTransformSpy = sinon.spy( transformerStub, 'transform' );


				const wrappedFunction = promissor._wrapRouteFunction( routeFunctionToWrap, { logger: loggerStub, errorTransformer:  transformerStub} );
				wrappedFunction( req, resStub, nextSpy );

				assert.isFalse( resStatusSpy.called );
				assert.isFalse( resSendSpy.called );

				assert( loggerErrorSpy.calledOnce );
				let errorSpyArgs = loggerErrorSpy.firstCall.args;
				assert.equal( errorSpyArgs[0], 'HANDLED ERROR: ');
				assert.equal( errorSpyArgs[1].message, 'Foo bar');

				assert( transformerTransformSpy.calledOnce );
				let transformSpyArgs = transformerTransformSpy.firstCall.args;
				assert.equal( transformSpyArgs[0].message, 'Foo bar');


				assert( nextSpy.calledOnce );
				assert.equal( nextSpy.firstCall.args[0].message, 'transformedError');
			});


		});

	});
})();