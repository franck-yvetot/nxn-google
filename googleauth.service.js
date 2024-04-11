const { google } = require('googleapis')

class GoogleAuthSce {
    constructor() {
        this.jwt = {}
    }

    init(config) {
        this.config = config;
        this.dir = config.basePath;
    }

    async getJwtFromKeys(scopes,keys) 
    {
        this.jwt[keys.client_email] = new google.auth.JWT(keys.client_email, null, keys.private_key, scopes);
    
        return new Promise((resolve, reject) => {
            this.jwt[keys.client_email].authorize((err, response) => {
                if(err)
                    reject(new Error(err));
                else
                    resolve(this.jwt[keys.client_email]);
            });
        });
    }

    async getJwt(scopes,keypath) {
        keypath = keypath || ".jwt_keys.json";
        const self = this;
    
        if(this.jwt[keypath])
            return this.jwt[keypath];
    
        // const dir = this.dir || __clientDir;
        const keys = require(keypath);

        return this.getJwtFromKeys(scopes,keys);

        /*
        this.jwt[keypath] = new google.auth.JWT(keys.client_email, null, keys.private_key, scopes);
    
        return new Promise((resolve, reject) => {
            this.jwt[keypath].authorize((err, response) => {
                if(err)
                    reject(new Error(err));
                else
                    resolve(self.jwt[keypath]);
            });
        });
        */
    }
      
}

module.exports = new GoogleAuthSce();