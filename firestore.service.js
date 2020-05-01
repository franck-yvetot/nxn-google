const debug = require("@nxn/debug")('FIRESTORE');
const admin = require('firebase-admin');

class FireStoreInstance
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
        let serviceAccount = require(this.keyPath);

        if(!serviceAccount.project_id)
            throw "cant find keys for connecting firestore instance";
            
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        this.db = admin.firestore();
        
        if(this.db)
            debug.log("Firestore instance connected on project "+serviceAccount.project_id);
        else
            throw "cant connect firestore instance";

        this.connected = true;
        return true;
    }
    catch(err) {
        debug.error(`cant connect to Firestore instance `+err);
        return Promise.reject({error:500,error:"cant conect to BigQuery "+err});
    }
}  

  async collection(col) {
    
    await this.connect();

    return this.db.collection(col);
  }
}

class FireStoreSce
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

    return new FireStoreInstance(config,keyPath)
  }
}
  

module.exports = new FireStoreSce();