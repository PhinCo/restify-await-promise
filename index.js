( function(){
	'use strict';

	function _install( restifyServer, options ){
		const optionsClone = Object.assign( {}, options );
		if( !restifyServer ) throw new Error(`Can't help you if you don't give me a server.`);
		['del', 'get', 'head', 'opts', 'post', 'put', 'patch'].forEach( method => {
			const previous = restifyServer[method];
			restifyServer[method] = function(){
				const args = [].slice.call( arguments );
				const handler = args[args.length - 1];

				if( _isFunction( handler ) ){
					//This wraps the conditional route handler but has no observed adverse impact
					const wrappedFunc = _wrapRouteFunction( handler, optionsClone );
					args.splice( args.length - 1, 1, wrappedFunc );
				}

				previous.apply( restifyServer, args );
			};
		});
	}

	function _wrapRouteFunction( funcToWrap, options ){
		if ( !options ) options = {};
		const logger = options.logger || false;
		const errorTransformer = options.errorTransformer || false;

		return function _wrappedRouteHandler( req, res, next ){

			let nextCalled = false;
			const wrappedNext = function(){
				if( nextCalled === true ) return;
				nextCalled = true;
				next.apply( null, arguments );
			};

			function doErrorHandling( error ){
				if( logger ) logger.error( 'HANDLED ERROR: ', error );
				let restError = !errorTransformer ? error : errorTransformer.transform( error );
				wrappedNext( restError );
			}

			function callSendAndNextAsNeeded( res, body ){
				if( _shouldSendResponse( res ) ){
					const statusCode = _extractStatusCodeFromBody( body );
					res.status( statusCode );
					res.send( body );
				}
				wrappedNext();
			}

			try{
				let valueReturnedFromFunction = funcToWrap( req, res, wrappedNext );
				if ( !_isValidReturn( valueReturnedFromFunction ) ){
					throw new Error('Only Promises, async functions, and objects can be returned when using this plugin.');
				}

				if( _isPromise( valueReturnedFromFunction ) || _isAsync( valueReturnedFromFunction ) ){
					return valueReturnedFromFunction
						.then( body => {
							callSendAndNextAsNeeded( res, body );
						})
						.catch( error => {
							doErrorHandling( error );
						});
				} else if( valueReturnedFromFunction ){
					callSendAndNextAsNeeded( res, valueReturnedFromFunction );
				}
			}catch( error ){
				doErrorHandling( error );
			}
		};
	}

	/**
	 * NOTE: Modifies body
	 *
	 * Allows routes to change response status code by providing a statusCode property
	 *
	 */
	function _extractStatusCodeFromBody( body ){
		let statusCode = 200;

		if( bodyHasStatusCode( body ) ){
			// Allow resolved responses to change status code
			statusCode = body.statusCode;
			delete body.statusCode;
		}
		return statusCode;
	}

	function bodyHasStatusCode( body ){
		if ( !body || typeof body !== 'object') return false;
		return !!body.statusCode;
	}

	function _shouldSendResponse( res ){
		return !res.finished && !res.headersSent;
	}

	function _isFunction( candidate ){
		return !!candidate && typeof candidate === 'function';
	}

	function _isPromise( candidate ){
		return !!candidate && (typeof candidate === 'object' || typeof candidate === 'function') && typeof candidate.then === 'function';
	}

	function _isAsync( candidate ){
		return !!Symbol && !!candidate && candidate[Symbol.toStringTag] === 'AsyncFunction';
	}

	function _isValidReturn( valueReturned ){
		if ( _isPromise( valueReturned ) ) return true;
		if ( _isAsync( valueReturned ) ) return true;
		return !_isFunction( valueReturned );
	}

	exports.install = _install;
	exports._wrapRouteFunction = _wrapRouteFunction;

})();