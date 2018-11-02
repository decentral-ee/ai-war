import React,  { Component} from 'react'

class TxButton extends Component {
  constructor(props){
    super(props);
    this.state = { buttonState : props.buttonState };
  }

  componentWillReceiveProps(props) {
    props.buttonState && this.setState({buttonState: props.buttonState});
  }
  click(){
    this.setState({buttonState:'clicked'})
    setTimeout(()=>{
      this.setState({buttonState:'waiting'})
    },7700)
    this.props.onClick.apply( this, arguments );
  }
  render () {
    const { helper, children, className, success, clicked, waiting, icons = true } = this.props;
    const { buttonState } = this.state;
    let classes, click = false, text, icon = false;
    if (helper !== 'MetaMask'){
      classes = 'btn-primary';
    }
    else if (buttonState === 'clicked'){
      classes = 'btn-warning';
      icon = icons && 'fa-exclamation-triangle';
      text = clicked || 'Check MetaMask...';
    }
    else if (buttonState === 'waiting'){
      classes = 'btn-info';
      icon = icons && 'fa-sync fa-spin';
      text = waiting || 'Waiting for Transaction'
    }
    else if(buttonState === 'abort' || buttonState === null){
      classes= 'btn-primary';
      click = this.click.bind(this);
    }
    else {
      classes = 'btn-success';
      icon = icons && 'fa-thumbs-up';
      text = success || 'Transaction confirmed!'
    }
    const i = !icon || ((icon) => {
       return (
          <i className={'mr-2 fas ' + icon}> </i>
        )
    } )(icon);
    return (
      <button
        className = {[className , classes].join(' ')}
        onClick = {click || null}
        disabled = {!click}
        >
        {icon && i}
        {text || children}
      </button>
    )
  }
}

export default TxButton
