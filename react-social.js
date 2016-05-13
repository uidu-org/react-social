var isBrowser = function () {
  return !(typeof document === "undefined" || typeof window === "undefined");
};

var assign = function(dest, src) {
  for (var key in src) {
    dest[key] = src[key];
  }

  return dest;
};

var spread = function (obj, omit) {
  var clone = assign({}, obj);

  omit.forEach(function (key) {
    delete clone[key];
  });

  return clone;
};

var $jsonp = (function(){
  var that = {};

  that.send = function(src, options) {
    var options = options || {},
      now = +new Date(),
      id = now + "_" + Math.floor(Math.random() * 1000),
      callback_name = options.callbackName || "callback",
      query = src.replace("@", callback_name),
      on_success = options.onSuccess || function(){},
      on_timeout = options.onTimeout || function(){},
      timeout = options.timeout || 10;

    var timeout_trigger = window.setTimeout(function(){
      window[callback_name] = function(){};
      on_timeout();
    }, timeout * 1000);

    window[callback_name] = function(data){
      window.clearTimeout(timeout_trigger);
      on_success(data);
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = query;

    document.getElementsByTagName('head')[0].appendChild(script);
  };
  return that;
})();

var windowOpen = function(url, name, height = 400, width = 550) {
  var left = (window.outerWidth / 2)
    + (window.screenX || window.screenLeft || 0) - (width / 2);
  var top = (window.outerHeight / 2)
    + (window.screenY || window.screenTop || 0) - (height / 2);

  var config = {
    height,
    width,
    left,
    top,
    location: 'no',
    toolbar: 'no',
    status: 'no',
    directories: 'no',
    menubar: 'no',
    scrollbars: 'yes',
    resizable: 'no',
    centerscreen: 'yes',
    chrome: 'yes',
  };

  return window.open(
    url, name, Object.keys(config).map(key => `${key}=${config[key]}`).join(', ')
  )
};


var ReactSocial = {};

var ReactSocial.Count = {
  propTypes: {
    element: React.PropTypes.string,
    url: React.PropTypes.string
  },

  getDefaultProps: function () {
    var location = "";

    if (isBrowser()) {
      location = window.location.href;
    }

    return {
      url: location,
      element: "span",
      onCount: function () { }
    };
  },

  getInitialState: function () {
    return {
      count: 0
    };
  },

  componentWillMount: function () {
    this.updateCount();
  },

  componentWillReceiveProps: function (nextProps) {
    if (this.props.url !== nextProps.url) {
      this.setState({
        count: 0
      }, function () {
        this.updateCount();
      });
    }
  },

  componentDidUpdate: function () {
    this.props.onCount(this.state.count);
  },

  updateCount: function () {
    if (!isBrowser()) {
      return ;
    }

    if (typeof this.fetchCount === "function") {
      return this.fetchCount(function (count) {
        this.setState({ count: count });
      }.bind(this));
    }

    var url = this.constructUrl(),
        _self = this;
    $jsonp.send(url, {
      callbackName: _self.getName(),
      onSuccess: function(data){
        _self.setState({
          count: _self.extractCount(data)
        });
      },
      onTimeout: function(){
        console.log('timeout!');
      },
    })
  },

  getCount: function () {
    return this.state.count;
  },

  render: function () {
    return (
      <this.props.element {...this.props}>
        {this.state.count}
      </this.props.element>
    )
  }
};

var ReactSocial.Button = {
  propTypes: {
    element: React.PropTypes.string,
    url: React.PropTypes.string,
    media: React.PropTypes.string,
    message: React.PropTypes.string,
    onClick: React.PropTypes.func
  },

  getDefaultProps: function () {
    var location = "";

    if (isBrowser()) {
      location = window.location.href;
    }

    return {
      element: "button",
      url: location,
      media: "",
      message: "",
      onClick: function () { }
    };
  },

  click: function (e) {
    this.props.onClick(e);
    if (isBrowser()) {
      var result = this.constructUrl();

      if (typeof result === "object") {
        var url = result[0]
        var target = result[1]
      } else {
        var url = result
        var target = "_blank"
      }

      windowOpen(url, 'foo');
    }
  },

  render: function () {

    return (
      <this.props.element {...this.props} onClick={this.click}>
      </this.props.element>
    )
  }
};

/* Counts */
ReactSocial.FacebookCount = React.createClass({
  mixins: [Count]

  , constructUrl: function () {
    var fql = encodeURIComponent("select like_count, share_count from link_stat where url = '" + this.props.url + "'")
      , url = "https://api.facebook.com/method/fql.query?format=json&callback=@&query=" + fql;

    return url;
  }

  , getName: function() {
    return 'facebook'
  }

  , extractCount: function (data) {
    console.log(data)
    if (!data[0]) { return 0; }

    return data[0].like_count + data[0].share_count;
  }
});

ReactSocial.GooglePlusCount = React.createClass({
  mixins: [Count]

  , constructUrl: function () {
    return "https://count.donreach.com/?callback=@&url=" + encodeURIComponent(this.props.url);
  }

  , getName: function() {
    return 'google'
  }

  , extractCount: function (data) {
    console.log(data)
    return data.shares.google;
  }
});

ReactSocial.LinkedInCount = React.createClass({
  mixins: [Count]

  , constructUrl: function () {
    return "https://www.linkedin.com/countserv/count/share?url=" + encodeURIComponent(this.props.url) + "&callback=@&format=jsonp";
  }

  , getName: function() {
    return 'linkedin'
  }

  , extractCount: function (data) {
    console.log(data)
    return data.count || 0;
  }
});

/* Buttons */
ReactSocial.FacebookButton = React.createClass({
  mixins: [Button]

  , propTypes: {
    appId: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ])
  }

  , constructUrl: function () {
    return "https://www.facebook.com/dialog/feed?"
           + "app_id=" + encodeURIComponent(this.props.appId)
           + "&display=popup&caption=" + encodeURIComponent(this.props.message)
           + "&link=" + encodeURIComponent(this.props.url)
           + "&redirect_uri=" + encodeURIComponent("https://www.facebook.com/")
  }
});

ReactSocial.TwitterButton = React.createClass({
  mixins: [Button]

  , constructUrl: function () {
    var msg = this.props.message === "" ?
      this.props.url : this.props.message + " " + this.props.url;
    return "https://twitter.com/intent/tweet?text=" + encodeURIComponent(msg);
  }
});

ReactSocial.EmailButton = React.createClass({
  mixins: [Button]

  , constructUrl: function () {
    return [
      "mailto:?subject=" + encodeURIComponent(this.props.message)
           + "&body=" + encodeURIComponent(this.props.url),
      "_self"
    ]
  }
});

ReactSocial.GooglePlusButton = React.createClass({
    mixins: [Button]

  , constructUrl: function () {
      return "https://plus.google.com/share?url=" + encodeURIComponent(this.props.url);
  }
});

ReactSocial.LinkedInButton = React.createClass({
  mixins: [Button]

  , constructUrl: function () {
    return "https://www.linkedin.com/shareArticle?url=" + encodeURIComponent(this.props.url);
  }
});