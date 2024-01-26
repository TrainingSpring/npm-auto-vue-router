import {compileScript, parse} from "vue/compiler-sfc"
import path from "path"
import fs from "fs"
import watch from "watch"
import {getConfig, getJsonFile, getSrcInfo, GUID, setConfig, traverseFolder} from "./comm.js";
import {analysisVue, getConfigStr, loopDir, writeRouter} from "./v3.js";

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
function analysisRouteConfig(callback,dir,prePath="/"){
    let routes = [];
    let timer = null;
    let config = getConfig();
    let map = {};
    dir = dir || path.join(__dir,"src",config.pagePath);
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

            // 如果没有配置route信息  给默认配置路由
            if (!route){
                route = {
                    path:camelToDash(info.name).toLowerCase(),
                }
            }else if(!route.path){
                route.path = camelToDash(info.name).toLowerCase();
            }
            route.components = `$[renderComponent()]$`;
            // 如果没有result , 可以判定为根目录
            if (!result){
                let p = path.posix.join(prePath,route.path)
                child = {
                    ...route,
                    path:p,
                }
                routes.push(child);
                res = child;
            }else {
                let p = isAbsolute(route.path)?route.path:path.posix.join(result.path,route.path);
                child = {
                    ...route,
                    path:p,
                }
                if (result.children){
                    result.children.push(child)
                }else {
                    result.redirect = p;
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
            if (!route ){
                route = {
                    path:camelToDash(name).toLowerCase(),
                }
            }else if(!route.path){
                route.path = camelToDash(name).toLowerCase();
            }
            // 当路由配置为被排除 ， 则不执行后续操作
            if (route.exclude)return result;
            let child = {};
            let rePath = fullPath.replace(dir,path.join("/",config.pagePath)).replaceAll("\\","/");
            if (!result){
                routes.push({
                    ...route,
                    path:isAbsolute(route.path)?route.path:path.posix.join(prePath,route.path),
                    components:`$[()=>import('@${rePath}')]$`
                })
                return ;
            }
// 相对路径
            let routePath = rePath.replace("/views","").replace(".vue",""); // 路由路径

            let p = isAbsolute(route.path)?route.path:path.posix.join(result.path,route.path);
            child = {
                ...route,
                path:p,
                components:`$[()=>import('@${rePath}')]$`
            }

            result.redirect = p;
            if (result.children){
                result.children.push(child)
            }else{
                result.redirect = p;
                result.children = [child];
            }
            data = child;
        }
        if (data) {
            map[fullPath] = data.path;
        }
        timer = setTimeout(()=>{
            callback(routes,map);
        },20)
        return res;
    })
}


class CURD{
    constructor() {
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
        if(config == null){
            return "/"+child
        }
        if (config.path && config.path[0] === "/"){
            return path.posix.join(config.path , child);
        }else{
            return this.getPath(parentDir,path.posix.join(config.path,child));
        }
    }
    _getFileInfo(filename){
        let sp = filename.split("\\");
        let fullName = sp.pop();
        let name = fullName.replace(/\.\w+$/,"");
        let dir = sp.join("\\");
        sp.pop();
        let parentPath = sp.join("\\");
        return {
            parentPath,
            name,
            fullName,
            dir
        }
    }
    _renderRoute(filename,type,callback){
        let route = null;
        let info = this._getFileInfo(filename);
        if (type === 1){
            route = analysisVue(filename);
            route = route?route.route:null;
            let pp = this.getPath(info.dir)
            let parent = getJsonFile(path.join(info.dir,"route.json"));
            // 如果没有配置route信息  给默认配置路由
            if (!route || !route.path){
                route = {
                    path:path.posix.join(pp,camelToDash(info.name).toLowerCase())
                }
            }else if(route.path[0] !== "/"){
                route.path = path.posix.join(pp,route.path);
            }
            route.components = `$[renderComponent()]$`;
            callback(route,{filename:route.path});
        }else if (type === 2){
            let prePath = this.getPath(info.dir);
            analysisRouteConfig((routes,mapdb)=>{
                callback(routes,mapdb);
            },info.dir,prePath)
        }
    }
    update(filename){
        let type = this.getPermission(filename);
        if (!type)return;
        let dataDir = path.join(__dirname,"data");
        // 路由映射
        let map = getJsonFile(path.join(dataDir,"map.json"));
        // 路由配置
        let route = getJsonFile(path.join(dataDir,"route.json"));
        // 找到当前文件路径对应的路由

        let cur = type===1?map[filename]:map[path.dirname(filename)];
        // 更新前的配置
        let prevCfg = this._each(route,cur);
        this._renderRoute(filename,type,(res,mapdb)=>{
            if (type === 1)
                prevCfg.parent.children[prevCfg.index] = res;
            else {
                prevCfg.item.children = res;
            }
            writeRoute(JSON.stringify(route),routeConfig);
            map = {
                ...map,
                ...mapdb
            }
            fs.writeFileSync(path.join(dataDir,"map.json"),JSON.stringify(map),{encoding:"utf-8"})
            fs.writeFileSync(path.join(dataDir,"route.json"),JSON.stringify(route),{encoding:"utf-8"})
        });
    }
}

function writeRoute(content,extra=""){
    let config = fs.readFileSync(path.join(__dirname,"template/route.js"),{encoding:"utf-8"});
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

export function renderAll(){

    let curd = new CURD();
    curd.update("H:\\npm-package\\auto-vue-router\\src\\views\\data\\exam-data\\route.json")
    return ;
    analysisRouteConfig((routes,map)=>{
        let str =JSON.stringify(routes)
            .replaceAll('"$[', "")
            .replaceAll(']$"', "")
            .replaceAll("}","\n}")
            .replaceAll("]","\n]")
            .replaceAll(",\"",",\n\"")
            .replaceAll("[","[\n")
            .replaceAll("{","{\n");

        let dataPath = path.join(__dirname,"data")
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
    watch.watchTree(dir,{
        interval:1,
        ignoreDotFiles:true,
        ignoreUnreadableDir:true,
        ignoreNotPermitted:true,
        ignoreDirectoryPattern:/(components|utils)/
    },function (f,cur,prev) {
        if (typeof f =='string' && (/(components|utils)/.test(f) || /~$/.test(f)))return;
        if (typeof f == "object" && prev === null && cur === null) {
            renderAll()
            // 完成对树的遍历
        } else if (cur.nlink === 0) {
            // f 被移除
            renderAll()
        } else if (prev != null){
            curd.update(f);
        }
    })
}
