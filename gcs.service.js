var googleReqSce = require("./googlerequest.service");

const debug = require("@nxn/debug")('GCS');
const arraySce=require("@nxn/ext/array.service");
const stringSce=require("@nxn/ext/string.service");

const crypto = require('crypto')   
const configSce = require("@nxn/config");

var scopes = [
    "https://www.googleapis.com/auth/cloud_search"
  ];

class GCSearchSce
{
  constructor() {
      this.config = {};
  }

  // if init by boot.service, get a config
  init(config) {
      this.config = config;
  }

  getInstance(dsId,keypath) {
    keypath = keypath||this.config.keypath;
    return new GCS_ItemsSceInstance(dsId,keypath,this.config)
  }

  createDocument(dsId, itemId, type, titre, url, lang) {
    return new GCSDocument(dsId, itemId, type, titre, url, lang,this.config);
  }
}
  
class GCS_ItemsSceInstance
{
  constructor(dsId,keypath,config) {
      this.dsId = dsId;
      this.keypath = keypath;
      this.config = config;
      this.connectorName = config.connectorName || "default";
      this.schemaPath = config.schemaPath || null;
      this.googleReq = googleReqSce.getInstance(keypath,scopes);
  }

  createDocument(itemId, type, titre, url, lang,config) {
    config = config || this.config;
    return  GCSDocument.build(this.dsId, itemId, type, titre, url, lang,config);
  }
  createDocumentFromData(data,config) {
    config = config || this.config;
    return GCSDocument.buildFromData(this.dsId, data, config);
  }

  formatId(itemId) {
    return formatItemId(itemId);
  }

  getDoc(itemId,asDoc=true) {
    let self = this;

    const dsId = this.dsId;
    const payload = '';

    const fields = ""
    var url = `https://cloudsearch.googleapis.com/v1/indexing/datasources/${dsId}/items/${itemId}?&key=`;
  
    return new Promise(function(resolve, reject) 
    {
        self.googleReq.get(url)
        .then((result) => 
        {
          if(result.error)
            reject(result);
          else
          {
            let res2;
            
            if(asDoc)
              res2 = self.createDocumentFromData(result,self.config);
            else
              res2 = result;

            resolve(res2);
          }
        })
        .catch((err)=>
        {
          debug.error(`GCS GET ERROR on /datasources/${dsId}/items/${itemId} : `+err.message);
          reject(err);
        });
    });    
  }

  getSchema(path) {
    const schema = new GCSSchema(this.config);
    if(path)
      schema.loadFromPath(path);

    return schema;
  }

  updateSchema(dsId,schema) {
    let self = this;

    if(!schema)
    {
      debug.error("Undefined GCS schema");
      return null;
    }

    const payload = schema.payload();

    const fields = "done%2Cerror%2Cmetadata%2Cname%2Cresponse"
    var url = `https://cloudsearch.googleapis.com/v1/indexing/datasources/${dsId}/schema?key=`;
                
    return new Promise(function(resolve, reject) 
    {
        self.googleReq.put(url, payload)
        .then((result) => 
        {
          if(result.error)
            reject(result);
          else
            resolve(result);
        })
        .catch((err)=>
        {
          const message = err.message || (err.error && err.error.message) || err || '';
          debug.error(`GCS UPDATE SCHEMA ERROR on /datasources/${dsId} : `+message);
          reject(err);
        });
    });    
  }

  indexDoc(doc) {
    let self = this;

    if(!doc)
    {
      debug.error("Cant undefined index document");
    }

    const dsId = doc.dsId;
    const itemId = doc.itemId;
    const payload = doc.payload();

    const fields = "done%2Cerror%2Cmetadata%2Cname%2Cresponse"
    var url = `https://cloudsearch.googleapis.com/v1/indexing/datasources/${dsId}/items/${itemId}:index?fields=${fields}&key=`;
  
    return new Promise(function(resolve, reject) 
    {
        self.googleReq.post(url, payload)
        .then((result) => 
        {
          if(result.error)
            reject(result);
          else
            resolve(result);
        })
        .catch((err)=>
        {
          const message = err.message || (err.error && err.error.message) || '';
          debug.error(`GCS INDEX ERROR on /datasources/${dsId}/items/${itemId} : `+message);
          reject(err);
        });
    });
  }

  deleteDoc(doc,mode='ASYNCHRONOUS') {
    let self = this;

    const dsId = doc.dsId;
    const itemId = doc.itemId;
    const version = doc.getVersion(true);

    let fields = `version=${version}&mode=`+mode;

    var url = `https://cloudsearch.googleapis.com/v1/indexing/datasources/${dsId}/items/${itemId}?${fields}&key=`;
  
    return new Promise(function(resolve, reject) 
    {
      self.googleReq.delete(url)
      .then((result) => 
      {
        if(result.error)
          reject(result);
        else
          resolve(result);
      })
      .catch((err)=>
      {
        debug.error(`GCS INDEX ERROR on /datasources/${dsId}/items/${itemId} : `+err.error.message);
        reject(err);
      });
    });    
  }

  async listAll(nbPerPage=100,asDoc=true,brief=true,cb=null) {
    let page = 0;
    let finished = false;
    let docs = [];
    let len =0;

    do {
      const res = await this.list(page,nbPerPage,asDoc,brief);
      if(res && res.docs.length)
      {
        if(cb)
          // call cb for each page
          await cb(res.docs)
        else
          docs = docs.concat(res.docs);

          len += res.docs.length;
        
          if(res.nextPageToken)
          page = res.nextPageToken;
        else
          finished = true;
      }
      else
        finished = true;

    } while(!finished)

    // no cb => returns all docs in one big array (not recommanded)
    if(cb)
      return len;
    else
      return docs;

  }

  list(page=1,nbPerPage=100,asDoc=true,brief=true) {
    let self = this;

    const dsId = this.dsId;
    const briefP = brief ? 'true':'false';
    let pageP = page ? "&pageToken="+page:"";
    var url = `https://cloudsearch.googleapis.com/v1/indexing/datasources/${dsId}/items?brief=${briefP}&pageSize=${nbPerPage}${pageP}&key=`;
  
    return new Promise(function(resolve, reject) 
    {
      self.googleReq.get(url)
      .then((result) => 
      {
        if(result.error)
        {
          reject(result);
        }

        if(asDoc)
          resolve(self.docsFromData(result))
        else
          resolve(result);
      })
      .catch((err)=>{
        if(err.error)
          debug.error(`GCS INDEX ERROR on /datasources/${dsId}/items : `+err.error.message);
        else
          debug.error(`GCS INDEX ERROR on /datasources/${dsId}/items : `+err.stack);
        reject(err);
      });
    });    
  }

  // transform data from list to docs objects
  docsFromData(data) {
    let docs = [];
    if(data && data.items)
      data.items.forEach(item=> { 
        docs.push(this.createDocumentFromData(item,this.config));
      });

    return {docs:docs, nextPageToken:data.nextPageToken};
  }
}

class GCSDocument
{
  constructor(config) 
  {
    this.config = config||{};
    this.connectorName = config.connectorName || "default";
  }

  init(dsId, itemId, type, title, url, lang) {

    this.itemId = formatItemId(itemId);
    this.dsId = dsId;
    this.type = type;
    this.title = title;

    if(typeof this.config.checkData == "undefined")
      this.config.checkData = true;

    // default version = YYMMddhhmmss
    const v64 = b64(dateString());

    this.item = {
        "name": `datasources/${dsId}/items/${itemId}`,
        "acl": {
            "readers": [
            ]
          },
          "metadata": {
            "title": title,
            "sourceRepositoryUrl": url,
            "objectType": type,
            "contentLanguage": lang
          },
          
          "structuredData": 
          {
            "object": {
              "properties": 
              [
              ]
            }
          },
          "content": {
            "inlineContent": b64(''),
            "contentFormat": "HTML"
          },
          "version": v64,
          "itemType": "CONTENT_ITEM"
      };

  }

  initFromData(dsId, data) {
    this.item = data;

    const name = data.name;
    const matches = name.match(/datasources\/([^/]+)\/items\/(.+)$/);
    this.dsId = matches[1];
    this.itemId = matches[2];

    this.type = data.metadata.objectType;
    this.title = data.metadata.title;

    if(typeof this.config.checkData == "undefined")
      this.config.checkData = true;

      this.version = data.version;
      this.versionDecode = this.getVersion(false);
  }

  static build(dsId, itemId, type, title, url, lang,config) {
    let item = new GCSDocument(config);
    item.init(dsId, itemId, type, title, url, lang);
    return item;
  }

  static buildFromData(dsId, data ,config) {
    let item = new GCSDocument(config);
    item.initFromData(dsId, data);
    return item;
  }

  payload(mode="ASYNCHRONOUS") {
    return {
      "mode":mode,
      "item":this.item
    };
  }

  item() {
    return this.item;
  }

  getItem() {
    return this.item;
  }

  setVersion(version) {
    if(!version)
    {
      if(this.config.version=="timestamp")
        version = timestamp(null);
      else
      version = dateString(null);
    }

    this.item.version = b64(version);

    return this;
  }

  getVersion(as64=true) {
    let v = this.item.version;

    if(!as64)
      v = decodeB64(v);

    return v;
  }

  setDateVersion(date,withSec) {
    const version = dateString(date,withSec);
    this.item.version = b64(version);

    return this;
  }

  setContent(str,type='TEXT') {

    const str2 = str.slice(0,9000);

    this.item.content = {
      "inlineContent": b64(str2),
      "contentFormat": type
    };
  }

  addTextField(name,values) {
    let values1;
    if(values === null || typeof values == "undefined")
      values1 = [];
    else if(typeof values == "string")
      values1 = [values];
    else
      values1 = values;

    let values2 = [];

    arraySce.forEachSync(values1,v=>
      // if(values1.length>0) values1.forEach(v=>
      {
        if(!v)
          return;

        if(v.length>=1000)
        {
          debug.error('FIXED document '+this.itemId+' has field '+name+' with value exceeding 1000 size :'+v);
          v = v.slice(0,500);
        }
        values2.push(v);
      });

    let field = {
      name:name,
      textValues:{ 
        values:values2
      }
    };

    this.item.structuredData.object.properties.push(field);
  }

  addHtmlField(name,values) {
    if(typeof values == "string")
      values = [values];

    let values2 = [];

    values.forEach(v=>
      {
        if(v.length>=1000)
        {
          debug.error('FIXED document '+this.itemId+' has field '+name+' with value exceeding 1000 size :'+v);
          v = v.slice(0,500);
        }
        values2.push(v);
      });

    let field = {
      name:name,
      htmlValues:{ 
        values:values2
      }
    };

    this.item.structuredData.object.properties.push(field);
  }

  addDateField(name,d) {

    const value = 
    {
      "year": d.getUTCFullYear(),
      "month": (d.getUTCMonth()+1),
      "day": d.getUTCDate()
    }

    let field = {
      name:name,
      dateValues:{ 
        values:[value]
      }
    };

    this.item.structuredData.object.properties.push(field);
  }

  addACL(acl="default") {
    if(acl == "default") {
      acl = {
        "gsuitePrincipal": {
          "gsuiteDomain": true
        }
      }
    }

    this.item.acl.readers.push(acl);
  }
  
}

class GCSSchema
{
  constructor(config) 
  {
    this.config = config||{};
  }

  loadFromPath(path) {
    return this.schema = configSce.loadCleanConfig(path);
  }

  payload(mode="ASYNCHRONOUS") {
    return { schema:this.schema };
  } 

  type(asCSV=true) {
    let type = [];
    this.schema.objectDefinitions.forEach(def => type.push(def.name));
    
    if(asCSV)
      return type.join(',');
    else
      return type;
  }
}


module.exports = new GCSearchSce();


// private functions
function formatItemId(itemId,asMD5=false) {
  if(itemId.length > 1500)
    return formatItemId(itemId,true);

  if(asMD5)
    itemId = md5(itemId);
  else
  {
    itemId.replace(/[_\-.]/g,"-");
    itemId = stringSce.removeAccents(itemId);
  }

  return itemId;
}

function md5(s)
{
  return crypto.createHash('md5').update(s).digest("hex");
}

function b64(s) {
  return Buffer.from(s).toString('base64'); 
}

function decodeB64(s) {
  // return Buffer.from(s).toString('ascii'); 
  return Buffer.from(s, 'base64').toString('ascii');
}

function timestamp(date) {
  const d = date || new Date();
  return d.getTime();
}

function dateString(date,withSec) {
  const d = date || new Date();

  return d.getUTCFullYear() + 
      ("0" + (d.getUTCMonth()+1)).slice(-2) + 
      ("0" + d.getUTCDate()).slice(-2) +
      ("0" + d.getUTCHours()).slice(-2) +
      ("0" + d.getUTCMinutes()).slice(-2) +
      ("0" + d.getUTCSeconds()).slice(-2);     
}
