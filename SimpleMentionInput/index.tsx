import React from 'react';
import {Platform} from 'react-native';
import SimpleMentionInputIOS from './IOS';
import SimpleMentionInputAndroid from './Android';

export default function SimpleMentionInputScreen() {
  return Platform.OS == 'ios' ? (
    <SimpleMentionInputIOS />
  ) : (
    <SimpleMentionInputAndroid />
  );
}
