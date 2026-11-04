# 日本語ゲーム / Nihongo Games

日本語を遊びながら覚えるゲーム集です。サーバーも通信も不要で、ブラウザだけで動きます。
A set of games for learning Japanese. No server and no network: it all runs in the browser.

## 遊び方 / How to play

`index.html` をダブルクリックして開くだけです(Chrome / Edge / Safari / Firefox)。
Download the repository and double-click `index.html`.

## カナディフェンス / Kana Defense

妖怪の看板に書かれた文字のローマ字をキーボードで打って倒し、鳥居を守る 3D タイピングゲームです。
Yokai march on your shrine gate carrying a sign. Type the romaji of the sign to defeat them.

| 章 / Chapter | ステージ / Stages | 内容 / Content |
| --- | --- | --- |
| ひらがな Hiragana | 17 | あ行から拗音まで / from あ to きゃ |
| カタカナ Katakana | 17 | 同じ順番で / same order |
| ミックス Mixed | 10 | 両方同時に / both at once |
| 漢字 Kanji | 13 | 上の全ステージをクリアで解放。数字から日常語まで / unlocks after all of the above; numbers to everyday words |

- **遊び方の種類 / Modes**: ソロ、協力リレー(2〜4人が20秒ごとに交代)、協力同時(2人。P2 は Shift を押しながら入力)。
  Solo, Relay co-op (2-4 players swap every 20 s), Same-time co-op (2 players; P2 holds Shift). ブラウザは複数キーボードを区別できないため、この方式です。Browsers cannot tell two keyboards apart, hence Shift.
- **学習の補助 / Learning aids**: ステージ前の文字カード、新しい文字のローマ字ヒント、日本語音声、通してしまった文字の復習、苦手な文字ほど多く出る出題、文字図鑑。
  Intro cards, romaji hints that fade as you improve, Japanese voice, a review list, more practice on weak kana, and a kana chart.
- **ご褒美 / Rewards**: 星1〜3、速さと正確さで増えるコイン、ショップの武器(拳、ナイフ、手裏剣、刀、炎・氷・雷の杖、グレネード、隕石)とエフェクト。
  Stars, coins for speed and accuracy, and a shop of weapons and hit effects. 品物は見た目と音だけを変えます。Purchases only change how a hit looks and sounds.
- **負けると / If you lose**: 鳥居のライフが尽きると敗北。倒した分のコインは残り、復習してやり直せます。
  The stage ends when the gate's lives run out. You keep coins for enemies defeated, review what got through and retry.

進行状況はそのブラウザの localStorage に保存されます。Progress is saved in the browser's localStorage.

## 開発 / Development

ビルド不要の素の JavaScript です。Plain JavaScript, no build step.

```bash
node --test tests/data.test.js
```

```
index.html          ゲーム一覧 / game launcher
shared/             かな・漢字データとローマ字判定(次のゲームでも共用)/ data shared by future games
kana-defense/       カナディフェンス本体 / the game
vendor/three.min.js Three.js r158 (MIT License)
```
