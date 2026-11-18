/**
 * Liberaturs Black Friday Banner
 * Non-intrusive, can be toggled by removing the script tag
 * Loads only on homepage and collection pages
 */
(function() {
  'use strict';
  if (window.__liberatursBFLoaded) return;
  window.__liberatursBFLoaded = true;

  const END_DATE = new Date('2026-11-28T23:59:59-08:00');
  const now = new Date();
  if (now > END_DATE) return;

  const style = document.createElement('style');
  style.textContent = `
    .lb-bf-banner {
      background: #1a1a1a;
      color: #fff;
      text-align: center;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.3px;
      position: relative;
      z-index: 9999;
    }
    .lb-bf-banner a {
      color: #f5a623;
      text-decoration: underline;
      margin-left: 8px;
    }
    .lb-bf-banner .lb-bf-close {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #aaa;
      font-size: 18px;
      cursor: pointer;
    }
    .lb-bf-hero {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #fff;
      padding: 48px 20px;
      text-align: center;
      margin: 0;
    }
    .lb-bf-hero h2 {
      font-size: 28px;
      margin: 0 0 8px;
      font-weight: 700;
    }
    .lb-bf-hero p {
      margin: 0 0 16px;
      opacity: 0.9;
    }
    .lb-bf-hero .lb-bf-cta {
      display: inline-block;
      background: #f5a623;
      color: #1a1a1a;
      padding: 12px 28px;
      text-decoration: none;
      font-weight: 600;
      border-radius: 2px;
    }
    @media (max-width: 600px) {
      .lb-bf-hero h2 { font-size: 22px; }
      .lb-bf-hero { padding: 32px 16px; }
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.className = 'lb-bf-banner';
  banner.innerHTML = `
    Black Friday: Free Shipping on All Orders of 2+ Items
    <a href="/collections/jackets-coats">Shop Outerwear</a>
    <button class="lb-bf-close" aria-label="Close">&times;</button>
  `;
  banner.querySelector('.lb-bf-close').onclick = () => {
    banner.remove();
    sessionStorage.setItem('lb-bf-banner-closed', '1');
  };
  if (!sessionStorage.getItem('lb-bf-banner-closed')) {
    const header = document.querySelector('header') || document.body;
    header.parentNode.insertBefore(banner, header);
  }

  if (location.pathname === '/' || location.pathname === '') {
    const hero = document.createElement('div');
    hero.className = 'lb-bf-hero';
    hero.innerHTML = `
      <h2>Black Friday Outerwear Drop</h2>
      <p>Free Shipping on 2+ Items · Ends Nov 28</p>
      <a class="lb-bf-cta" href="/collections/jackets-coats">Shop the Edit</a>
    `;
    const main = document.querySelector('main') || document.querySelector('#MainContent') || document.body;
    const firstSection = main.querySelector('section, .shopify-section, [class*="section"]') || main.firstElementChild;
    if (firstSection) {
      firstSection.parentNode.insertBefore(hero, firstSection);
    } else {
      main.prepend(hero);
    }
  }
})();
