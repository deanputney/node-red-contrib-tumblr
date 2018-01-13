module.exports = function(RED) {
    "use strict";
    var tumblrAPI = require('tumblr.js');
    var OAuth= require('oauth').OAuth;
    var tumblr_api_consumer_key = 'cD9L2H9aMdTpyhsOXUtGz1VYDv00myzSl2j45lALiQ76Mk9bsC';
    var tumblr_api_conmsumer_secret = 'ecqEp6pX8ItATC2smpdg13Q0YgXsoh1M5uiJRy9GRcNO43GclV';

    var oa = new OAuth(
        "https://www.tumblr.com/oauth/request_token",
        "https://www.tumblr.com/oauth/access_token",
        tumblr_api_consumer_key,
        tumblr_api_conmsumer_secret,
        "1.0A",
        null,
        "HMAC-SHA1"
    );

    function TumblrNode(n) {
        RED.nodes.createNode(this,n);
        this.screen_name = n.screen_name;
    }
    RED.nodes.registerType("tumblr-credentials",TumblrNode,{
        credentials: {
            screen_name: {type:"text"},
            access_token: {type: "password"},
            access_token_secret: {type:"password"}
        }
    });

    function TumblrPhotoOutNode(n) {
        RED.nodes.createNode(this,n);
        this.tumblr = n.tumblr;
        this.blog = n.blog;
        this.tumblrConfig = RED.nodes.getNode(this.tumblr);
        var credentials = RED.nodes.getCredentials(this.tumblr);
        var node = this;

        if (credentials && credentials.screen_name == this.tumblrConfig.screen_name) {
            var client = new tumblrAPI.Client({
              consumer_key: tumblr_api_consumer_key,
              consumer_secret: tumblr_api_conmsumer_secret,
              token: credentials.access_token,
              token_secret: credentials.access_token_secret
            });

            node.on("input", function(msg) {
                if (msg.hasOwnProperty("payload") && Buffer.isBuffer(msg.payload)) {
                    var blog = node.blog;
                    var params = {};
                    params.data64 = msg.payload.toString('base64');
                    if (msg.hasOwnProperty("caption")) {
                      params.caption = msg.caption;
                    }
                    if (msg.hasOwnProperty("tags")) {
                      params.tags = msg.tags;
                    }
                    if (msg.hasOwnProperty("state")) {
                      params.state = msg.state;
                    }
                    if (msg.hasOwnProperty("blog")) {
                      blog = msg.blog;
                    }
                    node.status({fill:"blue",shape:"dot",text:"tumblr.status.posting"});
                    client.createPhotoPost(blog, params, function(err,data){
                      if(err){
                        node.status({fill:"red", shape:"ring", text:" "});
                        node.error(RED._("tumblr.errors.postfail",{error:err}),msg);
                      }
                      else {
                        node.status({fill:"green", shape:"dot", text:" "});
                        node.log(RED._("tumblr.log.posted",{postid:data.id}),msg);
                        msg.payload = data;
                        node.send(msg);
                        node.status({});
                      }
                    });
                } else {
                  node.status({fill:"yellow", shape:"ring", text:RED._("tumblr.errors.nopayload")});
                  node.error(RED._("tumblr.errors.nopayload"));
                }
            });
        }
    }
    RED.nodes.registerType("tumblr photo out",TumblrPhotoOutNode);

    RED.httpAdmin.get('/tumblr-credentials/:id/auth', function(req, res) {
        var credentials = {};
        oa.getOAuthRequestToken({
            oauth_callback: req.query.callback
        },function(error, oauth_token, oauth_token_secret, results) {
            if (error) {
                var err = {statusCode: 401, data: "dummy error"};
                var resp = RED._("tumblr.errors.oautherror",{statusCode: err.statusCode, errorData: err.data});
                res.send(resp);
            }
            else {
                credentials.oauth_token = oauth_token;
                credentials.oauth_token_secret = oauth_token_secret;
                res.redirect('https://www.tumblr.com/oauth/authorize?oauth_token='+oauth_token);
                RED.nodes.addCredentials(req.params.id,credentials);
            }
        });
    });

    RED.httpAdmin.get('/tumblr-credentials/:id/auth/callback', function(req, res, next) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        credentials.oauth_verifier = req.query.oauth_verifier;

        oa.getOAuthAccessToken(
            credentials.oauth_token,
            credentials.oauth_token_secret,
            credentials.oauth_verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    RED.log.error(error);
                    res.send(RED._("tumblr.errors.oauthbroke"));
                }
                else {
                    credentials = {};
                    credentials.access_token = oauth_access_token;
                    credentials.access_token_secret = oauth_access_token_secret;

                    var client = new tumblrAPI.Client({
                        consumer_key: tumblr_api_consumer_key,
                        consumer_secret: tumblr_api_conmsumer_secret,
                        token: credentials.access_token,
                        token_secret: credentials.access_token_secret
                    });

                    client.userInfo(function(err, data) {
                      if(err){
                        RED.log.error(err);
                        res.send(RED._("tumblr.errors.oauthbroke"));
                      }
                      else {
                        credentials.screen_name = data.user.name;
                        RED.nodes.addCredentials(req.params.id,credentials);
                        res.send(RED._("tumblr.errors.authorized"));
                      }
                    });
                }
            }
        );
    });
};
