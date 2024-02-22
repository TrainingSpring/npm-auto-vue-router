"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebpackPluginAutoRouter = void 0;
exports.vitePluginVueAutoRouter = vitePluginVueAutoRouter;
var v3 = _interopRequireWildcard(require("./v3.js"));
var v2 = _interopRequireWildcard(require("./v2.js"));
var _comm = require("./comm.js");
var _child_process = require("child_process");
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // vite插件
/**
 * 获取插件模块
 * @param options
 * @return {{model: {renderAll?: function(): void, loopDir?: function(*=, *): void, watchPages?: function(): void, getConfigStr?: function(*, *=): (string|null|undefined), analysisVue?: function(*): (undefined|*|null), vitePluginVueAutoRouter?: function(): {name: string, enforce: string, configResolved(*): void, config(*, *): void}, writeRouter?: function(): void}, config: *}}
 */
function getModel(options) {
  var model = v3;
  var config = (0, _comm.getConfig)();
  if (options) {
    config = (0, _comm.setConfig)(options);
  }
  // 组件配置
  var c = (0, _comm.getConfig)();
  if (c && c.type === "complex") {
    model = v2;
  }
  model.updateConfigInfo();
  return {
    config: config,
    model: model
  };
}
function vitePluginVueAutoRouter(options) {
  var _config, command;
  var cfg = getModel(options);
  var model = cfg.model;
  return {
    name: "auto-router",
    enforce: 'pre',
    configResolved: function configResolved(resolvedConfig) {
      _config = resolvedConfig;
      if (command !== "build") model.watchPages();else model.renderAll();
    },
    config: function config(cfg, arg) {
      _config = cfg;
      command = arg.command;
    }
  };
}
var WebpackPluginAutoRouter = exports.WebpackPluginAutoRouter = /*#__PURE__*/function () {
  function WebpackPluginAutoRouter(options) {
    _classCallCheck(this, WebpackPluginAutoRouter);
    _defineProperty(this, "watcher", false);
    var cfg = getModel(options);
    this.model = cfg.model;
    this.config = cfg.config;
  }
  _createClass(WebpackPluginAutoRouter, [{
    key: "apply",
    value: function apply(compiler) {
      var mode = compiler.options.mode; // development
      var $this = this;
      if (mode === "development") {
        this.model.watchPages();
      } else {
        this.model.renderAll();
      }
      // compiler.hooks.run.taps();
    }
  }]);
  return WebpackPluginAutoRouter;
}();