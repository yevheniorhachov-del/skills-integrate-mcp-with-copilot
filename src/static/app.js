document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const loginModal = document.getElementById("login-modal");
  const logoutModal = document.getElementById("logout-modal");
  const loginForm = document.getElementById("login-form");
  const signupContainer = document.getElementById("signup-container");
  const signupBtn = document.getElementById("signup-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginMessage = document.getElementById("login-message");

  // Get auth token from localStorage
  function getAuthToken() {
    return localStorage.getItem("authToken");
  }

  // Set auth token in localStorage
  function setAuthToken(token) {
    localStorage.setItem("authToken", token);
  }

  // Clear auth token
  function clearAuthToken() {
    localStorage.removeItem("authToken");
  }

  // Check if user is logged in
  function isLoggedIn() {
    return getAuthToken() !== null;
  }

  // Update UI based on login status
  function updateUIByLoginStatus() {
    const isAdmin = isLoggedIn();
    if (isAdmin) {
      signupContainer.style.display = "block";
      signupBtn.textContent = "Register Student";
    } else {
      signupContainer.style.display = "none";
      signupBtn.textContent = "Register Student";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (only shown to logged-in teachers)
        let participantsHTML = "";
        if (details.participants.length > 0) {
          participantsHTML = `<div class="participants-section">
            <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
            <ul class="participants-list">
              ${details.participants
                .map((email) => {
                  const deleteBtn = isLoggedIn()
                    ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                    : "";
                  return `<li><span class="participant-email">${email}</span>${deleteBtn}</li>`;
                })
                .join("")}
            </ul>
          </div>`;
        } else {
          participantsHTML = `<p><em>No participants yet</em></p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if logged in)
      if (isLoggedIn()) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const token = getAuthToken();

    if (!token) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success message";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error message";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const token = getAuthToken();

    if (!token) {
      messageDiv.textContent = "You must be logged in as a teacher to register students";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success message";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error message";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register. Please try again.";
      messageDiv.className = "error message";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // Save token
        setAuthToken(result.token);
        localStorage.setItem("username", result.username);

        // Close login modal and update UI
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginMessage.classList.add("hidden");
        updateUIByLoginStatus();
        fetchActivities();

        // Show success message
        messageDiv.textContent = `Welcome, ${result.username}!`;
        messageDiv.className = "success message";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "login-error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "An error occurred during login";
      loginMessage.className = "login-error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle user icon click
  userIcon.addEventListener("click", () => {
    if (isLoggedIn()) {
      const username = localStorage.getItem("username");
      document.getElementById("logged-in-user").textContent = `Logged in as: ${username}`;
      logoutModal.classList.remove("hidden");
    } else {
      loginModal.classList.remove("hidden");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    const token = getAuthToken();

    try {
      await fetch(`/logout?token=${encodeURIComponent(token)}`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }

    // Clear token and update UI
    clearAuthToken();
    localStorage.removeItem("username");
    logoutModal.classList.add("hidden");
    updateUIByLoginStatus();
    fetchActivities();

    // Show message
    messageDiv.textContent = "You have been logged out";
    messageDiv.className = "info message";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 3000);
  });

  // Close modals when X is clicked
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", (event) => {
      event.target.closest(".modal").classList.add("hidden");
    });
  });

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
    if (event.target === logoutModal) {
      logoutModal.classList.add("hidden");
    }
  });

  // Initial setup
  updateUIByLoginStatus();
  fetchActivities();
});
