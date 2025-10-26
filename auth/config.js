// Shared config for Playwright auth flows
module.exports = {
  selectors: {
    email: 'input[name="email"], input[type="email"]',
    password: 'input[name="password"], input[type="password"]',
    loginButton: 'button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Войти")',
    editorReady: 'text=/New Workflow|Create Workflow|Add Node/i',
    workflowsListReady: 'text=/Workflows|New Workflow|Create Workflow|Add Node/i'
  },
  timeouts: {
    short: 5000,
    normal: 15000,
    long: 30000
  },
  retry: {
    attempts: 2,
    backoffMs: 1000
  }
};


