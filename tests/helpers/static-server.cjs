'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
function createStaticServer(root){
    root=path.resolve(root);
    return http.createServer(async(req,res)=>{
        try{
            const pathname=new URL(req.url,'http://localhost').pathname;
            const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
            if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
            // Read first: a missing file must never send a 200 response header.
            const bytes=await fs.readFile(file);
            res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes);
        }catch{res.writeHead(404).end();}
    });
}
module.exports={createStaticServer};
