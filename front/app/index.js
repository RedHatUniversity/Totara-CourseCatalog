import React from 'react';
import ReactDOM from 'react-dom';
import ApplicationContainer from './app/containers/ApplicationContainer'

// Globally available styles
import css from './sass/index.sass';

// Application container optionally loads config.json and sets up routing
ReactDOM.render(<ApplicationContainer />, document.querySelector('#app'));