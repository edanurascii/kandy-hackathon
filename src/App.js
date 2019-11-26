import React from 'react';
import { connect } from 'react-redux';
import logo from './logo.svg';
import './App.css';

import { actions as authActions } from './store/kandy/authentication';
import CONSTANTS from './constants';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      number: ""
    }
  }

  render() {
    const { dispatch } = this.props;
    const { number } = this.state;

    return (
      <div className="App">
        <button onClick={ () => dispatch(authActions.getTokens(CONSTANTS)) }>subscribe</button>
        <input onChange={ (event) => this.setState({number: event.target.value}) } />
        <button onClick={ () => dispatch(authActions.startCall(number)) }>Start Call</button>
      </div>
    );
  }
}

function select() {
  return {
  }
}
export default connect(select)(App);
