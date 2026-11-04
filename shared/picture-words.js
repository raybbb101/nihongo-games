// Words that can be drawn with a single picture. Format: word picture English.
// The first kana of each word is what a karuta player has to answer.
(function (root) {
  const PICTURE_WORDS = `
    あり 🐜 ant|あめ ☔ rain|あし 🦶 foot
    いぬ 🐶 dog|いちご 🍓 strawberry|いえ 🏠 house
    うま 🐴 horse|うし 🐮 cow|うみ 🌊 sea|うさぎ 🐰 rabbit
    えんぴつ ✏️ pencil|えき 🚉 station|えび 🍤 shrimp
    おに 👹 ogre|おかね 💰 money|おにぎり 🍙 rice ball
    かさ ☂️ umbrella|かに 🦀 crab|かめ 🐢 turtle|かぎ 🔑 key
    き 🌳 tree|きのこ 🍄 mushroom|きつね 🦊 fox|きりん 🦒 giraffe
    くま 🐻 bear|くるま 🚗 car|くつ 👟 shoes|くも ☁️ cloud
    けむし 🐛 caterpillar|ケーキ 🍰 cake|けん 🗡️ sword
    こども 🧒 child|コーヒー ☕ coffee|こおり 🧊 ice|ことり 🐦 small bird
    さかな 🐟 fish|さる 🐵 monkey|さくら 🌸 cherry blossom
    しか 🦌 deer|しんぶん 📰 newspaper|しお 🧂 salt
    すし 🍣 sushi|すいか 🍉 watermelon|スプーン 🥄 spoon
    せんせい 🧑‍🏫 teacher|せかい 🌍 world|セーター 🧶 sweater
    そば 🍜 noodles|そり 🛷 sled|そら 🌌 sky
    たこ 🐙 octopus|たまご 🥚 egg|たいよう ☀️ sun
    ちず 🗺️ map|チーズ 🧀 cheese|ちから 💪 strength
    つき 🌙 moon|つり 🎣 fishing|つめ 💅 nail
    て ✋ hand|てがみ ✉️ letter|テレビ 📺 TV
    とり 🐔 chicken|とけい ⏰ clock|とら 🐯 tiger|トマト 🍅 tomato
    なす 🍆 eggplant|ナイフ 🔪 knife|なみだ 😢 tears
    にく 🍖 meat|にわとり 🐓 rooster|にんじん 🥕 carrot
    ぬいぐるみ 🧸 stuffed toy|ぬの 🧵 cloth
    ねこ 🐱 cat|ねずみ 🐭 mouse|ねむい 😴 sleepy
    ノート 📓 notebook|のみもの 🥤 drink|のう 🧠 brain
    はな 🌷 flower|はさみ ✂️ scissors|はち 🐝 bee|はし 🥢 chopsticks
    ひ 🔥 fire|ひこうき ✈️ airplane|ひつじ 🐑 sheep
    ふね 🚢 ship|ふく 👕 clothes|ふじさん 🗻 Mt. Fuji|ふゆ ⛄ winter
    へび 🐍 snake|ヘリコプター 🚁 helicopter|へいわ 🕊️ peace
    ほん 📚 book|ほし ⭐ star|ほね 🦴 bone
    マイク 🎤 microphone|マスク 😷 mask|まつ 🌲 pine tree
    みず 💧 water|みみ 👂 ear|みかん 🍊 mandarin orange
    むし 🐞 bug|むしめがね 🔍 magnifying glass|むら 🏘️ village
    め 👁️ eye|めがね 👓 glasses|メロン 🍈 melon
    もも 🍑 peach|もり 🌳 forest|もち 🍡 rice cake
    やま ⛰️ mountain|やさい 🥦 vegetable|やぎ 🐐 goat
    ゆき ❄️ snow|ゆび ☝️ finger|ゆめ 💭 dream
    よる 🌃 night|ヨット ⛵ yacht|よろい 🛡️ armor
    らくだ 🐫 camel|ラーメン 🍜 ramen|ラジオ 📻 radio
    りんご 🍎 apple|りす 🐿️ squirrel|リボン 🎀 ribbon
    ルビー 💎 ruby|ルーレット 🎡 roulette wheel|るす 🚪 away from home
    レモン 🍋 lemon|レストラン 🍽️ restaurant|れきし 📜 history
    ロボット 🤖 robot|ろうそく 🕯️ candle|ロケット 🚀 rocket
    わに 🐊 crocodile|ワイン 🍷 wine|わらう 😄 laugh
    がっこう 🏫 school|ガソリン ⛽ gasoline
    ぎんこう 🏦 bank|ギター 🎸 guitar
    ぐんて 🧤 work gloves|グラス 🥂 glass
    ゲーム 🎮 game|げんき 😀 healthy
    ごはん 🍚 rice|ゴリラ 🦍 gorilla|ゴルフ ⛳ golf
    ざりがに 🦞 crayfish|ざっし 📖 magazine
    じてんしゃ 🚲 bicycle|じどうしゃ 🚙 automobile
    ずぼん 👖 trousers|ずつう 🤕 headache
    ゼブラ 🦓 zebra|ぜろ 0️⃣ zero
    ぞう 🐘 elephant|ぞうり 🩴 sandals
    だんご 🍡 dumpling|ダイヤ 💎 diamond
    でんわ ☎️ telephone|でんしゃ 🚃 train
    どあ 🚪 door|ドーナツ 🍩 donut
    バナナ 🍌 banana|バス 🚌 bus
    ビール 🍺 beer|ビデオ 📼 video
    ぶた 🐷 pig|ぶどう 🍇 grapes
    ベッド 🛏️ bed|ベル 🔔 bell
    ボール ⚽ ball|ぼうし 🧢 cap
    パン 🍞 bread|パンダ 🐼 panda
    ピアノ 🎹 piano|ピザ 🍕 pizza
    プレゼント 🎁 present|プール 🏊 pool
    ペン 🖊️ pen|ペンギン 🐧 penguin
    ポスト 📮 mailbox|ポップコーン 🍿 popcorn
  `.trim().split(/[|\n]/).map((entry) => {
    const [text, picture, ...en] = entry.trim().split(' ');
    return { text, picture, en: en.join(' ') };
  });
  root.PICTURE_WORDS = PICTURE_WORDS;
  if (typeof module !== 'undefined') module.exports = PICTURE_WORDS;
})(globalThis);
