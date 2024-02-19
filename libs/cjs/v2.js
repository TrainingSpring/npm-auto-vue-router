"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderAll = renderAll;
exports.watchPages = watchPages;
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _watch = _interopRequireDefault(require("watch"));
var _comm = require("./comm.js");
var _v = require("./v3.js");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var dirInfo = (0, _comm.getSrcInfo)();
var _filename = dirInfo.filename; // 当前文件路径
var _dirname = dirInfo.dirname; // 当前文件所处的文件夹路径
var __dir = dirInfo.dir;
var routeDir = _path["default"].join(__dir, "src/router");

/**
 *  将驼峰转换为中划线
 * @param str
 * @return {string}
 */
function camelToDash(str) {
  return str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}
function isAbsolute(path) {
  return path[0] === "/";
}
// 根据路由配置获取指定的路由信息
function getRoute(route) {
  var prePath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var srcName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
  // 如果没有配置route信息  给默认配置路由
  var p = "";
  if (!route) {
    route = {};
  }
  if (!route.path) {
    p = camelToDash(srcName).toLowerCase();
  } else {
    p = route.path;
  }
  var res = "";
  if (!isAbsolute(p)) {
    res = _path["default"].posix.join(prePath, p);
  } else res = p;
  route.path = res;
  return {
    name: p,
    route: route
  };
}
var routeConfig = "\n// \u6E32\u67D3\u4E00\u4E2A\u7EC4\u4EF6\u6216\u8005\u4E00\u4E2A\u7A7A\u7EC4\u4EF6\nexport function renderComponent(component) {\n  if (component)\n    return component\n  else return {\n    render: (e) => e(\"router-view\")\n  }\n}\n";
var defaultPre = "$$default$$";
function analysisRouteConfig(callback, dir) {
  var initResult = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var routes = [];
  var timer = null;
  var config = (0, _comm.getConfig)();
  var defaultRedirect = new RegExp(config.defaultRedirect || "^list$");
  var map = {};
  var pagePath = _path["default"].join(__dir, "src", config.pagePath);
  dir = dir || pagePath;
  (0, _comm.traverseFolder)(dir, function (status, info, fullPath, result) {
    if (status !== 1 && status !== 0) return;
    if (timer) {
      clearTimeout(timer);
    }
    var res = null;
    var data = null;
    // 文件夹处理
    if (status === 0) {
      var route = (0, _comm.getJsonFile)(_path["default"].join(fullPath, "route.json"));
      var child = {};
      if (!route) return undefined;
      route = getRoute(route, !result ? "/" : result.path, info.name).route;
      route.component = "$[renderComponent()]$";
      // 如果没有result , 可以判定为根目录
      if (!result) {
        child = _objectSpread({}, route);
        routes.push(child);
        res = child;
      } else {
        child = _objectSpread({}, route);
        if (route["default"]) {
          result.redirect = route.path;
        }
        if (result.children) {
          result.children.push(child);
        } else {
          result.redirect = route.path;
          result.children = [child];
        }
      }
      res = data = child;
    }
    // 文件处理
    else if (status === 1) {
      var cfg = (0, _v.analysisVue)(fullPath) || {};
      var _route = cfg.route;
      var name = info.name.split(".vue")[0];
      var setRoute = function setRoute(route) {
        var res = result;
        if (!res) {
          res = {
            path: "/"
          };
        }
        var routeInfo = getRoute(route, res.path, info.name);
        route = routeInfo.route;
        // 当路由配置为被排除 ， 则不执行后续操作
        if (route.exclude) return result;
        var child = {};
        var rePath = fullPath.replace(dir, _path["default"].join("/", config.pagePath)).replaceAll("\\", "/");
        child = _objectSpread(_objectSpread({}, route), {}, {
          component: "$[()=>import('@".concat(rePath, "')]$")
        });
        if (route["default"]) {
          res.redirect = defaultPre + route.path;
        } else if (!res.redirect || !res.redirect.includes(defaultPre) && defaultRedirect.test(routeInfo.name)) {
          res.redirect = route.path;
        }
        if (!result) {
          result = child;
          routes.push(child);
        } else if (result.children) {
          result.children.push(child);
        } else {
          result.children = [child];
        }
        return child;
      };
      if (Array.isArray(_route)) {
        for (var i in _route) {
          var _route2 = setRoute(_route[i]);
        }
      } else {
        setRoute(_route);
      }
      // data = child;
      // 相对路径
    }
    /*if (data) {
        map[fullPath] = data.path;
    }*/
    timer = setTimeout(function () {
      callback(routes, map);
    }, 20);
    return res;
  }, initResult);
}
var CURD = /*#__PURE__*/function () {
  function CURD() {
    _classCallCheck(this, CURD);
    _defineProperty(this, "sysConfig", void 0);
    this._getConfig();
  }
  _createClass(CURD, [{
    key: "_getConfig",
    value: function _getConfig() {
      this.sysConfig = (0, _comm.getConfig)();
    }
  }, {
    key: "_each",
    value: function _each(route, filename, parent) {
      for (var i in route) {
        var item = route[i];
        if (filename.indexOf(item.path) === 0) {
          if (filename !== item.path) {
            return this._each(item.children, filename, item);
          } else {
            return {
              item: item,
              parent: parent,
              index: i
            };
          }
        }
      }
      return null;
    }

    // 权限鉴定
  }, {
    key: "getPermission",
    value: function getPermission(filename) {
      var type = 0;
      if (filename.includes(".vue")) type = 1;else if (filename.includes("route.json")) type = 2;
      return type;
    }
  }, {
    key: "getPath",
    value: function getPath(src) {
      var child = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
      var parentDir = _path["default"].dirname(src);
      var config = (0, _comm.getJsonFile)(_path["default"].join(src, "route.json"));
      var root = _path["default"].join(__dir, "src", this.sysConfig.pagePath);
      if (root === src) {
        return "/" + child;
      }
      if (config == null || !config.path) {
        var dirName = camelToDash(src.split("\\").pop());
        return this.getPath(parentDir, _path["default"].posix.join(dirName, child));
      } else if (config.path && config.path[0] === "/") {
        return _path["default"].posix.join(config.path, child);
      } else {
        return this.getPath(parentDir, _path["default"].posix.join(config.path, child));
      }
    }
  }, {
    key: "_getFileInfo",
    value: function _getFileInfo(filename) {
      var sp = filename.split("\\");
      var fullName = sp.pop(); // 文件全名
      var name = fullName.replace(/\.\w+$/, ""); // 文件名(去除后缀)
      var dir = sp.join("\\"); // 文件所在目录
      var dirName = sp.pop(); // 文件所在目录名
      var parentPath = sp.join("\\"); // 父级目录路径
      return {
        parentPath: parentPath,
        name: name,
        fullName: fullName,
        dir: dir,
        dirName: dirName
      };
    }
  }, {
    key: "isSame",
    value: function isSame(val, val1) {
      var v = JSON.stringify(val).replaceAll(/[\s\n]/g, "");
      var v1 = JSON.stringify(val1).replaceAll(/[\s\n]/g, "");
      return v === v1;
    }
  }, {
    key: "_renderRoute",
    value: function _renderRoute(filename, type, prevCfg, callback) {
      var route = null;
      var info = this._getFileInfo(filename);
      if (type === 1) {
        var pagePath = _path["default"].join(__dir, "src", this.sysConfig.pagePath);
        route = (0, _v.analysisVue)(filename);
        route = route ? route.route : null;
        var pp = this.getPath(info.dir);
        // 如果没有配置route信息  给默认配置路由
        if (!route || !route.path) {
          route = {
            path: _path["default"].posix.join(pp, camelToDash(info.name).toLowerCase())
          };
        } else if (route.path[0] !== "/") {
          route.path = _path["default"].posix.join(pp, route.path);
        }
        var rePath = filename.replace(pagePath, _path["default"].join("/", this.sysConfig.pagePath)).replaceAll("\\", "/");
        route.component = "$[()=>import('@".concat(rePath, "')]$");
        if (this.isSame(route, prevCfg.item)) {
          callback(null);
        } else callback(route, _defineProperty({}, filename, route.path));
      } else if (type === 2) {
        var prePath = this.getPath(info.parentPath);
        var cfg = getRoute((0, _comm.getJsonFile)(filename), undefined, info.dirName);
        cfg.path = _path["default"].posix.join(prePath, cfg.path);
        for (var k in cfg) {
          prevCfg.item[k] = cfg[k];
        }
        // 更改路由信息
        prevCfg.item.children = [];
        analysisRouteConfig(function (routes, mapdb) {
          mapdb[info.dir] = cfg.path;
          callback(routes, mapdb);
        }, info.dir, prevCfg.item);
      }
    }
  }, {
    key: "update",
    value: function update(filename) {
      var type = this.getPermission(filename);
      if (!type) return;
      var dataDir = _path["default"].join(_comm.basename, "data");
      // 路由映射
      var map = (0, _comm.getJsonFile)(_path["default"].join(dataDir, "map.json"));
      // 路由配置
      var route = (0, _comm.getJsonFile)(_path["default"].join(dataDir, "route.json"));
      // 找到当前文件路径对应的路由

      var cur = type === 1 ? map[filename] : map[_path["default"].dirname(filename)];
      // 更新前的配置
      var prevCfg = this._each(route, cur);
      this._renderRoute(filename, type, prevCfg, function (res, mapdb) {
        if (res === null) return;
        if (type === 1) {
          prevCfg.parent.children[prevCfg.index] = res;
          if (res["default"] || prevCfg.index == 0) {
            prevCfg.parent.redirect = res.path;
          }
        }
        writeRoute(handleRoutes(route), routeConfig);
        map = _objectSpread(_objectSpread({}, map), mapdb);
        _fs["default"].writeFileSync(_path["default"].join(dataDir, "map.json"), JSON.stringify(map), {
          encoding: "utf-8"
        });
        _fs["default"].writeFileSync(_path["default"].join(dataDir, "route.json"), JSON.stringify(route), {
          encoding: "utf-8"
        });
        console.log("[auto-router] update:", filename);
      });
    }
  }]);
  return CURD;
}();
function writeRoute(content) {
  var extra = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
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
  _fs["default"].writeFileSync(routeDir + "/config.js", extra + "\n export default ".concat(content), {
    encoding: "utf-8"
  });
}
function handleVueFile() {
  var config = (0, _comm.getConfig)();
  var dir = _path["default"].join(__dir, "src", config.pagePath);
  (0, _comm.traverseFolder)(dir, function (status, info, fullPath, result) {
    if (status === 1) {
      var p = camelToDash(fullPath.split("\\").pop().replace(".vue", ""));
      var cfgStr = (0, _v.getConfigStr)(_fs["default"].readFileSync(fullPath, {
        encoding: "utf-8"
      })) || "";
      // 替换path name 为文件名
      var rps = cfgStr.replace(/path:"[\w\d-]+"/, "path:\"".concat(p, "\""));
      var text = _fs["default"].readFileSync(fullPath, {
        encoding: "utf-8"
      });
      _fs["default"].writeFileSync(fullPath, text.replace(cfgStr, rps));
    }
  });
}
function handleRoutes(routes) {
  return JSON.stringify(routes).replaceAll('"$[', "").replaceAll(']$"', "").replaceAll(defaultPre, "");
  /*.replaceAll("}","\n}")
  .replaceAll("]","\n]")
  .replaceAll(",\"",",\n\"")
  .replaceAll("[","[\n")
  .replaceAll("{","{\n");*/
}
function renderAll() {
  console.log("[auto-router]: 正在渲染路由...");
  analysisRouteConfig(function (routes, map) {
    var str = handleRoutes(routes);
    var dataPath = _path["default"].join(_comm.basename, "data");
    if (!_fs["default"].existsSync(dataPath)) _fs["default"].mkdirSync(dataPath);
    // fs.writeFileSync(path.join(dataPath,"route.json"),JSON.stringify(routes),{encoding:"utf-8"});
    // fs.writeFileSync(path.join(dataPath,"map.json"),JSON.stringify(map),{encoding:"utf-8"});
    writeRoute(str, routeConfig);
    console.log("[auto-router]: 渲染完成!!!");
  });
}

/**
 * @desc 监听pages目录
 */
function watchPages() {
  var curd = new CURD();
  var config = (0, _comm.getConfig)();
  var dir = _path["default"].join(__dir, "src", config.pagePath);
  var exclude = config.excludeReg ? new RegExp(config.excludeReg) : null;
  _watch["default"].watchTree(dir, {
    interval: 1,
    ignoreDotFiles: true,
    ignoreUnreadableDir: true,
    ignoreNotPermitted: true,
    ignoreDirectoryPattern: exclude
  }, function (f, cur, prev) {
    if (typeof f == 'string' && (/(component|utils)/.test(f) || /~$/.test(f))) return;
    if (_typeof(f) == "object" && prev === null && cur === null) {
      renderAll();
      // 完成对树的遍历
    } else {
      var check = (0, _comm.excludeCheck)(f);
      if (check.flag) return;
      // f 被移除 或者更名等
      renderAll();
    }
  });
}