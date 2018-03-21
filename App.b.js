/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  TextInput
} from 'react-native';

import WebRTC,
{
  RTCPeerConnection,
  getUserMedia,
  RTCView,
  RTCSessionDescription
} from 'react-native-webrtc';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' +
    'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

type Props = {};
export default class App extends Component<Props> {

  peer;
  calls;
  answers;
  uid;
  isNewAnswer = false;
  isNew = false;

  constructor() {
    super();

    this.state = {
      videoURL: null,
      streamURL: null,
      currentUser: null,
      incoming: false,
      data: null,
      offerSdp: null,
      answerSdp: null,
      calling: false,
      ringing: false,
      offer: null
    }
  }

  componentDidMount() {

    var turn = { 
      url: "turn:numb.viagenie.ca",
      username: "egi.hasdi@gmail.com",
      credential: "P@s5w0rd...?"
    };

    this.peer = new RTCPeerConnection({
      "iceServers": [
        {"url": "stun:stun.l.google.com:19302"},
        turn
      ]
    })

    this.peer.oniceconnectionstatechange = e => console.log('change ice', this.peer.iceConnectionState);

    this.peer.onaddstream = (event) => {
      this.setState({
        streamURL: event.stream.toURL()
      });
    }

    getUserMedia({
      audio: true,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30
        },
        facingMode: "environment"
      }
    }).then(stream => {
      this.setState({ videoURL: stream.toURL() });
      this.peer.addStream(stream);
    });
  }

  btnOnclick = () => {
    console.log('createoffer');
    this.peer.createOffer().then(desc => {
      this.peer.setLocalDescription(desc);

      this.peer.onicecandidate = e => {
        if(e.candidate) return;
        //send to peers
        // this.calls.push({from: this.uid, sdp: this.peer.localDescription.sdp});
        console.log('candidate', this.peer.localDescription);
        this.setState({
          offerSdp: this.peer.localDescription.sdp
        })
      };
    })
  }

  btnOKClick = () => {
    var desc = new RTCSessionDescription({type: 'answer', sdp: this.state.answerSdp});
    console.log('ok call', desc);
    this.peer.setRemoteDescription(desc)
      .catch(console.log);
  }

  btnAnswerClick = () => {
    var desc = new RTCSessionDescription({type: "offer", sdp: this.state.offerSdp});

    this.peer.setRemoteDescription(desc)
      .then(() => this.peer.createAnswer())
      .then(answer => this.peer.setLocalDescription(answer))
      .catch(console.log);
    
      this.peer.onicecandidate = e => {
        if(e.candidate) return;
        console.log('answer', this.peer.localDescription);
        this.setState({answerSdp: this.peer.localDescription.sdp});
        // this.answers.push({from: this.uid, sdp: this.peer.localDescription.sdp});
      }
  }

  render() {
    return (
      <View>
        <RTCView streamURL={this.state.videoURL} style={{ width: 100, height: 100}} />
        <RTCView streamURL={this.state.streamURL} style={{ width: 200, height: 200}} />

        <TextInput value={this.state.offerSdp} onChangeText={offerSdp => this.setState({ offerSdp })}/>
        <TextInput value={this.state.answerSdp} onChangeText={answerSdp => this.setState({ answerSdp })}/>
        
        <Button title="Answer" onPress={this.btnAnswerClick} /> 
        <Button title="Call" onPress={this.btnOnclick} />
        <Button title="OK" onPress={this.btnOKClick} />
        
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
