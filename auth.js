const API_BASE = '/cloud';

const tabs = Array.from(document.querySelectorAll('.auth-tab'));
const forms = {
  login: document.getElementById('loginForm'),
  register: document.getElementById('registerForm')
};
const messageBox = document.getElementById('authMessage');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.classList.contains('active')) return;
    tabs.forEach((btn) => {
      btn.classList.toggle('active', btn === tab);
      btn.setAttribute('aria-selected', btn === tab ? 'true' : 'false');
    });
    const target = tab.dataset.target;
    Object.entries(forms).forEach(([name, form]) => {
      if (name === target) {
        form.classList.remove('hidden');
      } else {
        form.classList.add('hidden');
      }
    });
    clearMessage();
  });
});

forms.login.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const payload = {
    email: form.email.value.trim(),
    password: form.password.value
  };

  setLoading(form, true);
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || '登录失败，请稍后重试');
    }

    showMessage('success', '登录成功，正在跳转...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
  } catch (error) {
    showMessage('error', error.message);
  } finally {
    setLoading(form, false);
  }
});

forms.register.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const payload = {
    email: form.email.value.trim(),
    password: form.password.value,
    inviteCode: form.inviteCode.value.trim()
  };

  setLoading(form, true);
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || '注册失败，请稍后重试');
    }

    showMessage('success', data?.message || '注册成功，请登录');
    forms.register.reset();

    // switch to login tab
    tabs.find((btn) => btn.dataset.target === 'login')?.click();
  } catch (error) {
    showMessage('error', error.message);
  } finally {
    setLoading(form, false);
  }
});

function setLoading(form, isLoading) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isLoading;
  button.dataset.original = button.dataset.original || button.textContent;
  button.textContent = isLoading ? '处理中...' : button.dataset.original;
  form.querySelectorAll('input').forEach((input) => {
    input.disabled = isLoading;
  });
}

function showMessage(type, text) {
  messageBox.textContent = text;
  messageBox.hidden = false;
  messageBox.classList.remove('success', 'error');
  if (type === 'success') {
    messageBox.classList.add('success');
  } else {
    messageBox.classList.add('error');
  }
}

function clearMessage() {
  messageBox.hidden = true;
  messageBox.textContent = '';
  messageBox.classList.remove('success', 'error');
}
