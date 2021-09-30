import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import _, {isEqual, isNumber} from 'lodash';
import WebView from 'react-native-webview';

// Hook
function usePrevious<T>(value: any) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current as T | null | undefined;
}

function usePreviousWithCompare<T>(value: T, compare: any) {
  const ref = useRef<T>();
  const prevValue = ref.current;

  const _isEqual = compare(prevValue, value);

  useEffect(() => {
    if (!_isEqual) {
      ref.current = value;
    }
  });

  return _isEqual ? prevValue : value;
}

function usePreviousWithCurrent<T>(value: T) {
  const ref = useRef<{prev: T | undefined; curr: T | undefined}>({
    prev: undefined,
    curr: undefined,
  });

  if (!isEqual(ref.current.curr, value)) {
    const newRefValue = {...ref.current};
    newRefValue.prev = newRefValue.curr;
    newRefValue.curr = value;
    ref.current = newRefValue;
  }

  return ref.current.prev;
}

const usersList = [
  'Ann',
  'Bob',
  'David',
  'Jack',
  'Jim',
  'Terry',
  'Tom',
  'Victor',
];

const SuggestionBox = forwardRef(({onSelect}: any, ref: any) => {
  const [search, setSearch] = useState<string | null>(null);
  const [isShown, setIsShown] = useState(false);

  const data = (
    search == null
      ? []
      : search == ''
      ? usersList
      : usersList.filter(name => name.includes(search))
  ).filter((_, index) => index < 5);

  useEffect(() => {
    if (search != null) {
      setIsShown(true);
    }
  }, [search]);

  useEffect(() => {
    if (!isShown) {
      setSearch(null);
    }
  }, [isShown]);

  useImperativeHandle(ref, () => {
    return {
      setSearch,
      setIsShown,
      initializeSearch: () => setSearch(''),
    };
  });

  return isShown ? (
    <FlatList
      style={{
        flexGrow: 0,
        backgroundColor: '#fff',
        width: '100%',
      }}
      nestedScrollEnabled
      data={data}
      keyExtractor={(_, index) => `name-${search}-${index}`}
      renderItem={({item}) => {
        return (
          <TouchableOpacity
            style={{
              height: 40,
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
            onPress={() => {
              setIsShown(false);
              onSelect(item);
            }}>
            <Text>{item}</Text>
          </TouchableOpacity>
        );
      }}
    />
  ) : null;
});

const TextInputBox = ({onSelectionChange, value, onChangeText}: any) => {
  return (
    <TextInput
      onSelectionChange={onSelectionChange}
      value={value}
      onChangeText={onChangeText}
      style={{
        height: 50,
        borderWidth: 1,
        borderColor: 'blue',
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        margin: 16,
      }}
      autoCorrect={false}
      multiline
      numberOfLines={3}
      textAlignVertical={'top'}
    />
  );
};

const getNearestLeftAtSign = (keyword: String, position: number) => {
  for (let i = position; i >= 0; i--) {
    if (keyword[i] == '@') return i;
  }
  return -1;
};

const getSearchKeyword = (keyword: String, left: number, right: number) => {
  return keyword.slice(left, right);
};

const replaceKeyword = (
  keyword: String,
  left: number,
  right: number,
  word: string,
) => {
  const subLeft = keyword.slice(0, left);
  const subRight = keyword.slice(right + 1, keyword.length);
  return `${subLeft}${word} ${subRight}`;
};

const convertTextToHtmlText = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SimpleMentionInput = () => {
  const [text, setText] = useState(new String());
  const [selection, setSelection] = useState({start: 0, end: 0});
  const [mentionRanges, setMentionRanges] = useState<any[]>([]);
  const [clickRange, setClickRange] = useState<any>(null);

  const [html, setHtml] = useState('');

  const suggestionBoxRef = useRef();

  const onChangeText = (text: string) => setText(new String(text));

  const onSelectionChange = ({
    nativeEvent: {
      selection: {start, end},
    },
  }: any) => {
    setSelection({start, end});
  };

  const prevSelection = usePreviousWithCurrent(selection);
  const prevText = usePrevious(text);

  const updateMentionRange = (pText: any, pSelection: any) => {
    const pTxt = pText?.toString();
    if (prevSelection) {
      setMentionRanges(prev => {
        const pS =
          pSelection.start == pSelection.end
            ? pSelection.start - 1
            : pSelection.start;
        const pE = pSelection.end - 1;
        let newValue = prev.map(mention => {
          if (mention?.end > pS && pE >= mention.start) {
            return null;
          } else if (pE < mention?.start) {
            const diff = text.toString().length - pTxt.length;
            return {
              start: mention.start + diff,
              end: mention.end + diff,
            };
          } else return mention;
        });
        return newValue.filter(item => !!item);
      });
    }
  };

  useEffect(() => {
    if (!!clickRange) {
      setClickRange(null);
    } else if (prevText != text && !clickRange) {
      if (text[selection.end - 1] == '@') {
        suggestionBoxRef.current?.initializeSearch();
      } else {
        const nearestLeftAtSign = getNearestLeftAtSign(text, selection.end - 1);
        if (nearestLeftAtSign == -1) {
          suggestionBoxRef.current?.setIsShown(false);
        } else {
          const searchKeyword = getSearchKeyword(
            text,
            nearestLeftAtSign + 1,
            selection.end,
          );
          suggestionBoxRef.current?.setSearch(searchKeyword);
        }
      }
      updateMentionRange(prevText, prevSelection);
    }
  }, [text, selection]);

  const calculateNextMentionRange = (
    nextText: string,
    currText: string,
    clickR: any,
    newMentionR: any,
  ) => {
    setMentionRanges(prev => {
      const newValue: any[] = [];
      const pS = clickR.start;
      const pE = clickR.end;
      prev.forEach(mention => {
        if (pE < mention.start) {
          const diff = nextText.length - currText.length;
          newValue.push({
            start: mention.start + diff,
            end: mention.end + diff,
          });
        } else if (mention.end < pS) {
          newValue.push(mention);
        }
      });
      return [...newValue, newMentionR].sort((a, b) =>
        a?.start > b?.start ? 1 : -1,
      );
    });
  };

  const onSuggestionItemSelect = (name: string) => {
    const nearestLeftAtSign = getNearestLeftAtSign(text, selection.end - 1);
    const nextText = replaceKeyword(
      text,
      nearestLeftAtSign,
      selection.end - 1,
      name,
    );
    const clR = {start: nearestLeftAtSign, end: selection.end - 1};
    const currTxt = text.toString();
    Object.freeze(currTxt);
    const newMentionRange = {
      start: nearestLeftAtSign,
      end: nearestLeftAtSign + name.length - 1,
    };
    calculateNextMentionRange(nextText, currTxt, clR, newMentionRange);
    setClickRange(clR);
    setText(new String(nextText));
  };

  const onSendText = () => {
    let htmlText = '';
    const t = text.toString();
    if (mentionRanges.length > 0) {
      let counter = 0;
      mentionRanges.forEach(mention => {
        const left = convertTextToHtmlText(t.slice(counter, mention.start));
        const curr = convertTextToHtmlText(
          t.slice(mention.start, mention.end + 1),
        );
        htmlText = `${htmlText}${left}<b>${curr}</b>`;
        counter = mention.end + 1;
      });
      const last = convertTextToHtmlText(t.slice(counter, t.length));
      htmlText = `${htmlText}${last}`.trim();
    } else {
      htmlText = convertTextToHtmlText(t).trim();
    }
    setHtml(htmlText);
  };

  return (
    <View style={{flex: 1}}>
      <SuggestionBox ref={suggestionBoxRef} onSelect={onSuggestionItemSelect} />
      <TextInputBox
        value={text.toString()}
        onChangeText={onChangeText}
        onSelectionChange={onSelectionChange}
      />
      <Button title={'Send'} onPress={onSendText} />
      <WebView
        style={{maxHeight: 200, width: '100%'}}
        source={{
          html: `
              <html>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">      
                <body>
                  ${html}
                </body>
              </html>
            `,
        }}
      />
    </View>
  );
};

export default SimpleMentionInput;

const styles = StyleSheet.create({});
