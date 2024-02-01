let fs = require("fs");
let fse = require("fs-extra");
let path = require("path");
//
let libs = path.join(__dirname,"libs/cjs");
// 处理cjs
fs.readdir(libs, (err, files) => {
    if (err){
        console.log("error: ",err);
        return;
    }
    files.forEach(file => {
        let fullPath = path.join(libs, file);
        let text = fs.readFileSync(fullPath,{encoding: "utf8"});
        text = text.replaceAll(".mjs",".js");
        text = compile(text,1);
        fs.writeFileSync(fullPath,text,{encoding: "utf8"});
    });
})
// 处理es
// 拷贝文件
fse.copySync(path.join(__dirname,"source"),path.join(__dirname,"libs/es"),{overwrite: true});
// 处理文件
fs.readdir(path.join(__dirname,"libs/es"), (err, files) => {
    if (err)return;
    files.forEach(file => {
        let fullPath = path.join(path.join(__dirname,"libs/es"), file);
        let text = fs.readFileSync(fullPath,{encoding: "utf8"});
        text = compile(text);
        fs.writeFileSync(fullPath,text,{encoding: "utf8"});
    })
})

/**
 * 条件编译
 * @param text
 * @param type 0:es模式  1:cjs模式
 */
function compile(text,type=0){
    let es = text.match(/\/\/\s?#es[\s\S]+\/\/\s?#es END/);
    let cjs = text.match(/\/\/\s?#cjs[\s\S]+\/\/\s?#cjs END/);
    if (!es && !cjs)return text;
    es = es?es[0]:"";
    cjs = cjs?cjs[0]:"";
    if (type === 0){
        if (cjs){
            text = text.replaceAll(cjs,"");
            let res = es.replace(/\/\/\s?#es/,"");
            res = res.replace(/\/\/\s?#es END/,"");
            text = text.replaceAll(es,res);
        }
    }else{
        if (es){
            text = text.replaceAll(es,"");
            let res = cjs.replace(/\/\/\s?#cjs/,"");
            res = res.replace(/\/\/\s?#cjs END/,"");
            text = text.replaceAll(cjs,res);
        }
    }
    return compile(text,type);
}
