export default function exchange(fromCurrency='ETH', toCurrency='USD', value, rates){
  if(!rates){
    rates = (async () => getExchangeRates())();
  }
  let result;
  if(fromCurrency==='ETH'){
    result = value * rates[toCurrency];
  }
  else if(toCurrency==='ETH'){
    result = value / rates[fromCurrency];
  }
  else{
    console.log('error');
    return 0;
  }
  let formattedResult =
    toCurrency==='ETH'
      ? format(result,9)
      : format(result,2) ;
  return (formattedResult);
}

export const format = (value, decimals)=> {
  if (value.toString().slice(-1)==='.') return value;
  if ((value*Math.pow(10,decimals))%10===0) return value; 
  return Math.round(value*(Math.pow(10,decimals)))/(Math.pow(10,decimals));
}

export const getExchangeRates = async (currencyList = ['USD', 'EUR', 'GBP', 'JPY']) =>{
  const apiUrl = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=`
  try{
    const rawExchangeRates = await fetch(apiUrl + currencyList.join());
    const jsonExchangeRates = await rawExchangeRates.json();
    return jsonExchangeRates['ETH'];
  }
  catch(error){
    console.log(error);
    return error;
  }
}
