'use strict';

var _ = require('underscore');

function assertGroups(context,list,req,res,next) {

  req.user.getGroups(function(err,groupsCollection) {
    if(err){
      context.handleSdkError(err,res);
    }else{
      if(list.length === _.intersection(list,_.pluck(groupsCollection.items,'name')).length){
        next();
      }else{
        context.handleAuthorizationError({},req,res,next);
      }
    }
  });
}

function groupsRequired(groupFilter){
  var context = this;
  var list = Array.isArray(groupFilter) ? groupFilter : ( typeof groupFilter === 'string' ? [groupFilter] : []);
  return function (req,res,next) {
    if(req.user){
      assertGroups(context,list,req,res,next);
    }else{
      context.authenticate(req,res,function(req,res) {
        assertGroups(context,list,req,res,next);
      }.bind(context,req,res));
    }

  };

}

module.exports = groupsRequired;