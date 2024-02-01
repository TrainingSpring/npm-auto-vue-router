"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.analysisVue = analysisVue;
exports.getConfigStr = getConfigStr;
exports.loopDir = loopDir;
exports.renderAll = renderAll;
exports.vitePluginVueAutoRouter = vitePluginVueAutoRouter;
exports.watchPages = watchPages;
exports.writeRouter = writeRouter;
var _compilerSfc = require("vue/compiler-sfc");
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _watch = _interopRequireDefault(require("watch"));
var _comm = require("./comm.js");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var _config = (0, _comm.getConfig)();
var dirInfo = (0, _comm.getSrcInfo)();
var _filename = dirInfo.filename; // 当前文件路径
var _dirname = dirInfo.dirname; // 当前文件所处的文件夹路径
var __dir = dirInfo.dir; // 执行命令时的路径
var pages = _path["default"].join(__dir, "/src", _config.pagePath);
var files;
try {
  files = _fs["default"].readdirSync(pages);
} catch (e) {
  throw new Error("未找到pages文件夹 ， 请确认是否配置正确。 尝试使用auto-router set -p <path> 重新设置页面目录！");
}
var routeDir = _path["default"].join(__dir, "src/router");
var ignoreDirs = /(components|utils)/;

/**
 * @desc 递归遍历文件夹及文件 并做相应的处理
 * 规则:
 *
 *  1. 页面局部组件 , 若放在单文件夹中 , 需放在在目录下的components文件夹中
 *
 * @param fls
 * @param p
 */
var routes = []; // 路由列表
var routesInfo = {}; // 路由详情
function loopDir() {
  var fls = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var p = arguments.length > 1 ? arguments[1] : undefined;
  if (fls.length === 0) return;
  fls.forEach(function (item) {
    var fullPath = _path["default"].join(p, item); // 完整路径
    var isDir = _fs["default"].statSync(fullPath).isDirectory(); // 是否为文件夹类型
    if (isDir && !ignoreDirs.test(item.toLowerCase())) {
      var child = _fs["default"].readdirSync(fullPath) || [];
      loopDir(child, fullPath);
    } else {
      // 获取后缀
      var extname = _path["default"].extname(fullPath);
      // 只处理vue文件
      if (extname === ".vue") {
        var routeStr = analysisRouteConfig(fullPath);
        routes.push(routeStr);
        routesInfo[fullPath] = {
          data: routeStr,
          index: routes.length - 1
        };
      }
    }
  });
}
function getConfigStr(content) {
  var setup = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var lc = 0;
  var power = false;
  var strCfg = "";
  var configReg = setup ? /_config\s*=\s*/ : /_config\s*:\s*/;
  // 获取_config配置
  try {
    content.split("\n").forEach(function (item) {
      // _config 字段
      if (!power && configReg.test(item)) {
        power = true;
      }
      if (!power) return;
      var strlen = item.length;
      strCfg += item + "\n";
      for (var i = 0; i < strlen; i++) {
        var str = item[i];
        if (str === "{") {
          lc++;
        }
        if (str === "}") {
          lc--;
        }
      }
      if (lc === 0) {
        power = false;
        throw "break";
      }
    });
  } catch (e) {
    if (e === "break") return strCfg;
    return null;
  }
}
/**
 * @desc 解析vue文件
 * @param filepath 文件路径
 */
function analysisVue(filepath) {
  if (!filepath) return;
  var file = _fs["default"].readFileSync(filepath, {
    encoding: "utf-8"
  });
  var parseVue = (0, _compilerSfc.parse)(file);
  try {
    // 因为在有些特殊情况下 , 比如在script标签中没有任何代码的情况下 , compileScript函数会报错 , 所以放在try中
    var _compileScript = (0, _compilerSfc.compileScript)(parseVue.descriptor, {
        filename: _path["default"].basename(filepath),
        id: (0, _comm.GUID)()
      }),
      content = _compileScript.content,
      setup = _compileScript.setup;
    var strCfg = getConfigStr(content, setup);
    if (setup) {
      strCfg = strCfg.replace(/^(const|let).*_config\s*=\s*/, 'return');
      return new Function("".concat(strCfg))();
    } else {
      return new Function("return {".concat(strCfg, "}"))()._config;
    }
  } catch (e) {
    console.log("error");
    return null;
  }
}

/**
 * @desc 解析路由配置
 * @param filepath 文件路径
 */
function analysisRouteConfig(filepath) {
  if (!filepath) return;
  var config = analysisVue(filepath);
  var rePath = filepath.replace(pages, "/" + _config.pagePath).replaceAll("\\", "/"); // 相对路径
  var routePath = rePath.replace("/" + _config.pagePath, "").replace(".vue", ""); // 路由路径
  var routePathArr = routePath.split("/"); // 相对路径转数组
  var res = {};
  // 没有配置config的情况 or 没有配置route
  if (!config || !config.route) {
    res = {
      path: routePath
    };
  } else if (config.route) {
    if (config.route.path) {
      // 有path的情况
      res = config.route;
    } else if (config.route.name != null) {
      // 没有path 有name的情况
      var len = routePathArr.length;
      routePathArr[len - 1] = encodeURI(config.route.name);
      if (routePathArr[len - 1] === "") routePathArr.pop();
      res = Object.assign({
        path: routePathArr.join("/")
      }, config.route);
    } else res = Object.assign({
      path: routePath
    }, config.route);
  }
  res["component"] = "$[()=>import('@".concat(rePath, "')]$");
  return JSON.stringify(res).replace('"$[', "").replace(']$"', "");
}
/**
 * @desc 写入路由
 */
function writeRouter() {
  var config = _fs["default"].readFileSync(_path["default"].join(_comm.basename, "template/route.js"), {
    encoding: "utf-8"
  });
  if (!_fs["default"].existsSync(routeDir)) _fs["default"].mkdirSync(routeDir);
  if (!_fs["default"].existsSync(routeDir + "/index.js")) _fs["default"].writeFileSync(routeDir + "/index.js", config, {
    encoding: "utf-8"
  });else {
    var index = _fs["default"].readFileSync(_path["default"].join(routeDir, "index.js"), {
      encoding: "utf-8"
    });
    if (!/import\s+\w+\s+from\s+"[\w.\/]*config\.js"/.test(index)) {
      _fs["default"].writeFileSync(routeDir + "/index.js", "import config from \"./config.js\"\n" + index, {
        encoding: "utf-8"
      });
    }
  }
  _fs["default"].writeFileSync(routeDir + "/config.js", "export default [\n\t".concat(routes.join(",\n\t"), "\n]"), {
    encoding: "utf-8"
  });
}
var CURD = /*#__PURE__*/function () {
  function CURD() {
    _classCallCheck(this, CURD);
    _defineProperty(this, "queue", []);
  }
  /**
   * @desc 当文件被更改 , 执行更新操作
   * @param filePath
   */
  _createClass(CURD, [{
    key: "update",
    value: function update(filePath) {
      var _routesInfo$filePath$;
      console.log("filePath", filePath);
      var prev = (_routesInfo$filePath$ = routesInfo[filePath]["data"]) === null || _routesInfo$filePath$ === void 0 ? void 0 : _routesInfo$filePath$.replace(/(\n)/g, "");
      var cur = analysisRouteConfig(filePath);
      var cur_cs = cur.replace(/(\n)/g, "");
      var index = routesInfo[filePath]["index"];
      if (prev !== cur_cs) {
        routes[index] = cur;
        routesInfo[filePath]["data"] = cur;
        writeRouter();
        console.log("[auto-router] update:", filePath);
      }
    }
    /**
     * @desc 执行删除操作
     * @param filePath
     * @param cur
     */
  }, {
    key: "delete",
    value: function _delete(filePath, cur) {
      var keys = Object.keys(routesInfo);
      for (var _i = 0, _keys = keys; _i < _keys.length; _i++) {
        var key = _keys[_i];
        if (key.indexOf(filePath) > -1) {
          var index = routesInfo[key].index;
          routes[index] = null;
          this.queue.push(index);
          delete routesInfo[key];
        }
      }
      writeRouter();
      console.log("[auto-router] delete:", filePath);
    }

    /**
     * @desc 执行新增操作
     * @param filePath
     * @param cur
     */
  }, {
    key: "create",
    value: function create(filePath, cur) {
      var _this = this;
      var res = this._baseLogic(filePath, cur);
      if (!res) return;
      res.forEach(function (item) {
        // 队列长度
        var q_len = _this.queue.length;
        // 判定队列是否为空 , 如果不为空 , 则出队,否则返回数组长度
        // 大致意思是 , 如果routes有空值, 则插入,没有控制则push
        var index = q_len > 0 ? _this.queue.shift() : routes.length;
        if (routes[index] != null) loopDir(files, pages);else if (routesInfo[item]) {
          // ...
        } else {
          var routeStr = analysisRouteConfig(item);
          routesInfo[item] = {
            data: routeStr,
            index: index
          };
          routes[index] = routeStr;
        }
      });
      writeRouter();
      console.log("[auto-router] create:", filePath);
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
  }, {
    key: "_dirHasFiles",
    value: function _dirHasFiles(dirPath, cur) {
      if (!cur.isDirectory() && _path["default"].extname(dirPath) === '.vue') return [dirPath];
      var q = [dirPath];
      var res = [];
      while (q.length) {
        // 当前文件夹
        var c = q.shift();
        var f = _fs["default"].readdirSync(c);
        var _iterator = _createForOfIteratorHelper(f),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var i = _step.value;
            var fullPath = _path["default"].join(c, i);
            if (_fs["default"].statSync(fullPath).isDirectory()) q.push(fullPath);else if (_path["default"].extname(fullPath) === '.vue') {
              res.push(fullPath);
            }
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }
      return res;
    }
  }, {
    key: "_baseLogic",
    value: function _baseLogic(filePath, cur) {
      if (ignoreDirs.test(filePath.toLowerCase())) return null;
      var res = this._dirHasFiles(filePath, cur);
      if (res.length === 0) return null;
      return res;
    }
  }]);
  return CURD;
}();
/**
 * @desc 监听pages目录
 */
function watchPages() {
  var curd = new CURD();
  var exclude = _config.excludeReg ? new RegExp(_config.excludeReg) : null;
  _watch["default"].watchTree(pages, {
    interval: 1,
    ignoreDotFiles: true,
    ignoreUnreadableDir: true,
    ignoreNotPermitted: true,
    ignoreDirectoryPattern: exclude
  }, function (f, cur, prev) {
    if (typeof f == 'string') {
      if (_config.excludePath && _config.excludePath.filter(function (e) {
        return f.includes(_path["default"].join(e));
      }).length) return;
      if (exclude.test(f) || /~$/.test(f)) return;else if (_config.excludeDir && _config.excludeDir.include(f)) return;
    }
    if (_typeof(f) == "object" && prev === null && cur === null) {
      renderAll();
      // 完成对树的遍历
    } else if (prev === null) {
      // f 是一个新文件
      curd.create(f, cur);
    } else if (cur.nlink === 0) {
      // f 被移除
      curd["delete"](f, cur);
    } else if (prev != null) {
      curd.update(f);
    }
  });
}
// 全部渲染pages
function renderAll() {
  console.log("render all ...");
  loopDir(files, pages); // 轮询目录 , 生成route配置
  writeRouter(); // 文件写入
}
// vite插件
function vitePluginVueAutoRouter() {
  var _config2, command;
  return {
    name: "auto-router",
    enforce: 'pre',
    configResolved: function configResolved(resolvedConfig) {
      _config2 = resolvedConfig;
      console.log(command);
      if (command !== "build") watchPages();else renderAll();
    },
    config: function config(cfg, arg) {
      _config2 = cfg;
      command = arg.command;
    }
  };
}