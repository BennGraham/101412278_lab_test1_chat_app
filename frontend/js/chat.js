document.addEventListener("DOMContentLoaded", () => {
  const socket = io({
    auth: {
      token: localStorage.getItem("token"),
    },
  });
  const roomTabs = document.getElementById("roomTabs");
  const chatArea = document.getElementById("chatArea");
  const messages = document.getElementById("messages");
  const messageForm = document.getElementById("messageForm");
  const messageInput = document.getElementById("messageInput");
  let currentRoom = null;

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) {
    window.location.href = "/view/login.html";
    return;
  }

  roomTabs.addEventListener("click", (e) => {
    const tabButton = e.target.closest(".nav-link");
    if (!tabButton) return;

    const room = tabButton.dataset.room;
    if (currentRoom === room) {
      leaveRoom(room);
      tabButton.classList.remove("active");
    } else {
      if (currentRoom) {
        leaveRoom(currentRoom);
      }
      joinRoom(room);
      document.querySelectorAll(".nav-link").forEach((tab) => {
        tab.classList.remove("active");
      });
      tabButton.classList.add("active");
    }
  });

  function joinRoom(room) {
    currentRoom = room;
    socket.emit("joinRoom", room);
    chatArea.classList.remove("d-none");
    messages.innerHTML = "";
  }

  function leaveRoom(room) {
    socket.emit("leaveRoom", room);
    chatArea.classList.add("d-none");
    messages.innerHTML = "";
    currentRoom = null;
  }

  socket.on("previousMessages", (previousMessages) => {
    messages.innerHTML = "";
    previousMessages.forEach((msg) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = "mb-2";

      const usernameSpan = document.createElement("span");
      const isCurrentUser = msg.from_user._id === userId;
      usernameSpan.className = isCurrentUser ? "text-primary" : "text-dark";
      usernameSpan.textContent = `${msg.from_user.username}: `;

      const messageText = document.createElement("span");
      messageText.className = "text-dark";
      messageText.textContent = msg.message;

      messageDiv.appendChild(usernameSpan);
      messageDiv.appendChild(messageText);
      messages.appendChild(messageDiv);
    });
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on("message", ({ user, text, userId: messageUserId }) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = "mb-2";

    if (user.toLowerCase() === "system") {
      messageDiv.className = "mb-2 text-danger";
      messageDiv.textContent = `${user}: ${text}`;
    } else {
      const usernameSpan = document.createElement("span");
      const isCurrentUser = messageUserId === userId;
      usernameSpan.className = isCurrentUser ? "text-primary" : "text-dark";
      usernameSpan.textContent = `${user}: `;

      const messageText = document.createElement("span");
      messageText.className = "text-dark";
      messageText.textContent = text;

      messageDiv.appendChild(usernameSpan);
      messageDiv.appendChild(messageText);
    }

    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  });

  let typingTimeout;

  messageInput.addEventListener("input", () => {
    if (currentRoom) {
      const hasText = messageInput.value.trim().length > 0;

      if (hasText) {
        socket.emit("typing", { room: currentRoom });
      } else {
        socket.emit("stopTyping", { room: currentRoom });
      }

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    }
  });

  socket.on("userTyping", ({ user }) => {
    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator text-muted fst-italic mb-2";
    typingDiv.textContent = `${user} is typing...`;
    typingDiv.dataset.user = user;

    // REMEMBER THIS - add user data to indicator
    const existingIndicator = messages.querySelector(
      `.typing-indicator[data-user="${user}"]`
    );
    if (existingIndicator) {
      existingIndicator.remove();
    }

    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on("userStoppedTyping", ({ user }) => {
    const typingIndicator = messages.querySelector(
      `.typing-indicator[data-user="${user}"]`
    );
    if (typingIndicator) {
      typingIndicator.remove();
    }
  });

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message || !currentRoom) return;

    socket.emit("chatMessage", {
      room: currentRoom,
      message,
      userId,
    });
    messageInput.value = "";
  });

  const logoutBtn = document.getElementById("logout-button");

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "/view/login.html";
  });
});
