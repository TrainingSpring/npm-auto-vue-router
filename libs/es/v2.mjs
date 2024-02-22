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
let _config = getConfig(); // 获取配置
let pagePath = path.join(__dir, "/src",_config.pagePath);

export function updateConfigInfo(){
    _config = getConfig();
    pagePath = path.join(__dir, "/src",_config.pagePath);
}

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
    let res = "";
    if (!isAbsolute(p)){
        res = path.posix.join(prePath,p);
    }else res = p;

    route.path = res;

    return {
        name:p,
        route
    };
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
const defaultPre = "$$default$$";
function analysisRouteConfig(callback,dir,initResult=null){
    let routes = [];
    let timer = null;
    let defaultRedirect = new RegExp(_config.defaultRedirect || "^list$");
    let map = {};
    dir = dir || pagePath;
    traverseFolder(dir,function(status,info,fullPath,result){
        if (status !== 1 && status !== 0)return ;

        if (timer){
            clearTimeout(timer);
            timer = null;
        }
        let res = null;
        let data = null;
        // 文件夹处理
        if (status === 0){
            let route = getJsonFile(path.join(fullPath,"route.json"));
            let child = {}
            if (!route)return undefined;
            route = getRoute(route,!result?"/":result.path,info.name).route;

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

                if(route.default){
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
            let _route = cfg.route;
            let name = info.name.split(".vue")[0];
            const setRoute = (route)=>{
                let res = result;
                if (!res){
                    res = {
                        path:"/"
                    };
                }
                let routeInfo = getRoute(route,res.path,info.name);
                route = routeInfo.route;
                // 当路由配置为被排除 ， 则不执行后续操作
                if (route.exclude)return result;
                let child = {};
                let rePath = fullPath.replace(dir,path.join("/",_config.pagePath)).replaceAll("\\","/");

                child = {
                    ...route,
                    component:`$[()=>import('@${rePath}')]$`
                }

                if(route.default){
                    res.redirect = defaultPre+route.path;
                }else if(!res.redirect || (!res.redirect.includes(defaultPre) && defaultRedirect.test(routeInfo.name))){
                    res.redirect = route.path;
                }

                if (!result){
                    result = child;
                    routes.push(child);
                }else if (result.children){
                    result.children.push(child)
                }else{
                    result.children = [child];
                }
                return child;
            }
            if (Array.isArray(_route)){
                for (let i in _route){
                    let route = setRoute(_route[i]);
                }
            }else{
                setRoute(_route)
            }
            // data = child;
            // 相对路径

        }
        /*if (data) {
            map[fullPath] = data.path;
        }*/
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
        this.pagePath = path.join(__dir, "/src",this.sysConfig.pagePath);
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
        let root = this.pagePath;
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
            let pagePath = this.pagePath;
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
            console.log("\n[auto-router] update:",filename);
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
    traverseFolder(pagePath,function(status,info,fullPath,result){
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
        .replaceAll(defaultPre,"")
    /*.replaceAll("}","\n}")
    .replaceAll("]","\n]")
    .replaceAll(",\"",",\n\"")
    .replaceAll("[","[\n")
    .replaceAll("{","{\n");*/
}

export function renderAll(){
    console.log("\n[auto-router]: 正在渲染路由...");
    analysisRouteConfig((routes,map)=>{
        let str = handleRoutes(routes);

        let dataPath = path.join(basename,"data")
        if (!fs.existsSync(dataPath))
            fs.mkdirSync(dataPath);
        // fs.writeFileSync(path.join(dataPath,"route.json"),JSON.stringify(routes),{encoding:"utf-8"});
        // fs.writeFileSync(path.join(dataPath,"map.json"),JSON.stringify(map),{encoding:"utf-8"});
        writeRoute(str,routeConfig);
        console.log("\n[auto-router]: 渲染完成!!!");
    })
}

/**
 * @desc 监听pages目录
 */
export function watchPages(){
    let curd = new CURD();
    let exclude = _config.excludeReg?new RegExp(_config.excludeReg):null;
    let timer = null;
    watch.watchTree(pagePath,{
        interval:1,
        ignoreDotFiles:true,
        ignoreUnreadableDir:true,
        ignoreNotPermitted:true,
        ignoreDirectoryPattern:exclude
    },function (f,cur,prev) {
        if (typeof f =='string'){
            let check = excludeCheck(f);
            if (check.flag)return;
            if ((exclude.test(f) || /~$/.test(f)))return;
        }
        // 过滤重复调用
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(()=>{
            renderAll();
        },50)
    })
}
