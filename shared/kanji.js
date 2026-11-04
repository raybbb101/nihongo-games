// Beginner kanji, ordered from the easiest to everyday words.
// r: accepted readings (first one is shown as the hint). en: meaning.
(function (root) {
  const k = (text, readings, en) => ({ text, r: readings.split(' '), en });
  const KANJI_GROUPS = [
    { id: 'num1', en: 'Numbers 1-5', ja: '数字 1〜5', items: [
      k('一', 'いち', 'one'), k('二', 'に', 'two'), k('三', 'さん', 'three'), k('四', 'よん し', 'four'), k('五', 'ご', 'five'),
    ] },
    { id: 'num2', en: 'Numbers 6-10', ja: '数字 6〜10', items: [
      k('六', 'ろく', 'six'), k('七', 'なな しち', 'seven'), k('八', 'はち', 'eight'), k('九', 'きゅう く', 'nine'), k('十', 'じゅう', 'ten'),
    ] },
    { id: 'week', en: 'Days of the week', ja: '曜日', items: [
      k('日', 'ひ にち', 'sun / day'), k('月', 'つき げつ', 'moon / month'), k('火', 'ひ か', 'fire'), k('水', 'みず すい', 'water'),
      k('木', 'き もく', 'tree'), k('金', 'かね きん', 'gold / money'), k('土', 'つち ど', 'soil'),
    ] },
    { id: 'nature', en: 'Nature', ja: '自然', items: [
      k('山', 'やま', 'mountain'), k('川', 'かわ', 'river'), k('田', 'た', 'rice field'), k('空', 'そら', 'sky'), k('雨', 'あめ', 'rain'), k('花', 'はな', 'flower'),
    ] },
    { id: 'body', en: 'People & body', ja: '人と体', items: [
      k('人', 'ひと', 'person'), k('口', 'くち', 'mouth'), k('目', 'め', 'eye'), k('手', 'て', 'hand'), k('足', 'あし', 'foot'), k('耳', 'みみ', 'ear'),
    ] },
    { id: 'place', en: 'Size & direction', ja: '大きさと方向', items: [
      k('大', 'だい おお', 'big'), k('小', 'しょう ちい', 'small'), k('上', 'うえ', 'up'), k('下', 'した', 'down'),
      k('中', 'なか', 'inside'), k('右', 'みぎ', 'right'), k('左', 'ひだり', 'left'),
    ] },
    { id: 'family', en: 'Family', ja: '家族', items: [
      k('男', 'おとこ', 'man'), k('女', 'おんな', 'woman'), k('子', 'こ', 'child'), k('父', 'ちち', 'father'), k('母', 'はは', 'mother'), k('友', 'とも', 'friend'),
    ] },
    { id: 'school', en: 'Words: school', ja: '言葉:学校', items: [
      k('学校', 'がっこう', 'school'), k('先生', 'せんせい', 'teacher'), k('学生', 'がくせい', 'student'),
      k('友達', 'ともだち', 'friend'), k('電車', 'でんしゃ', 'train'), k('日本', 'にほん', 'Japan'),
    ] },
    { id: 'time', en: 'Words: every day', ja: '言葉:毎日', items: [
      k('今日', 'きょう', 'today'), k('明日', 'あした', 'tomorrow'), k('時間', 'じかん', 'time'),
      k('毎日', 'まいにち', 'every day'), k('名前', 'なまえ', 'name'), k('天気', 'てんき', 'weather'),
    ] },
    { id: 'life', en: 'Words: daily life', ja: '言葉:生活', items: [
      k('ご飯', 'ごはん', 'rice / meal'), k('お茶', 'おちゃ', 'green tea'), k('肉', 'にく', 'meat'), k('魚', 'さかな', 'fish'),
      k('車', 'くるま', 'car'), k('本', 'ほん', 'book'), k('店', 'みせ', 'shop'), k('家', 'いえ', 'house'), k('駅', 'えき', 'station'),
    ] },
  ];
  root.KANJI_GROUPS = KANJI_GROUPS;
  if (typeof module !== 'undefined') module.exports = KANJI_GROUPS;
})(globalThis);
