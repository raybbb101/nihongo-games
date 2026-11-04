// Everyday words for beginners. Stages pick the ones whose kana have already been taught.
// Format: word|English|spelling as pronounced (only when it differs).
(function (root) {
  const parse = (block) => block.trim().split(/\s*\n\s*/).map((line) => {
    const [text, en, say] = line.split('|');
    return { text, en, say };
  });
  const KANA_WORDS = {
    hira: parse(`
      あお|blue
      あか|red
      あき|autumn
      いえ|house
      うえ|up
      かお|face
      いけ|pond
      こえ|voice
      えき|station
      きく|listen
      かく|write
      いく|go
      あかい|red (adj.)
      おおきい|big
      ここ|here
      あさ|morning
      あし|foot
      いす|chair
      うた|song
      うし|cow
      かさ|umbrella
      すし|sushi
      そと|outside
      たかい|tall
      ちかい|near
      つき|moon
      くつ|shoes
      くち|mouth
      おと|sound
      した|down
      あした|tomorrow
      たこ|octopus
      とけい|clock
      ちいさい|small
      いぬ|dog
      ねこ|cat
      はな|flower
      ひと|person
      ふね|ship
      ほし|star
      なつ|summer
      あたま|head
      くま|bear
      うま|horse
      さかな|fish
      なまえ|name
      みみ|ear
      むし|bug
      もも|peach
      はは|mother
      みなみ|south
      にし|west
      きのこ|mushroom
      まち|town
      おやすみ|good night
      ありがとう|thank you
      さようなら|goodbye
      こんにちは|hello|こんにちわ
      すみません|excuse me
      おはよう|good morning
      やま|mountain
      そら|sky
      ゆき|snow
      よる|night
      わたし|I, me
      にほん|Japan
      ほん|book
      くるま|car
      さくら|cherry blossom
      みかん|mandarin orange
      かわ|river
      へや|room
      はる|spring
      ふゆ|winter
      おいしい|tasty
      たのしい|fun
      ごはん|rice, meal
      たまご|egg
      がくせい|student
      だいがく|university
      でんわ|telephone
      ともだち|friend
      がっこう|school
      きって|stamp
      ざっし|magazine
      ぶた|pig
      りんご|apple
      かぜ|wind
      みず|water
      ひがし|east
      えんぴつ|pencil
      げんき|healthy, well
      こども|child
      ねずみ|mouse
      めがね|glasses
      いただきます|said before eating
      ごちそうさま|said after eating
      ごめんなさい|I'm sorry
      でんしゃ|train
      としょかん|library
      きょう|today
      おちゃ|green tea
      しゃしん|photo
      じゅぎょう|class, lesson
      りょこう|travel
      びょういん|hospital
      ぎゅうにゅう|milk
      かいしゃ|company
      いしゃ|doctor
      きょうしつ|classroom
      じしょ|dictionary
      ひゃく|hundred
    `),
    kata: parse(`
      ココア|cocoa
      カカオ|cacao
      ケーキ|cake
      オーケー|OK
      キウイ|kiwi
      エコ|eco
      キー|key
      コア|core
      カーキ|khaki
      テスト|test
      タクシー|taxi
      スキー|ski
      コート|coat
      ステーキ|steak
      アイス|ice cream
      ソース|sauce
      スーツ|suit
      シーツ|bed sheet
      ツアー|tour
      コスト|cost
      テキスト|textbook
      セーター|sweater
      ノート|notebook
      コーヒー|coffee
      ナイフ|knife
      ハム|ham
      マスク|mask
      メモ|memo
      ネクタイ|necktie
      テニス|tennis
      ハート|heart
      チーム|team
      ホーム|home
      マウス|mouse
      アニメ|anime
      ヒーター|heater
      ラーメン|ramen
      カメラ|camera
      ホテル|hotel
      ワイン|wine
      タオル|towel
      トイレ|toilet
      ミルク|milk
      ヨーヨー|yo-yo
      レストラン|restaurant
      メロン|melon
      アメリカ|America
      カレー|curry
      ライオン|lion
      イヤホン|earphones
      クリスマス|Christmas
      メール|email
      スマホ|smartphone
      ビール|beer
      テレビ|TV
      ラジオ|radio
      バス|bus
      パン|bread
      ピザ|pizza
      ゲーム|game
      パソコン|computer
      ドア|door
      ベッド|bed
      サッカー|soccer
      ギター|guitar
      ダンス|dance
      ズボン|trousers
      ボール|ball
      デパート|department store
      ペン|pen
      スポーツ|sports
      バナナ|banana
      シャツ|shirt
      ジュース|juice
      チョコ|chocolate
      ニュース|news
      メニュー|menu
      ジャズ|jazz
      シャワー|shower
      キャベツ|cabbage
      ショー|show
      ジャム|jam
      チャンス|chance
      キャンプ|camping
      リュック|backpack
      シュークリーム|cream puff
    `),
  };
  root.KANA_WORDS = KANA_WORDS;
  if (typeof module !== 'undefined') module.exports = KANA_WORDS;
})(globalThis);
