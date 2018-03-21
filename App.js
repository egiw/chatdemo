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

import firebase from 'react-native-firebase';

import WebRTC,
{
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  getUserMedia,
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

    this.calls = firebase.database().ref('calls');
    this.answers = firebase.database().ref('answers');

    this.answers.on('child_added', data => {
      if (!this.isNewAnswer) return;

      const message = data.val();

      if (this.uid !== message.from) {
        console.log('answer received', message);
        this.startCall(message.sdp);
      }
    });

    this.calls.on('child_added', data => {
      if (!this.isNew) return;

      const message = data.val();

      if (this.uid !== message.from) {
        console.log('new call');
        this.setState({
          ringing: true,
          offer: message.sdp
        })
      }
    });

    this.calls.once('value', message => {
      this.isNew = true;
    });

    this.answers.once('value', () => this.isNewAnswer = true);
  }

  componentDidMount() {

    firebase.auth()
      .signInAnonymouslyAndRetrieveData()
      .then(creds => creds.user.toJSON())
      .then(user => { 
        this.uid = user.uid;
        console.log('user id', this.uid)
      });


    this.peer = new RTCPeerConnection({
      "iceServers": [{ 
        "url": "stun:stun.l.google.com:19302",
      }, 
      {
        "url": "turn:numb.viagenie.ca",
        "username": "egi.hasdi@gmail.com",
        "credential": "P@s5w0rd...?"
      }
      ]
    })

    this.peer.onsignalingstatechange = evt => console.log('signaling changed', evt, this.peer.signalingState);

    this.peer.onaddstream = (event) => {
      console.log('stream added', event.stream);
      this.setState({
        streamURL: event.stream.toURL()
      });
    }

    let isFront = false;
    MediaStreamTrack
      .getSources()
      .then(sourceInfos => {
        console.log(sourceInfos);
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if (sourceInfo.kind == "video" && sourceInfo.facing == (isFront ? "front" : "back")) {
            videoSourceId = sourceInfo.id;
          }
        }
        return getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 240, // Provide your own width, height and frame rate here
              minHeight: 160,
              minFrameRate: 10
            },
            facingMode: (isFront ? "user" : "environment"),
            optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
          }
        });
      })
      .then(stream => {
        this.setState({videoURL: stream.toURL()})
        this.peer.addStream(stream);
      })
      .catch(console.log);
  }

  startCall = sdp => {
    var desc = new RTCSessionDescription({ type: 'answer', sdp });
    console.log('start call');
    this.peer.setRemoteDescription(desc)
      .then(() => console.log(this.peer.getRemoteStreams()))
      .catch(err => console.log('error', err));
  }

  btnOnclick = () => {
    this.peer.createOffer().then(desc => {
      this.peer.setLocalDescription(desc);

      console.log('created offer', desc);

      this.peer.onicecandidate = e => {
        if (e.candidate) return;
        //send to peers
        console.log('send calls');
        this.calls.push({ from: this.uid, sdp: this.peer.localDescription.sdp });
      };
    })
  }

  btnAnswerClick = () => {
    var desc = new RTCSessionDescription({ type: "offer", sdp: this.state.offer });

    console.log('btn answer clicked', desc);

    this.peer.setRemoteDescription(desc)
      .then(() => this.peer.createAnswer())
      .then(answer => this.peer.setLocalDescription(answer))
      .catch(console.log);

    this.peer.onicecandidate = e => {
      if (e.candidate) return;
      // this.setState({answerSdp: this.peer.localDescription.sdp});
      console.log('send answer', this.peer.localDescription);
      this.answers.push({ from: this.uid, sdp: this.peer.localDescription.sdp });
    }
  }

  render() {
    return (
      <View>
        {this.state.videoURL && <RTCView streamURL={this.state.videoURL} style={{ width: 100, height: 100 }} /> }
        {this.state.streamURL && <RTCView streamURL={this.state.streamURL} style={{ width: 200, height: 200 }} /> }

        {this.state.ringing ?
          <Button title="Answer" onPress={this.btnAnswerClick} /> :
          <Button title="Call" onPress={this.btnOnclick} />
        }

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
