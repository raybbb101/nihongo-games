# 日本語ゲーム / Nihongo Games

日本語を遊びながら覚えるゲーム集です。ブラウザだけで動きます。ソロはオフラインでも遊べます。
A set of games for learning Japanese that run in the browser. Solo works offline.

## 遊び方 / How to play

`index.html` をダブルクリックして開くだけです(Chrome / Edge / Safari / Firefox)。
Download the repository and double-click `index.html`.

## カナディフェンス / Kana Defense

妖怪の看板に書かれた文字のローマ字をキーボードで打って倒し、鳥居を守る 3D タイピングゲームです。
Yokai march on your shrine gate carrying a sign. Type the romaji of the sign to defeat them.

| 章 / Chapter | ステージ / Stages | 内容 / Content |
| --- | --- | --- |
| ひらがな Hiragana | 23 | あ行から拗音まで+言葉ステージ / from あ to きゃ, plus word stages |
| カタカナ Katakana | 23 | 同じ順番で、外来語の言葉ステージ付き / same order, with loanword stages |
| ミックス Mixed | 15 | 両方同時に / both at once |
| 漢字 Kanji | 13 | 上の全ステージをクリアで解放。数字から日常語まで / unlocks after all of the above; numbers to everyday words |

- **言葉ステージ / Word stages**: ボスの後に、学んだカナだけでできる言葉(おやすみ、コーヒーなど)をまるごと入力します。
  After boss stages, type whole words made only from kana you already know.
- **遊び方の種類 / Modes**: ソロ、またはルームコードで最大4人の協力。 Solo, or co-op for up to 4 with a room code.
- **学習の補助 / Learning aids**: ステージ前の文字カード(ローマ字と音声付き)、ゲーム中の繁体字中国語訳、通してしまった文字の復習、苦手な文字ほど多く出る出題、文字図鑑。
  Intro cards with romaji and voice, Traditional Chinese translations in play (no romaji), a review list, more practice on weak kana, and a kana chart.
- **ご褒美 / Rewards**: 星1〜3、速さと正確さで増えるコイン、ショップの武器(拳、ナイフ、手裏剣、刀、炎・氷・雷の杖、グレネード、隕石)とエフェクト。
  Stars, coins for speed and accuracy, and a shop of weapons and hit effects. 品物は見た目と音だけを変えます。Purchases only change how a hit looks and sounds.
- **負けると / If you lose**: 鳥居のライフが尽きると敗北。倒した分のコインは残り、復習してやり直せます。
  The stage ends when the gate's lives run out. You keep coins for enemies defeated, review what got through and retry.

進行状況はそのブラウザの localStorage に保存されます。Progress is saved in the browser's localStorage.

## カナカルタ / Kana Karuta

絵札(ねずみ🐭、めがね👓)を見て、その言葉の頭文字の札を取るカルタです。ローマ字を打つか札をクリックして答えます。遅いと天狗に取られます。
A picture appears (🐭 ねずみ); take the tile of its first kana (ね) by typing the romaji or clicking it, before the tengu does.

- ひらがな、カタカナ、ミックスで各15ステージ / 15 stages per script
- 同じ頭文字の絵札が重なります(め👁️ と めがね👓 はどちらも「め」)/ Cards can share a tile
- ゲーム中は絵と繁体字中国語訳だけを表示し、札にローマ字は出ません / In play only the picture and its Traditional Chinese translation show
- 1人、またはルームコードで最大4人の対戦 / Solo, or race up to 4 players with a room code
- お手つきをすると、ソロでは少しの間、対戦ではその札の間動けません / A wrong tile freezes you for a moment, or for the rest of that card when racing

## マルチプレイ / Multiplayer

ホストがルームを作るとコードが出ます。友達はそのコードを入力すると、それぞれのパソコンから参加できます。
The host creates a room and shares its code; friends type the code to join from their own computers.

最初の接続にだけ無料の公開サービス PeerJS を使い、その後はブラウザ同士(WebRTC)で直接通信します。遊ぶ内容はホストのブラウザが管理するので、ホストが抜けるとルームは閉じます。学校や会社のネットワークではつながらないことがあります。
PeerJS's free public server only introduces the browsers; after that they talk directly over WebRTC. The host's browser runs the game, so the room closes if the host leaves. Some school or office networks block it.

## 開発 / Development

ビルド不要の素の JavaScript です。Plain JavaScript, no build step.

```bash
node --test tests/data.test.js tests/karuta.test.js
```

```
index.html          ゲーム一覧 / game launcher
shared/             かな・漢字データとローマ字判定(次のゲームでも共用)/ data shared by future games
kana-defense/       カナディフェンス本体 / Kana Defense
kana-karuta/        カナカルタ本体 / Kana Karuta
vendor/three.min.js Three.js r158 (MIT License)
vendor/peerjs.min.js PeerJS 1.5.4 (MIT License)
```
