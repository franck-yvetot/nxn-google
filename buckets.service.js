/* Service for Google Buckets */ 
const axios = require("axios");
const configSce = require("@nxn/config");

const {Storage} = require('@google-cloud/storage');

// local buckets (cache or tests)
// const pathConfig = __dirname+"/../client_data/";
// const pathBuckets = pathConfig+"/buckets";

const fs = require('@nxn/files/file.service');

const debug=require("@nxn/debug")("GBUCKET");

class GoogleBuckets
{
    constructor(bucketCachePath,config,configPath) 
    {
        // client data where all config is stored by client
        this.configDir = configPath; //pathConfig+cltName+"/";
        this.config = config;

        // bucket local cache
        this.localBucketsPath = bucketCachePath+'buckets/';
        this.useCache = false;
        this.useLastIfFails = false;
        this.uploadFile = true;
    }

    async connect() {
        if(this.connected)
            return true; 

        // buckets config
        try {
            if(!this.config)
                this.config = await configSce.loadConfig(this.configDir+'buckets.json');
                
            this.useCache = this.config.use_cache || false;
            this.useLastIfFails = this.config.get_last_if_fails || false;
            this.uploadFile = this.config.upload_file || true;
            
            const keypath = this.config.keyPath || this.config.keypath ||'keyfile.json';

            // create storage client
            this.storage = new Storage({
                projectId: this.config.cloud_project_id,
                keyFilename: this.configDir+keypath,
            });

            if(this.storage)
                debug.log("Bucket service connected on project "+this.config.cloud_project_id);

            this.connected = true;
            return true;
        }
        catch(err) {
            debug.error(`cant connect to buckets `+err);
            return Promise.reject({error:500,error:"cant conect to buckets "+err});
        }

    }

    getFileUrl(bucketName,filename) {
        const buckN =  this.config.buckets[bucketName]||bucketName;

        return `https://storage.googleapis.com/${buckN}/${filename}`;
      }    

    getFileUri(bucketName,filename) {
        const buckN =  this.config.buckets[bucketName]||bucketName;

        return "gs://"+(`${buckN}/${filename}`).replace(/[/]+/,'/');
    }

    getBucketUri(bucketName,dir) {
        const buckN =  this.config.buckets[bucketName]||bucketName;
        if(dir)
            dir = ('/'+dir.trim()+'/').replace(/[/]+/,'/');
        else
            dir = '/';

        return `gs://${buckN}${dir}`;
    }    
    getBucketName(bucketName) {
        return  this.config.buckets[bucketName]||bucketName;
    }    

    async downloadFileFromBucket(bucketName,fileName,localPath,usecache) {

        let data = null;
        let tmp = localPath+'.tmp';

        // regular download
        try {
            await this.connect();

            // make sur tmp dir is created
            const tmpDir = await fs.createParentDirAsync(tmp);

            const {bucket,file} = this.getBucketFile(bucketName,fileName);
            await file.download({
                destination: tmp,
            });

            await fs.renameFileAsync(tmp,localPath);  

            return localPath;
        }
        catch(err) {
            try {
                debug.error(err.message);
                await fs.unlinkFileAsync(tmp);                
            } 
            catch (error) {
                debug.error(error.message);
            }

            return Promise.reject(err);
        }
    }

    async readFiles(bucketName,cb,filter,usecache,useLastIfFails) 
    {
        var self = this;
        usecache = (typeof usecache == "boolean") ? usecache : this.useCache;
        useLastIfFails = (typeof useLastIfFails == "boolean") ? useLastIfFails : this.useLastIfFails;
        const buckN =  this.config.buckets[bucketName]||bucketName;

        try 
        {
            await this.connect();

            const options = {};

            // actual bucket name
            const bucket = this.storage.bucket(buckN);

            // Lists files in the bucket, filtered by a prefix
            const [files] = await bucket.getFiles(options);           

            const n = files.length;
            let i = 0;
            files.forEach(async function (file){
                const fileName = file.name;
                let localPath = self.getLocalPath(bucketName,fileName);
                let data,metadata;

                try {
                    [metadata] = await file.getMetadata();

                    if(filter)
                    {
                        [ok,reason] = filter.accepts(metadata);
                        if(!ok)
                        {
                            debug.log("File "+fileName+" ignored "+reason);
                            return;
                        }
                    }
                    data = await self.readFileData(bucketName,fileName,usecache,useLastIfFails);
                }
                catch(err)
                {
                    debug.error(`cant read file ${fileName} in bucket ${bucketName} : ${buckN}, on path ${localPath} `+err);
                }

                try {
                    await cb(fileName, data,metadata,++i,n);                    
                } catch (error) {
                    debug.error(`cant process file ${fileName} from bucket `+error.message+"  "+error.stack);
                }
            });
        }
        catch(err)
        {
            debug.error(`cant read files from bucket ${bucketName} : ${buckN}`+err);
        }

        return ;
    }

    async readFileData(bucketName,fileName,usecache,useLastIfFails) {
        let localPath;

        usecache = (typeof usecache == "boolean") ? usecache : this.useCache;
        useLastIfFails = (typeof useLastIfFails == "boolean") ? useLastIfFails : this.useLastIfFails;

        try 
        {
            localPath = this.getLocalPath(bucketName,fileName);

            // try local version
            if(usecache && fs.existsSync(localPath))
            {
                debug.log(`get local cache for file ${fileName} in bucket ${bucketName}, on path ${localPath}`);
            }
            else
            {
                await this.downloadFileFromBucket(bucketName,fileName,localPath);
            }
        }
        catch(err)
        {
            debug.error(`cant get file ${fileName} from bucket ${bucketName}, on path ${localPath} `+err);
            
            if(useLastIfFails && fs.existsSync(localPath))
            {
                debug.log(`get local cache for file ${fileName} in bucket ${bucketName}, on path ${localPath}`);
            }
        }

        try 
        {
            if(!fs.existsSync(localPath))
            {
                debug.error(`cant read file ${fileName} in bucket ${bucketName}, on path ${localPath} `);
            }

            const data = await fs.readFileAsync(localPath);

            if(localPath.endsWith("json"))
            {
                return JSON.parse(data);
            }

            debug.log(`Read file ${fileName} from bucket ${bucketName}, to path ${localPath} `);

            return data;
        }
        catch(err)
        {
            debug.error(`cant read file ${fileName} in bucket ${bucketName}, on path ${localPath} `+err);
        }

        return null;
    }

    async uploadFileToBucket(localPath,bucketName,fileName) {

        await this.connect();

        const {bucket,file} = this.getBucketFile(bucketName,fileName);

        await bucket.upload(localPath, {
            // The path to which the file should be uploaded
            destination: fileName
        });

        debug.log(`File ${fileName} uploaded to bucket ${bucketName}, on path ${localPath}`);
    }

    async writeFileData(bucketName,fileName,data,uploadFile) {
        let localPath;

        uploadFile = (typeof uploadFile == "boolean") ? uploadFile : this.uploadFile;
        const buckN =  this.config.buckets[bucketName]||bucketName;

        try 
        {
            localPath = this.getLocalPath(bucketName,fileName);

            if(localPath.endsWith("json"))
            {
                data = JSON.stringify(data);
            }
            
            await fs.writeFileAsync(localPath,data,true);
        }
        catch(err)
        {
            const error = err.stack || err;
            debug.error(`cant write file ${fileName} to bucket ${bucketName} : ${buckN}, on path ${localPath} `+error);
            return;
        }

        try 
        {
            if(uploadFile)
                await this.uploadFileToBucket(localPath,bucketName,fileName);
        }
        catch(err)
        {
            const error = err.stack || err;
            debug.error(`cant write file ${fileName} to bucket ${bucketName} : ${buckN}, on path ${localPath} `+error);
        }
    }

    
    getLocalPath(bucketName,fileName) {
        const localPath = this.localBucketsPath+bucketName+"/"+fileName;
        return localPath;
    }

    getBucketFile(bucketName,fileName) {

        // actual bucket name
        const buckN =  this.config.buckets[bucketName]||bucketName;

        const bucket = this.storage.bucket(buckN);
        const file = bucket.file(fileName);

        return {bucket,file};
    }    

    /*
    async readUrl(url) {
        const response = await axios.get(url);
        const data = response.data;
        return data;    
    }
    */
}

class GoogleBucketsSce
{
    constructor() {
        this.bucketCachePath = null;
    }

    init(config) {
        this.config = config;
        this.log = config.log||{};
        this.bucketCachePath = config.localPath||__dataDir||__clientDir;
        this.configPath = config.localPath||__clientDir;
    }


    getInstance(bucketCachePath) {
        bucketCachePath = bucketCachePath || this.bucketCachePath;
        const inst = new GoogleBuckets(bucketCachePath,this.config,this.configPath);
        return inst;
    }
}

module.exports = new GoogleBucketsSce();
module.exports.GoogleBuckets = GoogleBuckets;
module.exports.GoogleBucketsSce = GoogleBucketsSce;