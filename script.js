let fs = require("fs");
let path = require("path");
//
let dist = path.join(__dirname,"dist");
fs.readdir(dist, (err, files) => {
    if (err){
        console.log("error: ",err);
        return;
    }
    files.forEach(file => {
        let fullPath = path.join(dist, file);
        let text = fs.readFileSync(fullPath,{encoding: "utf8"});
        text = text.replaceAll(".mjs",".js");
        fs.writeFileSync(fullPath,text,{encoding: "utf8"});
    });
})
