// Beginner kanji, ordered from the easiest to everyday words.
// r: accepted readings (the first one is shown on the intro cards). zh: Traditional Chinese meaning.
(function (root) {
  const k = (text, readings, zh) => ({ text, r: readings.split(' '), zh });
  const KANJI_GROUPS = [
    { id: 'num1', en: 'Numbers 1-5', ja: '数字 1〜5', items: [
      k('一', 'いち', '一'), k('二', 'に', '二'), k('三', 'さん', '三'), k('四', 'よん し', '四'), k('五', 'ご', '五'),
    ] },
    { id: 'num2', en: 'Numbers 6-10', ja: '数字 6〜10', items: [
      k('六', 'ろく', '六'), k('七', 'なな しち', '七'), k('八', 'はち', '八'), k('九', 'きゅう く', '九'), k('十', 'じゅう', '十'),
    ] },
    { id: 'week', en: 'Days of the week', ja: '曜日', items: [
      k('日', 'ひ にち', '太陽、日'), k('月', 'つき げつ', '月亮、月份'), k('火', 'ひ か', '火'), k('水', 'みず すい', '水'),
      k('木', 'き もく', '樹'), k('金', 'かね きん', '金、錢'), k('土', 'つち ど', '土'),
    ] },
    { id: 'nature', en: 'Nature', ja: '自然', items: [
      k('山', 'やま', '山'), k('川', 'かわ', '河川'), k('田', 'た', '田'), k('空', 'そら', '天空'), k('雨', 'あめ', '雨'), k('花', 'はな', '花'),
    ] },
    { id: 'body', en: 'People & body', ja: '人と体', items: [
      k('人', 'ひと', '人'), k('口', 'くち', '嘴巴'), k('目', 'め', '眼睛'), k('手', 'て', '手'), k('足', 'あし', '腳'), k('耳', 'みみ', '耳朵'),
    ] },
    { id: 'place', en: 'Size & direction', ja: '大きさと方向', items: [
      k('大', 'だい おお', '大'), k('小', 'しょう ちい', '小'), k('上', 'うえ', '上'), k('下', 'した', '下'),
      k('中', 'なか', '裡面'), k('右', 'みぎ', '右'), k('左', 'ひだり', '左'),
    ] },
    { id: 'family', en: 'Family', ja: '家族', items: [
      k('男', 'おとこ', '男人'), k('女', 'おんな', '女人'), k('子', 'こ', '小孩'), k('父', 'ちち', '爸爸'), k('母', 'はは', '媽媽'), k('友', 'とも', '朋友'),
    ] },
    { id: 'school', en: 'Words: school', ja: '言葉:学校', items: [
      k('学校', 'がっこう', '學校'), k('先生', 'せんせい', '老師'), k('学生', 'がくせい', '學生'),
      k('友達', 'ともだち', '朋友'), k('電車', 'でんしゃ', '電車'), k('日本', 'にほん', '日本'),
    ] },
    { id: 'time', en: 'Words: every day', ja: '言葉:毎日', items: [
      k('今日', 'きょう', '今天'), k('明日', 'あした', '明天'), k('時間', 'じかん', '時間'),
      k('毎日', 'まいにち', '每天'), k('名前', 'なまえ', '名字'), k('天気', 'てんき', '天氣'),
    ] },
    { id: 'life', en: 'Words: daily life', ja: '言葉:生活', items: [
      k('ご飯', 'ごはん', '米飯、餐點'), k('お茶', 'おちゃ', '茶'), k('肉', 'にく', '肉'), k('魚', 'さかな', '魚'),
      k('車', 'くるま', '汽車'), k('本', 'ほん', '書'), k('店', 'みせ', '商店'), k('家', 'いえ', '家'), k('駅', 'えき', '車站'),
    ] },
  ];
  root.KANJI_GROUPS = KANJI_GROUPS;
  if (typeof module !== 'undefined') module.exports = KANJI_GROUPS;
})(globalThis);
