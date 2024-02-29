const debug = require("@nxn/debug")('Sheets');
const {google} = require('googleapis');
const gauth = require("./googleauth.service");

// check : https://blog.stephsmith.io/tutorial-google-sheets-api-node-js/

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

class SheetsInstance
{

  constructor(config,keyPath) {
      this.config=config;
      this.keyPath = keyPath;
      this.sheets = null;
      this.spreadsheetId = config.spreadsheetId;
  }

  async connect(keypath) {
    if(this.sheets)
        return this.sheets; 

    try {            
        const auth   = await gauth.getJwt(SCOPES,keypath);
        this.sheets = google.sheets({version: 'v4', auth});

        debug.log("connected to google.sheets with keys in "+keypath);

        return this.sheets;
    }
    catch(err) {
        debug.error(`cant connect to Sheets instance `+err);
        return Promise.reject({error:500,error:"cant connect to Spreadsheet "+err});
    }
}  

  async sheets() {
    
    const sheets = await this.connect(this.keyPath);
    return sheets;
  }

  async readRange(range) 
  {
    const sheets = await this.connect(this.keyPath);
     
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.get(
            {
                spreadsheetId: this.spreadsheetId,
                range: range,
            }
        , (err, res) => {
                if (err) 
                    return reject(err);

                const rows = res.data.values;
                return resolve(rows);
            });      
        });
  }

  async writeRange(range, values) 
  {
    const sheets = await this.connect(this.keyPath);

    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.update(
            {
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'RAW',
                requestBody: {
                    values: values
                }
            },
            (err, res) => {
                if (err)
                    return reject(err);

                return resolve(res.data);
            });
    });
}

}

class SheetsSce
{
  constructor() {
      this.config = {};
  }

  // if init by boot.service, get a config
  init(config,app,express) {
      this.config = config;
  }

  // get instance by sheet id, or from sce config or from sce instance config by name/id
  getInstance(id,keyPath) {
    let config = {};

    if(this.config.instances && this.config.instances[id])
        config = this.config.instances[id];
    else
        config = this.config;

    keyPath = keyPath || this.config.keyPath || 'keyfile.json';
    keyPath = __clientDir + keyPath;

    if(!this.config.spreadsheetId)
        this.config.spreadsheetId = id;

    return new SheetsInstance(config,keyPath)
  }
}

module.exports = new SheetsSce();
module.exports.SheetsInstance = SheetsInstance;