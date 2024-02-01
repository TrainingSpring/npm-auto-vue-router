let fs = require("fs");
let fse = require("fs-extra");
let path = require("path");
//
let dist = path.join(__dirname,"dist/common");
// 处理commonjs
fs.readdir(dist, (err, files) => {
    if (err){
        console.log("error: ",err);
        return;
    }
    files.forEach(file => {
        let fullPath = path.join(dist, file);
        let text = fs.readFileSync(fullPath,{encoding: "utf8"});
        text = text.replaceAll(".mjs",".js");
        if (file !== "comm.js"){
            text = text.replaceAll("getSrcInfo","getSrcInfo.bind(null,'commJS')")
        }
        text = compile(text,1);
        console.log(text);
        fs.writeFileSync(fullPath,text,{encoding: "utf8"});
    });
})
// 处理es6
// 拷贝文件
fse.copySync(path.join(__dirname,"source"),path.join(__dirname,"dist/es6"),{overwrite: true});
// 处理文件
fs.readdir(path.join(__dirname,"dist/es6"), (err, files) => {
    if (err)return;
    files.forEach(file => {
        let fullPath = path.join(path.join(__dirname,"dist/es6"), file);
        let text = fs.readFileSync(fullPath,{encoding: "utf8"});
        text = compile(text);
        fs.writeFileSync(fullPath,text,{encoding: "utf8"});
    })
})

/**
 * 条件编译
 * @param text
 * @param type 0:es6模式  1:commonJS模式
 */
function compile(text,type=0){
    let es6 = text.match(/\/\/\s?#es6[\s\S]+\/\/\s?#es6 END/);
    let commonJS = text.match(/\/\/\s?#commonJS[\s\S]+\/\/\s?#commonJS END/);
    if (!es6 && !commonJS)return text;
    es6 = es6?es6[0]:"";
    commonJS = commonJS?commonJS[0]:"";
    if (type === 0){
        if (commonJS){
            text = text.replaceAll(commonJS,"");
            let res = es6.replace(/\/\/\s?#es6/,"");
            res = res.replace(/\/\/\s?#es6 END/,"");
            text = text.replaceAll(es6,res);
        }
    }else{
        if (es6){
            text = text.replaceAll(es6,"");
            let res = commonJS.replace(/\/\/\s?#commonJS/,"");
            res = res.replace(/\/\/\s?#commonJS END/,"");
            text = text.replaceAll(commonJS,res);
        }
    }
    return compile(text,type);
}
