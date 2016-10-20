import React from 'react';
import {request} from '../utils/Rest';
import CourseCatalog from '../components/TWS-CourseCatalog';
import {
  ConfigLoadingMessage,
  ConfigLoadingErrorMessage
} from '../components/ConfigLoading';

class ApplicationContainer extends React.Component {

  constructor() {
    super();
    this.state = {
      loading      : true,  // Loading the config.json file
      isError      : false, // Error loading the file?
      config       : {},    // Objects from config.json
      configFileURL: 'config.json'  // null || location of the configuration file
    };
  }

  // On initial mounting of the component, load config or start app
  componentDidMount() {
    this.validateConfiguration();
  }

  // Start the app or load the configuration file
  validateConfiguration() {
    if (!this.state.configFileURL) {
      this.setState({loading: false});
    } else {
      request({
        json: true,
        url : this.state.configFileURL
      }).then((data)=> {
        console.log('Configuration loaded');
        this.setState({loading: false, config: data});
      }).catch((err)=> {
        console.warn('Error loading configuration', err);
        this.setState({loading: false, isError: false, config: {}});
      });
    }
  }

  // Render loading, error or the app via routes
  render() {
    if (this.state.loading) {
      return <ConfigLoadingMessage/>;
    } else if (this.state.isError) {
      return <ConfigLoadingErrorMessage/>;
    }

    return (<div className="rh-app-container">
      <CourseCatalog config={this.state.config}/>
    </div>);
  }
}

export default ApplicationContainer

/*
 React Router configuration - REMOVED
 import {Router, Route, browserHistory} from 'react-router';

 // Route not found error message
 const RouteNotFound = (props) => <h1>Route not found!</h1>;

 // Inject the application config object into every routed view
 createElement(Component, props) {
 return <Component {...props} appConfig={this.state.config}/>
 }

 // In render

 Route setup
 https://github.com/reactjs/react-router/blob/master/docs/guides/RouteMatching.md

 DISABLED

 There's a problem loading the config.json file with routes deeper than 2 levels
 when pushstate history is used
 history={browserHistory}

 return (
 <Router createElement={this.createElement.bind(this)}>
 <Route path="/" component={App}/>
 <Route path="*" component={RouteNotFound}/>
 </Router>
 );
 */