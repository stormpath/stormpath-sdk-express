'use strict';

var async = require('async');

function currentUser(req,res){
  var context = this;
  async.parallel({
    groupsCollection: req.user.getGroups.bind(req.user),
    customData: req.user.getCustomData.bind(req.user)
  },function result(err,results) {
    if(err){
      context.handleSdkError(err,res);
    }else{
      req.user.groups = results.groupsCollection.items;
      req.user.customData = results.customData;
      res.json(req.user);
    }
  });

}

module.exports = currentUser;