



// vite插件
import * as v3 from "./v3.js";
import * as v2 from "./v2.js";
import {getConfig, setConfig} from "./comm.js";

export function vitePluginVueAutoRouter(options){
    let config,command;
    let model = v3;
    if (options) {
        setConfig(options);
    }
    // 组件配置
    let c = getConfig();
    if (c && c.version === 2) {
        model = v2;
    }
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
