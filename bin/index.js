#!/usr/bin/env node
import {watchPages,renderAll} from "../index.js"
import {program} from "commander";

program.command("render")
    .description("手动编译所有路由")
    .action(async (params,options)=>{
        renderAll();
        // console.log(options);
    })
program.command("watch")
    .description("路由监听")
    .action(async (params,options)=>{
        watchPages();
        // console.log(options);
    })
// 这个一定不能忘，且必须在最后！！！
program.parse(process.argv);
