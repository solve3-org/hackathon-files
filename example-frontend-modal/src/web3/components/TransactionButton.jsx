import React, { useEffect, useState } from 'react';
import { useConnectedAccount, useConnectedNetworkId, useConnectedProvider, useConnectedWeb3, useReadState, useSendTransaction } from '../hooks';
import GeneralButton from './internal/GeneralButton';
import ClipLoader from "react-spinners/ClipLoader";
import { css } from "@emotion/react";
import { FaCheck } from 'react-icons/fa'
import { ImCross } from 'react-icons/im'
import useWindowSize from 'react-use/lib/useWindowSize'

const solve3 = require("@solve3/modal");

const override = css`
  display: block;
  margin: 0 auto;
`;

const TransactionButton = (props) => {
  const { width, height } = useWindowSize()
  const { provider, } = useConnectedProvider();
  const { account, } = useConnectedAccount();
  const { networkId, } = useConnectedNetworkId();
  const network = useReadState('network')
  const blockexplorer = useReadState('blockexplorer')
  const { web3, } = useConnectedWeb3();

  const send = useSendTransaction();
  const [text, setText] = useState(props.text);
  const [status, setStatus] = useState('')
  const [msg, setMsg] = useState(<>&nbsp;</>)

  const [onClickHandler, setOnClickHandler] = useState(() => { })
  const [color, setColor] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [hoverColor, setHoverColor] = useState('')
  const [split, setSplit] = useState(false)
  const [icon, setIcon] = useState(<></>)



  const sendTx = (message) => {
    setMsg(props.language == 'de' ? 'Bitte Transaktion im Wallet bestätigen' : 'Confirm Transaction');
    send({
      confirmations: props.confirmations,
      address: props.address,
      abi: props.abi,
      method: props.method,
      args: [message, account]
    }).on('transactionHash', hash => {
      setStatus('hash')
      setText(props.language == 'de' ? 'Senden...' : 'Pending...')
      let url = <a target='_blank' href={blockexplorer.url + '/tx/' + hash}>{blockexplorer.name}</a>
      setMsg(props.language == 'de' ? <>Transaktion auf {url} ansehen.</> : <>View on {url}</>)
    }).on('receipt', receipt => {
      console.log(receipt)
    }).on('confirmation', number => {
      if (props.onSuccess) props.onSuccess();
      setStatus('confirmed')
      setText(props.language == 'de' ? 'Erfolgreich!' : 'Confirmed!')
    }).on('error', error => {
      setText(props.language == 'de' ? 'Error!' : 'Failed!')
      setStatus('error')
      setMsg(props.language == 'de' ? 'Ein Fehler ist aufgetreten' : 'An error occured')
    })
  }

  const openPopup = async () => {
    solve3
      .on("success", async (message) => {
        sendTx(message);
      })
      .on('error', async (err) => {
        console.log("error: ", err)
      })

    const handshake = await solve3.init({
      account: account,
      contract: props.address,
      network: "rinkeby"
    })

    web3.eth.sign(handshake, account).then((msg) => {
      solve3.open(msg)
    })
  }

  const resetVars = () => {
    setText(props.text)
    setStatus('')
    setMsg(<>&nbsp;</>)
    setOnClickHandler(() => { })
    setColor('')
    setBackgroundColor('')
    setHoverColor('')
    setSplit(false)
    setIcon(<></>)
  }

  return (
    <div>
      {/* inactive, not logged in, wrong network */}
      {(!account || (networkId != network)) &&
        <GeneralButton
          onClick={() => { }}
          text={text}
          color={props.colorInactive ? props.colorInactive : 'lightgrey'}
          backgroundColor={props.backgroundColorInactive ? props.backgroundColorInactive : '#f1f1f1'}
          caption={msg}
        />}

      {/* Waiting for wallet interaction */}
      {account && networkId == network && status == '' &&
        <GeneralButton
          onClick={openPopup}
          text={text}
          color={props.color ? props.color : 'dodgerblue'}
          backgroundColor={props.backgroundColor ? props.backgroundColor : 'white'}
          hoverColor={props.hoverColor ? props.hoverColor : '#fafafa'}
          caption={msg}
        />}

      {/* Pending TX */}
      {account && networkId == network && status != '' && status != 'confirmed' && status != 'error' &&
        <GeneralButton
          onClick={() => { }}
          text={text}
          color={props.color ? props.color : 'dodgerblue'}
          backgroundColor={props.backgroundColor ? props.backgroundColor : 'white'}
          hoverColor={props.hoverColor ? props.hoverColor : '#1c82e6'}
          caption={msg}
          split={true}
          icon={<ClipLoader color={'#ffffff'} loading={true} css={override} size={18} />}
        />}

      {/* Confirmed TX */}
      {account && networkId == network && status != '' && status == 'confirmed' && status != 'error' &&
        <><GeneralButton
          onClick={resetVars}
          text={text}
          color={props.colorConfirmed ? props.colorConfirmed : '#28a745'}
          backgroundColor={props.backgroundColorConfirmed ? props.backgroundColorConfirmed : 'white'}
          hoverColor={props.hoverColorConfirmed ? props.hoverColorConfirmed : '#24823a'}
          caption={msg}
          split={true}
          icon={<FaCheck />}
        />
        </>
      }

      {/* Failed TX */}
      {account && networkId == network && status != '' && status != 'confirmed' && status == 'error' &&
        <GeneralButton
          onClick={resetVars}
          text={text}
          color={props.colorFailed ? props.colorFailed : 'indianred'}
          backgroundColor={props.backgroundColorFailed ? props.backgroundColorFailed : 'white'}
          hoverColor={props.hoverFailed ? props.hoverFailed : '#b84040'}
          caption={msg}
          split={true}
          icon={<ImCross />}
        />}
    </div>
  );
}

export default TransactionButton;