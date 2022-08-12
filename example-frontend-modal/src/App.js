import './App.css';
import Web3Wrapper from './web3/wrapper/Web3Wrapper';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';
import Home from './pages/Home';

const wrapperConfig = {
  network: 80001,
  rpc: 'https://polygon-mumbai.g.alchemy.com/v2/tlgEMO7IY9X7wGD3s1bgsapn_4Cu-gu-',
  blockexplorer: {
    url: 'https://mumbai.polygonscan.com',
    name: 'polygonscan'
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
