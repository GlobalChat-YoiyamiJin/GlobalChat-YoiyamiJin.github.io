// firebase-config.js からサービスインスタンスをインポート
import { auth, db, storage, messagesRef } from './firebase-config.js';
// モジュール形式のFirestoreとAuth関数をインポート
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-storage.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";

let currentUserId = null;

// HTML要素を取得
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const userEmailSpan = document.getElementById('user-email');
const authMessage = document.getElementById('auth-message');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const messagesDiv = document.getElementById('messages');

// ====================================================================
// A. 認証機能 (ログイン/新規登録/ログアウト)
// ====================================================================

function updateUI(user) {
    if (user) {
        currentUserId = user.uid;
        userEmailSpan.textContent = user.email;
        authContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        authMessage.textContent = '';
        startMessageListener(); // ログインしたらメッセージ監視を開始
    } else {
        currentUserId = null;
        userEmailSpan.textContent = '';
        authContainer.style.display = 'block';
        chatContainer.style.display = 'none';
        authMessage.textContent = 'ログインまたは新規登録を行ってください。';
        
        messagesDiv.innerHTML = '';
        if (unsubscribeListener) {
            unsubscribeListener(); // メッセージ監視を停止
            unsubscribeListener = null;
        }
    }
}

// Firebaseの認証状態が変化したときに実行
onAuthStateChanged(auth, updateUI);

// 新規会員登録
window.signUp = function() {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || password.length < 6) {
        authMessage.textContent = '有効なメールアドレスと6文字以上のパスワードを入力してください。';
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            authMessage.textContent = '新規登録成功！自動でログインしました。';
        })
        .catch((error) => {
            authMessage.textContent = `登録エラー: ${error.message}`;
        });
}

// ログイン
window.signIn = function() {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            authMessage.textContent = 'ログイン成功！';
        })
        .catch((error) => {
            authMessage.textContent = `ログインエラー: ${error.message}`;
        });
}

// ログアウト
window.signOutUser = function() {
    signOut(auth).catch((error) => {
        console.error("ログアウトエラー:", error);
    });
}

// ====================================================================
// B. メッセージの送受信、リアルタイム表示
// ====================================================================

// テキストメッセージの送信
window.sendMessage = function() {
    if (!currentUserId) return;
    
    const messageText = messageInput.value.trim();
    if (messageText === '') return;

    addDoc(messagesRef, { // addDocを使用
        text: messageText,
        userId: currentUserId,
        timestamp: serverTimestamp(), // serverTimestampを使用
        type: 'text'
    })
    .then(() => {
        messageInput.value = '';
    })
    .catch((error) => {
        console.error("メッセージ送信エラー: ", error);
    });
}


// ファイル（画像/動画）のアップロードと送信
window.uploadFile = function() {
    if (!currentUserId) return;
    
    const file = fileInput.files[0];
    if (!file) return;

    // 1. Storageにファイルをアップロード
    const filePath = `chats/${currentUserId}/${Date.now()}_${file.name}`;
    const fileRef = storageRef(storage, filePath); // storageRefを使用
    
    uploadBytes(fileRef, file).then((snapshot) => { // uploadBytesを使用
        return getDownloadURL(snapshot.ref); // getDownloadURLを使用
    }).then((downloadURL) => {
        // 2. FirestoreにURLをメッセージとして保存
        const fileType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 'file';

        addDoc(messagesRef, { // addDocを使用
            text: file.name, 
            userId: currentUserId,
            timestamp: serverTimestamp(),
            fileURL: downloadURL,
            type: fileType
        });
        fileInput.value = '';
    }).catch((error) => {
        console.error("ファイルアップロードエラー: ", error);
        alert("ファイルのアップロードに失敗しました。");
    });
}


let unsubscribeListener = null;

// リアルタイムでのメッセージ監視を開始
function startMessageListener() {
    if (unsubscribeListener) return;

    // Firestoreのデータをリアルタイムで監視
    const messagesQuery = query(messagesRef, orderBy('timestamp')); // queryとorderByを使用
    
    unsubscribeListener = onSnapshot(messagesQuery, (snapshot) => { // onSnapshotを使用
        snapshot.docChanges().forEach((change) => {
            const message = { id: change.doc.id, ...change.doc.data() };
            
            if (change.type === 'added') {
                displayMessage(message);
            }
            if (change.type === 'removed') {
                removeMessage(message.id);
            }
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// メッセージをHTMLに追加する
function displayMessage(message) {
    if (document.getElementById('msg-' + message.id)) return;

    const msgElement = document.createElement('div');
    msgElement.id = 'msg-' + message.id;
    msgElement.className = 'message-item';
    
    if (message.userId === currentUserId) {
        msgElement.classList.add('my-message');
    } else {
        msgElement.classList.add('other-message');
    }

    let content = '';

    if (message.type === 'text') {
        content = `<p>${message.text}</p>`;
    } else if (message.type === 'image' && message.fileURL) {
        content = `<img src="${message.fileURL}" alt="画像">`;
    } else if (message.type === 'video' && message.fileURL) {
        content = `<video controls src="${message.fileURL}"></video>`;
    }
    
    // 送信取り消しボタンの追加（自分のメッセージのみ）
    if (message.userId === currentUserId) {
        content += `<span class="delete-btn" onclick="deleteMessage('${message.id}')">✕</span>`;
    }
    
    msgElement.innerHTML = content;
    messagesDiv.appendChild(msgElement);
}

// HTML要素からメッセージを削除する
function removeMessage(messageId) {
    const element = document.getElementById('msg-' + messageId);
    if (element) {
        element.remove();
    }
}

// ====================================================================
// C. 送信取り消し機能
// ====================================================================

window.deleteMessage = function(messageId) {
    if (confirm('本当にこのメッセージを取り消し、完全に削除しますか？')) {
        deleteDoc(doc(db, 'messages', messageId)).then(() => { // deleteDocとdocを使用
            console.log("メッセージが正常に取り消されました。");
        }).catch((error) => {
            console.error("メッセージの取り消しエラー: ", error);
            alert("メッセージの削除に失敗しました。これはあなたのメッセージではない可能性があります。");
        });
    }
}

// Enterキーでの送信を可能にする
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        window.sendMessage();
    }
});

// ====================================================================
// G. 外部プロバイダ機能 (Google)
// ====================================================================

window.signInWithGoogle = function() {
    // 1. Google 認証プロバイダを作成
    const provider = new GoogleAuthProvider();
    
    // 2. ポップアップでサインイン処理を実行
    signInWithPopup(auth, provider)
        .then((result) => {
            // ログイン成功。updateUIが自動で画面を切り替えます。
            console.log("Googleログイン成功:", result.user.email);
            authMessage.textContent = 'Googleアカウントでログインしました！';
        })
        .catch((error) => {
            // ログイン失敗
            authMessage.textContent = `Googleログインエラー: ${error.message}`;
            console.error("Googleサインインエラー:", error);
        });
}