/**
 * DevServer APIs index file
 * Exports all API routers for the dev server
 */

const manifestApi = require('./manifestApi');
const schemaApi = require('./schemaApi');
const proxyApi = require('./proxyApi');

/**
 * Register all dev server APIs with an Express application
 * @param {object} app Express application
 */
function registerDevServerApis(app) {
  console.log('*** Mounting Manifest API ***');
  app.use('/', manifestApi);
  app.use('/', schemaApi);
  
  console.log('*** Mounting Proxy API ***');
  app.use('/api', proxyApi);

  // Mount other APIs here
}

module.exports = {
  manifestApi,
  registerDevServerApis
};
