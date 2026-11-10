/**
 * Liberaturs — 日本市场尺码表日文翻译脚本 v2.1 (2026-11-10)
 *
 * 背景：尺码表应用只有一份内容（不支持按语言分内容，已逆向其 admin/前端代码确认），
 * 且应用按选项「显示名」匹配 Size 属性（options.find(o => o.name === chart.attributeName)），
 * 日本站选项被翻译成「サイズ」后匹配失败，应用不注入 Size Guide 按钮（实测英文站正常、日本站无按钮）。
 *
 * v2 方案：在日本站语言路径（/ja/、/ja-jp/）上自给自足——
 *  1. 复用尺码表应用的公开前台 API 拉取商品尺码表数据
 *  2. 应用没注入按钮时，自己渲染一个同款「サイズガイド」按钮（复用官方按钮 CSS class，外观原生）
 *  3. 点击后自渲染弹窗（样式自带，官方 modal CSS 在懒加载 chunk 里不能依赖），内容用内置词表实时翻成日文
 * 欧美页面完全不受影响（路径门 + 无数据时不注入）。
 *
 * 翻译匹配策略：
 *  1. 表头/标题：规范化空白/连字符后精确匹配（HEADERS 表）
 *  2. 富文本段落：句子级正则替换（SENTENCES 表，按序执行）
 * MutationObserver 同时覆盖应用自己渲染的弹窗（若官方按钮未来恢复）。
 */
(function () {
  if (!/\/(ja|ja-jp)\//.test(location.pathname)) return; // 日本站语言路径（ja-jp 会 301 到 ja）
  if (window.__libJpSizeChart) return;
  window.__libJpSizeChart = true;

  /* ---------- 工具 ---------- */
  function norm(s) {
    return s
      .replace(/[‐‑‒–—]/g, '-') // 各种连字符统一
      .replace(/[   ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------- 1. 表头 / 标题（精确匹配） ---------- */
  var HEADERS = {
    // 尺码列
    'LETTER SIZE': 'レターサイズ',
    'SIZE': 'サイズ',
    'JP SIZE': '日本サイズ',
    'US-UK SIZE': 'US・UKサイズ',
    'US-UK-AU-NZ SIZE': 'US・UK・AU・NZサイズ',
    'DE-NL-EU SIZE': 'DE・NL・EUサイズ',
    'FR-ES-PT SIZE': 'FR・ES・PTサイズ',
    'BE-FR-ES-PT SIZE': 'BE・FR・ES・PTサイズ',
    // 适映尺寸
    'FITS CHEST (INCH)': '適応胸囲（インチ）',
    'FITS CHEST (CM)': '適応胸囲（cm）',
    'FITS WAIST (INCH)': '適応ウエスト（インチ）',
    'FITS WAIST (CM)': '適応ウエスト（cm）',
    // 部位
    'Shoulder': '肩幅',
    'Shoulder Width': '肩幅',
    'Chest (Pit to Pit)': '胸幅（脇下）',
    'Body Length': '着丈',
    'Sleeve Length': '袖丈',
    'Sleeve': '袖丈',
    'Raglan Sleeve': 'ラグラン袖丈',
    'Waist': 'ウエスト',
    'Waist (Flat Width)': 'ウエスト',
    'Waist (Flat Width, Relaxed-Stretched)': 'ウエスト（自然時〜最大伸長）',
    'Waist (Flat Half)': 'ウエスト（半分）',
    'Waist (Unstretched)': 'ウエスト（自然状態）',
    'Waist (Stretched)': 'ウエスト（最大伸長）',
    'Hip': 'ヒップ',
    'Hip (Flat Width)': 'ヒップ',
    'Thigh': 'もも幅',
    'Thigh (Flat Width)': 'もも幅',
    'Inseam': '股下',
    'Outseam Length': '総丈',
    'Leg Opening': '裾幅',
    'Cuff Width': '袖口幅',
    'Hem': '裾幅',
    'Hem Width': '裾幅',
    'Pant Length': 'パンツ丈',
    'Front Rise': '前股上',
    'Back Rise': '後ろ股上',
    'Neck': '首回り',
    'Neck Circumference': '首回り',
    'Collar Height': '襟の高さ',
    'Front Length': '前身頃',
    'Front Body Length': '前身頃',
    'Back Length': '後ろ身頃',
    'Back Body Length': '後ろ身頃',
    'Length': '着丈',
    // 标题 / 按钮
    'International Size Conversion & Body Fit Guide': '国際サイズ換算＆体型ガイド',
    'Exact Garment Flat Measurements (Laid Flat)': '実寸（平置き採寸）',
    'Exact Garment Flat Measurements (Laid Flat）': '実寸（平置き採寸）',
    'Size Exact Garment Flat Measurements (Laid Flat)': '実寸（平置き採寸）',
    'Size Chart': 'サイズ表',
    'Fit Info': 'フィット情報',
    'sizechart': 'サイズ表',
    'Tips': 'ヒント',
    'Tips:': 'ヒント'
  };
  var HEADER_KEYS = {};
  Object.keys(HEADERS).forEach(function (k) { HEADER_KEYS[norm(k).toLowerCase()] = HEADERS[k]; });

  /* ---------- 2. 备注 / 段落（正则替换，按序执行） ---------- */
  var SENTENCES = [
    // --- 备注行 ---
    ['1inch = 2\\.54cm', '1インチ＝2.54cm'],
    ['Manual measurement, 0\\.4-1\\.2 variance allowed\\.', '手動測定のため、0.4～1.2の誤差があります。'],
    ['\\*Manual measurement, 0\\.4"-1\\.2" variance allowed\\.', '手動測定のため、0.4～1.2インチの誤差があります。'],
    ['All manual measurements carry a 2[\\u2010\\u2011\\u2012\\u2013\\u2014-]3cm production tolerance,? slight dimensional variance is normal\\.', 'すべて手動測定のため、2～3cmの誤差があります。'],
    ['Manual measurements carry a 2[\\u2010\\u2011\\u2012\\u2013\\u2014-]3cm tolerance\\.', '手動測定のため、2～3cmの誤差があります。'],
    ['All manual measurements carry a 2[\\u2010\\u2011\\u2012\\u2013\\u2014-]3cm production tolerance\\.', 'すべて手動測定のため、2～3cmの誤差があります。'],
    ['ABBREVIATIONS', '国名略号'],
    ['EU=European Union', 'EU＝欧州連合'],
    ['United Kingdom', '英国'],
    ['United States', '米国'],
    ['Germany', 'ドイツ'],
    ['Netherlands', 'オランダ'],
    ['European Union', 'EU'],
    ['Belgium', 'ベルギー'],
    ['France', 'フランス'],
    ['Spain', 'スペイン'],
    ['Portugal', 'ポルトガル'],
    ['Australia', 'オーストラリア'],
    ['New Zealand', 'ニュージーランド'],
    ['Japan(?!\\|)', '日本'],
    ['\\*NOTE: For layering over thick sweaters, size up\\.', '厚手のセーターとの重ね着にはワンサイズアップをおすすめします。'],
    ['\\*NOTE: If you plan to wear thick sweaters or base layers underneath, size up for extra comfort\\.', '厚手のセーターやアンダーレイヤーを着る場合は、ゆとりのためワンサイズアップをおすすめします。'],
    ['\\*NOTE: If you plan to wear thick sweaters or fleece liners underneath, size up for extra comfort\\.', '厚手のセーターやフリースのインナーを着る場合は、ゆとりのためワンサイズアップをおすすめします。'],

    // --- 通用 How to Measure（上衣） ---
    ['How to Measure \\(Garment Laid Flat\\)', '測り方（平置き採寸）'],
    ['All measurements are taken with the garment laid flat on a smooth table or floor\\. For full-zip styles, fully zip the garment before measuring; for button-front styles, fasten all buttons\\. Smooth out any wrinkles to ensure accurate results\\.', 'すべてアイテムを平らな床やテーブルに置いて測定しています。フルジップの商品はファスナーを完全に閉じ、ボタン留めの商品はすべてのボタンを閉じてから測定してください。正確な結果を得るためにシワを伸ばしてください。'],
    ['CHEST \\(PIT TO PIT\\)', '胸幅（脇下）'],
    ['Lay the garment flat with the front facing up\\. Measure straight across the body from one armpit seam to the opposite armpit seam\\. Double this number to get the full chest circumference\\.', '商品を表側が上になるように平置きし、脇下の縫い目から反対側の脇下の縫い目までまっすぐ測ります。この数値を2倍すると胸囲の目安になります。'],
    ['SHOULDER', '肩幅'],
    ['Lay the garment flat with the back facing up\\. Measure straight across the top of the garment from the outer edge of one shoulder seam \\(where the sleeve meets the body\\) to the outer edge of the opposite shoulder seam\\. Do not double\\.', '商品を裏側が上になるように平置きし、袖と身頃がつながる肩の外側の縫い目から反対側までまっすぐ測ります。2倍にはしません。'],
    ['Lay the garment flat with the back facing up\\. Measure straight across the top of the garment from the outer edge of one shoulder seam to the outer edge of the opposite shoulder seam\\. Do not double\\.', '商品を裏側が上になるように平置きし、肩の外側の縫い目から反対側までまっすぐ測ります。2倍にはしません。'],
    ['SLEEVE LENGTH', '袖丈'],
    ['Lay the sleeve fully flat\\. Measure from the top of the shoulder seam \\(shoulder point, where the sleeve meets the shoulder\\) straight down to the bottom edge of the sleeve cuff\\. Do not double\\.', '袖をまっすぐ伸ばして平置きし、肩先（袖と身頃のつなぎ目）から袖口の下端までまっすぐ測ります。2倍にはしません。'],
    ['Lay the sleeve fully flat\\. Measure from the top of the shoulder seam straight down to the bottom edge of the sleeve cuff\\. Do not double\\.', '袖をまっすぐ伸ばして平置きし、肩の縫い目から袖口の下端までまっすぐ測ります。2倍にはしません。'],
    ['BODY LENGTH \\(CENTER BACK\\)', '着丈（後ろ中心）'],
    ['Lay the garment flat with the back facing up\\. Measure from the center of the back neck seam \\(the lowest point of the back collar\\) straight down vertically to the bottom hem of the garment\\. Do not double\\.', '商品を裏側が上になるように平置きし、後ろ襟の中心（襟の一番低い位置）から裾までまっすぐ垂直に測ります。2倍にはしません。'],
    ['Lay the garment flat with the back facing up\\. Measure from the center of the back neck seam straight down vertically to the bottom hem of the garment\\. Do not double\\.', '商品を裏側が上になるように平置きし、後ろ襟の中心から裾までまっすぐ垂直に測ります。2倍にはしません。'],
    ['(?:Tips:? )?Use a soft,? flexible measuring tape for the most accurate results\\.', 'ヒント：正確に測るには柔らかいメジャーをご使用ください。'],
    ['(?:Tips:? )?Use a soft measuring tape for the most accurate results\\.', 'ヒント：正確に測るには柔らかいメジャーをご使用ください。'],
    ['Always compare your measurements to the', '必ず当店のサイズ表の'],
    ['in our size chart \\(do not use your body measurements\\)\\.', '商品の実寸と比較してください（お身体のサイズではありません）。'],
    ['If your measurements fall between two sizes, size up for a more relaxed fit, or size down for a slimmer,? neater fit\\.', 'サイズの間に当てはまる場合、ゆったりめがお好みならワンサイズアップ、すっきりめならワンサイズダウンをおすすめします。'],
    ['For layering styles \\(e\\.g\\. jackets, overshirts\\), we recommend sizing up to accommodate thick inner layers\\.', '重ね着するアウターやオーバーシャツは、厚手のインナーに対応できるようワンサイズアップをおすすめします。'],
    ['Size up if you plan to layer thick inner wear\\.', '厚手のインナーを重ねる場合はワンサイズアップをおすすめします。'],
    ['This is a relaxed fit sweatshirt\\.', 'こちらはリラックスフィットのスウェットシャツです。'],
    ['This is a comfort fit sanforized selvedge jeans\\.', 'こちらは防縮加工を施したセルビッジジーンズのコンフォートフィットです。'],
    ['All measurements are taken with the garment laid flat on a smooth table or floor\\. Smooth out any wrinkles before measuring\\.', 'すべてアイテムを平らな床やテーブルに置いて測定しています。測定前にシワを伸ばしてください。'],
    ['Lay the garment flat with the back facing up\\. Measure from the center of the back neck seam straight down vertically to the bottom hem\\. Do not double\\.', '商品を裏側が上になるように平置きし、後ろ襟の中心から裾までまっすぐ垂直に測ります。2倍にはしません。'],
    ['If your measurements fall between two sizes, size up for a more relaxed fit, or size down for a slimmer fit\\.', 'サイズの間に当てはまる場合、ゆったりめがお好みならワンサイズアップ、すっきりめならワンサイズダウンをおすすめします。'],

    // --- 裤子/短裤 How to Measure（按裤型模板） ---
    ['All measurements are taken with the (wide leg pants|pants|shorts|jeans|sweatpants|vest) laid flat on a smooth table or floor\\. Smooth out any wrinkles before measuring\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ', vest: 'ベスト' }[g] || '商品';
      return 'すべて' + G + 'を平らな床やテーブルに置いて測定しています。測定前にシワを伸ばしてください。';
    }],
    ['Lay the (wide leg pants|pants|shorts|jeans|sweatpants) flat with the front facing up, buttoned and zipped fully closed\\. Measure straight across the top of the waistband from one side seam to the other\\. Double this number to get the full waist circumference\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return G + 'を表側が上になるように平置きし、ボタンとファスナーを完全に閉じた状態で、ウエストバンドの上部を脇の縫い目から反対側までまっすぐ測ります。この数値を2倍するとウエストの目安になります。';
    }],
    ['Lay the sweatpants flat with the front facing up\\. Measure the waistband at its natural relaxed state, then gently stretch to its maximum comfortable tension, record both values\\. Double this number to get the full waist circumference\\.', 'スウェットパンツを表側が上になるように平置きし、ウエストバンドを自然な状態で測り、その後軽く最大まで伸ばして2つの値を記録します。この数値を2倍するとウエストの目安になります。'],
    ['Lay the (wide leg pants|pants|shorts|jeans|sweatpants) flat with the front facing up\\. Measure straight across the widest part of the hip/seat area, typically 3" below the crotch seam, from one side seam to the other\\. Double this number to get the full hip circumference\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return G + 'を表側が上になるように平置きし、股下から約3インチ下のヒップ（お尻周り）の一番広い部分を、脇の縫い目から反対側までまっすぐ測ります。この数値を2倍するとヒップの目安になります。';
    }],
    ['Lay the (wide leg pants|pants|shorts|jeans|sweatpants) flat with one leg fully extended\\. Measure straight across the thigh, 1" below the crotch seam, from the inner seam to the outer seam\\. Double this number to get the full thigh circumference\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return G + 'を片方の脚をまっすぐ伸ばして平置きし、股下から約1インチ下の太ももの部分を、内側の縫い目から外側の縫い目までまっすぐ測ります。この数値を2倍するともも周りの目安になります。';
    }],
    ['Lay the (wide leg pants|pants|shorts|jeans|sweatpants) flat with the front facing up\\. Measure from the top of the waistband straight down to the bottom edge of the leg opening\\. This is the total outseam length of the (wide leg pants|pants|shorts|jeans|sweatpants)\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return G + 'を表側が上になるように平置きし、ウエストバンドの上部から裾の下端までまっすぐ測ります。これが' + G + 'の総丈です。';
    }],
    ['Lay the (wide leg pants|pants|shorts|jeans|sweatpants) flat with one leg fully extended\\. Measure straight across the bottom leg opening from one side to the other\\. Double this number to get the full leg opening circumference\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return G + 'を片方の脚をまっすぐ伸ばして平置きし、裾の開口部を端から端までまっすぐ測ります。この数値を2倍すると裾周りの目安になります。';
    }],
    ['Lay the (pants|jeans) flat with the front facing up\\. Measure from the top center of the waistband straight down to the center of the crotch seam\\.', function (m, g) {
      var G = { pants: 'パンツ', jeans: 'ジーンズ' }[g] || '商品';
      return G + 'を表側が上になるように平置きし、ウエストバンドの中心上部から股の中心の縫い目までまっすぐ測ります。';
    }],
    ['Lay the (pants|jeans) flat with the back facing up\\. Measure from the top center of the waistband straight down to the center of the crotch seam\\.', function (m, g) {
      var G = { pants: 'パンツ', jeans: 'ジーンズ' }[g] || '商品';
      return G + 'を裏側が上になるように平置きし、ウエストバンドの中心上部から股の中心の縫い目までまっすぐ測ります。';
    }],
    ['Lay the vest flat with the front facing up\\. Measure straight across the chest from one armpit seam to the other\\. Double this number to get the full chest circumference\\.', 'ベストを表側が上になるように平置きし、脇下の縫い目から反対側までまっすぐ測ります。この数値を2倍すると胸囲の目安になります。'],
    ['Measure from the center back of the neck, along the raglan seam, to the bottom edge of the armhole\\.', '首の後ろ中心からラグラン線に沿って脇の下端まで測ります。'],
    ['Measure from the highest point of the shoulder \\(near the neck\\) straight down to the bottom hem at the front\\.', '肩の一番高い位置（首元付近）から前身頃の裾までまっすぐ測ります。'],
    ['Measure from the center back neck seam straight down to the bottom hem at the back\\.', '後ろ襟の中心から後ろ身頃の裾までまっすぐ測ります。'],
    ['Tips Use a soft measuring tape for the most accurate results\\. For the best fit, measure a pair of your well-fitting (wide leg pants|pants|shorts|jeans|sweatpants) and compare to the garment measurements above\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return 'ヒント：正確に測るには柔らかいメジャーをご使用ください。最適なフィットのため、いつもお使いの' + G + 'を測って上記の実寸と比較してください。';
    }],
    ['For the best fit, measure a pair of your well-fitting (wide leg pants|pants|shorts|jeans|sweatpants) and compare to the garment measurements above\\.', function (m, g) {
      var G = { 'wide leg pants': 'ワイドパンツ', pants: 'パンツ', shorts: 'ショーツ', jeans: 'ジーンズ', sweatpants: 'スウェットパンツ' }[g] || '商品';
      return '最適なフィットのため、いつもお使いの' + G + 'を測って上記の実寸と比較してください。';
    }],
    ['For the best fit, measure a vest you own that fits well and compare to the garment measurements above\\.', '最適なフィットのため、いつもお使いのベストを測って上記の実寸と比較してください。'],
    ['This is a non-stretch relaxed fit cargo denim shorts\\. Size up 1 size if you prefer a looser fit, or plan to wear with a belt\\.', 'こちらは伸縮性のないリラックスフィットのカーゴデニムショーツです。ゆったりめがお好み、またはベルトで着用したい場合はワンサイズアップをおすすめします。'],
    ['This is an oversized fit down insulated vest with an extended back hem\\. Size down 1 size if you prefer a less voluminous fit\\.', 'こちらはバックヘムが長めのオーバーサイズフィットのダウンベストです。ボリュームを抑えたい場合はワンサイズダウンをおすすめします。'],
    ['This is a comfort fit sanforized selvedge jeans\\. Size up 1 size if you prefer a looser fit, or plan to break in the denim\\. If your measurements fall between sizes, choose the larger size for a more roomy fit\\.', 'こちらは防縮加工を施したセルビッジジーンズのコンフォートフィットです。ゆったりめがお好み、またはデニムを馴らして穿く予定の場合はワンサイズアップをおすすめします。サイズの間に当てはまる場合は、ゆとりのある大きいサイズをお選びください。'],
    ['This is a relaxed fit ([^.]+)\\. Size up 1 size if you prefer a looser fit, or plan to layer underneath\\. If your measurements fall between sizes, choose the larger size for a more roomy fit\\.', function (m, g1) { return 'こちらはリラックスフィットの' + g1 + 'です。ゆったりめがお好み、または重ね着をご希望の場合はワンサイズアップをおすすめします。サイズの間に当てはまる場合は、ゆとりのある大きいサイズをお選びください。'; }],
    ['This is a relaxed fit ([^.]+)\\. Size up 1 size if you prefer a looser fit, or plan to layer underneath\\.', function (m, g1) { return 'こちらはリラックスフィットの' + g1 + 'です。ゆったりめがお好み、または重ね着をご希望の場合はワンサイズアップをおすすめします。'; }],
    ['This is a relaxed fit ([^.]+)\\. Size up 1 size if you prefer a looser fit\\.', function (m, g1) { return 'こちらはリラックスフィットの' + g1 + 'です。ゆったりめがお好みの場合はワンサイズアップをおすすめします。'; }],
    ['This is a relaxed fit ([^.]+)\\. Size up 1 size if you prefer an even roomier fit\\.', function (m, g1) { return 'こちらはリラックスフィットの' + g1 + 'です。さらにゆったりめがお好みの場合はワンサイズアップをおすすめします。'; }],
    ['This is a relaxed fit style\\. Size up 1 size if you prefer a looser fit, or plan to layer underneath\\. If your measurements fall between sizes, choose the larger size for a more roomy fit\\.', 'こちらはリラックスフィットです。ゆったりめがお好み、または重ね着をご希望の場合はワンサイズアップをおすすめします。サイズの間に当てはまる場合は、ゆとりのある大きいサイズをお選びください。'],
    ['If your measurements fall between sizes, choose the larger size for a more roomy fit\\.', 'サイズの間に当てはまる場合は、ゆとりのある大きいサイズをお選びください。'],
    ['If your measurements fall between sizes, choose the larger size for a more comfortable wide leg silhouette\\.', 'サイズの間に当てはまる場合は、ワイドシルエットを快適に着こなせる大きいサイズをお選びください。'],
    ['Size up 1 size if you prefer a looser fit, or plan to break in the denim\\.', 'ゆったりめがお好み、またはデニムを馴らして穿く予定の場合はワンサイズアップをおすすめします。'],
    ['Size up 1 size if you prefer a looser fit, or plan to layer underneath\\.', 'ゆったりめがお好み、または重ね着をご希望の場合はワンサイズアップをおすすめします。'],
    ['Size up 1 size if you prefer a looser fit\\.', 'ゆったりめがお好みの場合はワンサイズアップをおすすめします。'],
    ['Size up 1 size if you prefer an even roomier fit\\.', 'さらにゆったりめがお好みの場合はワンサイズアップをおすすめします。'],

    // --- Fit callouts ---
    ['RELAXED FIT', 'リラックスフィット'],
    ['LOOSE FIT', 'ルーズフィット'],
    ['This style features a relaxed silhouette with extra room through the chest and body\\. If you prefer a slimmer look, we recommend sizing down\\.', '胸と身頃にゆとりのあるリラックスシルエットです。すっきり着こなしたい場合はワンサイズダウンをおすすめします。'],
    ['This style features a relaxed silhouette cut to layer over sweaters and base layers, with room through the chest and body\\. If you prefer a closer fit, we recommend sizing down\\.', 'セーターやインナーの上に重ね着できるよう、胸と身頃にゆとりを持たせたリラックスシルエットです。体に寄せて着たい場合はワンサイズダウンをおすすめします。'],
    ['This style features a relaxed silhouette through the hip and thigh for comfortable movement\\. The waistband is elastic and stretches to fit\\. If you prefer a slimmer look, we recommend sizing down\\.', 'ヒップと太もも周りにゆとりを持たせ、動きやすいリラックスシルエットです。ウエストは伸縮性があります。すっきり着こなしたい場合はワンサイズダウンをおすすめします。'],
    ['This style is cut loose through the chest and body for a generous fit\\. Size down if you prefer a closer look\\.', '胸と身頃にたっぷりゆとりのあるルーズシルエットです。スタンダードに着たい場合はワンサイズダウンをおすすめします。'],
    ['This shirt is cut loose through the chest and body for a generous fit\\. Size down if you prefer a closer look\\.', '胸と身頃にたっぷりゆとりのあるルーズシルエットのシャツです。スタンダードに着たい場合はワンサイズダウンをおすすめします。'],
    ['This style has a relaxed, comfortable fit with extra room through the chest and body\\. If you prefer a slimmer fit, consider sizing down\\.', '胸と身頃にゆとりのある、リラックスして快適なフィットです。すっきり着こなしたい場合はワンサイズダウンを検討してください。']
  ];
  var SENT_RE = SENTENCES.map(function (p) { return [new RegExp(p[0], 'g'), p[1]]; });

  /* ---------- 处理 ---------- */
  var RICH_HINT = /How to Measure|ABBREVIATIONS|1inch = 2\.54|Manual measurement|Manual measurements|production tolerance/;

  function translateTextNode(tn) {
    var v = tn.nodeValue;
    if (!v || !v.trim()) return;
    var key = norm(v).toLowerCase();
    if (HEADER_KEYS[key]) tn.nodeValue = HEADER_KEYS[key];
  }

  function processRich(el) {
    var txt = el.textContent || '';
    if (!RICH_HINT.test(txt)) return;
    if (/[぀-ヿ一-鿿]/.test(txt) && !/How to Measure|ABBREVIATIONS/.test(txt)) return; // 已翻译过
    var html = el.innerHTML;
    // &nbsp;/unicode 空白统一为空格，避免正则不匹配（HTML 渲染本就折叠空白，安全）
    var out = html.replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');
    for (var i = 0; i < SENT_RE.length; i++) {
      out = out.replace(SENT_RE[i][0], SENT_RE[i][1]);
    }
    if (out !== html) el.innerHTML = out;
  }

  function process(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.tagName)) return;

    // 1) 表格单元格精确替换
    var cells = root.tagName === 'TD' || root.tagName === 'TH' ? [root] : root.querySelectorAll ? root.querySelectorAll('td,th') : [];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.childNodes.length === 1 && c.firstChild.nodeType === 3) translateTextNode(c.firstChild);
    }
    // 2) 短标题/按钮/链接精确替换（限制短文本，避免误伤正文）
    if (root.querySelectorAll) {
      var shorts = root.querySelectorAll('h1,h2,h3,h4,h5,h6,button,a,[role="button"],[role="heading"],span,strong,label,div');
      for (var j = 0; j < shorts.length; j++) {
        var el = shorts[j];
        if (el.childNodes.length === 1 && el.firstChild.nodeType === 3 && el.firstChild.nodeValue.trim().length <= 50) {
          translateTextNode(el.firstChild);
        }
      }
      // 3) 富文本段落
      var richtexts = [];
      var all = root.querySelectorAll ? root.querySelectorAll('div,section,article,li,p') : [];
      for (var k = 0; k < all.length; k++) {
        if (RICH_HINT.test(all[k].textContent || '')) richtexts.push(all[k]);
      }
      // 从最内层开始，避免父级替换后子级失效
      for (var m = richtexts.length - 1; m >= 0; m--) processRich(richtexts[m]);
    }
  }

  process(document.body);
  var mo = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var nodes = records[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        process(nodes[j]);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* ================= v2：自渲染「サイズガイド」按钮 + 弹窗 ================= */
  if (!/\/products\//.test(location.pathname)) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function getProductId() {
    try {
      var g = window.__plugin__ruler__product__;
      if (g && g.id) return g.id;
    } catch (e) {}
    try {
      var s = window.SL_State;
      if (s && s.product && s.product.id) return String(s.product.id);
    } catch (e) {}
    return null;
  }

  function findSizeGroup() {
    var groups = document.querySelectorAll('fieldset.variant-picker__group');
    for (var i = 0; i < groups.length; i++) {
      var legend = groups[i].querySelector('.variant-picker__group-label');
      var t = legend ? legend.textContent.trim() : '';
      if (t === 'サイズ' || t === 'Size') return groups[i];
    }
    // 兜底：带 4 个以上选项的组
    for (var j = 0; j < groups.length; j++) {
      if (groups[j].querySelectorAll('.variant-picker__button,label.variant-picker__option').length >= 4) return groups[j];
    }
    return null;
  }

  function fetchChart(pid) {
    return fetch('/api/bff/product-plugin/front/size-chart/query?productId=' + encodeURIComponent(pid), { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = j && j.data && j.data.sizeChartList;
        if (!list || !list.length) return null;
        var charts = [];
        for (var i = 0; i < list.length; i++) {
          try {
            var items = JSON.parse(list[i].content);
            for (var k = 0; k < items.length; k++) charts.push(items[k]);
          } catch (e) {}
        }
        return charts.length ? charts : null;
      })
      .catch(function () { return null; });
  }

  /* 弹窗自带样式（官方 modal CSS 在懒加载 chunk 里，不能依赖） */
  var SG_CSS =
    '#jpSizeGuideModal{position:fixed;inset:0;z-index:1031}' +
    '#jpSizeGuideModal .jp-sg-mask{position:absolute;inset:0;background:rgba(0,0,0,.45)}' +
    '#jpSizeGuideModal .jp-sg-card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;color:#29252c;width:min(720px,92vw);max-height:85vh;display:flex;flex-direction:column;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.2)}' +
    '#jpSizeGuideModal .jp-sg-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #eee;font-weight:600;font-size:16px}' +
    '#jpSizeGuideModal .jp-sg-close{cursor:pointer;line-height:0}' +
    '#jpSizeGuideModal .jp-sg-body{overflow:auto;padding:12px 20px 20px;-webkit-overflow-scrolling:touch}' +
    '#jpSizeGuideModal .jp-sg-chart-title{font-weight:600;margin:14px 0 8px}' +
    '#jpSizeGuideModal .jp-sg-grid{display:flex;overflow-x:auto}' +
    '#jpSizeGuideModal .jp-sg-col{flex:1 1 auto;min-width:72px}' +
    '#jpSizeGuideModal .jp-sg-col:first-child{font-weight:600}' +
    '#jpSizeGuideModal .jp-sg-cell{padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;white-space:nowrap}' +
    '#jpSizeGuideModal .jp-sg-remark{font-size:12px;color:#666;margin-top:10px;white-space:normal;line-height:1.6}';
  function ensureSgCss() {
    if (document.getElementById('jpSgCss')) return;
    var st = document.createElement('style');
    st.id = 'jpSgCss';
    st.textContent = SG_CSS;
    document.head.appendChild(st);
  }

  /* 弹窗：自渲染表格（数据来自官方前台 API，样式自带不依赖官方懒加载 CSS） */
  function buildModal(charts) {
    var bodyHtml = '';
    for (var i = 0; i < charts.length; i++) {
      var c = charts[i];
      var rows = c.sizeChartBody || [];
      var cols = 0, r, q;
      for (r = 0; r < rows.length; r++) { if (rows[r] && rows[r].length > cols) cols = rows[r].length; }
      if (!cols) continue;
      var colHtml = '';
      for (q = 0; q < cols; q++) {
        var cells = '';
        for (r = 0; r < rows.length; r++) {
          var v = rows[r] ? rows[r][q] : '';
          cells += '<div class="jp-sg-cell">' + esc(v) + '</div>';
        }
        colHtml += '<div class="jp-sg-col">' + cells + '</div>';
      }
      bodyHtml += '<div class="jp-sg-chart-title">' + esc(c.sizeChartTitle || '') + '</div>' +
        '<div class="jp-sg-grid">' + colHtml + '</div>';
      if (c.sizeChartRemark) {
        bodyHtml += '<div class="jp-sg-remark">' + esc(c.sizeChartRemark) + '</div>';
      }
    }
    if (!bodyHtml) return null;
    ensureSgCss();
    var wrap = document.createElement('div');
    wrap.id = 'jpSizeGuideModal';
    wrap.innerHTML =
      '<div class="jp-sg-mask"></div>' +
      '<div class="jp-sg-card">' +
      '  <div class="jp-sg-head">' +
      '    <div>サイズ表</div>' +
      '    <div class="jp-sg-close">' +
      '      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.2 4.80005L4.80005 19.2" stroke="currentcolor" stroke-width="1.5"></path><path d="M4.80005 4.79995L19.2001 19.2" stroke="currentcolor" stroke-width="1.5"></path></svg>' +
      '    </div>' +
      '  </div>' +
      '  <div class="jp-sg-body">' + bodyHtml + '</div>' +
      '</div>';
    function close() {
      wrap.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.querySelector('.jp-sg-mask').addEventListener('click', close);
    wrap.querySelector('.jp-sg-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return wrap;
  }

  function injectButton(group, charts) {
    var head = group.querySelector('.variant-picker__group-head');
    if (head && !/ruler-size-title-space-between/.test(head.className)) head.className += ' ruler-size-title-space-between';
    var entry = document.createElement('div');
    entry.className = 'plugin-ruler__entry ruler-direction-bottom ruler-size-chart-btn';
    entry.setAttribute('data-jp-sizeguide', '1');
    entry.innerHTML = '<div class="size-btn" style="color:rgb(0,0,0);cursor:pointer">' +
      '<span class="size-btn__title" style="font-size:16px;text-decoration:underline">サイズガイド</span></div>';
    entry.addEventListener('click', function (ev) {
      ev.preventDefault();
      var old = document.getElementById('jpSizeGuideModal');
      if (old) old.remove();
      var modal = buildModal(charts);
      if (!modal) return;
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
      process(modal); // 表头/备注翻成日文
    });
    (head || group).appendChild(entry);
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (tries > 30) { clearInterval(timer); return; } // 15s 放弃
    var group = findSizeGroup();
    if (!group) return;
    clearInterval(timer);
    var pid = getProductId();
    if (!pid) return;
    // 给官方应用 2s 宽限：若它自己注入了按钮就不用我们补
    setTimeout(function () {
      if (document.querySelector('.plugin-ruler__entry')) return;
      fetchChart(pid).then(function (charts) {
        if (!charts) return;
        if (document.querySelector('.plugin-ruler__entry')) return;
        var g = findSizeGroup();
        if (g) injectButton(g, charts);
      });
    }, 2000);
  }, 500);
})();