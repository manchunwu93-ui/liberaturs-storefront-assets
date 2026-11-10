/**
 * Liberaturs — 日本市场尺码表日文翻译脚本 v1.1 (2026-11-10)
 *
 * 原理：尺码表应用只有一份内容（不支持按语言分内容，已逆向其 admin/前端代码确认）。
 * 本脚本仅在 URL 含 /ja-jp/ 的日本站页面运行，把尺码表弹窗内的
 * 表头/标题/备注/测量说明段落替换为日文。欧美页面完全不受影响。
 *
 * 匹配策略：
 *  1. 表格单元格(th/td)与短文本节点：规范化空白/连字符后做全词精确匹配（HEADERS 表）
 *  2. 富文本段落：对包含测量说明的容器做句子级正则替换（SENTENCES 表，按序执行）
 * 用 MutationObserver 覆盖点击弹窗后动态注入的 DOM。
 */
(function () {
  if (!/\/ja-jp\//.test(location.pathname)) return;
  if (window.__libJpSizeChart) return;
  window.__libJpSizeChart = true;

  /* ---------- 工具 ---------- */
  function norm(s) {
    return s
      .replace(/[‐‑‒–—]/g, '-') // 各种连字符统一
      .replace(/[ ​-​]/g, ' ')
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
    var out = html.replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');
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
})();
