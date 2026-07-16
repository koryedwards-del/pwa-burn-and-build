import {
  deleteContact,
  fetchContacts,
  getContactsAdminKey,
  persistContactsAdminKey,
  revokeContactAccess,
  saveContact,
} from './contactsApi.js';

const store = {
  contacts: [],
  error: '',
  loading: true,
  newEmail: '',
  newName: '',
};

function render() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="contacts-page">
      <div class="contacts-header">
        <h1>Admin — Contact list</h1>
        <p>Creating a diet adds the contact. Access unlocks only after Stripe checkout — use a Stripe coupon for complimentary access.</p>
      </div>
      <div class="contacts-panel">
        ${store.error ? `<div class="contacts-error">${store.error}</div>` : ''}
        <div class="contacts-toolbar">
          <input class="ob-input" type="email" name="newEmail" placeholder="Email" value="${store.newEmail}" />
          <input class="ob-input" type="text" name="newName" placeholder="Name" value="${store.newName}" />
          <button type="button" class="btn-primary" data-add-contact>Add contact</button>
        </div>
        <div class="contacts-table-wrap">
          ${store.loading ? '<div class="contacts-empty">Loading contacts…</div>' : renderTable()}
        </div>
        <p class="contacts-meta">Paid status reflects Stripe checkout only. Revoke clears mistaken or test access.</p>
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
      <td>${contact.burnAndBuild ? '<span class="contacts-paid">Paid</span>' : '—'}</td>
      <td>${contact.programCount || 0}</td>
      <td class="actions">
        ${contact.burnAndBuild ? `<button type="button" class="btn-secondary" data-revoke-access="${contact.email}">Revoke access</button>` : ''}
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
          <th>Access</th>
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

  document.querySelector('[data-add-contact]')?.addEventListener('click', addContact);

  document.querySelectorAll('[data-revoke-access]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.revokeAccess;
      if (!window.confirm(`Revoke Burn & Build access for ${email}? They will need to complete Stripe checkout again.`)) return;
      store.error = '';
      const result = await revokeContactAccess(email);
      if (!result.ok) {
        store.error = result.message;
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
  });

  if (!result.ok) {
    store.error = result.message;
    render();
    return;
  }

  store.newEmail = '';
  store.newName = '';
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
