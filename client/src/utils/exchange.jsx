
import React, { Component } from 'react';

export default class Exchange extends Component {
  state = {
    rates: {}
  }
  async componentDidMount(){
    const currencyList = ['USD', 'EUR', 'GBP', 'JPY'];
    const apiUrl = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=`
    try{
      const rawExchangeRates = await fetch(apiUrl + currencyList.join());
      const jsonExchangeRates = await rawExchangeRates.json();
      this.setState({
        rates : jsonExchangeRates['ETH']
      });
    }
    catch(error){
      console.log(error); 
    }
  }
  render() {
    const { value, currency } = this.props;
    const { rates } = this.state;
    let symbol = currency;
    let result = value * rates[symbol];
    let formattedResult = Math.round(result*100)/100 ;
    return (
      <span>{symbol +" "+ formattedResult}
      </span>
    )
  }
    static defaultProps = {
      currency: "USD"
    }


}
