#!/usr/bin/env node
import {program} from "commander"
import path from "path"
import {fileURLToPath} from 'url';
import {getConfig, getJsonFile, setConfig} from "../libs/es/comm.mjs";

const __filename = fileURLToPath(import.meta.url); // 当前文件路径
const __dirname = path.dirname(__filename); // 当前文件所处的文件夹路径
let config = getConfig();


program.command("set")
    // .option("-v,--version <version>", "设置vue版本")
    .option("-ed,--excludeDir <excludeDir>", "设置排除目录 , 以;隔开")
    .option("-er,--excludeReg <excludeReg>", "设置排除目录,正则字符串(有则优先)")
    .option("-ep,--excludePath <excludePath>", "设置排除路径, 以;隔开")
    .option("-p,--pagePath <pagePath>", "设置页面目录")
    .option("-t,--type <type>", "设置渲染类型(simple,complex)")
    .description("配置信息").action(async (params,options)=>{
        console.log(config);
    let {excludeDir,excludePath} = params;
    if (excludePath){
        params.excludePath = excludePath.split(";");
    }
    if (excludeDir){
        params.excludeDir = excludeDir.split(";");
    }
    config = setConfig(params);
})
program.option("-sc,--set-config <config>","设置配置")
    .option("-v,--version","获取版本号")
    .description("统一配置信息")
    .action( async (params,options)=>{
        if (params.version){
            let pkg = getJsonFile(path.join(__dirname,'../',"package.json"));
            console.log(pkg.version);
        }else if(params.setConfig){
            let c = (new Function("return " + params.setConfig))();
            let cfg = Object(c,config);
            config = setConfig(cfg);
        }

    })

program.command("get-config")
    .description("获取配置信息")
    .action(async ()=>{
        console.log(JSON.stringify(getConfig()));
    })

program.command("render")
    .description("手动编译所有路由")
    .action(async (params,options)=>{
        let model;
        switch (config.type){
            case "simple":
                model = await import("../libs/es/v3.mjs");
                break
            case "complex":
                model = await import("../libs/es/v2.mjs");
                break;
            default:
                console.error("[error: render]编译类型设置错误！（simple | complex)");
                return;
        }
        model.renderAll();
        // console.log(options);
    })


program.command("watch")
    .description("路由监听")
    .action(async (params,options)=>{
        let model;
        switch (config.type){
            case "simple":
                model = await import("../libs/es/v3.mjs");
                break
            case "complex":
                model = await import("../libs/es/v2.mjs");
                break;
            default:
                console.error("[error: render]编译类型设置错误！（simple | complex)");
                return;
        }
        model.watchPages();
    })
// 这个一定不能忘，且必须在最后！！！
program.parse(process.argv);
