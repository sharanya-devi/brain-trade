const BACKEND_URL = 'http://127.0.0.1:5000';

// Utility: clear all error/success messages
function clearMessages() {
  ['registerError', 'registerSuccess', 'loginError', 'profileResult', 'matchResult', 'sessionMessage', 'certMessage', 'notificationMessage', 'callStatus']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
}

// 🔹 User Profile Loader & Credits updater
async function loadProfile(email) {
  if (!email) return;
  try {
    const res = await fetch(`${BACKEND_URL}/profile/${encodeURIComponent(email)}`);
    const data = await res.json();
    if (res.ok) {
      const creditsBadge = document.getElementById("userCredits");
      if (creditsBadge && data.credits !== undefined) {
        creditsBadge.textContent = data.credits;
      }
      const profileResult = document.getElementById("profileResult");
      if (profileResult) {
        profileResult.innerHTML = `
          <div class="profile-pic"></div>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Skill You Have:</strong> ${data.skill_have}</p>
          <p><strong>Skill You Want:</strong> ${data.skill_want}</p>
          <p><strong>Credits Balance:</strong> ${data.credits}</p>
          ${data.certificates && data.certificates.length ? `<p><strong>Verified Certificates:</strong> ${data.certificates.length}</p>` : ''}
        `;
      }
    }
  } catch (err) {
    console.error("Failed to fetch profile:", err);
  }
}

// 🔹 Navigation & UI Initialization
document.addEventListener("DOMContentLoaded", () => {
  const email = sessionStorage.getItem("userEmail");

  // Protect dashboard: redirect to index.html if not logged in
  const isDashboard = window.location.pathname.includes("dashboard.html");
  if (isDashboard && !email) {
    window.location.href = "index.html";
    return;
  }

  if (email) {
    const fieldsToFill = ["user1_email", "notif_email", "cert_email", "profile_email"];
    fieldsToFill.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = email;
    });
    loadProfile(email);
  }

  // Dashboard Section Switching
  const navMatch = document.getElementById("nav-match");
  const navSchedule = document.getElementById("nav-schedule");
  const navNotifications = document.getElementById("nav-notifications");
  const viewProfileLink = document.getElementById("view-profile-link");
  const navUploadCert = document.getElementById("nav-upload-cert");
  const profileIcon = document.getElementById("profile-icon");
  const profileDropdown = document.getElementById("profile-dropdown");
  const logoutLink = document.getElementById("logout-link");

  function showSection(sectionId) {
    const sections = document.querySelectorAll("main section");
    sections.forEach(sec => sec.classList.remove("active"));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active");
    if (profileDropdown) profileDropdown.classList.add("hidden");
  }

  if (navMatch) navMatch.addEventListener("click", () => showSection("matchSection"));
  if (navSchedule) navSchedule.addEventListener("click", () => showSection("sessionSection"));
  
  if (navNotifications) {
    navNotifications.addEventListener("click", () => {
      showSection("notificationSection");
      const notifForm = document.getElementById("notificationForm");
      if (notifForm) notifForm.dispatchEvent(new Event("submit"));
    });
  }

  if (viewProfileLink) {
    viewProfileLink.addEventListener("click", (e) => {
      e.preventDefault();
      showSection("profileSection");
      if (email) loadProfile(email);
    });
  }

  if (navUploadCert) {
    navUploadCert.addEventListener("click", (e) => {
      e.preventDefault();
      showSection("certSection");
    });
  }

  if (profileIcon && profileDropdown) {
    profileIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.add("hidden");
      }
    });
  }

  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.removeItem("userEmail");
      window.location.href = "index.html";
    });
  }
});

// Helper for scheduling directly from match list
window.scheduleWith = function(partnerEmail) {
  const sections = document.querySelectorAll("main section");
  sections.forEach(sec => sec.classList.remove("active"));
  const target = document.getElementById("sessionSection");
  if (target) target.classList.add("active");
  const pInput = document.getElementById("user2_email");
  if (pInput) {
    pInput.value = partnerEmail;
    pInput.focus();
  }
};

// 🔹 Match Finding
const matchForm = document.getElementById("matchForm");
if (matchForm) {
  matchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    const skill_have = document.getElementById("match_have").value.trim();
    const skill_want = document.getElementById("match_want").value.trim();
    const resultBox = document.getElementById("matchResult");

    resultBox.innerHTML = "Searching for matching skill partners...";

    try {
      const res = await fetch(`${BACKEND_URL}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill_have, skill_want })
      });
      const data = await res.json();
      if (res.ok) {
        if (!data.matches || data.matches.length === 0) {
          resultBox.innerHTML = "<p>No matching users found right now. Try searching for different skills or check back soon!</p>";
        } else {
          resultBox.innerHTML = data.matches.map(m => `
            <div class="notification-item">
              <h3 style="margin-top:0;">${m.name}</h3>
              <p><strong>Offers:</strong> ${m.skill_have}</p>
              <p><strong>Wants:</strong> ${m.skill_want}</p>
              <p><strong>Email:</strong> ${m.email}</p>
              <button onclick="scheduleWith('${m.email}')">Schedule Session With ${m.name.split(' ')[0]}</button>
            </div>
          `).join('');
        }
      } else {
        resultBox.textContent = data.error || "Matching failed.";
      }
    } catch {
      resultBox.textContent = "Network error: Unable to reach server.";
    }
  });
}

// 🔹 View Profile Form Refresh
const profileForm = document.getElementById("profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("profile_email").value;
    loadProfile(email);
  });
}

// 🔹 Schedule Session
const sessionForm = document.getElementById("sessionForm");
if (sessionForm) {
  sessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    const user1_email = document.getElementById("user1_email").value.trim();
    const user2_email = document.getElementById("user2_email").value.trim();
    const datetime = document.getElementById("datetime").value;
    const sessionMsg = document.getElementById("sessionMessage");

    try {
      const res = await fetch(`${BACKEND_URL}/schedule-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user1_email, user2_email, datetime })
      });
      const data = await res.json();
      if (res.ok) {
        sessionMsg.style.color = "green";
        sessionMsg.textContent = `${data.message}! (Room ID: ${data.room_id})`;
      } else {
        sessionMsg.style.color = "red";
        sessionMsg.textContent = data.error || "Scheduling failed.";
      }
    } catch {
      sessionMsg.style.color = "red";
      sessionMsg.textContent = "Network error: Unable to connect to server.";
    }
  });
}

// 🔹 Certificate Upload
const certForm = document.getElementById("certForm");
if (certForm) {
  certForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    const email = document.getElementById("cert_email").value.trim();
    const fileInput = document.getElementById("certificate");
    const certMsg = document.getElementById("certMessage");

    if (!fileInput.files || !fileInput.files[0]) {
      certMsg.textContent = "Please select a certificate file.";
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("certificate", fileInput.files[0]);

    try {
      const res = await fetch(`${BACKEND_URL}/upload-certificate`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        certMsg.style.color = "green";
        certMsg.textContent = data.message;
        fileInput.value = "";
        loadProfile(email);
      } else {
        certMsg.style.color = "red";
        certMsg.textContent = data.error || "Upload failed.";
      }
    } catch {
      certMsg.style.color = "red";
      certMsg.textContent = "Network error during upload.";
    }
  });
}

// 🔹 Notifications (accept/reject session)
const notificationForm = document.getElementById("notificationForm");
if (notificationForm) {
  notificationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    const email = document.getElementById("notif_email").value.trim();
    const container = document.getElementById("notificationMessage");

    try {
      const res = await fetch(`${BACKEND_URL}/get-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        if (!data.notifications || data.notifications.length === 0) {
          container.textContent = "No notifications found.";
          return;
        }

        container.innerHTML = data.notifications.map(n => {
          const fromEmail = n.from_email || n.user1_email || "Someone";
          const timeStamp = n.created_at || "Recently";
          const isPending = n.type === "session_request";
          const hasRoom = n.room_id;

          return `
            <div class="notification-item" data-id="${n._id}">
              <p><strong>Message:</strong> ${n.message || 'Session notification'}</p>
              <p><strong>From:</strong> ${fromEmail}</p>
              <p><strong>Received:</strong> ${new Date(timeStamp).toLocaleString()}</p>
              ${isPending ? `
                <button class="accept-btn" onclick="respondNotification('${n._id}', true)">Accept Session</button>
                <button class="reject-btn" onclick="respondNotification('${n._id}', false)">Decline</button>
              ` : ''}
              ${hasRoom ? `
                <a href="videocall.html?room=${encodeURIComponent(n.room_id)}" class="nav-btn" style="text-decoration:none; display:inline-block; margin-top:8px;">Join Video Call</a>
              ` : ''}
            </div>
          `;
        }).join('');
      } else {
        container.textContent = data.error || "Failed to load notifications.";
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      container.textContent = "Network error: Unable to reach server.";
    }
  });
}

// 🔹 Respond to Notification
window.respondNotification = async function(id, accept) {
  try {
    const res = await fetch(`${BACKEND_URL}/respond-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accepted: accept })
    });
    const data = await res.json();

    if (res.ok) {
      alert(data.message || (accept ? "Session accepted." : "Session rejected."));
      if (accept && data.room_id) {
        window.location.href = `videocall.html?room=${encodeURIComponent(data.room_id)}`;
      } else {
        const notifForm = document.getElementById("notificationForm");
        if (notifForm) notifForm.dispatchEvent(new Event("submit"));
      }
    } else {
      alert(data.error || "Failed to respond to notification.");
    }
  } catch (err) {
    console.error("Error responding to notification:", err);
    alert("Network error.");
  }
};


