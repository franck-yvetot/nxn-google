const fs = require('@nxn/files');
const SheetsSce = require("@nxn/google/sheets.service");
const debug = require("@nxn/debug")('SHEET_CONNECTOR');
const FlowNode = require("@nxn/boot/node")

class GcsGoogleSheetSce extends FlowNode
{
    constructor() {
        super();
        this.localPath = null;
        this.sheets = {};
    }

    init(config,ctxt,...injections) {
        if(this.isInit())
            return;
        super.init(config,ctxt,injections);

        const rootPath = __dataDir||__clientDir||this.invalidParam('missing client data dir');
        this.localPath = rootPath + (config.localPath||"/sheets/");
        this.sheets = {};
    }

    name() {
        return this._name;
    }

    async connect() {
        return SheetsSce;
    }

    // called from run section of the config
    async run(config,ctxt,...processors) {

        await this.init(config,ctxt,processors);

        await this.processMessage(null);
    }

    async processMessage(msg=null) {

        const self= this;

        const config = this.config;
        const docname = config.doc_name||'spreadsheet';
        const offset = config.start_row||0;

        const store=config.store;
        const keep=config.keep;
        const process=config.process||true;

        if(!config.spreadsheetId)
            throw new Error("missing configuration : spreadsheetId for "+docname);

        if(!config.keyPath)
            throw new Error("missing configuration : keyPath for "+docname);

        if(!config.range)
            throw new Error("missing configuration : range for "+docname);       
            
        const spreadsheetId = config.spreadsheetId;

        try
        {
        const sheetsSce = await this.connect();
            const sheet = await sheetsSce.getInstance(spreadsheetId,config.keyPath);

        const rows = await sheet.readRange(config.range);
        const headers = rows.shift();

        debug.log("found "+rows.length+" rows in google sheet " + docname + " :" +config.spreadsheetId);

        if(keep && !self.sheets[docname])
            self.sheets[docname]={};

        const lastOffset = rows.length-1;

        if(offset)
        {
            rows.splice(0, offset+1);
        }

        debug.log("Processing "+rows.length+" lines starting line : "+offset);

        // get connector instance
        if(!this.canSendMessage())
        {
            debug.error("no receivers for sheet");
            return false;            
        }       

        rows.forEach(async function(row,i){
            const id = i+1+offset;

            debug.log("ID = "+id);
            
            // get it back to json
            const data = self.rowToJs(row,headers,config.mapData);
            data.id = ""+id;

			if(store)
                self.storeLocal(docname,id,data);
                
            if(keep)
                self.sheets[docname][id] = data;

            if(process)
                await self.processItem(docname, id, data);
        });

        return lastOffset;
    }
        catch(err) {
            throw new Error("cant read spreadsheet "+config.spreadsheetId+"  "+err.message+err.stack);
        }

    }

    // transform row to object w/ mapping of headers
    rowToJs(row,headers,map) {
        let obj={};
        headers.forEach((header,i) => {
            const cell = row[i]||'';
            if(map[header])
                header=map[header];

            obj[header] = cell;
        });

        return obj;
    }

    async processItem(docname, id, data)
    {
        const self = this;
        let res;

        // get index object
        this.sendMessage({name:'row_'+id,data:data});

        /*
        if(res)
            await this.storeLocal(docname,"/index/"+id,res);
        */
    }
  
    async storeLocal(docname,id,data) {
        const jdata = JSON.stringify(data,null,4);
        const path = this.localPath+docname+"/"+id+".json";
        debug.log("store row to "+path);
        return fs.writeFileAsync(path,jdata,true);
    }
}

class Factory
{
    constructor () {
        this.instances={};
    }
    getInstance(instName) {
        if(this.instances[instName])
            return this.instances[instName];

        return (this.instances[instName] = new GcsGoogleSheetSce(instName));
    }
}

module.exports = new Factory();