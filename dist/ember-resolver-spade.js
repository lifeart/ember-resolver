// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: Copyright 2013 Stefan Penner and Ember App Kit Contributors
// License:   Licensed under MIT license
//            See https://raw.github.com/ember-cli/ember-resolver/master/LICENSE
// ==========================================================================


minispade.register('ember-resolver/container-debug-adapter', "(function() {/*globals define registry requirejs */\n\ndefine(\"ember/container-debug-adapter\",\n  [],\n  function() {\n    \"use strict\";\n\n  // Support Ember < 1.5-beta.4\n  // TODO: Remove this after 1.5.0 is released\n  if (typeof Ember.ContainerDebugAdapter === 'undefined') {\n    return null;\n  }\n  /*\n   * This module defines a subclass of Ember.ContainerDebugAdapter that adds two\n   * important features:\n   *\n   *  1) is able provide injections to classes that implement `extend`\n   *     (as is typical with Ember).\n   */\n\n  var ContainerDebugAdapter = Ember.ContainerDebugAdapter.extend({\n    /**\n      The container of the application being debugged.\n      This property will be injected\n      on creation.\n\n      @property container\n      @default null\n    */\n    // container: null, LIVES IN PARENT\n\n    /**\n      The resolver instance of the application\n      being debugged. This property will be injected\n      on creation.\n\n      @property resolver\n      @default null\n    */\n    // resolver: null,  LIVES IN PARENT\n    /**\n      Returns true if it is possible to catalog a list of available\n      classes in the resolver for a given type.\n\n      @method canCatalogEntriesByType\n      @param {string} type The type. e.g. \"model\", \"controller\", \"route\"\n      @return {boolean} whether a list is available for this type.\n    */\n    canCatalogEntriesByType: function(type) {\n      return true;\n    },\n\n    /**\n     * Get all defined modules.\n     *\n     * @method _getEntries\n     * @return {Array} the list of registered modules.\n     * @private\n     */\n    _getEntries: function() {\n      return requirejs.entries;\n    },\n\n    /**\n      Returns the available classes a given type.\n\n      @method catalogEntriesByType\n      @param {string} type The type. e.g. \"model\", \"controller\", \"route\"\n      @return {Array} An array of classes.\n    */\n    catalogEntriesByType: function(type) {\n      var entries = this._getEntries(),\n          module,\n          types = Ember.A();\n\n      var makeToString = function(){\n        return this.shortname;\n      };\n\n      var prefix = this.namespace.modulePrefix;\n\n      for(var key in entries) {\n        if(entries.hasOwnProperty(key) && key.indexOf(type) !== -1) {\n          // Check if it's a pod module\n          var name = getPod(type, key, this.namespace.podModulePrefix || prefix);\n          if (!name) {\n            // Not pod\n            name = key.split(type + 's/').pop();\n\n            // Support for different prefix (such as ember-cli addons).\n            // Uncomment the code below when\n            // https://github.com/ember-cli/ember-resolver/pull/80 is merged.\n\n            //var match = key.match('^/?(.+)/' + type);\n            //if (match && match[1] !== prefix) {\n              // Different prefix such as an addon\n              //name = match[1] + '@' + name;\n            //}\n          }\n          types.addObject(name);\n        }\n      }\n      return types;\n    }\n  });\n\n  function getPod(type, key, prefix) {\n    var match = key.match(new RegExp('^/?' + prefix + '/(.+)/' + type + '$'));\n    if (match) {\n      return match[1];\n    }\n  }\n\n  ContainerDebugAdapter['default'] = ContainerDebugAdapter;\n  return ContainerDebugAdapter;\n});\n\n})();\n//@ sourceURL=ember-resolver/container-debug-adapter");minispade.register('ember-resolver/core', "(function() {/*globals define registry requirejs */\n\ndefine(\"ember/resolver\",\n  [],\n  function() {\n    \"use strict\";\n\n    if (typeof requirejs.entries === 'undefined') {\n      requirejs.entries = requirejs._eak_seen;\n    }\n\n  /*\n   * This module defines a subclass of Ember.DefaultResolver that adds two\n   * important features:\n   *\n   *  1) The resolver makes the container aware of es6 modules via the AMD\n   *     output. The loader's _moduleEntries is consulted so that classes can be\n   *     resolved directly via the module loader, without needing a manual\n   *     `import`.\n   *  2) is able to provide injections to classes that implement `extend`\n   *     (as is typical with Ember).\n   */\n\n  function classFactory(klass) {\n    return {\n      create: function (injections) {\n        if (typeof klass.extend === 'function') {\n          return klass.extend(injections);\n        } else {\n          return klass;\n        }\n      }\n    };\n  }\n\n  if (!(Object.create && !Object.create(null).hasOwnProperty)) {\n    throw new Error(\"This browser does not support Object.create(null), please polyfil with es5-sham: http://git.io/yBU2rg\");\n  }\n\n  function makeDictionary() {\n    var cache = Object.create(null);\n    cache['_dict'] = null;\n    delete cache['_dict'];\n    return cache;\n  }\n\n  var underscore = Ember.String.underscore;\n  var classify = Ember.String.classify;\n  var get = Ember.get;\n\n  function parseName(fullName) {\n    /*jshint validthis:true */\n\n    if (fullName.parsedName === true) { return fullName; }\n\n    var prefixParts = fullName.split('@');\n    var prefix;\n\n    if (prefixParts.length === 2) {\n      if (prefixParts[0].split(':')[0] === 'view') {\n        prefixParts[0] = prefixParts[0].split(':')[1];\n        prefixParts[1] = 'view:' + prefixParts[1];\n      }\n\n      prefix = prefixParts[0];\n    }\n\n    var nameParts = prefixParts[prefixParts.length - 1].split(\":\");\n    var type = nameParts[0], fullNameWithoutType = nameParts[1];\n    var name = fullNameWithoutType;\n    var namespace = get(this, 'namespace');\n    var root = namespace;\n\n    return {\n      parsedName: true,\n      fullName: fullName,\n      prefix: prefix || this.prefix({type: type}),\n      type: type,\n      fullNameWithoutType: fullNameWithoutType,\n      name: name,\n      root: root,\n      resolveMethodName: \"resolve\" + classify(type)\n    };\n  }\n\n  function resolveOther(parsedName) {\n    /*jshint validthis:true */\n\n    Ember.assert('`modulePrefix` must be defined', this.namespace.modulePrefix);\n\n    var normalizedModuleName = this.findModuleName(parsedName);\n\n    if (normalizedModuleName) {\n      var module = require(normalizedModuleName, null, null, true /* force sync */);\n\n      if (module && module['default']) { module = module['default']; }\n\n      if (module === undefined) {\n        throw new Error(\" Expected to find: '\" + parsedName.fullName + \"' within '\" + normalizedModuleName + \"' but got 'undefined'. Did you forget to `export default` within '\" + normalizedModuleName + \"'?\");\n      }\n\n      if (this.shouldWrapInClassFactory(module, parsedName)) {\n        module = classFactory(module);\n      }\n\n      return module;\n    } else {\n      return this._super(parsedName);\n    }\n  }\n  // Ember.DefaultResolver docs:\n  //   https://github.com/emberjs/ember.js/blob/master/packages/ember-application/lib/system/resolver.js\n  var Resolver = Ember.DefaultResolver.extend({\n    resolveOther: resolveOther,\n    resolveTemplate: resolveOther,\n    pluralizedTypes: null,\n\n    makeToString: function(factory, fullName) {\n      return '' + this.namespace.modulePrefix + '@' + fullName + ':';\n    },\n    parseName: parseName,\n    shouldWrapInClassFactory: function(module, parsedName){\n      return false;\n    },\n    init: function() {\n      this._super();\n      this.moduleBasedResolver = true;\n      this._normalizeCache = makeDictionary();\n\n      this.pluralizedTypes = this.pluralizedTypes || makeDictionary();\n\n      if (!this.pluralizedTypes.config) {\n        this.pluralizedTypes.config = 'config';\n      }\n      \n      var podModulePrefix = this.namespace.podModulePrefix || '';\n      var podPath = podModulePrefix.substr(podModulePrefix.lastIndexOf('/') + 1);\n      Ember.deprecate('`podModulePrefix` is deprecated and will be removed '+\n        'from future versions of ember-cli. Please move existing pods from '+\n        '\\'app/' + podPath + '/\\' to \\'app/\\'.', this.namespace.podModulePrefix !== '');\n\n    },\n    normalize: function(fullName) {\n      return this._normalizeCache[fullName] || (this._normalizeCache[fullName] = this._normalize(fullName));\n    },\n    _normalize: function(fullName) {\n      // replace `.` with `/` in order to make nested controllers work in the following cases\n      // 1. `needs: ['posts/post']`\n      // 2. `{{render \"posts/post\"}}`\n      // 3. `this.render('posts/post')` from Route\n      var split = fullName.split(':');\n      if (split.length > 1) {\n        return split[0] + ':' + Ember.String.dasherize(split[1].replace(/\\./g, '/'));\n      } else {\n        return fullName;\n      }\n    },\n\n    pluralize: function(type) {\n      return this.pluralizedTypes[type] || (this.pluralizedTypes[type] = type + 's');\n    },\n\n    podBasedLookupWithPrefix: function(podPrefix, parsedName) {\n      var fullNameWithoutType = parsedName.fullNameWithoutType;\n\n      if (parsedName.type === 'template') {\n        fullNameWithoutType = fullNameWithoutType.replace(/^components\\//, '');\n      }\n\n        return podPrefix + '/' + fullNameWithoutType + '/' + parsedName.type;\n    },\n\n    podBasedModuleName: function(parsedName) {\n      var podPrefix = this.namespace.podModulePrefix || this.namespace.modulePrefix;\n\n      return this.podBasedLookupWithPrefix(podPrefix, parsedName);\n    },\n\n    podBasedComponentsInSubdir: function(parsedName) {\n      var podPrefix = this.namespace.podModulePrefix || this.namespace.modulePrefix;\n      podPrefix = podPrefix + '/components';\n\n      if (parsedName.type === 'component' || parsedName.fullNameWithoutType.match(/^components/)) {\n        return this.podBasedLookupWithPrefix(podPrefix, parsedName);\n      }\n    },\n\n    mainModuleName: function(parsedName) {\n      // if router:main or adapter:main look for a module with just the type first\n      var tmpModuleName = parsedName.prefix + '/' + parsedName.type;\n\n      if (parsedName.fullNameWithoutType === 'main') {\n        return tmpModuleName;\n      }\n    },\n\n    defaultModuleName: function(parsedName) {\n      return parsedName.prefix + '/' +  this.pluralize(parsedName.type) + '/' + parsedName.fullNameWithoutType;\n    },\n\n    prefix: function(parsedName) {\n      var tmpPrefix = this.namespace.modulePrefix;\n\n      if (this.namespace[parsedName.type + 'Prefix']) {\n        tmpPrefix = this.namespace[parsedName.type + 'Prefix'];\n      }\n\n      return tmpPrefix;\n    },\n\n    /**\n\n      A listing of functions to test for moduleName's based on the provided\n      `parsedName`. This allows easy customization of additional module based\n      lookup patterns.\n\n      @property moduleNameLookupPatterns\n      @returns {Ember.Array}\n    */\n    moduleNameLookupPatterns: Ember.computed(function(){\n      return Ember.A([\n        this.podBasedModuleName,\n        this.podBasedComponentsInSubdir,\n        this.mainModuleName,\n        this.defaultModuleName\n      ]);\n    }),\n\n    findModuleName: function(parsedName, loggingDisabled){\n      var self = this;\n      var moduleName;\n\n      this.get('moduleNameLookupPatterns').find(function(item) {\n        var moduleEntries = requirejs.entries;\n        var tmpModuleName = item.call(self, parsedName);\n\n        // allow treat all dashed and all underscored as the same thing\n        // supports components with dashes and other stuff with underscores.\n        if (tmpModuleName) {\n          tmpModuleName = self.chooseModuleName(moduleEntries, tmpModuleName);\n        }\n\n        if (tmpModuleName && moduleEntries[tmpModuleName]) {\n          if (!loggingDisabled) {\n            self._logLookup(true, parsedName, tmpModuleName);\n          }\n\n          moduleName = tmpModuleName;\n        }\n\n        if (!loggingDisabled) {\n          self._logLookup(moduleName, parsedName, tmpModuleName);\n        }\n\n        return moduleName;\n      });\n\n      return moduleName;\n    },\n\n    chooseModuleName: function(moduleEntries, moduleName) {\n      var underscoredModuleName = Ember.String.underscore(moduleName);\n\n      if (moduleName !== underscoredModuleName && moduleEntries[moduleName] && moduleEntries[underscoredModuleName]) {\n        throw new TypeError(\"Ambiguous module names: `\" + moduleName + \"` and `\" + underscoredModuleName + \"`\");\n      }\n\n      if (moduleEntries[moduleName]) {\n        return moduleName;\n      } else if (moduleEntries[underscoredModuleName]) {\n        return underscoredModuleName;\n      } else {\n        // workaround for dasherized partials:\n        // something/something/-something => something/something/_something\n        var partializedModuleName = moduleName.replace(/\\/-([^\\/]*)$/, '/_$1');\n\n        if (moduleEntries[partializedModuleName]) {\n          Ember.deprecate('Modules should not contain underscores. ' +\n                          'Attempted to lookup \"'+moduleName+'\" which ' +\n                          'was not found. Please rename \"'+partializedModuleName+'\" '+\n                          'to \"'+moduleName+'\" instead.', false);\n\n          return partializedModuleName;\n        } else {\n          return moduleName;\n        }\n      }\n    },\n\n    // used by Ember.DefaultResolver.prototype._logLookup\n    lookupDescription: function(fullName) {\n      var parsedName = this.parseName(fullName);\n\n      var moduleName = this.findModuleName(parsedName, true);\n\n      return moduleName;\n    },\n\n    // only needed until 1.6.0-beta.2 can be required\n    _logLookup: function(found, parsedName, description) {\n      if (!Ember.ENV.LOG_MODULE_RESOLVER && !parsedName.root.LOG_RESOLVER) {\n        return;\n      }\n\n      var symbol, padding;\n\n      if (found) { symbol = '[✓]'; }\n      else       { symbol = '[ ]'; }\n\n      if (parsedName.fullName.length > 60) {\n        padding = '.';\n      } else {\n        padding = new Array(60 - parsedName.fullName.length).join('.');\n      }\n\n      if (!description) {\n        description = this.lookupDescription(parsedName);\n      }\n\n      Ember.Logger.info(symbol, parsedName.fullName, padding, description);\n    }\n  });\n\n  Resolver.moduleBasedResolver = true;\n  Resolver['default'] = Resolver;\n  return Resolver;\n});\n\ndefine(\"resolver\",\n  [\"ember/resolver\"],\n  function (Resolver) {\n    Ember.deprecate('Importing/requiring Ember Resolver as \"resolver\" is deprecated, please use \"ember/resolver\" instead');\n    return Resolver;\n  });\n\n})();\n//@ sourceURL=ember-resolver/core");minispade.register('ember-resolver/initializers', "(function() {(function() {\n  \"use strict\";\n\n  Ember.Application.initializer({\n    name: 'container-debug-adapter',\n\n    initialize: function(container, app) {\n      var ContainerDebugAdapter = require('ember/container-debug-adapter');\n      var Resolver = require('ember/resolver');\n\n      container.register('container-debug-adapter:main', ContainerDebugAdapter);\n      app.inject('container-debug-adapter:main', 'namespace', 'application:main');\n    }\n  });\n}());\n\n})();\n//@ sourceURL=ember-resolver/initializers");minispade.register('ember-resolver', "(function() {minispade.require('ember-resolver/core');\nminispade.require('ember-resolver/container-debug-adapter');\nminispade.require('ember-resolver/initializers');\n\n})();\n//@ sourceURL=ember-resolver");