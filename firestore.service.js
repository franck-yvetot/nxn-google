const debug = require("@nxn/debug")('FIRESTORE');
const admin = require('firebase-admin');
const {configSce} = require('@nxn/boot');

class FireStoreInstance
{
  constructor(config) {
    this.init(config);
  }

  async init(config) {
    if(!config || this.config)
      return;

      this.config=config;
    this.keyPath = config.keyPath || config.keypath || '.keypath.json';
  }

  async connect() {
    if(this.connected)
        return true; 

    // buckets config
    try {            
        let serviceAccount = configSce.loadConfig(this.keyPath);

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

  async find(query,col,limit=0,skip=0) {
    await this.connect();

    limit = parseInt(limit);
    const docs = await this.db.collection(col).find(query,{skip:skip,limit:limit}).toArray();
    
    return docs;
  }

  async count(query,col,limit=0,skip=0) {
    await this.connect();

    limit = parseInt(limit);
    const n = await this.db.collection(col).countDocuments(query);
    
    return n;
  }
  
  async insertOne(doc,col) {
    await this.connect();

    const r = await this.db.collection(col).insertOne(doc);
    
    return r.insertedCount;
  }

  async insertMany(docs,col) {
    await this.connect();

    const r = await this.db.collection(col).insertMany(docs);

    return r.insertedCount;
  }

  async updateOne(query,update,col,addIfMissing=true) {
    await this.connect();

    const r = await this.db.collection(col).updateOne(query,{$set:update},{upsert: addIfMissing});
    
    return r.modifiedCount;
  }

  async updateMany(query,update,col,addIfMissing=true) {
    await this.connect();

    const r = await this.db.collection(col).updateMany(query,{$set:update},{upsert: addIfMissing});

    return r.modifiedCount;
  }

  async deleteOne(query,col) {
    await this.connect();

    const r = await this.db.collection(col).deleteOne(query);
    
    return r.deletedCount;
  }
  async deleteMany(query,col) {
    await this.connect();

    const r = await this.db.collection(col).deleteMany(query);
    
    return r.deletedCount;
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

    return new FireStoreInstance(config)
  }
}
  

module.exports = new FireStoreSce();