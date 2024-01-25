import {compileScript, parse} from "vue/compiler-sfc"
import path from "path"
import fs from "fs"
import watch from "watch"
import {getConfig, getJsonFile, getSrcInfo, GUID, setConfig, traverseFolder} from "./comm.js";
import clipboardy from 'clipboardy';
import {analysisVue} from "./v3.js";


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
function analysisRouteConfig(callback){
    let routes = [];
    let timer = null;
    let config = getConfig();
    let dir = path.join(__dir,"src",config.pagePath);
    traverseFolder(dir,function(status,info,fullPath,result){
        if (status !== 1 && status !== 0)return ;

        if (timer){
            clearTimeout(timer);
        }
        let res = null;
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
                let p = path.posix.join("/",route.path)
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
            res = child;
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
            let rePath = fullPath.replace(dir,path.join("/",config.pagePath)).replaceAll("\\","/"); // 相对路径
            let routePath = rePath.replace("/views","").replace(".vue",""); // 路由路径

            let p = isAbsolute(route.path)?route.path:path.posix.join(result.path,route.path);
            let child = {
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

        }else{
            // console.info("[error:"+status+"]"+info)
        }

        timer = setTimeout(()=>{
            callback(routes);
        },20)
        return res;
    })

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

export function renderAll(){
    analysisRouteConfig((routes)=>{
        let str =JSON.stringify(routes)
            .replaceAll('"$[', "")
            .replaceAll(']$"', "")
            .replaceAll("}","\n}")
            .replaceAll("]","\n]")
            .replaceAll(",\"",",\n\"")
            .replaceAll("[","[\n")
            .replaceAll("{","{\n");

        writeRoute(str,routeConfig);
    })
}

/**
 * @desc 监听pages目录
 */
export function watchPages(){
    let config = getConfig();
    let dir = path.join(__dir,"src",config.pagePath);
    watch.watchTree(dir,{
        interval:1,
        ignoreDotFiles:true,
        ignoreUnreadableDir:true,
        ignoreNotPermitted:true,
        ignoreDirectoryPattern:/(components|utils)/
    },function (f,cur,prev) {
        renderAll()
    })
}
