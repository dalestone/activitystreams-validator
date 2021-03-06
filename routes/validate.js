// activitystreams-validator: https://github.com/w3c-social/activitystreams-validator
//
// Copyright © 2016 World Wide Web Consortium, (Massachusetts Institute of
// Technology, European Research Consortium for Informatics and Mathematics,
// Keio University, Beihang). All Rights Reserved. This work is distributed
// under the W3C® Software License [1] in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.
//
// [1] http://www.w3.org/Consortium/Legal/copyright-software

var fs = require('fs');

var express = require('express');
var upload = require('multer')({dest: process.env['UPLOADS'] || '/tmp/uploads'});
var as = require('activitystrea.ms');
var request = require('request');

var Validator = require('../lib/validator');

var router = express.Router();

router.get('/', function(req, res, next) {
  var options;
  if (!req.query || !req.query.url) {
    next(new Error("No URL provided"));
  }
  url = req.query.url;
  options = {
    url: req.query.url,
    headers: {
      'accept': 'application/activity+json;q=1.0,application/ld+json;q=0.8,application/json;q=0.6,*/*;q=0.1'
    }
  };
  request.get(options, function(err, response, body) {
    if (err) {
      next(err);
    } else if (response.statusCode != 200) {
      next(new Error("Unexpected status code" + response.statusCode));
    } else {
      val = new Validator();
      val.validateHTTPResponse(url, response);
      val.validateData(body);
      res.render("validate", {title: "Validation Report", input: body, notes: val.getNotes()});
    }
  });
});

/* Validate input, print some output */

router.post('/', function(req, res, next) {
  var val;
  if (req.is('json') || req.is('application/activity+json') || req.is('application/ld+json')) {
    val = new Validator();
    val.validateTopLevelItem(req.body);
    res.json({title: "Validation Report", input: req.body, notes: val.getNotes()});
  } else if (req.is('urlencoded')) {
    if (!req.body || !req.body.data) {
      return next(new Error("No data"));
    }
    val = new Validator();
    val.validateData(req.body.data);
    res.render("validate", {title: "Validation Report", input: req.body.data, notes: val.getNotes()});
  } else if (req.is('multipart/form-data')) {
    upload.single('file')(req, res, function(err) {
      if (err) {
        return next(err);
      } else {
        fs.readFile(req.file.path, "utf8", function(err, data) {
          if (err) {
            return next(err);
          } else {
            val = new Validator();
            val.validateData(data);
            res.render("validate", {title: "Validation Report", input: data, notes: val.getNotes()});
          }
        });
      }
    });
  } else {
    next(new Error("Unexpected POST request type"));
  }
});

module.exports = router;
