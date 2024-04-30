let currentSortField = 'title';
let currentSortOrder = '0';
let passwordVisible = false;
let itemsState = [];
let currentSortState = 0;

document.addEventListener('DOMContentLoaded', function() {
    const accountButton = document.querySelector('.account-btn');
    const sortArrow = document.getElementById('sort-arrow');
    const addItemButton = document.querySelector('.add-item-button');
    const addItemModal = document.getElementById('addItemModal');
    const addItemForm = document.getElementById('addItemForm');
    const closeModal = document.querySelector('.close');
    const modalContent = document.querySelector('.modal-content');
    const searchInput = document.getElementById('searchInput');



    function toggleDropdown() {
        const dropdownContent = document.querySelector('.dropdown-content');
        const isHidden = dropdownContent.getAttribute('aria-hidden') === 'true';
        dropdownContent.classList.toggle('show');
        dropdownContent.setAttribute('aria-hidden', String(!isHidden));
    }

    accountButton.addEventListener('click', function(event) {
        toggleDropdown();
        event.stopPropagation();
    });

    window.addEventListener('click', function(event) {
        const dropdownContent = document.querySelector('.dropdown-content');
        if (dropdownContent.classList.contains('show')) {
            dropdownContent.classList.remove('show');
            dropdownContent.setAttribute('aria-hidden', 'true');
        }
    });

    document.querySelector('.dropdown-content').addEventListener('click', function(event) {
        event.stopPropagation();
    });

    sortArrow.addEventListener('click', function() {
        currentSortState = (currentSortState + 1) % 3;
        if (currentSortState === 1) {
            currentSortField = 'title';
            currentSortOrder = 'asc';
            sortArrow.innerHTML = '▼';
        } else if (currentSortState === 2) {
            currentSortField = 'title';
            currentSortOrder = 'desc';
            sortArrow.innerHTML = '▲';
        } else {
            currentSortField = 'title';
            currentSortOrder = '0';
            sortArrow.innerHTML = '&#9656;'; 
        }
        fetchItemsAndUpdateUI(); 
    });

    searchInput.addEventListener('input', function() {
        fetchItemsAndUpdateUI(this.value.trim().toLowerCase());
    });

    addItemButton.addEventListener('click', function() {
        addItemModal.style.display = 'block';
    });


    closeModal.addEventListener('click', function() {
        addItemModal.style.display = 'none';
    });

    

    modalContent.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    window.addEventListener('click', function(event) {
        if (event.target === addItemModal) {
            addItemModal.style.display = 'none';
        }
    });

    fetch('/getUserEmail')
    .then(response => {
        if (!response.ok) {
            throw new Error('Could not fetch user email');
        }
        return response.json();
    })
    .then(data => {
        document.querySelector('.settings-popup-value').textContent = data.email;
    })
    .catch(error => console.error('Error:', error));

    fetchItemsAndUpdateUI();
});

async function fetchItemsAndUpdateUI(searchTerm = '') {
    let url = `/getItems?sortField=${currentSortState === 0 ? 'lastUsed' : currentSortField}&sortOrder=${currentSortState === 0 ? 'desc' : currentSortOrder}`;
    
    try {
        const response = await fetch(url);
        let items = await response.json();

        if (response.ok) {
            itemsState = items;
            if (searchTerm) {
                items = items.filter(item => item.title.toLowerCase().includes(searchTerm) || item.username.toLowerCase().includes(searchTerm));
            }
            renderItems(items);
        } else {
            throw new Error('An error occurred while fetching items');
        }
    } catch (error) {
        console.error('Error fetching items:', error);
    }
}

async function addItem(title, website, username, password) {
    const capitalizedTitle = capitalizeFirstLetter(title);
    try {
        const response = await fetch('/addItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: capitalizedTitle, website, username, password })
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Item added:', data);
            document.getElementById('addItemModal').style.display = 'none';
            document.getElementById('addItemForm').reset();
            await fetch('/updateLastUsed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: data.item._id })
            });
            fetchItemsAndUpdateUI();
        } else {
            throw new Error(data.message || 'An error occurred');
        }
    } catch (error) {
        console.error('Error adding item:', error);
    }
}

async function decryptPassword(itemId) {
    try {
        const response = await fetch('/decryptPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
        });

        if (!response.ok) {
            throw new Error(`Failed to decrypt password. Server responded with status: ${response.status}`);
        }

        await fetch('/updateLastUsed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
        });

        const { decryptedPassword } = await response.json();
        await navigator.clipboard.writeText(decryptedPassword);
        alert('Password copied to clipboard!');
        const lastUsedElement = document.getElementById(`last-used-${itemId}`);
        if (lastUsedElement) {
            lastUsedElement.textContent = 'Last Used: Just now';
        }
    } catch (error) {
        console.error('Failed to decrypt or copy password:', error);
        alert('Failed to decrypt or copy password. Check console for details.');
    }
    fetchItemsAndUpdateUI();
}

async function getDecryptedPassword(itemId) {
    try {
        const response = await fetch('/decryptPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
        });

        if (!response.ok) {
            throw new Error(`Failed to decrypt password. Server responded with status: ${response.status}`);
        }

        const { decryptedPassword } = await response.json();
        return decryptedPassword;
    } catch (error) {
        console.error('Failed to decrypt password:', error);
        throw error;
    }
}

async function deleteItem(itemId) {
    try {
        const response = await fetch('/deleteItem', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
        });
        if (response.ok) {
            fetchItemsAndUpdateUI();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
}

function renderItems(items) {
    const itemsListContainer = document.querySelector('.items-list');
    itemsListContainer.innerHTML = '';

    items.forEach(item => {
        const lastUsedText = getLastUsedText(new Date(item.lastUsed));
        const itemElement = document.createElement('div');
        itemElement.className = 'item';
        itemElement.innerHTML = `
            <div class="item-details">
                <h2 class="item-title">${item.title}</h2>
                <p class="item-username">${item.username}</p>
                <p class="item-last-used" id="last-used-${item._id}">${lastUsedText}</p>
            </div>
            <div class="item-actions">
                <button class="copy-item-button" onclick="decryptPassword('${item._id}')">Copy</button>
                <button class="edit-item-button" onclick="openEditItemModal('${item._id}')">Edit Item</button>
                <button class="delete-item-button" onclick="deleteItem('${item._id}')">Delete Item</button>
            </div>
        `;
        itemsListContainer.appendChild(itemElement);
        updateLastUsedText(item._id, new Date(item.lastUsed));
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function updateLastUsedText(itemId, lastUsedDate) {
    const lastUsedElement = document.getElementById(`last-used-${itemId}`);
    if (lastUsedElement) {
        lastUsedElement.textContent = `Last Used: ${getTimeAgo(lastUsedDate)}`;
    }
    const updateTime = () => {
        const now = new Date();
        const diff = Math.round((now - lastUsedDate) / 1000);
        let text = '';
        if (diff < 60) {
            text = 'Just now';
        } else if (diff < 3600) {
            text = `${Math.round(diff / 60)} minute(s) ago`;
        } else if (diff < 86400) {
            text = `${Math.round(diff / 3600)} hour(s) ago`;
        } else {
            text = `${Math.round(diff / 86400)} day(s) ago`;
        }
        lastUsedElement.textContent = `Last Used: ${text}`;
    };
    updateTime();
    setInterval(updateTime, 60000);
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const diffMinutes = Math.floor(diff / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    return `${diffMinutes} minutes ago`;
}

async function fetchItemDetails(itemId) {
    const response = await fetch(`/getItemDetails/${itemId}`, { method: 'GET' });
    if (response.ok) {
        const item = await response.json();
        return item;
    } else {
        throw new Error('Failed to fetch item details');
    }
}

function openEditItemModal(itemId) {
    const item = itemsState.find(item => item._id === itemId);
    if (item) {
        document.getElementById('editItemModal').style.display = 'block';
        document.getElementById('edit-title').value = item.title;
        document.getElementById('edit-website').value = item.website;
        document.getElementById('edit-username').value = item.username;
        document.getElementById('editItemForm').dataset.itemId = item._id;

        getDecryptedPassword(item._id).then(decryptedPassword => {
            document.getElementById('edit-password').value = decryptedPassword;
        }).catch(error => {
            console.error('Failed to decrypt password:', error);
        });
    } else {
        console.error('Item not found');
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('edit-password');
    if (passwordVisible) {
        passwordInput.type = 'password';
        passwordVisible = false;
    } else {
        passwordInput.type = 'text';
        passwordVisible = true;
    }
}

function getLastUsedText(lastUsedDate) {
    const now = new Date();
    const diffMs = now - lastUsedDate;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (diffSec < 60) return "Last Used: Just now";
    else if (diffMin >= 60 && diffMin <= 61) return `Last Used: ${diffMin} a minute ago`;
    else if (diffMin < 60) return `Last Used: ${diffMin} minutes ago`;
    else if (diffHr < 24) return `Last Used: ${diffHr} hour(s) ago`;
    else if (diffDay < 7) return `Last Used: ${diffDay} day(s) ago`;
    else return lastUsedDate.toLocaleDateString();
}

document.getElementById('editItemForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const itemId = this.dataset.itemId;
    const title = document.getElementById('edit-title').value;
    const website = document.getElementById('edit-website').value;
    const username = document.getElementById('edit-username').value;
    const password = document.getElementById('edit-password').value;

    try {
        const response = await fetch('/updateItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, title, website, username, password })
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Item updated:', data);
            await fetch('/updateLastUsed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId })
              });
            document.getElementById('editItemModal').style.display = 'none';
            fetchItemsAndUpdateUI();
        } else {
            throw new Error(data.message || 'An error occurred during the update');
        }
    } catch (error) {
        console.error('Error updating item:', error);
    }
});

document.getElementById('addItemForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const website = document.getElementById('website').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    addItem(title, website, username, password);
});

document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value;
    fetchItemsAndUpdateUI(searchTerm);
});

document.getElementById('settingsButton').onclick = function() {
    document.getElementById('settingsPopup').style.display = 'block';
}

document.getElementsByClassName('settings-popup-close')[0].onclick = function() {
    document.getElementById('settingsPopup').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === document.getElementById('settingsPopup')) {
        document.getElementById('settingsPopup').style.display = 'none';
    }
}

document.getElementById('changeEmailBtn').addEventListener('click', function() {
    var settingsContent = document.querySelectorAll('.settings-popup-item');
    settingsContent.forEach(function(item) {
        item.style.display = 'none';
    });
    document.getElementById('authSection').style.display = 'block';
    sendAuthCode();
});

document.getElementById('changePasswordBtn').addEventListener('click', function() {
    var settingsContent = document.querySelectorAll('.settings-popup-item');
    settingsContent.forEach(function(item) {
        item.style.display = 'none';
    });
    document.getElementById('authSectionPassword').style.display = 'block';
    sendAuthCodePassword();
});

document.getElementById('verifyCodeBtn').addEventListener('click', function() {
    var code = document.getElementById('authCode').value;
    verifyAuthCode(code);
});

document.getElementById('verifyCodeBtnPassword').addEventListener('click', function() {
    var code = document.getElementById('authCodePassword').value;
    verifyAuthCodePassword(code);
});

function sendAuthCode() {
    fetch('/sendAuthCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: document.querySelector('.settings-popup-value').textContent })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        console.log('Auth code sent to email!');
    })
    .catch(error => console.error('Failed to send auth code:', error));
}

function sendAuthCodePassword() {
    fetch('/sendAuthCodePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: document.querySelector('.settings-popup-value').textContent })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        console.log('Auth code sent to email!');
    })
    .catch(error => console.error('Failed to send auth code:', error));
}

function verifyAuthCode(code) {
    fetch('/verifyAuthCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Code verified:', data.message);
            document.getElementById('authSection').style.display = 'none';
            showEmailUpdateForm();
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => console.error('Failed to verify auth code:', error));
}

function verifyAuthCodePassword(code) {
    fetch('/verifyAuthCodePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Auth code verified:', data.message);
            document.getElementById('authSectionPassword').style.display = 'none';
            showPasswordUpdateForm();
        } else {
            alert('Failed to verify auth code: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Failed to verify auth code for password:', error);
        alert('Failed to verify auth code. Please check the console for more details.');
    });
}

function showEmailUpdateForm() {
    fetch('/getUserEmail')
    .then(response => {
        if (!response.ok) {
            throw new Error('Could not fetch user email');
        }
        return response.json();
    })
    .then(data => {
        const settingsPopupContent = document.querySelector('.settings-popup-content');
        const emailUpdateHTML = `
            <div id="emailUpdateSection" class="email-update-section">
                <div class="settings-popup-item">
                    <label for="currentEmail" class="settings-popup-label">Current Email:</label>
                    <input type="email" id="currentEmail" value="${data.email}" disabled class="settings-popup-input">
                </div>
                <div class="settings-popup-item">
                    <label for="newEmail" class="settings-popup-label">New Email:</label>
                    <input type="email" id="newEmail" placeholder="Enter New Email" class="settings-popup-input">
                </div>
                <div class="settings-popup-item">
                    <label for="confirmNewEmail" class="settings-popup-label">Re-Enter New Email:</label>
                    <input type="email" id="confirmNewEmail" placeholder="Confirm New Email" class="settings-popup-input">
                </div>
                <button id="confirmEmailChangeBtn" class="settings-popup-button small-button">Confirm Email Change</button>
            </div>
        `;
        settingsPopupContent.innerHTML = emailUpdateHTML;
        document.getElementById('confirmEmailChangeBtn').addEventListener('click', confirmEmailChange);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function confirmEmailChange() {
    const newEmail = document.getElementById('newEmail').value;
    const confirmNewEmail = document.getElementById('confirmNewEmail').value;

    if(newEmail === confirmNewEmail) {
        fetch('/updateEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newEmail: newEmail })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Email updated successfully:', data.message);
                document.getElementById('settingsPopup').style.display = 'none';
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Failed to update email:', error);
        });
    } else {
        console.error('New emails do not match.');
    }
}

function showPasswordUpdateForm() {
    const emailUpdateSection = document.getElementById('emailUpdateSection');
    if (emailUpdateSection) emailUpdateSection.style.display = 'none';

    const passwordUpdateHTML = `
        <div id="passwordUpdateSection" class="password-update-section">
            <div class="settings-popup-item">
                <label for="newPassword" class="settings-popup-label">New Password:</label>
                <input type="password" id="newPassword" placeholder="Enter New Password" class="settings-popup-input">
            </div>
            <div class="settings-popup-item">
                <label for="confirmNewPassword" class="settings-popup-label">Confirm New Password:</label>
                <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" class="settings-popup-input">
            </div>
            <button id="confirmPasswordChangeBtn" class="settings-popup-button small-button">Confirm Password Change</button>
        </div>
    `;

    const settingsPopupContent = document.querySelector('.settings-popup-content');
    const authSection = document.getElementById('authSection');
    if (authSection) authSection.style.display = 'none';

    settingsPopupContent.insertAdjacentHTML('beforeend', passwordUpdateHTML);

    document.getElementById('confirmPasswordChangeBtn').addEventListener('click', confirmPasswordChange);
}

function confirmPasswordChange() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword === confirmNewPassword) {
        fetch('/updatePassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: newPassword })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Password updated successfully:', data.message);
                document.getElementById('settingsPopup').style.display = 'none';
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Failed to update password:', error);
        });
    } else {
        console.error('New passwords do not match.');
    }
}