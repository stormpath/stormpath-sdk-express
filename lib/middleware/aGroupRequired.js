'use strict';

var _ = require('underscore');

function assertAGroup(context,list,req,res,next) {

  req.user.getGroups(function(err,groupsCollection) {
    if(err){
      context.handleSdkError(err,res);
    }else{
      if(_.intersection(list,_.pluck(groupsCollection.items,'name')).length > 0){
        next();
      }else{
        context.handleAuthorizationError({},req,res,next);
      }
    }
  });
}

function aGroupRequired(groupFilter){
  var context = this;
  var list = Array.isArray(groupFilter) ? groupFilter : ( typeof groupFilter === 'string' ? [groupFilter] : []);
  return function (req,res,next) {
    if(req.user){
      assertAGroup(context,list,req,res,next);
    }else{
      context.authenticate(req,res,function(req,res) {
        assertAGroup(context,list,req,res,next);
      }.bind(context,req,res));
    }

  };

}

module.exports = aGroupRequired;