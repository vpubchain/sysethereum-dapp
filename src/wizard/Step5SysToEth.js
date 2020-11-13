
import React, { Component } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";
import sbconfig from '../SyscoinSuperblocksI';
import { getProof } from 'bitcoin-proof'
import Web3 from 'web3';
import CONFIGURATION from '../config';
const web3 = new Web3(Web3.givenProvider);
class Step5 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      receiptStatus: '',
      receiptTxHash: '',
      receiptTxIndex: '',
      receiptFrom: '',
      receiptTo: '',
      receiptBlockhash: '', 
      receiptBlocknumber: '',
      receiptTotalGas: '',
      receiptGas: '',
      receiptObj: null,
      working: false

    };
    this.submitProofs = this.submitProofs.bind(this);
    this.downloadReceipt = this.downloadReceipt.bind(this);
    this.setStateFromReceipt = this.setStateFromReceipt.bind(this);
    this.isValidated = this.isValidated.bind(this);
  }
  isValidated() {
    if(this.state.receiptObj === null){
      return false;
    }
    this.props.updateStore({
      ...this.state,
      savedToCloud: false // use this to notify step4 that some changes took place and prompt the user to save again
    });
    return true;
  }
  componentDidMount() {
    if(!this.props.getStore().superblockhash){
      this.props.jumpToStep(3);
    }
    else if(!this.props.getStore().blockhash || !this.props.getStore().txid){
      this.props.jumpToStep(2);
    }
  }

  componentWillUnmount() {}
  downloadReceipt () {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(this.state.receiptObj, null, "   ")], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "receipt.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  }
 
  setStateFromReceipt(receipt, error, confirmation) {
    if(receipt.transactionHash && this.state.receiptTxHash !== receipt.transactionHash){
      return;
    }
    var found = false;
    if(receipt.events){
      var TokenUnfreezeFn = '0xb925ba840e2f36bcb317f8179bd8b5ed01aba4a22abf5f169162c0894dea87ab';
      for (var key in receipt.events) {
        if (receipt.events.hasOwnProperty(key)) {
          if(receipt.events[key].raw && receipt.events[key].raw.topics && receipt.events[key].raw.topics.length > 0){
            if(receipt.events[key].raw.topics[0] === TokenUnfreezeFn){
              found = true;
            }
          }
        }
      }
    }
    if(!found){
      error = this.props.t("step5ErrorEventCheckLog");
    }
    this.setState({
      receiptObj: receipt,
      receiptStatus: receipt.status === true? "true":"false",
      receiptTxHash: receipt.transactionHash,
      receiptTxIndex: receipt.transactionIndex,
      receiptFrom: receipt.from,
      receiptTo: receipt.to,
      receiptBlockhash: receipt.blockHash, 
      receiptBlocknumber: receipt.blockNumber,
      receiptTotalGas: receipt.cumulativeGasUsed,
      receiptGas: receipt.gasUsed,
      receiptConf: confirmation,
      buttonVal: error !== null? false: true, 
      buttonValMsg:  error !== null? error: this.props.t("step5Success")}); 
  }

  async submitProofs() {
    if(!web3 || !web3.currentProvider || web3.currentProvider.isMetaMask === false){
      this.setState({buttonVal: false, buttonValMsg: this.props.t("step5InstallMetamask")});
      return;  
    }
    let chainId = await web3.eth.getChainId();
    if(CONFIGURATION.testnet && chainId !== 4){
      this.setState({buttonVal: false, buttonValMsg: this.props.t("stepUseTestnet")});
      return;       
    }
    else if(!CONFIGURATION.testnet && chainId !== 1){
      this.setState({buttonVal: false, buttonValMsg: this.props.t("stepUseMainnet")});
      return;       
    }
    let SyscoinSuperblocks = new web3.eth.Contract(sbconfig.data, sbconfig.contract); 
    if(!SyscoinSuperblocks || !SyscoinSuperblocks.methods || !SyscoinSuperblocks.methods.relayTx){
      this.setState({buttonVal: false, buttonValMsg: this.props.t("stepSuperblock")});
      return;  
    }
    this.setState({
      receiptStatus: '',
      receiptTxHash: '',
      receiptTxIndex: '',
      receiptFrom: '',
      receiptTo: '',
      receiptBlockhash: '', 
      receiptBlocknumber: '',
      receiptTotalGas: '',
      receiptGas: '',
      receiptConf: 0,
      receiptObj: null,
      buttonVal: true, 
      buttonValMsg: ""});
    let accounts = await web3.eth.getAccounts();
    if(!accounts || !accounts[0] || accounts[0] === 'undefined')
    {
      this.setState({buttonVal: false, buttonValMsg: this.props.t("step5LoginMetamask")});
      if(window.ethereum){
        await window.ethereum.enable();
      }
     
      return;
    }
    this.setState({buttonVal: true, buttonValMsg: this.props.t("step5AuthMetamask")});
    let _txBytes = "0x" + this.props.getStore().txbytes;
    let _txSiblings = [];
    for(let i = 0;i<this.props.getStore().txsiblings.length;i++){
      let _txSibling = "0x" + this.props.getStore().txsiblings[i];
      _txSiblings.push(_txSibling);
    }
    let _syscoinBlockHeader = "0x" + this.props.getStore().syscoinblockheader;
    let _syscoinBlockSiblings = [];
    for(let i = 0;i<this.props.getStore().syscoinblocksiblings.length;i++){
      let _blockSibling = "0x" + this.props.getStore().syscoinblocksiblings[i];
      _syscoinBlockSiblings.push(_blockSibling);
    }  
    let _superblockHash = "0x" + this.props.getStore().superblockhash;
    let merkleProof = getProof(this.props.getStore().txsiblings, this.props.getStore().txindex);
    for(let   i = 0;i<merkleProof.sibling.length;i++){
      merkleProof.sibling[i] = "0x" + merkleProof.sibling[i];
    }
    this.setState({working: true});
    let thisObj = this;
    thisObj.state.receiptObj = null;

    console.log("_txBytes=", _txBytes)
    console.log("this.props.getStore().txindex=", this.props.getStore().txindex)
    console.log("merkleProof.sibling=", merkleProof.sibling)
    console.log("_syscoinBlockHeader=", _syscoinBlockHeader)
    console.log("this.props.getStore().syscoinblockindex=", this.props.getStore().syscoinblockindex)
    console.log("_syscoinBlockSiblings=", _syscoinBlockSiblings)
    console.log("_superblockHash=", _superblockHash)

     SyscoinSuperblocks.methods.relayTx(_txBytes, this.props.getStore().txindex, merkleProof.sibling, _syscoinBlockHeader, 
      this.props.getStore().syscoinblockindex, _syscoinBlockSiblings, _superblockHash).send({from: accounts[0], gas: 500000})
      .once('transactionHash', function(hash){
        thisObj.setState({receiptTxHash: hash, buttonVal: true, buttonValMsg: thisObj.props.t("step5PleaseWait")});
      })
      .once('confirmation', function(confirmationNumber, receipt){ 
        if(thisObj.state.receiptObj === null){
          thisObj.setStateFromReceipt(receipt, null, confirmationNumber);
          thisObj.setState({working: false});
          
        } else {
          thisObj.setState({receiptConf: confirmationNumber});
        }
      })
      .on('error', (error, receipt) => {
        thisObj.setState({working: false});
        if(error.message.length <= 512 && error.message.indexOf("{") !== -1){
          error = JSON.parse(error.message.substring(error.message.indexOf("{")));
        }
        let message = error.message.toString();
        if(receipt){
          thisObj.setStateFromReceipt(receipt, message, 0);
        }
        else{
          thisObj.setState({buttonVal: false, buttonValMsg:  message}); 
        }
      })
  }

 


  render() {
    // explicit class assigning based on validation
    let notValidClasses = {};    
    if (typeof this.state.buttonVal == 'undefined' || this.state.buttonVal) {
      notValidClasses.buttonCls = 'has-success';
      notValidClasses.buttonValGrpCls = 'val-success-tooltip';
    }
    else {
       notValidClasses.buttonCls = 'has-error';
       notValidClasses.buttonValGrpCls = 'val-err-tooltip mb30';
    }   
    return (
      <div className="step step5">
        <div className="row">
          <form id="Form" className="form-horizontal">
            <div className="form-group">
              <label className="col-md-12">
                <h1 dangerouslySetInnerHTML={{__html: this.props.t("step5Head")}}></h1>
                <h3 dangerouslySetInnerHTML={{__html: this.props.t("step5Description")}}></h3>
              </label>
              <div className="row">
              <div className="col-md-4 col-sm-12 col-centered">

                <div className={notValidClasses.buttonCls}>
                    <button type="button" disabled={this.state.working} className="form-control btn btn-default formbtn" aria-label={this.props.t("step5Button")} onClick={this.submitProofs}>
                    <span className="glyphicon glyphicon-send" aria-hidden="true">&nbsp;</span>
                    {this.props.t("step5Button")}
                    </button>
                  <div className={notValidClasses.buttonValGrpCls}>{this.state.buttonValMsg}</div>
                </div>
              </div>
              </div>
              <div className="row">
                <div className="col-md-12">

                <Tabs>
                    <TabList>
                      <Tab>{this.props.t("tabGeneral")}</Tab>
                      <Tab>{this.props.t("tabAdvanced")}</Tab>
                    </TabList>
                    <TabPanel>
                      <code className="block">
                          <span class="dataname">{this.props.t("step5ReceiptStatus")}:</span> <span className="result">{this.state.receiptStatus}</span><br />
                          <span class="dataname">{this.props.t("step5ReceiptTxHash")}:</span> <span className="result">{this.state.receiptTxHash}</span><br />
                          <span class="dataname">{this.props.t("step5ReceiptTxIndex")}:</span> <span className="result">{this.state.receiptTxIndex}</span><br />
                          <span class="dataname">{this.props.t("step5ReceiptFrom")}:</span> <span className="result">{this.state.receiptFrom}</span><br />
                          <span class="dataname">{this.props.t("step5ReceiptTo")}:</span><span className="result">{this.state.receiptTo}</span><br />
                      </code>
                    </TabPanel>
                    <TabPanel>
                      <code className="block">
                      <span class="dataname">{this.props.t("step5ReceiptBlockhash")}:</span> <span className="result">{this.state.receiptBlockhash}</span><br />
                      <span class="dataname">{this.props.t("step5ReceiptBlocknumber")}:</span> <span className="result">{this.state.receiptBlocknumber}</span><br />
                      <span class="dataname">{this.props.t("step5ReceiptTotalGas")}:</span> <span className="result">{this.state.receiptTotalGas}</span><br />
                      <span class="dataname">{this.props.t("step5ReceiptGas")}:</span> <span className="result">{this.state.receiptGas}</span><br />
                      <span class="dataname">{this.props.t("step5ReceiptConfirmations")}:</span> <span className="result">{this.state.receiptConf}</span><br />
                      </code>
                    </TabPanel>
                  </Tabs>

                </div>
                </div>
                <div className="row">
                <div className="col-md-4 col-sm-12 col-centered">
   
                  <div>
                    <button type="button" disabled={!this.state.receiptObj || this.state.working} className="form-control btn btn-default formbtn" aria-label={this.props.t("step5Download")} onClick={this.downloadReceipt}>
                    <span className="glyphicon glyphicon-download" aria-hidden="true">&nbsp;</span>
                    {this.props.t("step5Download")}
                    </button>
                  </div>
                 </div>
                 </div>
              </div>
          </form>
        </div>
      </div>
    )
  }
}

export default Step5;
