const debug = require("@nxn/debug")('FIRESTORE');
const admin = require('firebase-admin');
const {configSce} = require('@nxn/boot');

class FireStoreInstance
{
  constructor(config) {
  }

  async init(config,ctxt) {
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

  async find(query,col,limit=0,skip=0,orderBy=null,fields=null) {
    await this.connect();

    limit = parseInt(limit);
    const coll = this.db.collection(col);
    if(query && Object.keys(query).length > 0)
    {
      Object.keys(query).forEach((v,fname)=> {
        const val = v.value||v;
        const op = v.operator || "==";
        coll.where(fname,op,val);
      });
    }

    if(orderBy && orderBy.length > 0)
    {
      orderBy.forEach((v)=> {
        const fname = k;
        coll.orderBy(fname);
      });
    }

    if(skip)
      coll.startAt(skip);
    
    if(limit)
      coll.limit(limit);
    
    if(fields)
      coll.select(fields);

    const snap = await coll.get();
    const docs = snap.docs;
    
    let results = [];
    if (!snap.empty) snap.forEach(doc => {
      let data = doc.data();
      data._id = doc.id;
      results.push(data);
    });
        
    return results;
  }

  async count(col, query=null) {
    await this.connect();

    const collection = this.db.collection(col);
    const recSet = (query && Object.keys(query).length > 0) ? collection.where(query) : collection;
    const snap = await collection.select().get();
    const n = snap.size;
    
    return n;
  }
  
  async insertOne(doc,col) {
    await this.connect();

    const id = doc.id;
    const coll = this.db.collection(col);
    const res = coll.doc(id).set(doc);
    
    return res;
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

  getInstance(name) {
    let config = {};

    if(this.config.instances && this.config.instances[name])
        config = this.config.instances[name];
    else
        config = this.config;

    return new FireStoreInstance(config)
  }
}
  

module.exports = new FireStoreSce();
module.exports.FireStoreInstance = FireStoreInstance;