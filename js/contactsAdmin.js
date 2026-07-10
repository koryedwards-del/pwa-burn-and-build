import {
  deleteContact,
  fetchContacts,
  getContactsAdminKey,
  persistContactsAdminKey,
  saveContact,
  setContactBurnAndBuild,
} from './contactsApi.js';

const store = {
  contacts: [],
  error: '',
  loading: true,
  newEmail: '',
  newName: '',
  newBurnAndBuild: false,
};

function render() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="contacts-page">
      <div class="contacts-header">
        <h1>Admin — Contact list</h1>
        <p>One list for all apps. Creating a diet adds the contact and checks B&amp;B. You can also toggle B&amp;B here.</p>
      </div>
      <div class="contacts-panel">
        ${store.error ? `<div class="contacts-error">${store.error}</div>` : ''}
        <div class="contacts-toolbar">
          <input class="ob-input" type="email" name="newEmail" placeholder="Email" value="${store.newEmail}" />
          <input class="ob-input" type="text" name="newName" placeholder="Name" value="${store.newName}" />
          <label class="contacts-checkbox">
            <input type="checkbox" name="newBurnAndBuild" ${store.newBurnAndBuild ? 'checked' : ''} />
            B&amp;B
          </label>
          <button type="button" class="btn-primary" data-add-contact>Add contact</button>
        </div>
        <div class="contacts-table-wrap">
          ${store.loading ? '<div class="contacts-empty">Loading contacts…</div>' : renderTable()}
        </div>
        <p class="contacts-meta">Same email everywhere — not two accounts. Diet creation checks B&amp;B automatically.</p>
      </div>
    </div>`;

  bindEvents();
}

function renderTable() {
  if (!store.contacts.length) {
    return '<div class="contacts-empty">No contacts yet.</div>';
  }

  const rows = store.contacts.map((contact) => `
    <tr>
      <td class="email">${contact.email}</td>
      <td>${contact.displayName || '—'}</td>
      <td>
        <label class="contacts-checkbox">
          <input type="checkbox" data-toggle-bnb="${contact.email}" ${contact.burnAndBuild ? 'checked' : ''} />
          B&amp;B
        </label>
      </td>
      <td>${contact.programCount || 0}</td>
      <td class="actions">
        <button type="button" class="btn-secondary" data-delete-contact="${contact.email}">Delete</button>
      </td>
    </tr>
  `).join('');

  return `
    <table class="contacts-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>B&amp;B</th>
          <th>Plans</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function bindEvents() {
  document.querySelector('[name="newEmail"]')?.addEventListener('input', (e) => {
    store.newEmail = e.target.value;
  });
  document.querySelector('[name="newName"]')?.addEventListener('input', (e) => {
    store.newName = e.target.value;
  });
  document.querySelector('[name="newBurnAndBuild"]')?.addEventListener('change', (e) => {
    store.newBurnAndBuild = e.target.checked;
  });

  document.querySelector('[data-add-contact]')?.addEventListener('click', addContact);

  document.querySelectorAll('[data-toggle-bnb]').forEach((input) => {
    input.addEventListener('change', async () => {
      store.error = '';
      const result = await setContactBurnAndBuild(input.dataset.toggleBnb, input.checked);
      if (!result.ok) {
        store.error = result.message;
        input.checked = !input.checked;
        render();
        return;
      }
      await loadContacts();
    });
  });

  document.querySelectorAll('[data-delete-contact]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm(`Delete ${btn.dataset.deleteContact}?`)) return;
      store.error = '';
      const result = await deleteContact(btn.dataset.deleteContact);
      if (!result.ok) {
        store.error = result.message;
        render();
        return;
      }
      await loadContacts();
    });
  });
}

async function addContact() {
  store.error = '';
  const email = store.newEmail.trim();
  if (!email) {
    store.error = 'Enter an email address.';
    render();
    return;
  }

  const result = await saveContact({
    email,
    displayName: store.newName.trim(),
    burnAndBuild: store.newBurnAndBuild,
  });

  if (!result.ok) {
    store.error = result.message;
    render();
    return;
  }

  store.newEmail = '';
  store.newName = '';
  store.newBurnAndBuild = false;
  await loadContacts();
}

async function loadContacts() {
  store.loading = true;
  store.error = '';
  render();

  const result = await fetchContacts();
  store.loading = false;

  if (!result.ok) {
    store.error = result.message;
    if (result.message === 'Admin key required.' && !getContactsAdminKey()) {
      const key = window.prompt('Enter contacts admin key');
      if (key) {
        persistContactsAdminKey(key);
        await loadContacts();
        return;
      }
    }
    render();
    return;
  }

  store.contacts = result.contacts || [];
  render();
}

loadContacts();
