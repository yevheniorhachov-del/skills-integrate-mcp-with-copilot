"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import json
from pathlib import Path
from typing import Optional

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Pydantic models for request bodies
class LoginRequest(BaseModel):
    username: str
    password: str

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load teacher credentials from JSON file
def load_teachers():
    teachers_file = os.path.join(Path(__file__).parent, "teachers.json")
    try:
        with open(teachers_file, 'r') as f:
            data = json.load(f)
            return data.get('teachers', {})
    except FileNotFoundError:
        print("teachers.json not found")
        return {}

# In-memory session storage (teacher login tokens)
active_sessions = {}

teachers = load_teachers()

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/login")
def login(request: LoginRequest):
    """Login endpoint for teachers"""
    username = request.username
    password = request.password
    
    # Check if username exists and password matches
    if username not in teachers or teachers[username] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create a simple session token
    session_token = f"{username}_{os.urandom(16).hex()}"
    active_sessions[session_token] = username
    
    return {"token": session_token, "username": username}


@app.post("/logout")
def logout(token: str):
    """Logout endpoint for teachers"""
    if token in active_sessions:
        del active_sessions[token]
        return {"message": "Logged out successfully"}
    raise HTTPException(status_code=401, detail="Invalid token")


def is_admin(token: Optional[str]) -> bool:
    """Check if the provided token belongs to an authenticated teacher"""
    return token is not None and token in active_sessions


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, token: Optional[str] = None):
    """Sign up a student for an activity - requires admin authentication"""
    # Only teachers (with valid token) can register students
    if not is_admin(token):
        raise HTTPException(status_code=401, detail="Unauthorized: Only teachers can register students")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    teacher = active_sessions[token]
    return {"message": f"Teacher {teacher} registered {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, token: Optional[str] = None):
    """Unregister a student from an activity - requires admin authentication"""
    # Only teachers (with valid token) can unregister students
    if not is_admin(token):
        raise HTTPException(status_code=401, detail="Unauthorized: Only teachers can unregister students")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    teacher = active_sessions[token]
    return {"message": f"Teacher {teacher} unregistered {email} from {activity_name}"}
