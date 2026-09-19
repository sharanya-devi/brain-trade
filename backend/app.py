from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import os
import re
import uuid
from datetime import datetime, timezone

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database connection with fallback for local development
mongo_uri = os.getenv("MONGO_URI")
client = None
db = None

try:
    if not mongo_uri:
        raise ValueError("MONGO_URI not provided")
    # Quick probe to test if MongoDB is reachable and DNS resolves
    test_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
    test_client.admin.command('ping')
    client = test_client
    db = client.get_database()
    print("[SUCCESS] Connected to remote MongoDB successfully!")
except Exception as e:
    print(f"[WARN] Remote MongoDB unavailable ({e}). Using mongomock for local development.")
    import mongomock
    client = mongomock.MongoClient()
    db = client["braintrade"]

users = db["users"]
sessions = db["sessions"]
notifications = db["notifications"]

# Seed sample users if database is empty (helps immediate local testing)
if users.count_documents({}) == 0:
    users.insert_many([
        {
            "name": "Alice Smith",
            "email": "alice@example.com",
            "skill_have": "Python",
            "skill_want": "Graphic Design",
            "password": "password123",
            "credits": 100,
            "certificates": []
        },
        {
            "name": "Bob Jones",
            "email": "bob@example.com",
            "skill_have": "Graphic Design",
            "skill_want": "Python",
            "password": "password123",
            "credits": 100,
            "certificates": []
        }
    ])
    print("[INFO] Seeded initial demo users (alice@example.com and bob@example.com).")

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return jsonify({"status": "running", "message": "Brain Trade Backend is running!"})

@app.route('/add-user', methods=['POST'])
def add_user():
    data = request.json or {}
    required_fields = ['name', 'email', 'skill_have', 'skill_want', 'password']
    if not all(field in data and str(data[field]).strip() for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    email = data['email'].strip().lower()
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409
        
    user_doc = {
        "name": data['name'].strip(),
        "email": email,
        "skill_have": data['skill_have'].strip(),
        "skill_want": data['skill_want'].strip(),
        "password": data['password'],
        "credits": 100,
        "certificates": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    users.insert_one(user_doc)
    return jsonify({"message": "User added!"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    
    user = users.find_one({'email': email})
    if user and user.get('password') == password:
        return jsonify({
            'message': 'Login successful!',
            'user': {
                'name': user.get('name'),
                'email': user.get('email'),
                'credits': user.get('credits', 100)
            }
        }), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/profile/<email>', methods=['GET'])
def get_profile(email):
    email = email.strip().lower()
    user = users.find_one({"email": email}, {"_id": 0, "password": 0})
    if user:
        return jsonify(user), 200
    return jsonify({"error": "User not found"}), 404

@app.route('/match', methods=['POST'])
def match_users():
    data = request.json or {}
    skill_want = data.get("skill_want", "").strip()
    skill_have = data.get("skill_have", "").strip()
    
    if not skill_want or not skill_have:
        return jsonify({"error": "Both skills are required for matching"}), 400

    # Case-insensitive complementary matching
    matches = users.find({
        "skill_have": {"$regex": f"^{re.escape(skill_want)}$", "$options": "i"},
        "skill_want": {"$regex": f"^{re.escape(skill_have)}$", "$options": "i"}
    }, {"password": 0})
    
    match_list = []
    for match in matches:
        match['_id'] = str(match['_id'])
        match_list.append(match)
    return jsonify({"matches": match_list})

@app.route('/schedule-session', methods=['POST'])
def schedule_session():
    data = request.json or {}
    user1 = (data.get("user1_email") or '').strip().lower()
    user2 = (data.get("user2_email") or '').strip().lower()
    time = data.get("datetime")

    if not user1 or not user2 or not time:
        return jsonify({"error": "Missing fields"}), 400

    if user1 == user2:
        return jsonify({"error": "Cannot schedule a session with yourself"}), 400

    if not users.find_one({"email": user1}) or not users.find_one({"email": user2}):
        return jsonify({"error": "User not found"}), 404

    session_id = ObjectId()
    room_id = f"room-{uuid.uuid4().hex[:8]}"
    session_data = {
        "_id": session_id,
        "from_email": user1,
        "to_email": user2,
        "scheduled_time": time,
        "status": "pending",
        "room_id": room_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    sessions.insert_one(session_data)

    notifications.insert_one({
        "user_email": user2,
        "session_id": str(session_id),
        "from_email": user1,
        "type": "session_request",
        "status": "unread",
        "message": f"{user1} requested a session on {time}.",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return jsonify({
        "message": "Session scheduled and notification sent",
        "session_id": str(session_id),
        "room_id": room_id
    }), 201

@app.route('/get-notifications', methods=['POST'])
def get_notifications():
    data = request.json or {}
    email = (data.get("email") or '').strip().lower()
    if not email:
        return jsonify({"error": "Email missing"}), 400

    notifs = notifications.find({"user_email": email})
    notif_list = []
    for n in notifs:
        n['_id'] = str(n['_id'])
        notif_list.append(n)
    return jsonify({"notifications": notif_list})

@app.route('/notifications/<notif_id>', methods=['PATCH'])
def update_notification(notif_id):
    data = request.json or {}
    if "status" not in data:
        return jsonify({"error": "Missing status"}), 400
    try:
        oid = ObjectId(notif_id)
    except Exception:
        oid = notif_id
    result = notifications.update_one({"_id": oid}, {"$set": {"status": data['status']}})
    if result.matched_count == 0:
        return jsonify({"error": "Notification not found"}), 404
    return jsonify({"message": "Notification updated"}), 200

@app.route('/respond-notification', methods=['POST'])
def respond_notification():
    data = request.json or {}
    notif_id = data.get("id")
    accepted = data.get("accepted", False)
    action = "accept" if accepted else "reject"

    if not notif_id:
        return jsonify({"error": "Missing notification ID"}), 400

    try:
        notif = notifications.find_one({"_id": ObjectId(notif_id)})
    except Exception:
        notif = notifications.find_one({"_id": notif_id})

    if not notif:
        return jsonify({"error": "Notification not found"}), 404

    # Mark notification as read
    notifications.update_one({"_id": notif["_id"]}, {"$set": {"status": "read"}})

    session_id = notif.get("session_id")
    room_id = None
    if session_id:
        try:
            s_obj_id = ObjectId(session_id)
        except Exception:
            s_obj_id = session_id
        session = sessions.find_one({"_id": s_obj_id})
        if session:
            room_id = session.get("room_id") or f"room-{uuid.uuid4().hex[:8]}"
            sessions.update_one({"_id": s_obj_id}, {"$set": {"status": action, "room_id": room_id}})
            
            notifications.insert_one({
                "user_email": session['from_email'],
                "session_id": str(session['_id']),
                "from_email": session['to_email'],
                "type": "session_response",
                "status": "unread",
                "message": f"{session['to_email']} has {action}ed your session request.",
                "room_id": room_id if action == "accept" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    return jsonify({
        "message": f"Session {action}ed successfully.",
        "action": action,
        "room_id": room_id
    }), 200

@app.route('/sessions/<session_id>/respond', methods=['POST'])
def respond_session(session_id):
    data = request.json or {}
    action = data.get("action")
    if action not in ["accept", "reject"]:
        return jsonify({"error": "Invalid action"}), 400

    try:
        s_oid = ObjectId(session_id)
    except Exception:
        s_oid = session_id

    session = sessions.find_one({"_id": s_oid})
    if not session:
        return jsonify({"error": "Session not found"}), 404

    room_id = session.get("room_id") or f"room-{uuid.uuid4().hex[:8]}"
    sessions.update_one({"_id": s_oid}, {"$set": {"status": action, "room_id": room_id}})
    notifications.insert_one({
        "user_email": session['from_email'],
        "session_id": str(session['_id']),
        "from_email": session['to_email'],
        "type": "session_response",
        "status": "unread",
        "message": f"{session['to_email']} has {action}ed your session request.",
        "room_id": room_id if action == "accept" else None,
        "created_at": datetime.utcnow().isoformat()
    })

    return jsonify({"message": f"Session {action}ed", "room_id": room_id}), 200

@app.route('/sessions/<email>', methods=['GET'])
def get_sessions(email):
    email = email.strip().lower()
    s_list = sessions.find({"$or": [{"from_email": email}, {"to_email": email}]})
    result = []
    for s in s_list:
        s['_id'] = str(s['_id'])
        result.append(s)
    return jsonify({"sessions": result})

@app.route('/sessions/<session_id>/videoroom', methods=['GET'])
def get_video_room(session_id):
    try:
        s_oid = ObjectId(session_id)
    except Exception:
        s_oid = session_id

    session = sessions.find_one({"_id": s_oid})
    if not session:
        return jsonify({"error": "Session not found"}), 404
    if "room_id" not in session or not session['room_id']:
        room_id = f"room-{uuid.uuid4().hex[:8]}"
        sessions.update_one({"_id": s_oid}, {"$set": {"room_id": room_id}})
    else:
        room_id = session['room_id']
    return jsonify({"room_id": room_id})

@app.route('/get-room-id', methods=['POST'])
def get_room_id():
    data = request.json or {}
    email = (data.get("email") or '').strip().lower()
    if not email:
        return jsonify({"error": "Email missing"}), 400

    # Retrieve latest session with room
    session = sessions.find_one(
        {"$or": [{"from_email": email}, {"to_email": email}], "room_id": {"$exists": True}},
        sort=[("_id", -1)]
    )
    if session and session.get("room_id"):
        return jsonify({"room_id": session["room_id"]})

    # Default unique room for this user
    fallback_room = f"room-{uuid.uuid5(uuid.NAMESPACE_DNS, email).hex[:8]}"
    return jsonify({"room_id": fallback_room})

@app.route('/upload-certificate', methods=['POST'])
def upload_certificate():
    email = (request.form.get("email") or '').strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    if 'certificate' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['certificate']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    safe_name = f"{uuid.uuid4().hex[:6]}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)}"
    filepath = os.path.join(UPLOAD_FOLDER, safe_name)
    file.save(filepath)

    users.update_one(
        {"email": email},
        {"$push": {"certificates": safe_name}}
    )

    return jsonify({"message": "Certificate uploaded successfully!", "filename": safe_name}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
