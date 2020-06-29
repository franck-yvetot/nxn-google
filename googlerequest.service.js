const debug = require("@nxn/debug")('googlerequest');
var RequestP = require("request-promise-native");
var gauth = require("./googleauth2");

class GoogleRequestInstance
{
    constructor(keypath,scopes,config) {
        this.config = config || {};
        this.keypath = keypath || this.config.keypath || null;
        this.scopes = scopes;
        this.jwt = null;
    }

    async getJwt() {
        if(!this.jwt)
        {
            this.jwt = await gauth.getJwt(this.scopes,this.keypath);
        }

        return this.jwt;
    }     

    init(config) {
        this.config = config;
    }

    put(url, payload,method="put") {
        return this.post(url, payload,method);
    }

    post(url, payload,method="post") {

        let self = this;

        return new Promise(async function(resolve, reject) 
        {

            let jwt;
            try {
                jwt = await self.getJwt();            
            } catch (error) {

                debug.error("Error : cant get jwt on scope "+self.scopes+" and keypath = "+self.keypath+" "+error.message+error.stack);
                reject(error);         
                return;   
            }

            // get Auth/Bearer header
            const reqMeta = await jwt.getRequestMetadataAsync();

            var headers = { 
                "content-type": "application/json",
                ...reqMeta.headers // NB. new syntax ES6
            };

            method = method.toUpperCase();

            RequestP({
                uri: url,
                method: method,
                headers: headers,
                body: payload,
                json:true
            })
            .then((data)=>
            {
                resolve(data);
            })
            .catch( (resp)=>{
                reject(resp.error);
            });

        });

    }

    get(url) 
    {
        let self = this;

        return new Promise(async function(resolve, reject) 
        {
            let jwt;
            try 
            {
                jwt = await self.getJwt();            
            } 
            catch (error) 
            {
                reject(error);            
            }

            // get Auth/Bearer header
            const reqMeta = await jwt.getRequestMetadataAsync();

            var headers = { 
                "content-type": "application/json",
                ...reqMeta.headers // NB. new syntax ES6
            };

            RequestP({
                uri: url,
                method: 'GET',
                headers: headers,
                json:true
            })
            .then((data)=>
            {
                resolve(data);
            })
            .catch( (resp)=>{
                reject(resp.error);
            });

        });
    }

    delete(url) 
    {
        let self = this;

        return new Promise(async function(resolve, reject) 
        {
            let jwt;
            try 
            {
                jwt = await self.getJwt();            
            } 
            catch (error) 
            {
                reject(error);            
            }

            // get Auth/Bearer header
            const reqMeta = await jwt.getRequestMetadataAsync();

            var headers = { 
                "content-type": "application/json",
                ...reqMeta.headers // NB. new syntax ES6
            };

            RequestP({
                uri: url,
                method: 'DELETE',
                headers: headers,
                // body: payload,
                json:true
            })
            .then((data)=>
            {
                resolve(data);
            })
            .catch( (resp)=>{
                reject(resp.error);
            });
        });
    }    
}


class GoogleRequestSce
{
    constructor() {
        this.config = {};
        this.jwt = null;
    }

    init(config) {
        this.config = config;
    }

    getInstance(keypath,scopes) {
        return new GoogleRequestInstance(keypath,scopes,this.config);
    }
}

module.exports = new GoogleRequestSce();
