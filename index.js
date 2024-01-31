



// vite插件
import * as v3 from "./source/v3.js";
import * as v2 from "./source/v2.js";
import {getConfig, setConfig} from "./source/comm.js";



function getModel(options){
    let model = v3;
    if (options) {
        setConfig(options);
    }
    // 组件配置
    let c = getConfig();
    if (c && c.type === "complex") {
        model = v2;
    }
    return model;
}

export function vitePluginVueAutoRouter(options){
    let config,command;
    let model = getModel(options);
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
