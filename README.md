# restify-await-promise

[![Build Status](https://travis-ci.org/PhinCo/restify-await-promise.svg)](https://travis-ci.org/PhinCo/restify-await-promise)
[![devDependency Status](https://david-dm.org/PhinCo/restify-await-promise/dev-status.svg)](https://david-dm.org/restify/restify-await-promise#info=devDependencies)

Converts restify routes to support async/await and returned promises

# Usage

```javascript
const restify = require('restify');
const restify-promise = require('restify-await-promise');

const server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

const alwaysBlameTheUserErrorTransformer = {
	transform: function( exceptionThrownByRoute ){
		//Always blame the user
		exceptionThrownByRoute.statusCode = 400; 
		return exceptionThrownByRoute;
	}
}

const options = {
	logger: yourLogger,                                  //Optional: Will automatically log exceptions	
	errorTransformer: alwaysBlameTheUserErrorTransformer //Optional: Lets you add status codes 
};

restify-promise.supportPromises( server );

//Async function, automatically calls send with the returned object and next
server.get('/echo/:name', async function (req ) {
	const params = req.params; 
	return { params };
});

//Async function, manual send, automatically calls next
server.get('/echo/:name', async function (req, res) {
	await SomePromise.work( req.parms.name );
	res.send({ success: true });
});

//Promise
server.get('/echo/:name', function (req, res, next) {
	const params = req.params; 
	return Promise.resolve( { params } );
});

//Existing restify method
server.get('/echo/:name', function (req, res, next) {
	  res.send(req.params);
	  return next();
});

server.listen(8080, function () {
	  console.log('%s listening at %s', server.name, server.url);
});
```


# Installation
```bash
$ npm install --save restify-await-promise
```

## Bugs

See <https://travis-ci.org/PhinCo/restify-await-promise/issues>.
