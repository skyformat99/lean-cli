/* globals window, AV, $, Vue */

var _ = AV._;

// init select2
$.fn.select2.defaults.set("theme", "bootstrap");

// create select-vue component
Vue.component('select2', {
  props: ['options', 'value'],
  template: '#select2-template',
  mounted: function () {
    var vm = this;
    $(this.$el)
      // init select2
      .select2({ data: this.options })
      .val(this.value)
      .trigger('change')
      // emit event on change.
      .on('change', function () {
        vm.$emit('change');
        vm.$emit('input', this.value);
      });
  },
  watch: {
    value: function (value) {
      // update value
      $(this.$el).val(value).trigger('change');
    },
    options: function (options) {
      // update options
      $(this.$el).select2({ data: options });
    }
  },
  destroyed: function () {
    $(this.$el).off().select2('destroy');
  }
});

function getAppInfo() {
  return $.getJSON("/__engine/1/appInfo").then(function(info) {
    AV._initialize(info.appId, info.appKey, info.masterKey);
    AV._useMasterKey = true;
    return info;
  });
}

function getCloudFunction() {
  return $.get("/__engine/1/functions").then(function(cloudFunctions) {
    _.each(cloudFunctions, function(cloudFunction, idx) {
      cloudFunction.id = idx;
      cloudFunction.text = cloudFunction.name;
    });
    return cloudFunctions;
  });
}

function getHookFunctions(className) {
  return $.get("/__engine/1/classes/" + className + "/actions").then(function(hookFunctions) {
    _.each(hookFunctions, function(hookFunction, idx) {
      hookFunction.id = idx;
      hookFunction.text = hookFunction.action;
    });
    return hookFunctions;
  });
}

function getHookClasses() {
  return $.get("/__engine/1/classes").then(function(hookClasses) {
    return _.map(hookClasses, function(hookClass, idx) {
      return {
        id: idx,
        name: hookClass,
        text: hookClass,
      };
    });
  });
}

function getUser(uid) {
  var dtd = $.Deferred();
  if (!uid) {
    dtd.resolve(null);
    return dtd;
  }
  var user = AV.Object.createWithoutData("_User", uid);
  user.fetch({
    success: function(user) {
      dtd.resolve(user);
    },
    error: function(user, err) {
      dtd.reject(err);
    }
  });
  return dtd;
}

function callCloudFunction(appInfo, cloudFunction, params, user, isCall) {
  var data = null;
  if(params !== null && params.trim() !== '') {
    try {
      data = JSON.parse(params);
    } catch (err) {
      var dtd = $.Deferred();
      dtd.reject(err);
      return dtd;
    }
  }
  var apiEndpoint = isCall ? '/1.1/call/' : '/1.1/functions/';
  var url = "http://" + window.location.hostname + ":" + appInfo.leanenginePort + apiEndpoint + cloudFunction.name;
  data = data || {};

  return $.ajax({
    type: "POST",
    url: url,
    headers: {
      "X-AVOSCloud-Application-Id": appInfo.appId,
      "X-AVOSCloud-Application-Key": appInfo.appKey,
      "X-AVOSCloud-Session-Token": user ? user._sessionToken : undefined,
      // "X-LC-Hook-Key": sendHookKey ? hookKey : undefined
    },
    data: JSON.stringify(data),
    dataType: 'json',
    contentType: 'application/json',
  });
}

function callCloudHook(appInfo, className, hookName) {
  var url = 'http://' + window.location.hostname + ':' + appInfo.leanenginePort + "/1.1/functions/" + className;
}

$(document).ready(function() {
  new Vue({
    el: "#application",
    data: {
      warnings: [],
      result: '',

      // cloud function related:
      cloudFunctions: [],
      selectedFunction: 0,
      cloudFunctionUserId: null,
      isCall: false,
      cloudFunctionParams: null,

      // cloud hook related:
      hookClasses: [],
      hookFunctions: [],
      selectedClass: 0,
      selectedHook: 0,
    },
    methods: {
      executeCloudFunction: function() {
        getUser(this.cloudFunctionUserId).then((function(user) {
          var cloudFunction = this.cloudFunctions[this.selectedFunction];
          return callCloudFunction(
            this.appInfo,
            cloudFunction,
            this.cloudFunctionParams,
            user,
            this.isCall);
        }).bind(this)).done((function(result) {
          this.result = result;
        }).bind(this)).fail((function(err) {
          this.result = err.responseText || err.message;
        }).bind(this));
      },
      refreshHookFunctions: function() {
        var className = this.hookClasses[this.selectedClass].name;
        getHookFunctions(className).then((function(hookFunctions) {
          this.hookFunctions = hookFunctions;
          this.selectedHook = 0;
        }).bind(this));
      },
      executeCloudHook: function() {
        var className = this.hookClasses[this.selectedClass].name;
        var hookName = this.hookFunctions[this.selectedHook];
        callCloudHook(this.appInfo, className, hookName);
      },
    },
    mounted: function() {
      $.when(getAppInfo(), getCloudFunction(), getHookClasses()).then((function(appInfo, cloudFunctions, hookClasses) {
        this.warnings = appInfo.warnings;
        this.appInfo = appInfo;
        this.cloudFunctions = cloudFunctions;
        this.hookClasses = hookClasses;

        var className = this.hookClasses[this.selectedClass].name;
        return getHookFunctions(className);
      }).bind(this)).then((function(hookFunctions) {
        this.hookFunctions = hookFunctions;
        this.selectedHook = 0;
      }).bind(this));
    },
  });
});
