/**
 * DevServer APIs index file
 * Exports all API routers for the dev server
 */

const manifestApi = require('./manifestApi');
const schemaApi = require('./schemaApi');
const proxyApi = require('./proxyApi');
const { WOPIHostEndpoints } = require('./wopiHost');

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

  // Initialize WOPI Host endpoints for Excel Online integration
  console.log('*** Mounting WOPI Host API ***');
  const wopiHost = new WOPIHostEndpoints();
  wopiHost.initializeEndpoints(app);

  // Mount other APIs here
}

module.exports = {
  manifestApi,
  registerDevServerApis,
  WOPIHostEndpoints
};
