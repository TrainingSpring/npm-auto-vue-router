// 获取路径信息
import {fileURLToPath} from "url";
import path from "path";
import fs from "fs";
import * as v3 from "./v3.js";
import * as v2 from "./v2.js";
const srcInfo = getSrcInfo();
const __filename=srcInfo.filename;
const __dirname=srcInfo.dirname;

/**
 *  设置配置
 * @param options
 */
export function setConfig(options){
    let config = getConfig();
    config = Object.assign(config,options);
    fs.writeFileSync(path.join(__dirname,"bin/config.json"),JSON.stringify(config),{encoding:'utf-8'});
}

/**
 *  获取配置
 * @return {JSON}
 */
export function getConfig() {
    return getJsonFile(path.join(__dirname,"bin/config.json"));
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

// vite插件
export function vitePluginVueAutoRouter(options){
    let config,command;
    let model = v3;
    if (options) {
        setConfig(options);
    }
    // 组件配置
    let c = getConfig();
    if (c && c.version === 2) {
        model = v2;
    }
    return {
        name:"auto-router",
        enforce: 'pre',
        configResolved(resolvedConfig) {
            config = resolvedConfig;
            if (command !== "build")
                model.watchPages();
            else
                model.renderAll();
        },
        config(cfg, arg){
            config = cfg;
            command = arg.command;
        }
    }
}
