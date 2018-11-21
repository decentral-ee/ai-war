import React, {Component} from 'react'
import TxButton from './TxButton'
import exchange, {format} from './../utils/exchange'

export default class TxInput extends Component{
  constructor (props) {
    super(props);
    this.state = {
      currency : 'ETH',
      fiat: 'USD',
      showInput: 0,
      ethInput: 0,
      maxValue: 0
    }
  }
  componentWillReceiveProps(props) {
    const {maxValue, all, rates} = this.props;
    const {fiat, currency, ethInput} = this.state;
    if(maxValue!==this.state.maxValue){
      const maxFiat = exchange('ETH', fiat, maxValue, rates);
      if(all){
        const showInput = currency==='ETH'? maxValue : maxFiat;
        this.setState({ethInput: maxValue, showInput});
      }
      const fMaxValue = format(maxValue,9);
      this.setState({maxValue: fMaxValue, maxFiat});
    }
    if(fiat !== props.fiat){
      this.setState({fiat: props.fiat});
      if(currency!=="ETH"){
        const showInput = exchange('ETH', props.fiat, ethInput, rates);
        this.setState({currency: props.fiat, showInput});
      }
    }
  }
  handleInput = (e) => {
    let val = e.target.value, val2;
    if (/^(\d+(\.\d{1,9})?)|^(?![\s\S])$/.test(val)) {
      const {rates} = this.props;
      const { currency, maxFiat, maxValue } = this.state;
      if(currency === 'ETH'){
        if(val > maxValue){
          setTimeout(()=>{
            this.setState({
              showInput: maxValue
            });
          },1500);
          val2 = maxValue;
        }
        else{
          val2 = val;
        }
      }
      else{
        if(val > maxFiat){
          setTimeout(()=>{
            this.setState({
              showInput: maxFiat
            });
          },1500);
          val2 = this.props.maxValue;
        }
        else{
          val2 = exchange(currency, 'ETH', val, rates);
        }
      }
      this.setState({
        showInput: val,
        ethInput: val2
      });
      console.log("val, val2: ", val, val2);
    }
  }
  async handleSubmit(e) {
      e.preventDefault();
      const {ethInput } = this.state;
      if( ethInput>0 ){
        this.setState({buttonState: 'submitted'});
        const {accounts, txFunction, web3, all, txArgs} = this.props;
        const args =
          all
            ? ({
                from: accounts[0],
                ...txArgs
            })
            : ({
                from: accounts[0],
                value: web3.utils.toWei(ethInput.toString(), "ether"),
                ...txArgs
            });
        await txFunction(args)
          .then((r)=>{
            console.log(r);
            this.setState({buttonState : r});
            setTimeout(()=>{
              this.setState({buttonState:null});
            },7700);
          }
        ).catch ((e) =>{
          console.log(e);
          this.setState({buttonState:'abort'});
          setTimeout(()=>{
            this.setState({buttonState: null})
          }, 7700);
        }
      );
    }
  }
  handleCurrencyChange = (e) => {
    const {currency, fiat, ethInput} = this.state;
    const newCurrency =
      currency === 'ETH'
        ? fiat || 'USD'
        : 'ETH';
    if(ethInput>0){
      if(newCurrency === 'ETH'){
        this.setState({showInput:ethInput});
      }
      else{
        const newVal = exchange('ETH', newCurrency, ethInput, this.props.rates);
        this.setState({showInput: newVal});
      }
    }
    this.setState({currency: newCurrency});
  }
  render(){
    const {children, helper, clicked = 'Confirm Tx', waiting = 'Waiting...', success = 'Confirmed!', all = false} = this.props;
    const {showInput, currency, buttonState} = this.state;
    return (
      <form className="form-group form-row m-0 squareEdges" onSubmit={this.handleSubmit.bind(this) }>
        <div className="col-7 m-0 p-0 d-flex">
          <label className="col m-0 p-2 col" value={currency} onClick={this.handleCurrencyChange} >{currency}</label>
          <input type="text" placeholder="Amount" className="m-0 p-2 col" value={showInput>0? (currency==='ETH'?format(showInput,9):format(showInput,2)): ''} disabled={all} onChange={this.handleInput} />
        </div>
        <TxButton
          config={{
            icons:false,
            colors:true,
            clicked,
            waiting,
            success,
            buttonType:"submit",
            className:"col-5 m-0 p-0 btn"
          }}
          buttonState={buttonState}
          helper={helper}
          >
            {children}
          </TxButton>
      </form>
    )
  }
}
