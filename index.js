( function(){
	'use strict';



	function _supportPromises( restifyServer, options ){
		if( !restifyServer ) throw new Error("Can't help you if you don't give me a server.");
		['del', 'get', 'head', 'opts', 'post', 'put', 'patch'].forEach( method => {
			const previous = restifyServer[method];
			restifyServer[method] = function(){
				const args = [].slice.call( arguments );
				const handler = args[args.length - 1];

				if( _isFunction( handler ) ){
					const wrappedFunc = _wrapRouteFunction( handler );
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
			const newNext = function(){
				if( nextCalled === true ) return;
				nextCalled = true;
				next.apply( null, arguments );
			};

			function doErrorHandling( error ){
				if( logger ) logger.error( "HANDLED ERROR: ", error );
				let restError = !errorTransformer ? error  : errorTransformer.transform( error );
				newNext( restError );
			}

			function callSendAndNextIfNeeded( res, body ){
				if( _shouldSendResponse( res ) ){
					const statusCode = _extractStatusCodeFromBody( body );
					res.status( statusCode );
					res.send( body );
				}
				newNext();
			}

			try{
				let valueReturnedFromFunction = funcToWrap( req, res, newNext );
				if( _isPromise( valueReturnedFromFunction ) || _isAsync( valueReturnedFromFunction ) ){
					valueReturnedFromFunction
						.then( body => {
							callSendAndNextIfNeeded( res, body )
						})
						.catch( error => {
							doErrorHandling( error )
						});
				}
				else if(  valueReturnedFromFunction ){
					if ( _isFunction( valueReturnedFromFunction) ) {
						throw new Error( 'Functions should not be returned from route invocations.' );
					}
					callSendAndNextIfNeeded( res, valueReturnedFromFunction );
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

	exports.supportPromises = _supportPromises;
	exports._wrapRouteFunction = _wrapRouteFunction;


})();