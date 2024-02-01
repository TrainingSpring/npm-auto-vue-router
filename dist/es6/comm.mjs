// 获取路径信息
import {fileURLToPath} from "url";
import path from "path";
import fs from "fs";
const srcInfo = getSrcInfo();
const filename=srcInfo.filename;
const dirname=srcInfo.dirname;

/**
 *  设置配置
 * @param options
 */
export function setConfig(options){
    let config = getConfig();
    if (options.version){
        options.version = Number(options.version)
    }
    config = Object.assign(config,options);
    if(options.excludeReg){
        config.excludeDir = null;
    }else if(options.excludeDir){
        config.excludeReg = null;
    }
    fs.writeFileSync(path.join(dirname,"../","bin/config.json"),JSON.stringify(config),{encoding:'utf-8'});
    return config;
}

/**
 *  获取配置
 * @return {any}
 */
export function getConfig() {
    let cfgPath = path.join(dirname,"../","bin/config.json");
    let cfg = getJsonFile(cfgPath);
    if (cfg == null){
        let res = {"excludeDir":null,"excludeReg":"((component(s)?)|(utils)|(route(r)?))","excludePath":null,"pagePath":"pages","type":"simple"};
        setJsonFile(cfgPath,res);
        return res;
    }
    return cfg

}

/**
 * 从Json文件中获取JSON数据
 * @param dir 路径
 * @return {JSON}
 */
export function getJsonFile(dir) {
    try {
        let res = fs.readFileSync(dir,{encoding:'utf-8'});
        return JSON.parse(res);
    }catch (e){
        return null;
    }
}
/**
 * 从Json文件中获取JSON数据
 * @param dir 路径
 * @param data 数据
 * @return {JSON}
 */
export function setJsonFile(dir,data) {
    try {
        if (typeof data !== "string"){
            data = JSON.stringify(data);
        }
        fs.writeFileSync(dir,data,{encoding:'utf-8'});
        return true;
    }catch (e){
        return false;
    }
}
/**
 * 获取基础路径信息
 * @return {{filename: string, dir: string, dirname: string}}
 */
export function getSrcInfo(){
    
    let __filename = fileURLToPath(import.meta.url);
    return {
        filename: __filename, // 当前文件路径
        dirname: path.dirname(__filename), // 当前文件所处的文件夹路径
        dir: path.resolve()   // 执行命令时的路径
    }
    

    
}

/**
 * @desc 生成GUID
 * @param format 格式
 * @return {string}
 */
export function GUID(format = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") {
    let char = ['A', 'B', 'C', 'D', 'E', 'F', 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    let len = 0;
    for (let i in format)
        if (format[i] === 'x') len += 1;
    let random = () => {
        let i = parseInt(Math.random() * 15);

        return char[i];
    };
    return format.replace(/x/g, res => random())
}

const config = getConfig();
/**
 * 遍历文件夹
 * @param dir 文件夹路径
 * @param callback 回调 ， 包含三个参数 status:(-1 ,错误 ， 0 文件夹 ， 1 文件   2.遍历完成) ， info(-1 ，错误信息 ， 0,1 文件 ， 2 完成信息） ， fullPath：当状态为0,1时有此参数 , result 上一级递归的回调值(当状态为0,1时有此参数)
 * @param result 回调结果
 */
export function traverseFolder(dir,callback,result) {
    fs.readdir(dir, { withFileTypes: true },(err,dirs)=>{
        if (err) return callback(-1,err);
        dirs.forEach(dirent => {
            const fullPath = path.join(dir, dirent.name);

            if (dirent.isDirectory()) {
                if (config.excludePath && config.excludePath.filter(e => fullPath.includes(path.join(e))).length){
                    return callback(2,"Traversal complete. The src <" + fullPath + ">was excluded.")
                }
                if (config.excludeReg && (new RegExp(config.excludeReg)).test(dirent.name)){
                    return callback(2,"Traversal complete. The src <" + fullPath + ">was excluded.")
                }else if(config.excludeDir && config.excludeDir.includes(dirent.name)){
                    return callback(2,"Traversal complete. The src <" + fullPath + ">was excluded.")
                }
                let res = callback(0,dirent,fullPath,result)
                traverseFolder(fullPath, callback,res);

            } else {
                let extname = path.extname(fullPath);
                if (extname === ".vue")
                    return callback(1,dirent,fullPath,result)
                else return callback(2,"Traversal complete. The src <" + fullPath + ">is not a vue file.")
            }
        });
        // 可以在此处添加一个回调来通知整个目录遍历完成
        callback(2, 'Traversal complete');
    });
}
/**
 * @description 深度优先遍历
 * @param {Array,JSON} data 数据
 * @param callback 回调
 * @param options 配置
 * @constructor
 */
export function DFS(data, callback = ()=>{}, options = {}) {
    let _options = Object.assign({}, {
        child: "data"
    }, options);
    let {
        child
    } = _options;
    if (!!data) {
        let stack = [];
        if (Array.isArray(data))
            for (let i = data.length - 1; i >= 0; i--) {
                let item = data[i];
                item._tier = 0;
                stack.push(item);
            }
        else if (typeof data === "object") {
            data._tier = 0;
            stack.push(data);

        }
        while (stack.length > 0) {
            let item = stack.pop();
            let tier = item._tier;
            tier++;
            callback(item);
            let children = item[child] || [];
            for (let i = children.length - 1; i >= 0; i--) {
                children[i]._tier = tier;
                stack.push(children[i]);
            }
        }
    }
}
