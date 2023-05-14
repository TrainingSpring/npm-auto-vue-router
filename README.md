# 一个基于Vue3的自动路由解析工具
> 将文件转地址转换为路由地址
> 暂时只支持一级路由, 多级路由完善中

## 安装
```shell
npm install -g auto-router-vue3
```

## 使用方式
> 后面应该会更新自定义文件夹渲染 , 但现在没有
> 项目结构必须有: /src/pages文件夹 , 该pages文件夹下存放的是所有page
> 然后调用 auto-router {param}方法即可
> 其中 , components , utils 文件/文件夹是被忽略的 , 不会参与渲染

## 在vite 中使用vitePluginVueAutoRouter插件

使用该插件 , 可以在开发过程中实时渲染.

```javascript
export default ({mode})=>{
  return defineConfig({
    plugins: [vue(),
      vitePluginVueAutoRouter()]
  })
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
        name:"index",
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
    



### param 说明
| 参数名    | 参数说明          |
|--------|---------------|
| render | 执行路由渲染        |
| watch  | 监听文件,实现自动路由渲染 |

示例: 
```shell
auto-rouer render
```
