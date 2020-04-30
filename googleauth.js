const {JWT} = require('google-auth-library');
// const keys = require('./.jwt_keys.json');

var jwt = null;

function loadGoogleJwt(scopes) {
  return new Promise(function(resolve, reject){
    if(jwt)
      resolve (jwt);

    const keys = require(__clientDir+".jwt_keys.json");

    jwt = new JWT(keys.client_email,null,keys.private_key,scopes);

    const url = `https://dns.googleapis.com/dns/v1/projects/${keys.project_id}`;
    const res = jwt.request({url})
    .then((res)=>{
      jwt = res.data;
      console.log(jwt);  
      resolve(jwt);  
    })
    .catch((err)=> {
      reject(err);
    })
  });

}

module.exports.getJwt = loadGoogleJwt;