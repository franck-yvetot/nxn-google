const { google } = require('googleapis')

class GoogleService
{
    constructor() {
        this.projects = {}
        this.jwt = {}
    }

    getProjectKeys(keysId) {
        if(this.projects[keysId])
            return this.projects[keysId];

        let keyID = keysId || process.env['GOOGLE_PROJECT_ID'] || '';
        if(keyID)
            keyID = '_'+keyID;

        const keys = require(`../.jwt_keys${keyID}.json`);
    }

    loadGoogleJwt(scopes,keys,keysId) {
        return new Promise(function(resolve, reject)
        {
            let jwt;

            if(keysId && this.jwt[keysId])
                resolve (this.jwt[keysId]);

            jwt = new google.auth.JWT(keys.client_email, null, keys.private_key, scopes);

            jwt.authorize((err, response) => {
                if(err)
                    reject(err);
                else
                {
                    if(keysId)
                        resolve (this.jwt[keysId]);
    
                    resolve(jwt);
                }
            });
        });
    }

    postGoogleRequest(url,obj, payload, jwt) {
            
        return new Promise(async function(resolve, reject) {
      
          // get Auth/Bearer header
          const reqMeta = await jwt.getRequestMetadataAsync();
      
          var headers = { 
            "content-type": "application/json",
            ...reqMeta.headers // NB. new syntax ES6
          };
      
          RequestP({
            uri: url,
            method: 'POST',
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
}