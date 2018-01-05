module.exports = function(RED) {
    "use strict";
    var tumblrAPI = require('tumblr.js');
    var OAuth= require('oauth').OAuth;

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

    function TumblrInNode(n) {
        RED.nodes.createNode(this,n);
            var node = this;
            var credentials = RED.nodes.getCredentials(this.tumblr);

            if (credentials && credentials.screen_name == this.tumblrConfig.screen_name) {
               var client = new tumblr.Client({
                   consumer_key: "twtQpl4VV5Nh2VGzxSJ5vwUX0LkzPeyVYkeXsv82sojfgfCOEV",
                   consumer_secret: "CJZJiHvn17kbkp846e1LOMqJxtgkztDRG4uhsCJIJVVxUK37XQ",
                   access_token_key: credentials.access_token,
                   access_token_secret: credentials.access_token_secret
               });

              client.userInfo(function(err, data) {
                data.user.blogs.forEach(function(blog) {
                  console.log(blog.name);
                });
              });
            }
    }
    RED.nodes.registerType("tumblr in",TumblrInNode);


    function TumblrOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
    }
    RED.nodes.registerType("tumblr out",TumblrOutNode);

    var oa = new OAuth(
        "https://www.tumblr.com/oauth/request_token",
        "https://www.tumblr.com/oauth/access_token",
        "twtQpl4VV5Nh2VGzxSJ5vwUX0LkzPeyVYkeXsv82sojfgfCOEV",
        "CJZJiHvn17kbkp846e1LOMqJxtgkztDRG4uhsCJIJVVxUK37XQ",
        "1.0A",
        null,
        "HMAC-SHA1"
    );

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
                RED.log.info('oauth_token:'+oauth_token);
                RED.log.info('oauth_token_secret:'+oauth_token_secret);
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
        RED.log.error(credentials);

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
                    credentials.screen_name = "@"+results.screen_name;
                    RED.nodes.addCredentials(req.params.id,credentials);
                    res.send(RED._("tumblr.errors.authorized"));
                }
            }
        );
    });
}
