
# Connect FS

This is a fork of [connect-fs by tnantoka](https://github.com/tnantoka/connect-fs) I had to do because tnantoka's version was not compatible with latest connect/express versions. 
I publish this version [on NPM as connect-fs2](https://www.npmjs.org/package/connect-fs2). It has all contributions and latest PRs merged.

connect-fs is a FileSystem session store, just copied connect-redis.

 connect-fs support only connect `>= 1.4.0`.

## Installation

	  $ npm install connect-fs2

## Options

  - `dir='./sessions'` Direcotry to save session files

## Usage

    var connect = require('connect')
	 	  , FSStore = require('connect-fs2')(connect)
                  , session = require('express-session')
                  , cookieParser = require('cookie-parser');

    connect.createServer(
      cookieParser(),
      session({ store: new FSStore, secret: 'your secret' })
    );

  with express    

    var FSStore = require('connect-fs2')(express);

    app.configure(function() {
      app.set('views', __dirname + '/views');
      app.set('view engine', 'ejs');
      app.use(bodyParser());
      app.use(methodOverride());
      app.use(cookieParser());
      app.use(session({
        store: new FSStore,
        secret: 'your secret',
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
      }));
      app.use(app.router);
      app.use(express.static(__dirname + '/public'));
    });

