import {compileScript, parse} from "vue/compiler-sfc"
import path from "path"
import fs from "fs"
import watch from "watch"
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url); // 当前文件路径
const __dirname = path.dirname(__filename); // 当前文件所处的文件夹路径
const __dir = path.resolve();   // 执行命令时的路径
const pages = path.join(__dir, "/src/pages");
const files = fs.readdirSync(pages);
const routeDir = path.join(__dir,"src/router");
const ignoreDirs = /(components|utils)/;

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

/**
 * @desc 递归遍历文件夹及文件 并做相应的处理
 * 规则:
 *
 *  1. 页面局部组件 , 若放在单文件夹中 , 需放在在目录下的components文件夹中
 *
 * @param fls
 * @param p
 */
let routes = []; // 路由列表
let routesInfo = {}; // 路由详情
export function loopDir(fls = [],p){
    if (fls.length === 0)return;
    fls.forEach(item=>{
        const fullPath = path.join(p,item); // 完整路径
        const isDir = fs.statSync(fullPath).isDirectory(); // 是否为文件夹类型
        if (isDir && !ignoreDirs.test(item.toLowerCase())){
            const child = fs.readdirSync(fullPath) || [];
            loopDir(child,fullPath);
        }else {
            // 获取后缀
            const extname = path.extname(fullPath);
            // 只处理vue文件
            if (extname === ".vue"){
                let routeStr = analysisRouteConfig(fullPath)
                routes.push(routeStr)
                routesInfo[fullPath] = {
                    data:routeStr,
                    index:routes.length - 1,

                }
            }
        }
    })
}

/**
 * @desc 解析vue文件
 * @param filepath 文件路径
 */
export function analysisVue(filepath) {
    if (!filepath)return ;
    const file = fs.readFileSync(filepath,{encoding:"utf-8"})
    const parseVue = parse(file);
    try {
        // 因为在有些特殊情况下 , 比如在script标签中没有任何代码的情况下 , compileScript函数会报错 , 所以放在try中
        let {content} = compileScript(parseVue.descriptor,{
            filename:path.basename(filepath),
            id:GUID(),
        });
        let lc = 0;
        let power = false;
        let configReg = /_config\s*=\s*/
        let strCfg = "";
        // 获取_config配置
        try {
            content.split("\n").forEach((item)=>{
                // _config 字段
                if (!power && configReg.test(item)){
                    power = true;
                }
                if (!power)return ;
                let strlen = item.length;
                strCfg += item;
                for (let i = 0 ;i < strlen;i++){
                    let str = item[i];
                    if (str === "{"){
                        lc ++;
                    }
                    if(str === "}"){
                        lc --;
                    }
                }
                if (lc === 0){
                    power = false;
                    throw "break";
                }
            })
        }catch (e){}
        strCfg = strCfg.replace(/^(const|let).*_config\s*=\s*/,'return');
        return (new Function(`${strCfg}`))();
    }catch (e){
        return null;
    }

}

/**
 * @desc 解析路由配置
 * @param filepath 文件路径
 */
function analysisRouteConfig(filepath){
    if (!filepath)return;
    let config = analysisVue(filepath);
    let abPath = filepath.replace(pages,"/pages").replaceAll("\\","/"); // 相对路径
    let routePath = abPath.replace("/pages","").replace(".vue",""); // 路由路径
    let routePathArr = routePath.split("/"); // 相对路径转数组
    let res = {};
    // 没有配置config的情况 or 没有配置route
    if (!config || !config.route){
        res = {
            path:routePath
        }
    }else if(config.route){
        if (config.route.path){ // 有path的情况
            res = config.route;
        }else if (config.route.name != null){ // 没有path 有name的情况
            let len = routePathArr.length;
            routePathArr[len - 1] = encodeURI(config.route.name);
            if (routePathArr[len-1] === "")routePathArr.pop();
            res = Object.assign({
                path:routePathArr.join("/")
            },config.route);
        }else
            res = Object.assign({
                path:routePath
            },config.route);
    }
    res["component"] = `$[()=>import('@${abPath}')]$`;
    return JSON.stringify(res).replace('"$[', "").replace(']$"', "");
}
/**
 * @desc 写入路由
 */
export function writeRouter(){
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
    fs.writeFileSync(routeDir+"/config.js",`export default [\n\t${routes.join(",\n\t")}\n]`,{encoding:"utf-8"});
}



class CURD{
    queue = [];
    constructor() {
    }
    /**
     * @desc 当文件被更改 , 执行更新操作
     * @param filePath
     */
    update(filePath) {
        let prev = routesInfo[filePath]["data"].replace(/(\n)/g,"");
        let cur = analysisRouteConfig(filePath);
        let cur_cs = cur.replace(/(\n)/g,"");
        const index = routesInfo[filePath]["index"];
        if(prev !== cur_cs){
            routes[index] = cur;
            routesInfo[filePath]["data"] = cur;
            writeRouter();
        }
    }
    /**
     * @desc 执行删除操作
     * @param filePath
     * @param cur
     */
    delete(filePath,cur){
        let keys = Object.keys(routesInfo);
        for (let key of keys){
            if (key.indexOf(filePath) > -1){
                let index = routesInfo[key].index;
                routes[index] = null;
                this.queue.push(index);
                delete routesInfo[key];
            }
        }
        writeRouter();
    }

    /**
     * @desc 执行新增操作
     * @param filePath
     * @param cur
     */
    create(filePath,cur){
        const res = this._baseLogic(filePath,cur);
        if (!res)return;
        res.forEach(item=>{
            // 队列长度
            const q_len = this.queue.length;
            // 判定队列是否为空 , 如果不为空 , 则出队,否则返回数组长度
            // 大致意思是 , 如果routes有空值, 则插入,没有控制则push
            const index = q_len>0?this.queue.shift():routes.length;
            if (routes[index] != null)
                loopDir(files,pages);
            else if(routesInfo[item]){
                // ...
            }else{
                const routeStr = analysisRouteConfig(item);
                routesInfo[item] = {
                    data: routeStr,
                    index
                }
                routes[index] = routeStr;
            }
        })

        writeRouter();
    }

    /**
     * @desc 主要用于判定路径是否是目录,
     如果是目录则深度遍历目录下有没有vue文件 ,
     如果是vue文件则返回路径
     * @param dirPath
     * @param cur
     * @return {Array|*}
     * @private
     */
    _dirHasFiles(dirPath,cur){
        if (!cur.isDirectory() && path.extname(dirPath) === '.vue')return [dirPath];
        let q = [dirPath];
        let res = [];
        while (q.length){
            // 当前文件夹
            let c = q.shift();
            let f = fs.readdirSync(c);
            for (let i of f){
                const fullPath = path.join(c,i);
                if (fs.statSync(fullPath).isDirectory())q.push(fullPath);
                else if(path.extname(fullPath) === '.vue'){
                    res.push(fullPath);
                }
            }
        }
        return res;
    }
    _baseLogic(filePath,cur){
        if(ignoreDirs.test(filePath.toLowerCase()))return null;
        const res = this._dirHasFiles(filePath,cur);
        if (res.length === 0)return null;
        return res;
    }
}

/**
 * @desc 监听pages目录
 */
export function watchPages(){
    let curd = new CURD();
    watch.watchTree(pages,{
        interval:1,
        ignoreDotFiles:true,
        ignoreUnreadableDir:true,
        ignoreNotPermitted:true,
        ignoreDirectoryPattern:/(components|utils)/
    },function (f,cur,prev) {
        if (typeof f == "object" && prev === null && cur === null) {
            renderAll()
            // 完成对树的遍历
        } else if (prev === null) {
            // f 是一个新文件
            curd.create(f,cur)
        } else if (cur.nlink === 0) {
            // f 被移除
            curd.delete(f,cur);
        } else if (prev != null){
            curd.update(f);
        }
    })
}
// 全部渲染pages
export function renderAll() {
    loopDir(files,pages); // 轮询目录 , 生成route配置
    writeRouter(); // 文件写入
}
// vite插件
export function vitePluginVueAutoRouter(){
    let config,command;
    return {
        name:"auto-router",
        enforce: 'pre',
        configResolved(resolvedConfig) {
            config = resolvedConfig;
            console.log(command)
            if (command !== "build")
                watchPages();
            else
                renderAll();
        },
        config(cfg, arg){
            config = cfg;
            command = arg.command;
        }
    }
}
