# brain-trade
A peer-to-peer skill exchange platform built with Flask, MongoDB, JavaScript, Node.js, Socket.IO and WebRTC.

The platform allows users to offer skills they already know and find other users who can teach them the skills they want to learn. Users can find complementary skill matches, schedule sessions, receive notifications, and connect through one-on-one video calls.


## 🚀 Features

- 👤 **User Registration & Login**
  - Create an account with name, email, password, skills offered, and skills wanted.
  - User authentication using Flask and MongoDB.

- 🔄 **Skill Matching**
  - Users specify the skill they can teach and the skill they want to learn.
  - Matches users with complementary skill requirements.

- 📅 **Session Scheduling**
  - Send session requests to matched users.
  - Select a preferred date and time.
  - Accept or reject session requests.

- 🔔 **Notifications**
  - Receive notifications for session requests and updates.
  - Manage incoming requests from the dashboard.

- 🎥 **Video Calling**
  - One-on-one browser-based video communication.
  - WebRTC is used for peer-to-peer media communication.
  - Socket.IO handles WebRTC signaling.

- 📊 **User Dashboard**
  - View profile information.
  - Find skill matches.
  - Manage sessions.
  - View notifications.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Frontend structure |
| CSS3 | Styling and UI |
| JavaScript | Frontend logic and API integration |
| Python | Backend development |
| Flask | REST API |
| Flask-CORS | Cross-origin requests |
| MongoDB | Database |
| PyMongo | MongoDB integration |
| Node.js | Signaling server |
| Socket.IO | Real-time signaling |
| WebRTC | Peer-to-peer video communication |

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │        Frontend         │
                    │  HTML / CSS / JavaScript│
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                 REST API                 WebSocket
                    │                         │
                    ▼                         ▼
          ┌─────────────────┐      ┌─────────────────┐
          │   Flask API     │      │ Socket.IO Server│
          │   Port 5000     │      │    Port 3000    │
          └────────┬────────┘      └────────┬────────┘
                   │                        │
                   ▼                        ▼
          ┌─────────────────┐        ┌──────────────┐
          │     MongoDB     │        │    WebRTC    │
          │ Users / Sessions│        │ Video Calls  │
          │ / Notifications │        └──────────────┘
          └─────────────────┘

⚙️ Installation & Setup
Prerequisites

Make sure the following are installed:

Python 3.x
Node.js
MongoDB
Git
Modern web browser
1. Clone the Repository
git clone https://github.com/sharanya-devi/brain-trade.git
cd brain-trade
2. Configure MongoDB

Create a .env file inside the backend folder:

MONGO_URI=mongodb://localhost:27017/braintrade
3. Install Python Dependencies
cd backend
pip install -r requirements.txt
4. Start Flask Backend
python app.py

Flask runs on:

http://127.0.0.1:5000
5. Install Node Dependencies

Inside the backend folder:

npm install
6. Start Socket.IO Server
node signaling-server.js

The signaling server runs on:

http://localhost:3000
7. Start the Frontend

Open:

frontend/index.html

You can also use VS Code Live Server to run the frontend.

🎯 Future Enhancements
🔐 Password hashing and improved authentication
⭐ User ratings and reviews
💬 Real-time text messaging
🔎 Advanced skill search and filtering
📈 Skill progress tracking
📱 Improved mobile responsiveness
☁️ Cloud deployment
📌 Project Status

Working Project

Brain Trade currently provides the core functionality for user authentication, skill matching, session scheduling, notifications, and one-on-one video communication.

👩‍💻 Developer

Sharanya Devi

B.Tech – Computer Science & Engineering
