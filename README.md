# 一个基于Vue的自动路由解析工具
> 将文件转地址转换为路由地址
> 
> 本来是基于vue3的，所以名字带了vue3，后来兼容了vue2

# 安装
```shell
npm install -g auto-router-vue3
# or 
npm install -d auto-router-vue3
```

# 使用方式
两种使用方式：
 1. 命令行执行 
 2. 引入插件执行

## 命令行执行方式
可以使用命令 `auto-router -h` 

```
Options:
  -sc,--set-config <config>  设置配置(json字符串)
  -v,--version               获取版本号
  -h, --help                 display help for command

Commands:
  set [options]              配置信息
  get-config                 获取配置信息
  render                     手动编译所有路由
  watch                      路由监听

```
- set命令:  `auto-router set -h` 查看帮助文档
```
配置信息

Options:
-ed,--excludeDir <excludeDir>    设置排除目录 , 以;隔开
-er,--excludeReg <excludeReg>    设置排除目录,正则字符串(有则优先)
-ep,--excludePath <excludePath>  设置排除路径, 以;隔开
-p,--pagePath <pagePath>         设置页面目录
-t,--type <type>                 设置渲染类型(simple,complex)
-h, --help                       display help for command

```
- render 命令:  `auto-router render` 编译所有路由
- watch 命令:  `auto-router watch` 监听路由变化

# 配置说明
|字段| 默认           | 数据结构         | 说明                                  | 示例                                      |
|:---|:-------------|:-------------|:------------------------------------|:----------------------------------------|
|excludeDir| null         | Array , null | 若不配置则,则为null; 排除配置中的路由地址, 优先级高      | ["src/views/Layout", "src/views/Login"] |
|excludeReg| null         | String , null | 排除匹配的路由地址, 优先级中                     | "component(s)?"                         |
|excludePath| null         | Array , null | 排除匹配的路径名 , 给不熟悉正则的人使用的 优先级低         | ["component", "components"]             |
|pagePath| null         | String       | 页面所在的根目录                            | "pages"                                 |
|type| simple, complex | String        | 页面的渲染类型, simple: 单级路由, complex:多级路由 | "simple"                                |
|defaultRedirect| list| String | 正则匹配文件名 ， 设置默认重定向地址| "^list$"                                |

## 在vite 中使用vitePluginVueAutoRouter插件

使用该插件 , 可以在开发过程中实时渲染.

```js
// 引入
import vitePluginVueAutoRouter from "auto-router-vue3";
// 使用方式
export default ({mode})=>{
  return defineConfig({
    plugins: [vue(),
      // 插件可以传递配置参数
      vitePluginVueAutoRouter()]
  })
}
```
## 在vue-cli中使用插件(webpack)
由于vue-cli使用的webpack, 所以需要在`vue.config.js`中配置插件
```js
// 引入webpack插件
const WebpackPluginAutoRouter =  require("auto-router-vue3/cjs").WebpackPluginAutoRouter;
// 在下面的configureWebpack.plugins中添加
module.exports = {
  configureWebpack: {
    plugins: [
      new WebpackPluginAutoRouter({
        excludePath:["src/views/Layout"], // 排除路径
        excludeReg:"((component(s)?)|(utils)|(route(r)?))", // 排除路径正则匹配
        pagePath:"views", // 页面目录
        type:"complex" // 渲染类型 , simple: 简单模式, 不包含多级路由, complex: 复杂模式 , 可以有多级路由,按目录分级
      })
    ],
  },
}

```

## 路由配置
- 在.vue文件中 , export中, 添加
  ```javascript
  _config:{ 
    route:{ // 和配置route一样, 不要配置component字段
      name:"路由name", // 路由中 ,如果有该name字段,则使用name来命名路由, 如果没有则使用文件名命名
      meta:{},
      path:"", // 如果存在这个字段 , 则优先使用path作为路由 
      ...
    }
  }
    ```
  例如:
    ```javascript
    exports default{
        _config:{
            route:{ // 和配置route一样, 不要配置component字段
                name:"路由name", // 路由中 ,如果有该name字段,则使用name来命名路由, 如果没有则使用文件名命名
                meta:{},
                path:"", // 如果存在这个字段 , 则优先使用path作为路由 
                ...
            }
        },
        data(){
           return {
           
             }   
        }
    }
    ```
  - 如果使用的setup 则定义一个_config变量来实现
    ```javascript
      const _config= {
        route:{ // 和配置route一样, 不要配置component字段
                name:"路由name", // 路由中 ,如果有该name字段,则使用name来命名路由, 如果没有则使用文件名命名
                meta:{},
                path:"", // 如果存在这个字段 , 则优先使用path作为路由 
                ...
            }
      }
  ```
    

## 由于导入的方式是用@方式导入 , 所以还要在vite.config中添加以下配置:
```javascript
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
```
