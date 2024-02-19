"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DFS = DFS;
exports.GUID = GUID;
exports.basename = void 0;
exports.excludeCheck = excludeCheck;
exports.getConfig = getConfig;
exports.getJsonFile = getJsonFile;
exports.getSrcInfo = getSrcInfo;
exports.setConfig = setConfig;
exports.setJsonFile = setJsonFile;
exports.traverseFolder = traverseFolder;
var _url = require("url");
var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); } // 获取路径信息
var srcInfo = getSrcInfo();
var filename = srcInfo.filename;
var dirname = srcInfo.dirname;
var basename = exports.basename = _path["default"].join(dirname, "../../");
/**
 *  设置配置
 * @param options
 */
function setConfig(options) {
  var config = getConfig();
  if (options.version) {
    options.version = Number(options.version);
  }
  config = Object.assign(config, options);
  if (options.excludeReg) {
    config.excludeDir = null;
  } else if (options.excludeDir) {
    config.excludeReg = null;
  }
  _fs["default"].writeFileSync(_path["default"].join(basename, "bin/config.json"), JSON.stringify(config), {
    encoding: 'utf-8'
  });
  return config;
}

/**
 *  获取配置
 * @return {any}
 */
function getConfig() {
  var cfgPath = _path["default"].join(basename, "bin/config.json");
  var cfg = getJsonFile(cfgPath);
  if (cfg == null) {
    var res = {
      "excludeDir": null,
      "excludeReg": "((component(s)?)|(utils)|(route(r)?))",
      "excludePath": null,
      "pagePath": "pages",
      "type": "simple",
      defaultRedirect: "^list$"
    };
    setJsonFile(cfgPath, res);
    return res;
  }
  return cfg;
}

/**
 * 从Json文件中获取JSON数据
 * @param dir 路径
 * @return {JSON}
 */
function getJsonFile(dir) {
  try {
    var res = _fs["default"].readFileSync(dir, {
      encoding: 'utf-8'
    });
    return JSON.parse(res);
  } catch (e) {
    return null;
  }
}
/**
 * 从Json文件中获取JSON数据
 * @param dir 路径
 * @param data 数据
 * @return {JSON}
 */
function setJsonFile(dir, data) {
  try {
    if (typeof data !== "string") {
      data = JSON.stringify(data);
    }
    _fs["default"].writeFileSync(dir, data, {
      encoding: 'utf-8'
    });
    return true;
  } catch (e) {
    return false;
  }
}
/**
 * 获取基础路径信息
 * @return {{filename: string, dir: string, dirname: string}}
 */
function getSrcInfo() {
  

  
  return {
    filename: __filename,
    dirname: __dirname,
    dir: _path["default"].resolve()
  };
  
}

/**
 * @desc 生成GUID
 * @param format 格式
 * @return {string}
 */
function GUID() {
  var format = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
  var _char = ['A', 'B', 'C', 'D', 'E', 'F', 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  var len = 0;
  for (var i in format) if (format[i] === 'x') len += 1;
  var random = function random() {
    var i = parseInt(Math.random() * 15);
    return _char[i];
  };
  return format.replace(/x/g, function (res) {
    return random();
  });
}
var config = getConfig();
function excludeCheck(fullPath) {
  var name = _path["default"].basename(fullPath);
  if (name.split(".").length > 1) {
    name = _path["default"].basename(_path["default"].dirname(fullPath));
  }
  if (config.excludePath && config.excludePath.filter(function (e) {
    return fullPath.includes(_path["default"].join(e));
  }).length) {
    return {
      flag: true,
      msg: "Traversal complete. The src <" + fullPath + ">was excluded."
    };
  }
  if (config.excludeReg && new RegExp(config.excludeReg).test(name)) {
    return {
      flag: true,
      msg: "Traversal complete. The src <" + fullPath + ">was excluded."
    };
  } else if (config.excludeDir && config.excludeDir.includes(name)) {
    return {
      flag: true,
      msg: "Traversal complete. The src <" + fullPath + ">was excluded."
    };
  }
  return {
    flag: false
  };
}
/**
 * 遍历文件夹
 * @param dir 文件夹路径
 * @param callback 回调 ， 包含三个参数 status:(-1 ,错误 ， 0 文件夹 ， 1 文件   2.遍历完成) ， info(-1 ，错误信息 ， 0,1 文件 ， 2 完成信息） ， fullPath：当状态为0,1时有此参数 , result 上一级递归的回调值(当状态为0,1时有此参数)
 * @param result 回调结果
 */
function traverseFolder(dir, callback, result) {
  _fs["default"].readdir(dir, {
    withFileTypes: true
  }, function (err, dirs) {
    if (err) return callback(-1, err);
    dirs.forEach(function (dirent) {
      var fullPath = _path["default"].join(dir, dirent.name);
      if (dirent.isDirectory()) {
        var check = excludeCheck(fullPath);
        if (check.flag) return callback(2, check.msg);
        var res = callback(0, dirent, fullPath, result);
        traverseFolder(fullPath, callback, res);
      } else {
        var extname = _path["default"].extname(fullPath);
        if (extname === ".vue") return callback(1, dirent, fullPath, result);else return callback(2, "Traversal complete. The src <" + fullPath + ">is not a vue file.");
      }
    });
    // 可以在此处添加一个回调来通知整个目录遍历完成
    callback(2, 'Traversal complete');
  });
}
/**
 * @description 深度优先遍历
 * @param {Array,JSON} data 数据
 * @param callback 回调
 * @param options 配置
 * @constructor
 */
function DFS(data) {
  var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _options = Object.assign({}, {
    child: "data"
  }, options);
  var child = _options.child;
  if (!!data) {
    var stack = [];
    if (Array.isArray(data)) for (var i = data.length - 1; i >= 0; i--) {
      var item = data[i];
      item._tier = 0;
      stack.push(item);
    } else if (_typeof(data) === "object") {
      data._tier = 0;
      stack.push(data);
    }
    while (stack.length > 0) {
      var _item = stack.pop();
      var tier = _item._tier;
      tier++;
      callback(_item);
      var children = _item[child] || [];
      for (var _i = children.length - 1; _i >= 0; _i--) {
        children[_i]._tier = tier;
        stack.push(children[_i]);
      }
    }
  }
}