import React,  { Component} from 'react'
import CustomProperties from 'react-custom-properties';

class TxButton extends Component {

  constructor(props){
    super(props)
    this.btn = React.createRef();
    this.state = { buttonState: null};
  }
  componentDidUpdate(){
    //here the logic to get all variables from DOM
    const btnHeight = this.btn.current && (this.btn.current.clientHeight).toString() + 'px';
    const btnWidth = this.btn.current && (this.btn.current.clientWidth).toString() + 'px';
    const ad = (this.btn.current.clientHeight - 6).toString() + 'px';
    const abd = (this.btn.current.clientWidth - this.btn.current.clientHeight + 3).toString() + 'px';
    if( btnHeight !== this.state.a || btnWidth !== this.state.b){
      this.setState({ a: btnHeight, b: btnWidth, ad , abd,s: '3000ms', w: '3px', d: '1px', color: '#ddd'});
    }
  }
  componentWillReceiveProps(props) {
    if(props.buttonState === 'submitted') {
      if(
          this.state.buttonState !=='clicked'
          && this.state.buttonState !=='waiting'
      ){
        this.click()
      }
    }
    else if (typeof props.buttonState !== 'undefined' && props.buttonState !== 'InProgress'){
       this.setState({buttonState: props.buttonState});
    }
  }
  click(){
    this.setState({buttonState:'clicked'});
    setTimeout(()=>{
      this.state.buttonState !=='abort'
      && this.setState({buttonState:'waiting'})
    },7700);
    const { onClick } = this.props;
    onClick && this.props.onClick.apply( this, arguments );
  }
  render () {
    const { helper, children, config = {}} = this.props;
    const { className, success, clicked, waiting, icons = true, colors = true, buttonType} = config;
    const { buttonState, a, b, s, w, d, color, ad, abd } = this.state;
    let classes, click = false, text, icon = false;
    if (helper !== 'MetaMask'){
      classes = colors && 'btn-primary';
    }
    else if (buttonState === 'clicked'){
      classes = colors && 'btn-warning';
      icon = icons && 'fa-exclamation-triangle';
      text = clicked || 'Check MetaMask...';
    }
    else if (buttonState === 'waiting'){
      classes = colors && 'btn-waiting';
      icon = icons && 'fa-sync fa-spin';
      text = waiting || 'Waiting for Transaction'
    }
    else if(buttonState === 'abort'){
      classes= colors && 'btn-danger';
      icon = icons && 'fa-exclamation-triangle';
      text = "Cancelled";
    }
    else if(buttonState === null){
      classes = colors && 'btn-primary';
      click = this.click.bind(this);
    }
    else {
      classes = colors && 'btn-success';
      icon = icons && 'fa-thumbs-up';
      text = success || 'Transaction confirmed!'
    }
    const i = !icon || ((icon) => {
       return (
          <i className={'mr-2 fas ' + icon}> </i>
        )
    } )(icon);
    const spans =
      <>
        <span className='line-1'></span>
        <span className="line-2"></span>
        <span className='line-3'></span>
        <span className='line-4'></span>
      </> ;
    return (
      <button
        ref={this.btn}
        className = {[className , classes].join(' ')}
        disabled = {!click}
        type = {buttonType}
        onClick={ (buttonType==="submit") ? undefined : (click || null)}
        >
          <CustomProperties properties={{ '--a' : a, '--b' : b, '--ad': ad, '--a-b-d': abd, '--s': s, '--w' : w, '--d': d, '--color' : color}}>
            {icon && i}
            {text || children}
            {buttonState === 'waiting' ? spans : null}
          </CustomProperties>
      </button>
    )
  }
}

export default TxButton
