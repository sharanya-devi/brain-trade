// --- UI shifting logic ---
const navRegister = document.getElementById('navRegister');
const navLogin = document.getElementById('navLogin');
const titleSection = document.getElementById('titleSection');
const formSide = document.getElementById('formSide');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');

function showForm(type) {
  // Move title to left and show form section
  titleSection.classList.add('shifted');
  formSide.classList.add('active');

  // Toggle between register/login form
  if (type === 'register') {
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  } else {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  }

  // Clear any previous messages
  clearMessages();
}

// Event listeners
navRegister.addEventListener('click', () => showForm('register'));
navLogin.addEventListener('click', () => showForm('login'));

function clearMessages() {
  const registerError = document.getElementById('registerError');
  const registerSuccess = document.getElementById('registerSuccess');
  const loginError = document.getElementById('loginError');

  if (registerError) registerError.textContent = '';
  if (registerSuccess) registerSuccess.textContent = '';
  if (loginError) loginError.textContent = '';
}

// --- Register button logic ---
document.getElementById('registerBtn').addEventListener('click', async () => {
  clearMessages();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const skill_have = document.getElementById('regSkillHave').value.trim();
  const skill_want = document.getElementById('regSkillWant').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !skill_have || !skill_want || !password) {
    document.getElementById('registerError').textContent = 'Please fill all fields.';
    return;
  }

  try {
    const res = await fetch('http://127.0.0.1:5000/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, skill_have, skill_want, password })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('registerSuccess').textContent = 'Registered successfully! You can now login.';
      // Clear form
      document.getElementById('regName').value = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regSkillHave').value = '';
      document.getElementById('regSkillWant').value = '';
      document.getElementById('regPassword').value = '';
    } else {
      document.getElementById('registerError').textContent = data.error || 'Registration failed.';
    }
  } catch (err) {
    document.getElementById('registerError').textContent = 'Network error: Unable to reach server.';
  }
});

// --- Login button logic ---
document.getElementById('loginBtn').addEventListener('click', async () => {
  clearMessages();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    document.getElementById('loginError').textContent = 'Please fill both fields.';
    return;
  }

  try {
    const res = await fetch('http://127.0.0.1:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      sessionStorage.setItem('userEmail', email);
      window.location.href = 'dashboard.html';
    } else {
      document.getElementById('loginError').textContent = data.error || 'Login failed.';
    }
  } catch (err) {
    document.getElementById('loginError').textContent = 'Network error: Unable to reach server.';
  }
});

