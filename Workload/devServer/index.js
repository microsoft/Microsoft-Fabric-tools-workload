/**
 * DevServer APIs index file
 * Exports all API routers for the dev server
 */

const manifestApi = require('./manifestApi');

/**
 * Register all dev server APIs with an Express application
 * @param {object} app Express application
 */
function registerDevServerApis(app) {
  console.log('*** Mounting Manifest API ***');
  app.use('/', manifestApi);
  app.use('/', schemaApi);
}

function registerDevServerComponents() {
  console.log('*** Mounting Dev Server Components ***');

  // Tell the user about the Playground URL
  const workloadName = process.env.WORKLOAD_NAME || 'your-workload';
  console.log(`🎮 Playground available at: https://fabric.microsoft.com/workloads/${workloadName}/playground-client-sdk`);
}

module.exports = {
  manifestApi,
  registerDevServerApis,
  registerDevServerComponents
};
