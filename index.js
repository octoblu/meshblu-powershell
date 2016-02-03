'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('meshblu-powershell')
var shell = require('node-powershell');
var fs = require('fs');


var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    path: {
      type: 'string'
    },
    script: {
      type: 'string'
    },
    useArgs: {
      type: 'boolean',
      description: 'Just use param ( ) instead of Read-Host in your script',
      required: true,
      default: false
    },
    args: {
      type: 'array',
      items: {
        type: 'string'
      },
      required: false
    }
  }
};

var ACTION_MAP = [
  {
    'value': 'usePath',
    'name': 'Run Script from Path'
  },
  {
    'value': 'send',
    'name': 'Send Script and Run'
  }
]

var MESSAGE_FORM_SCHEMA = [
  {
    'key': 'action',
    'type': 'select',
    'titleMap': ACTION_MAP
  },
  {
    'key': 'path',
    'condition': "model.action == 'usePath'"
  },
  {
    'key': 'script',
    'condition': "model.action == 'send'"
  },
  {
    'key': 'useArgs'
  },
  {
    'key': 'args'
  }
]

var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {

  }
};

function Plugin(){
  var self = this;
  self.options = {};
  self.messageSchema = MESSAGE_SCHEMA;
  self.messageFormSchema = MESSAGE_FORM_SCHEMA;
  self.optionsSchema = OPTIONS_SCHEMA;
  return self;
}
util.inherits(Plugin, EventEmitter);

Plugin.prototype.onMessage = function(message){
  var self = this;
  var payload = message.payload;
  if(payload.script){
    self.saveScript(payload);
  }else{
    if(payload.useArgs == false){
      self.runScriptFromPath(payload.path);
    }else if(payload.useArgs == true){
      self.runWithArgs(payload.path, payload.args);
    }
  }
};


Plugin.prototype.runScriptFromPath = function(path){
  var self = this;

  PS = new shell(path);

  PS.on('output', function(data){
      console.log(data);
      self.emit('message', {devices: ['*'], payload: data});
  });
  PS.on('end', function(code) {
    self.emit('message', {devices: ['*'], payload: { 'script-end': code}});
  });
};

Plugin.prototype.runWithArgs = function(path, args){
  var self = this;
  var multi_arg;

  args.forEach(function(o) {
    multi_arg = multi_arg + ' "' + o + '"';
  });

  path = path + multi_arg;

  PS = new shell(path);

  PS.on('output', function(data){
      console.log(data);
      self.emit('message', {devices: ['*'], payload: data});
  });
  PS.on('end', function(code) {
    self.emit('message', {devices: ['*'], payload: { 'script-end': code}});
  });
};

Plugin.prototype.saveScript = function(payload){
  var self = this;

  fs.writeFile("./script.ps1", payload.script, function(err) {
      if(err) {
          return console.log(err);
      }
      if(payload.useArgs == false){
        self.runScriptFromPath("./script.ps1");
      }else if(payload.useArgs == true){
        self.runWithArgs("./script.ps1", payload.args);
      }
  });
};

Plugin.prototype.onConfig = function(device){
  var self = this;
  self.setOptions(device.options||{});
};

Plugin.prototype.setOptions = function(options){
  var self = this;
  self.options = options;
};

module.exports = {
  messageSchema: MESSAGE_SCHEMA,
  messageFormSchema: MESSAGE_FORM_SCHEMA,
  optionsSchema: OPTIONS_SCHEMA,
  Plugin: Plugin
};
