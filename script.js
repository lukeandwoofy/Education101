// script.js

// TODO: Replace with your own Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let currentGroup = null;

// Screens and elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const chatArea = document.getElementById('chat-area');
const groupList = document.getElementById('group-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginError = document.getElementById('login-error');
const createGroupBtn = document.getElementById('create-group-btn');
const joinGroupBtn = document.getElementById('join-group-btn');
const createModal = document.getElementById('create-group-modal');
const joinModal = document.getElementById('join-group-modal');
const groupNameInput = document.getElementById('group-name');
const customCodeInput = document.getElementById('custom-code');
const generateRandomBtn = document.getElementById('generate-random-btn');
const groupCodeP = document.getElementById('group-code');
const createConfirm = document.getElementById('create-group-confirm');
const createError = document.getElementById('create-error');
const joinCodeInput = document.getElementById('join-code');
const joinConfirm = document.getElementById('join-group-confirm');
const joinError = document.getElementById('join-error');
const groupTitle = document.getElementById('group-title');
const closeModals = document.querySelectorAll('.close-modal');

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        loadUserGroups();
    } else {
        loginScreen.classList.remove('hidden');
        mainScreen.classList.add('hidden');
    }
});

// Login
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password).catch(err => {
        loginError.textContent = err.message;
    });
});

// Register
registerBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password).catch(err => {
        loginError.textContent = err.message;
    });
});

// Load user's groups
function loadUserGroups() {
    const userGroupsRef = db.ref(`users/${currentUser.uid}/groups`);
    userGroupsRef.on('value', snapshot => {
        groupList.innerHTML = '';
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const groupId = child.key;
                const groupName = child.val().name;
                const li = document.createElement('li');
                li.textContent = groupName;
                li.dataset.groupId = groupId;
                li.addEventListener('click', () => openGroup(groupId, groupName));
                groupList.appendChild(li);
            });
        }
    });
}

// Open a group chat
function openGroup(groupId, groupName) {
    currentGroup = groupId;
    groupTitle.textContent = groupName;
    chatArea.classList.remove('hidden');
    messagesDiv.innerHTML = '';
    const messagesRef = db.ref(`groups/${groupId}/messages`);
    messagesRef.on('child_added', snapshot => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.classList.add('message');
        div.classList.add(msg.uid === currentUser.uid ? 'sent' : 'received');
        div.textContent = `${msg.name}: ${msg.text}`;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// Send message
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text && currentGroup) {
        const messagesRef = db.ref(`groups/${currentGroup}/messages`);
        messagesRef.push({
            uid: currentUser.uid,
            name: currentUser.email.split('@')[0], // Simple name from email
            text: text,
            timestamp: Date.now()
        });
        messageInput.value = '';
    }
});

// Create group modal
createGroupBtn.addEventListener('click', () => createModal.classList.remove('hidden'));
joinGroupBtn.addEventListener('click', () => joinModal.classList.remove('hidden'));

closeModals.forEach(btn => {
    btn.addEventListener('click', () => {
        createModal.classList.add('hidden');
        joinModal.classList.add('hidden');
        createError.textContent = '';
        joinError.textContent = '';
        groupCodeP.textContent = '';
        customCodeInput.value = '';
        groupNameInput.value = '';
        joinCodeInput.value = '';
    });
});

// Generate random code
generateRandomBtn.addEventListener('click', () => {
    const randomCode = Math.random().toString(36).substring(2, 10); // Simple random 8-char code
    groupCodeP.textContent = `Code: ${randomCode}`;
    customCodeInput.value = randomCode; // Set to custom for creation
});

// Create group
createConfirm.addEventListener('click', () => {
    const name = groupNameInput.value.trim();
    const code = customCodeInput.value.trim() || groupCodeP.textContent.split(': ')[1];
    if (!name || !code) {
        createError.textContent = 'Name and code required';
        return;
    }
    // Check if code exists
    db.ref('group_codes/' + code).once('value').then(snapshot => {
        if (snapshot.exists()) {
            createError.textContent = 'Code already in use';
        } else {
            // Create group
            const groupRef = db.ref('groups').push();
            const groupId = groupRef.key;
            groupRef.set({
                name: name,
                code: code,
                createdBy: currentUser.uid
            });
            // Map code to groupId
            db.ref('group_codes/' + code).set(groupId);
            // Add to user's groups
            db.ref(`users/${currentUser.uid}/groups/${groupId}`).set({ name: name });
            createModal.classList.add('hidden');
        }
    });
});

// Join group
joinConfirm.addEventListener('click', () => {
    const code = joinCodeInput.value.trim();
    if (!code) {
        joinError.textContent = 'Code required';
        return;
    }
    db.ref('group_codes/' + code).once('value').then(snapshot => {
        if (snapshot.exists()) {
            const groupId = snapshot.val();
            db.ref(`groups/${groupId}`).once('value').then(groupSnap => {
                const groupName = groupSnap.val().name;
                // Add to user's groups if not already
                db.ref(`users/${currentUser.uid}/groups/${groupId}`).set({ name: groupName });
                joinModal.classList.add('hidden');
            });
        } else {
            joinError.textContent = 'Invalid code';
        }
    });
});
