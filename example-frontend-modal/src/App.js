import './App.css';
import Web3Wrapper from './web3/wrapper/Web3Wrapper';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';
import Home from './pages/Home';

const wrapperConfig = {
  network: 4,
  rpc: 'https://eth-rinkeby.alchemyapi.io/v2/JIn1tzPJqmEAJhYkP0eofMPE03wSz3YY',
  blockexplorer: {
    url: 'https://rinkeby.etherscan.io',
    name: 'etherscan'
  },
}


function App() {
  return (
    <div className="App">
      <Web3Wrapper config={wrapperConfig}>
        <Router>
          <Switch>
            <Route path='/'>
              <Home />
            </Route>

          </Switch>
        </Router>
      </Web3Wrapper>
    </div>
  );
}

export default App;
