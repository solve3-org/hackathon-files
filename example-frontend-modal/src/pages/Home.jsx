import React, { useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useCallContract, useConnectedAccount, useConnectedNetworkId, useConnectedWeb3, useErc20BalanceOf, useReadState, useSendTransaction, useTriggerEvent } from '../web3/hooks';
import ConnectButton from '../web3/components/ConnectButton';
import { TransactionButton } from '../web3/components';
import solve3 from '../module/Solve3Modal';


const abi = require('../nft.abi.json');

const Home = () => {
  const { account, } = useConnectedAccount();
  const { networkId, setNetworkId } = useConnectedNetworkId();
  const network = useReadState('network')
  const [success, setSuccess] = useState(false)

  const onSuccess = () => {
    setSuccess(true)
  }

  return (
    <>
      {/* <div>
        <button onClick={() => { mint() }}>mint</button>
      </div> */}
      <Container className="Container" style={{ padding: '20px' }}>
        <Row>
          <Row className="justify-content-center Wrapper" style={{ width: '100%' }}>
            <Col className="Box" md='6'>
              <div style={{ width: "100%" }}>
                <center>
                  <div>
                    <h2>
                      SOLVE3 Demo
                    </h2>
                  </div>
                  <div style={{ marginTop: "50px" }}>
                    <ConnectButton network={4} />
                  </div>
                </center>
              </div>
              <div className="Content Center">
                <div>
                  {(account && networkId == network && !success) && <>
                    <p style={{ marginTop: "15px"}}>
                      <h5>Mint an NFT</h5>
                    </p>
                    <p>
                      (max. 2 per address)
                    </p>
                    <div style={{marginTop: "20px"}}>
                      {/* <button onClick={() => { mint() }}>mint</button> */}
                      <TransactionButton
                        address={"0x90e3e15568C1a366c48a775d7cd45db705714af7"}
                        abi={abi}
                        method={'mint'}
                        args={[]}
                        confirmations={1} //optional
                        text={'Mint'}
                        confetti={true}
                        onSuccess={onSuccess}
                      />
                    </div>
                  </>}
                  {(!account || networkId != network) && <>
                    <p style={{ marginTop: "15px" }}>
                      <br />
                      Please connect your wallet to the correct network
                      <br />
                    </p>

                  </>}
                  {account && success && <>
                    <p style={{ marginTop: "15px" }}>
                      <br />
                      You have successfully minted an NFT!
                      <br />
                    </p>
                  </>}
                </div>
              </div>
            </Col>
          </Row>
        </Row>
      </Container>
    </>
  );
}

export default Home;