node-red-contrib-tumblr
=====================
<a href="http://nodered.org" target="_new">Node-RED</a> node to talk to Tumblr.
Currently supports posting of photos to the specified blog.

Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

        npm install node-red-contrib-tumblr

Usage
-----

In order to use this node you will need to authenticate with Tumblr to allow access to your blogs. This is done in the node settings.

You can specify which blog you would like to post to in the node settings or by setting `msg.blog`

### Tumblr photo out node

Posts the photo in `msg.payload` to the blog name set it the node configuration.</p>
