#!/usr/bin/env node
import * as v3 from "../v3.js"
import * as v2 from "../v2.js"
import {program} from "commander"
import fs from "fs"
import path from "path"
import config from "./config.json" assert {type:'json'}
import {fileURLToPath} from 'url';
import {watchPages} from "../v2.js";
import {setConfig} from "../index.js";

const __filename = fileURLToPath(import.meta.url); // 当前文件路径
const __dirname = path.dirname(__filename); // 当前文件所处的文件夹路径

let v = config.version;

program.command("set")
    .option("-v,--version <version>", "设置vue版本")
    .option("-ed,--excludeDir <excludeDir>", "设置排除目录 , 以;隔开")
    .option("-er,--excludeReg <excludeReg>", "设置排除目录,正则字符串(有则优先)")
    .option("-ep,--excludePath <excludePath>", "设置排除路径, 以;隔开")
    .option("-p,--pagePath <pagePath>", "设置页面目录")
    .option("-t,--type <type>", "设置渲染类型(simple,complex)")
    .description("配置信息").action(async (params,options)=>{
        let {excludeDir,excludePath} = params;
        if (excludePath){
            params.excludePath = excludePath.split(";");
        }
        if (excludeDir){
            params.excludeDir = excludeDir.split(";");
        }
        config = setConfig(params);
})

program.command("render")
    .description("手动编译所有路由")
    .action(async (params,options)=>{
        switch (v){
            case 2:
                v2.renderAll();
                break
            case 3:
                v3.renderAll();
                break;

        }
        // console.log(options);
    })
program.command("watch")
    .description("路由监听")
    .action(async (params,options)=>{
        switch (v){
            case 2:
                v2.watchPages();
                break
            case 3:
                v3.watchPages();
                break;

        }
    })
// 这个一定不能忘，且必须在最后！！！
program.parse(process.argv);
