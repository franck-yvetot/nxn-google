const { google } = require('googleapis')

// const {JWT} = require('google-auth-library');
// const keys = require('./.jwt_keys.json');

var jwt = {};

function getJwt(scopes,keypath,email=null) {
  return new Promise(function(resolve, reject)
  {
    keypath = keypath || ".jwt_keys.json";

    if(jwt[keypath])
      resolve (jwt[keypath]);

    const keys = require(__clientDir+keypath);

    jwt[keypath] = new google.auth.JWT(keys.client_email, null, keys.private_key, scopes,email);

    jwt[keypath].authorize((err, response) => {
        if(err)
            reject(err);
        else
            resolve(jwt[keypath]);
    });
  });
}

module.exports.getJwt = getJwt;