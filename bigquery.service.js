var gauth = require("./googleauth2");
var RequestP = require("request-promise-native");

const debug = require("nxn-boot/debug.service")('BIGQUERY');
const {BigQuery} = require('@google-cloud/bigquery');

class BigQueryInstance
{

  constructor(config,keyPath) {
      this.config=config;
      this.keyPath = keyPath;
  }

  async connect() {
    if(this.connected)
        return true; 

    // buckets config
    try {            
        this.bigquery = new BigQuery({
          projectId: this.config.cloud_project_id,
          keyFilename: this.keyPath,
        });

        if(this.bigquery)
            debug.log("Big Query instance connected on project "+this.config.cloud_project_id);

        this.connected = true;
        return true;
    }
    catch(err) {
        debug.error(`cant connect to BigQuery instance `+err);
        return Promise.reject({error:500,error:"cant conect to BigQuery "+err});
    }
}  

  async query(query,options) {
    
    await this.connect();

    // Queries the U.S. given names dataset for the state of Texas.
    options = options || {}
    
    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    options = {
      query: query,
      ...options
    };

    // Run the query as a job
    const [job] = await this.bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    return rows
  }
}

class BigQuerySce
{
  constructor() {
      this.config = {};
  }

  // if init by boot.service, get a config
  init(config,app,express) {
      this.config = config;
  }

  getInstance(name) {
    let config = {};

    if(this.config.instances && this.config.instances[name])
        config = this.config.instances[name];
    else
        config = this.config;

    let keyPath = __clientDir;
    keyPath += config.keyPath || this.config.keyPath || 'keyfile.json';

    return new BigQueryInstance(config,keyPath)
  }
}
  

module.exports = new BigQuerySce();