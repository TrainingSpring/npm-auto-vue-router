import path from "path"
import fs from "fs"
import watch from "watch"
import {getConfig, getJsonFile, getSrcInfo, traverseFolder, basename, excludeCheck} from "./comm.mjs";
import {analysisVue, getConfigStr} from "./v3.mjs";

const dirInfo = getSrcInfo();
const __filename = dirInfo.filename; // 当前文件路径
const __dirname = dirInfo.dirname; // 当前文件所处的文件夹路径
const __dir = dirInfo.dir;
const routeDir = path.join(__dir,"src/router");

/**
 *  将驼峰转换为中划线
 * @param str
 * @return {string}
 */
function camelToDash(str) {
    return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}
function isAbsolute(path) {
    return path[0] === "/";
}
// 根据路由配置获取指定的路由信息
function getRoute(route,prePath="",srcName=""){
    // 如果没有配置route信息  给默认配置路由
    let p = "";
    if (!route){
        route = {};
    }
    if (!route.path){
        p = camelToDash(srcName).toLowerCase();
    }else{
        p = route.path;
    }
    if (!isAbsolute(p)){
        p = path.posix.join(prePath,p);
    }

    route.path = p;

    return route;
}
let routeConfig = `
// 渲染一个组件或者一个空组件
export function renderComponent(component) {
  if (component)
    return component
  else return {
    render: (e) => e("router-view")
  }
}
`
function analysisRouteConfig(callback,dir,initResult=null){
    let routes = [];
    let timer = null;
    let config = getConfig();
    let map = {};
    let pagePath = path.join(__dir,"src",config.pagePath);
    dir = dir || pagePath;
    traverseFolder(dir,function(status,info,fullPath,result){
        if (status !== 1 && status !== 0)return ;

        if (timer){
            clearTimeout(timer);
        }
        let res = null;
        let data = null;
        // 文件夹处理
        if (status === 0){
            let route = getJsonFile(path.join(fullPath,"route.json"));
            let child = {}
            route = getRoute(route,!result?"/":result.path,info.name);

            route.component = `$[renderComponent()]$`;
            // 如果没有result , 可以判定为根目录
            if (!result){
                child = {
                    ...route,
                }
                routes.push(child);
                res = child;
            }else {
                child = {
                    ...route,
                }

                if(path.default){
                    result.redirect = route.path;
                }

                if (result.children){
                    result.children.push(child)
                }else {
                    result.redirect = route.path;
                    result.children = [child];
                }
            }
            res = data = child;
        }
        // 文件处理
        else if(status === 1){
            let cfg = analysisVue(fullPath) || {};
            let route = cfg.route;
            let name = info.name.split(".vue")[0];
            route = getRoute(route,result.path,info.name)
            // 当路由配置为被排除 ， 则不执行后续操作
            if (route.exclude)return result;
            let child = {};
            let rePath = fullPath.replace(dir,path.join("/",config.pagePath)).replaceAll("\\","/");

            child = {
                ...route,
                component:`$[()=>import('@${rePath}')]$`
            }
            if(path.default){
                result.redirect = route.path;
            }


            if (result.children){
                result.children.push(child)
            }else{
                result.redirect = route.path;
                result.children = [child];
            }
            data = child;
        // 相对路径

        }
        if (data) {
            map[fullPath] = data.path;
        }
        timer = setTimeout(()=>{
            callback(routes,map);
        },20)
        return res;
    },initResult)
}


class CURD{
    sysConfig;
    constructor() {
        this._getConfig();
    }
    _getConfig(){
        this.sysConfig = getConfig();
    }

    _each(route,filename,parent){
        for (let i in route){
            let item = route[i];
            if (filename.indexOf(item.path) === 0){
                if (filename!==item.path){
                    return this._each(item.children,filename,item);
                }else{
                    return {item,parent,index:i};
                }
            }
        }
        return null;
    }

    // 权限鉴定
    getPermission(filename){
        let type = 0;
        if (filename.includes(".vue"))
            type = 1;
        else if (filename.includes("route.json"))
            type = 2;
        return type;
    }
    getPath(src,child=""){
        let parentDir = path.dirname(src);
        let config = getJsonFile(path.join(src,"route.json"));
        let root = path.join(__dir,"src",this.sysConfig.pagePath);
        if (root === src){
            return "/"+child;
        }
        if(config == null || !config.path){
            let dirName = camelToDash(src.split("\\").pop());
            return this.getPath(parentDir,path.posix.join(dirName,child))
        }else
        if (config.path && config.path[0] === "/"){
            return path.posix.join(config.path , child);
        }else{
            return this.getPath(parentDir,path.posix.join(config.path,child));
        }
    }
    _getFileInfo(filename){
        let sp = filename.split("\\");
        let fullName = sp.pop(); // 文件全名
        let name = fullName.replace(/\.\w+$/,""); // 文件名(去除后缀)
        let dir = sp.join("\\"); // 文件所在目录
        let dirName = sp.pop(); // 文件所在目录名
        let parentPath = sp.join("\\"); // 父级目录路径
        return {
            parentPath,
            name,
            fullName,
            dir,
            dirName
        }
    }
    isSame(val,val1){
        let v = JSON.stringify(val).replaceAll(/[\s\n]/g,"");
        let v1 = JSON.stringify(val1).replaceAll(/[\s\n]/g,"");
        return v === v1;
    }
    _renderRoute(filename,type,prevCfg,callback){
        let route = null;
        let info = this._getFileInfo(filename);
        if (type === 1){
            let pagePath = path.join(__dir,"src",this.sysConfig.pagePath);
            route = analysisVue(filename);
            route = route?route.route:null;
            let pp = this.getPath(info.dir)
            // 如果没有配置route信息  给默认配置路由
            if (!route || !route.path){
                route = {
                    path:path.posix.join(pp,camelToDash(info.name).toLowerCase())
                }
            }else if(route.path[0] !== "/"){
                route.path = path.posix.join(pp,route.path);
            }
            let rePath = filename.replace(pagePath,path.join("/",this.sysConfig.pagePath)).replaceAll("\\","/");
            route.component = `$[()=>import('@${rePath}')]$`;
            if (this.isSame(route,prevCfg.item)){
                callback(null)
            }else
                callback(route,{[filename]:route.path});
        }else if (type === 2){
            let prePath = this.getPath(info.parentPath);
            let cfg = getRoute(getJsonFile(filename),undefined,info.dirName);
            cfg.path = path.posix.join(prePath, cfg.path);
            for (let k in cfg){
                prevCfg.item[k] = cfg[k];
            }
            // 更改路由信息
            prevCfg.item.children = [];
            analysisRouteConfig((routes,mapdb)=>{
                mapdb[info.dir] = cfg.path;
                callback(routes,mapdb);
            },info.dir,prevCfg.item)
        }
    }
    update(filename){
        let type = this.getPermission(filename);
        if (!type)return;
        let dataDir = path.join(basename,"data");
        // 路由映射
        let map = getJsonFile(path.join(dataDir,"map.json"));
        // 路由配置
        let route = getJsonFile(path.join(dataDir,"route.json"));
        // 找到当前文件路径对应的路由

        let cur = type===1?map[filename]:map[path.dirname(filename)];
        // 更新前的配置
        let prevCfg = this._each(route,cur);
        this._renderRoute(filename,type,prevCfg,(res,mapdb)=>{
            if (res === null)return;
            if (type === 1) {
                prevCfg.parent.children[prevCfg.index] = res;
                if (res.default || prevCfg.index == 0){
                    prevCfg.parent.redirect = res.path;
                }
            }

            writeRoute(handleRoutes(route),routeConfig);
            map = {
                ...map,
                ...mapdb
            }
            fs.writeFileSync(path.join(dataDir,"map.json"),JSON.stringify(map),{encoding:"utf-8"});
            fs.writeFileSync(path.join(dataDir,"route.json"),JSON.stringify(route),{encoding:"utf-8"});
            console.log("[auto-router] update:",filename);
        });
    }
}

function writeRoute(content,extra=""){
    let config = fs.readFileSync(path.join(basename,"template/route.js"),{encoding:"utf-8"});
    if (!fs.existsSync(routeDir))
        fs.mkdirSync(routeDir);
    if (!fs.existsSync(routeDir+"/index.js"))
        fs.writeFileSync(routeDir+"/index.js",config,{encoding:"utf-8"});
    else {
        let index = fs.readFileSync(path.join(routeDir,"index.js"),{encoding:"utf-8"});
        if (!/import\s+\w+\s+from\s+"[\w.\/]*config\.js"/.test(index)){
            fs.writeFileSync(routeDir+"/index.js","import config from \"./config.js\"\n"+index,{encoding:"utf-8"})
        }
    }
    fs.writeFileSync(routeDir+"/config.js",extra+`\n export default ${content}`,{encoding:"utf-8"});
}

function handleVueFile(){
    let config = getConfig();
    let dir = path.join(__dir,"src",config.pagePath);
    traverseFolder(dir,function(status,info,fullPath,result){
        if (status === 1){
            let p = camelToDash(fullPath.split("\\").pop().replace(".vue",""));
            let cfgStr = getConfigStr(fs.readFileSync(fullPath,{encoding:"utf-8"}))||"";
            // 替换path name 为文件名
            let rps = cfgStr.replace(/path:"[\w\d-]+"/,`path:"${p}"`)
            let text = fs.readFileSync(fullPath,{encoding:"utf-8"});
            fs.writeFileSync(fullPath,text.replace(cfgStr,rps));
        }
    })
}

function handleRoutes(routes){
    return JSON.stringify(routes)
        .replaceAll('"$[', "")
        .replaceAll(']$"', "")
    /*.replaceAll("}","\n}")
    .replaceAll("]","\n]")
    .replaceAll(",\"",",\n\"")
    .replaceAll("[","[\n")
    .replaceAll("{","{\n");*/
}

export function renderAll(){
    analysisRouteConfig((routes,map)=>{
        let str = handleRoutes(routes);

        let dataPath = path.join(basename,"data")
        if (!fs.existsSync(dataPath))
            fs.mkdirSync(dataPath);
        fs.writeFileSync(path.join(dataPath,"route.json"),JSON.stringify(routes),{encoding:"utf-8"});
        fs.writeFileSync(path.join(dataPath,"map.json"),JSON.stringify(map),{encoding:"utf-8"});
        writeRoute(str,routeConfig);
    })
}

/**
 * @desc 监听pages目录
 */
export function watchPages(){
    let curd = new CURD();
    let config = getConfig();
    let dir = path.join(__dir,"src",config.pagePath);
    let exclude = config.excludeReg?new RegExp(config.excludeReg):null;
    watch.watchTree(dir,{
        interval:1,
        ignoreDotFiles:true,
        ignoreUnreadableDir:true,
        ignoreNotPermitted:true,
        ignoreDirectoryPattern:exclude
    },function (f,cur,prev) {
        if (typeof f =='string' && (/(component|utils)/.test(f) || /~$/.test(f)))return;
        if (typeof f == "object" && prev === null && cur === null) {
            renderAll()
            // 完成对树的遍历
        } else if (cur.nlink === 0) {
            // f 被移除
            renderAll()
        } else if (prev != null){
            let check = excludeCheck(f);
            if (check.flag)return;
            curd.update(f);
        }
    })
}
