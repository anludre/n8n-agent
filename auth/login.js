// auth/login.js
const { chromium } = require('playwright');

(async () => {
  const N8N_URL = process.env.N8N_URL || 'https://n8n.aicontenthub.ru';
  const USER = process.env.N8N_USERNAME;
  const PASS = process.env.N8N_PASSWORD;

  if (!USER || !PASS) {
    console.error('Missing N8N_USERNAME or N8N_PASSWORD env vars.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1) открываем главную
  await page.goto(N8N_URL, { waitUntil: 'domcontentloaded' });

  // 2) если уже залогинены — просто сохраняем state
  const loggedIn = await page.locator("text=/New Workflow|Create Workflow|Add Node/i").first().isVisible().catch(() => false);
  if (loggedIn) {
    await context.storageState({ path: 'auth/state.json' });
    await browser.close();
    console.log('Already logged in. Saved state.json');
    process.exit(0);
  }

  // 3) находим форму логина (подстрой селекторы под свой n8n, если нужно)
  // Частые варианты:
  // - input[name="email"] / input[type="email"]
  // - input[name="password"] / input[type="password"]
  // - текст кнопки: "Sign in" / "Log in" / "Войти"
  const emailSel = 'input[name="email"], input[type="email"]';
  const passSel  = 'input[name="password"], input[type="password"]';
  const btnSelAny = 'button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Войти")';

  await page.waitForSelector(emailSel, { timeout: 15000 });
  await page.fill(emailSel, USER);
  await page.fill(passSel, PASS);

  // иногда кнопка логина disabled до ввода — ждём, кликаем
  await page.waitForSelector(btnSelAny, { timeout: 15000 });
  await page.click(btnSelAny);

  // 4) ждём признак успешного входа
  await page.waitForSelector('text=/New Workflow|Create Workflow|Add Node/i', { timeout: 20000 });

  // 5) сохраняем cookie/localStorage
  await context.storageState({ path: 'auth/state.json' });
  await browser.close();
  console.log('Login succeeded. Saved auth/state.json');
})();


