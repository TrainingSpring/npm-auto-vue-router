



// vite插件
import * as v3 from "./v3.js";
import * as v2 from "./v2.js";
import {getConfig, setConfig} from "./comm.js";
import {exec, execSync, spawn} from "child_process";
import path from "path";


/**
 * 获取插件模块
 * @param options
 * @return {{model: {renderAll?: function(): void, loopDir?: function(*=, *): void, watchPages?: function(): void, getConfigStr?: function(*, *=): (string|null|undefined), analysisVue?: function(*): (undefined|*|null), vitePluginVueAutoRouter?: function(): {name: string, enforce: string, configResolved(*): void, config(*, *): void}, writeRouter?: function(): void}, config: *}}
 */
function getModel(options){
    let model = v3;
    let config = getConfig();
    if (options) {
        config = setConfig(options);
    }
    // 组件配置
    let c = getConfig();
    if (c && c.type === "complex") {
        model = v2;
    }
    return {
        config,
        model
    };
}

export function vitePluginVueAutoRouter(options){
    let config,command;
    let cfg = getModel(options);
    let model = cfg.model;
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

export class WebpackPluginAutoRouter{
    constructor(options){
        let cfg = getModel(options);
        this.model = cfg.model;
        this.config = cfg.config;
    }
    apply(compiler){
        let mode = compiler.options.mode; // development
        if (mode === "development"){
            this.model.watchPages();
        }else{
            this.model.renderAll();
        }
        // compiler.hooks.run.taps();
    }
}
