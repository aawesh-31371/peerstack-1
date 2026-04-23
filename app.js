const API_BASE = "https://peerstack-1-1.onrender.com/api";
const AUTH_KEY = "peerstack_token";

const state = {
  token: localStorage.getItem(AUTH_KEY),
  currentUser: null,
  currentScreen: "explore",
  homeProjects: [],
  exploreProjects: [],
  profile: null,
  searchMode: "profiles",
  searchTerm: "",
  projectResults: [],
  profileResults: [],
  flashMessage: "",
  flashType: "info",
};

const elements = {
  homeScreen: document.getElementById("homeScreen"),
  exploreScreen: document.getElementById("exploreScreen"),
  profileScreen: document.getElementById("profileScreen"),
  homeFeed: document.getElementById("homeFeed"),
  exploreFeed: document.getElementById("exploreFeed"),
  authCard: document.getElementById("authCard"),
  uploadCard: document.getElementById("uploadCard"),
  profileSidebar: document.getElementById("profileSidebar"),
  profileProjects: document.getElementById("profileProjects"),
  profileProjectsHeading: document.getElementById("profileProjectsHeading"),
  heroStats: document.getElementById("heroStats"),
  flashHost: document.getElementById("flashHost"),
  logoutBtn: document.getElementById("logoutBtn"),
  navHomeBtn: document.getElementById("navHomeBtn"),
  navExploreBtn: document.getElementById("navExploreBtn"),
  navProfileBtn: document.getElementById("navProfileBtn"),
  homeIntro: document.getElementById("homeIntro"),
  projectSearchTab: document.getElementById("projectSearchTab"),
  profileSearchTab: document.getElementById("profileSearchTab"),
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  searchResults: document.getElementById("searchResults"),
};

init();

async function init() {
  bindGlobalActions();
  await hydrateSession();
  if (state.currentUser) {
    state.currentScreen = "home";
  }
  await refreshAll();
}

function bindGlobalActions() {
  elements.logoutBtn.addEventListener("click", async () => {
    state.token = null;
    state.currentUser = null;
    state.currentScreen = "explore";
    state.searchTerm = "";
    state.projectResults = [];
    state.profileResults = [];
    localStorage.removeItem(AUTH_KEY);
    elements.searchInput.value = "";
    await refreshAll();
  });

  elements.navHomeBtn.addEventListener("click", async () => {
    state.currentScreen = "home";
    await loadHomeFeed();
    render();
  });

  elements.navExploreBtn.addEventListener("click", async () => {
    state.currentScreen = "explore";
    await loadExploreFeed();
    render();
  });

  elements.navProfileBtn.addEventListener("click", async () => {
    state.currentScreen = "profile";
    if (state.currentUser) {
      await loadProfile(state.currentUser.id, true);
    }
    render();
  });

  elements.projectSearchTab.addEventListener("click", () => {
    state.searchMode = "projects";
    renderSearchResults();
  });

  elements.profileSearchTab.addEventListener("click", () => {
    state.searchMode = "profiles";
    renderSearchResults();
  });

  elements.searchInput.addEventListener("input", async (event) => {
    state.searchTerm = event.target.value.trim();
    await runSearch();
  });

  elements.clearSearchBtn.addEventListener("click", async () => {
    state.searchTerm = "";
    elements.searchInput.value = "";
    state.projectResults = [];
    state.profileResults = [];
    await loadExploreFeed();
    render();
  });
}

async function hydrateSession() {
  if (!state.token) {
    return;
  }

  try {
    const data = await apiFetch("/auth/me");
    state.currentUser = data.user;
  } catch (error) {
    state.token = null;
    state.currentUser = null;
    localStorage.removeItem(AUTH_KEY);
  }
}

async function refreshAll() {
  await Promise.all([loadHomeFeed(), loadExploreFeed(), loadDefaultProfile()]);
  if (state.searchTerm) {
    await runSearch();
  }
  render();
}

async function loadHomeFeed() {
  const params = new URLSearchParams({
    scope: state.currentUser ? "following" : "all",
  });

  if (state.currentUser) {
    params.set("currentUserId", state.currentUser.id);
  }

  const data = await apiFetch(`/projects?${params.toString()}`, { skipFlash: true });
  state.homeProjects = data.projects;
}

async function loadExploreFeed() {
  const params = new URLSearchParams({
    scope: "all",
  });

  if (state.currentUser) {
    params.set("currentUserId", state.currentUser.id);
  }

  if (state.searchTerm && state.searchMode === "projects") {
    params.set("search", state.searchTerm);
  }

  const data = await apiFetch(`/projects?${params.toString()}`, { skipFlash: true });
  state.exploreProjects = data.projects;
}

async function loadDefaultProfile() {
  if (state.currentUser) {
    await loadProfile(state.currentUser.id, true);
  } else {
    state.profile = null;
  }
}
async function loadProfile(userId, silent = false) {
  const data = await apiFetch(`/users/${userId}`, { skipFlash: silent });
  state.profile = data;
}

async function runSearch() {
  if (!state.searchTerm) {
    state.projectResults = [];
    state.profileResults = [];
    await loadExploreFeed();
    render();
    return;
  }

  const projectQuery = new URLSearchParams({
    search: state.searchTerm,
    scope: "all",
  });

  if (state.currentUser) {
    projectQuery.set("currentUserId", state.currentUser.id);
  }

  const [projectData, profileData] = await Promise.all([
    apiFetch(`/projects?${projectQuery.toString()}`, { skipFlash: true }),
    apiFetch(`/users?search=${encodeURIComponent(state.searchTerm)}`, { skipFlash: true }),
  ]);

  state.projectResults = projectData.projects;
  state.profileResults = profileData.users;

  if (state.searchMode === "projects") {
    state.exploreProjects = projectData.projects;
  }

  render();
}

function render() {
  renderHeroStats();
  renderFlash();
  renderNavigation();
  renderAuthCard();
  renderUploadCard();
  renderProfileSidebar();
  renderProfileProjects();
  renderHome();
  renderExplore();
  syncTopbar();
}

function renderHeroStats() {
  const visibleProjects =
    state.currentScreen === "home"
      ? state.homeProjects
      : state.currentScreen === "explore"
        ? state.exploreProjects
        : state.profile?.projects || [];

  const totalRatings = visibleProjects.reduce(
    (sum, project) => sum + Number(project.ratingsCount || 0),
    0
  );
  const totalComments = visibleProjects.reduce(
    (sum, project) => sum + Number(project.commentsCount || 0),
    0
  );

  elements.heroStats.innerHTML = `
    <div class="stat-card">
      <strong>${capitalize(state.currentScreen)}</strong>
      <span>${getScreenSubtitle()}</span>
    </div>
    <div class="stat-card">
      <strong>${visibleProjects.length}</strong>
      <span>projects on this screen</span>
    </div>
    <div class="stat-card">
      <strong>${totalRatings + totalComments}</strong>
      <span>visible interactions</span>
    </div>
  `;
}

function renderFlash() {
  if (!state.flashMessage) {
    elements.flashHost.innerHTML = "";
    return;
  }

  elements.flashHost.innerHTML = `
    <div class="flash-message ${state.flashType === "error" ? "error" : ""}">
      ${escapeHtml(state.flashMessage)}
    </div>
  `;
}

function renderNavigation() {
  elements.homeScreen.classList.toggle("hidden", state.currentScreen !== "home");
  elements.exploreScreen.classList.toggle("hidden", state.currentScreen !== "explore");
  elements.profileScreen.classList.toggle("hidden", state.currentScreen !== "profile");

  elements.navHomeBtn.classList.toggle("active", state.currentScreen === "home");
  elements.navExploreBtn.classList.toggle("active", state.currentScreen === "explore");
  elements.navProfileBtn.classList.toggle("active", state.currentScreen === "profile");
}

function renderHome() {
  elements.homeIntro.textContent = state.currentUser
    ? "Your home feed shows projects from people you follow, plus your own uploads."
    : "Create an account and follow creators to make this feed feel personal.";

  if (!state.homeProjects.length) {
    elements.homeFeed.innerHTML = `
      <div class="empty-state">
        <h4>${state.currentUser ? "Your home feed is empty" : "No public projects yet"}</h4>
        <p>${state.currentUser ? "Follow people from Explore and their projects will show up here." : "Sign in and start following creators to build your home feed."}</p>
      </div>
    `;
    return;
  }

  elements.homeFeed.innerHTML = state.homeProjects.map((project) => renderProjectCard(project)).join("");
  bindProjectInteractions(elements.homeFeed);
}

function renderExplore() {
  renderSearchResults();

  if (!state.exploreProjects.length) {
    elements.exploreFeed.innerHTML = `
      <div class="empty-state">
        <h4>No projects found</h4>
        <p>Try a different search term or clear the search to explore more work.</p>
      </div>
    `;
    return;
  }

  elements.exploreFeed.innerHTML = state.exploreProjects.map((project) => renderProjectCard(project)).join("");
  bindProjectInteractions(elements.exploreFeed);
}

function renderAuthCard() {
  if (!state.currentUser) {
    elements.authCard.innerHTML = `
      <p class="section-label">Account</p>
      <h3>Login or create your profile</h3>
      <p>Profile is your own space for uploading projects and growing followers.</p>
      <div class="inline-actions" style="margin-top: 18px;">
        <button id="showRegisterBtn" class="pill-btn active">Register</button>
        <button id="showLoginBtn" class="pill-btn">Login</button>
      </div>
      <div id="authFormHost"></div>
    `;

    const showRegisterBtn = document.getElementById("showRegisterBtn");
    const showLoginBtn = document.getElementById("showLoginBtn");
    const authFormHost = document.getElementById("authFormHost");

    const renderRegister = () => {
      showRegisterBtn.classList.add("active");
      showLoginBtn.classList.remove("active");
      authFormHost.innerHTML = `
        <form id="registerForm" class="form-grid">
          <div class="field">
            <label for="registerName">Full name</label>
            <input id="registerName" name="name" placeholder="enter name" required />
          </div>
          <div class="field">
            <label for="registerUsername">Username</label>
            <input id="registerUsername" name="username" placeholder="username" required />
          </div>
          <div class="field">
            <label for="registerEmail">Email</label>
            <input id="registerEmail" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="field">
            <label for="registerPassword">Password</label>
            <input id="registerPassword" name="password" type="password" placeholder="Create a password" required />
          </div>
          <div class="field">
            <label for="registerBio">Short bio</label>
            <textarea id="registerBio" name="bio" placeholder="Tell people what you build"></textarea>
          </div>
          <button class="primary-btn" type="submit">Create account</button>
        </form>
      `;

      document.getElementById("registerForm").onsubmit = handleRegister;
    };

    const renderLogin = () => {
      showLoginBtn.classList.add("active");
      showRegisterBtn.classList.remove("active");
      authFormHost.innerHTML = `
        <form id="loginForm" class="form-grid">
          <div class="field">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="field">
            <label for="loginPassword">Password</label>
            <input id="loginPassword" name="password" type="password" placeholder="Your password" required />
          </div>
          <button class="primary-btn" type="submit">Login</button>
        </form>
      `;

      document.getElementById("loginForm").addEventListener("submit", handleLogin);
    };

    showRegisterBtn.addEventListener("click", renderRegister);
    showLoginBtn.addEventListener("click", renderLogin);
    renderRegister();
    return;
  }

  const viewedProfile = state.profile?.user;
  const ownProfile = viewedProfile && viewedProfile.id === state.currentUser.id;

  elements.authCard.innerHTML = `
    <p class="section-label">${ownProfile ? "Your profile" : "Profile view"}</p>
    <h3>${ownProfile ? `Welcome back, ${escapeHtml(state.currentUser.name)}` : `Viewing @${escapeHtml(viewedProfile?.username || state.currentUser.username)}`}</h3>
    <p>${ownProfile ? "Upload new work below and manage your project identity from this screen." : "You can follow this creator, inspect their stats, and browse their uploaded projects here."}</p>
    <div class="notice">Signed in as <strong>@${escapeHtml(state.currentUser.username)}</strong></div>
  `;
}

function renderUploadCard() {
  const canUpload =
    state.currentUser && state.profile && state.profile.user.id === state.currentUser.id;

  if (!canUpload) {
    elements.uploadCard.classList.add("hidden");
    elements.uploadCard.innerHTML = "";
    return;
  }

  elements.uploadCard.classList.remove("hidden");
  elements.uploadCard.innerHTML = `
    <p class="section-label">Upload project</p>
    <h3>Post to your profile</h3>
    <p>Add your project name, GitHub link, and a short description so peers can review it.</p>
    <form id="uploadForm" class="form-grid">
      <div class="field">
        <label for="projectName">Project name</label>
        <input id="projectName" name="name" placeholder="PeerStack" required />
      </div>
      <div class="field">
        <label for="projectGithub">GitHub link</label>
        <input id="projectGithub" name="githubLink" type="url" placeholder="https://github.com/username/project" required />
      </div>
      <div class="field">
        <label for="projectDescription">Short description</label>
        <textarea id="projectDescription" name="description" placeholder="Describe what your project does and who it helps." required></textarea>
      </div>
      <button class="primary-btn" type="submit">Upload project</button>
    </form>
  `;

  document.getElementById("uploadForm").addEventListener("submit", handleProjectUpload);
}

function renderProfileSidebar() {
  if (!state.profile) {
    elements.profileSidebar.innerHTML = `
      <div class="empty-state">
        <h4>No profile yet</h4>
        <p>Search for people in Explore or create an account to start one.</p>
      </div>
    `;
    return;
  }

  const viewedUser = state.profile.user;
  const isCurrentProfile = state.currentUser && state.currentUser.id === viewedUser.id;

  elements.profileSidebar.innerHTML = `
    <p class="section-label">${isCurrentProfile ? "Your creator card" : "Creator profile"}</p>
    <div class="avatar">${getInitials(viewedUser.name)}</div>
    <h3 style="margin-top: 16px;">${escapeHtml(viewedUser.name)}</h3>
    <p class="meta">@${escapeHtml(viewedUser.username)}</p>
    <p style="margin-top: 12px;">${escapeHtml(viewedUser.bio || "No bio added yet.")}</p>

    <div class="stats-grid">
      <div class="stat-chip">
        <strong>${viewedUser.projectsCount}</strong>
        <span>Projects</span>
      </div>
      <div class="stat-chip">
        <strong>${viewedUser.followersCount}</strong>
        <span>Followers</span>
      </div>
      <div class="stat-chip">
        <strong>${viewedUser.followingCount}</strong>
        <span>Following</span>
      </div>
      <div class="stat-chip">
        <strong>${viewedUser.averageRating}</strong>
        <span>Avg rating</span>
      </div>
    </div>

    ${
      state.currentUser && !isCurrentProfile
        ? `<button class="follow-btn ${viewedUser.isFollowing ? "is-following" : ""}" data-follow-user-id="${viewedUser.id}">
             ${viewedUser.isFollowing ? "Following" : "Follow"}
           </button>`
        : ""
    }

    <div class="connections-list">
      <h4>Followers</h4>
      ${renderConnections(viewedUser.followers)}
      <h4>Following</h4>
      ${renderConnections(viewedUser.following)}
    </div>
  `;

  const followButton = elements.profileSidebar.querySelector("[data-follow-user-id]");
  if (followButton) {
    followButton.addEventListener("click", () => handleFollow(viewedUser.id, { keepProfile: true }));
  }

  elements.profileSidebar.querySelectorAll("[data-profile-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openProfile(button.dataset.profileUserId);
    });
  });
}

function renderConnections(connections) {
  if (!connections.length) {
    return `<p class="helper">No connections to show yet.</p>`;
  }

  return connections
    .map(
      (user) => `
        <div class="connection-item">
          <button class="profile-link" data-profile-user-id="${user._id || user.id}">
            <strong>${escapeHtml(user.name)}</strong>
            <div class="meta">@${escapeHtml(user.username)}</div>
          </button>
        </div>
      `
    )
    .join("");
}

function renderProfileProjects() {
  if (!state.profile) {
    elements.profileProjectsHeading.textContent = "Uploaded projects";
    elements.profileProjects.innerHTML = `
      <div class="empty-state">
        <p>No profile selected.</p>
      </div>
    `;
    return;
  }

  const viewedUser = state.profile.user;
  elements.profileProjectsHeading.textContent =
    state.currentUser && viewedUser.id === state.currentUser.id
      ? "Your uploaded projects"
      : `${viewedUser.name}'s projects`;

  if (!state.profile.projects.length) {
    elements.profileProjects.innerHTML = `
      <div class="empty-state">
        <p>No projects uploaded yet.</p>
      </div>
    `;
    return;
  }

  elements.profileProjects.innerHTML = state.profile.projects
    .map(
      (project) => `
        <article class="profile-project-card">
          <div class="profile-project-head">
            <div>
              <h4>${escapeHtml(project.name)}</h4>
              <div class="meta">${formatDate(project.createdAt)} · ${project.averageRating}/5</div>
            </div>
            <a class="secondary-btn" href="${escapeHtml(project.githubLink)}" target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <p>${escapeHtml(project.description)}</p>
          <div class="meta">${project.commentsCount} comments</div>
        </article>
      `
    )
    .join("");
}

function renderProjectCard(project) {
  const isOwnProfile = state.currentUser && state.currentUser.id === project.owner.id;

  return `
    <article class="project-card">
      <div class="project-cover"></div>
      <div class="project-body">
        <div class="project-header">
          <div class="project-user">
            <button class="mini-avatar profile-link" data-profile-user-id="${project.owner.id}">
              ${getInitials(project.owner.name)}
            </button>
            <div>
              <button class="profile-link" data-profile-user-id="${project.owner.id}">
                <strong>${escapeHtml(project.owner.name)}</strong>
              </button>
              <div class="meta">@${escapeHtml(project.owner.username)} · ${formatDate(project.createdAt)}</div>
            </div>
          </div>
          ${
            state.currentUser && !isOwnProfile
              ? `<button class="follow-btn ${project.owner.isFollowing ? "is-following" : ""}" data-follow-user-id="${project.owner.id}">
                   ${project.owner.isFollowing ? "Following" : "Follow"}
                 </button>`
              : ""
          }
        </div>

        <div class="project-title-row">
          <div>
            <h3>${escapeHtml(project.name)}</h3>
            <p class="meta">Project showcase</p>
          </div>
          <span class="tag">${project.commentsCount} comments</span>
        </div>

        <p class="project-description">${escapeHtml(project.description)}</p>

        <div class="project-actions">
          <a class="secondary-btn" href="${escapeHtml(project.githubLink)}" target="_blank" rel="noreferrer">Open GitHub</a>
          <div class="meta">Average rating: <strong>${project.averageRating}</strong>/5</div>
        </div>

        <div class="rating-panel">
          <div class="rating-header">
            <div>
              <h4>Rate this project</h4>
              <p class="meta">${state.currentUser ? "Click a star to leave or update your rating." : "Login to leave a rating."}</p>
            </div>
            <div class="rating-stars" data-rating-project-id="${project.id}">
              ${renderStars(project.currentUserRating, Boolean(state.currentUser))}
            </div>
          </div>
        </div>

        <div class="comments-panel">
          <h4>Comments</h4>
          <div class="comment-list">
            ${
              project.comments.length
                ? project.comments
                    .map(
                      (comment) => `
                        <div class="comment-item">
                          <div class="comment-row">
                            <div>
                              <strong>${escapeHtml(comment.user.name)}</strong>
                              <div class="comment-meta">@${escapeHtml(comment.user.username)} · ${formatDate(comment.createdAt)}</div>
                            </div>
                          </div>
                          <p>${escapeHtml(comment.text)}</p>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="empty-state"><p>No comments yet. Be the first one to review this project.</p></div>`
            }
          </div>
          ${
            state.currentUser
              ? `
                <form class="comment-form form-grid" data-comment-project-id="${project.id}">
                  <div class="field">
                    <label for="comment-${project.id}">Add comment</label>
                    <textarea id="comment-${project.id}" name="comment" placeholder="Share thoughtful feedback with the creator." required></textarea>
                  </div>
                  <button class="primary-btn" type="submit">Post comment</button>
                </form>
              `
              : `<p class="helper" style="margin-top: 14px;">Register or login to comment on projects.</p>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderStars(currentRating, canInteract) {
  return Array.from({ length: 5 }, (_, index) => {
    const value = index + 1;
    return `
      <button
        class="star-btn ${value <= currentRating ? "active" : ""}"
        type="button"
        data-star-value="${value}"
        ${canInteract ? "" : "disabled"}
      >
        ★
      </button>
    `;
  }).join("");
}

function renderSearchResults() {
  elements.projectSearchTab.classList.toggle("active", state.searchMode === "projects");
  elements.profileSearchTab.classList.toggle("active", state.searchMode === "profiles");

  if (!state.searchTerm) {
    elements.searchResults.classList.add("hidden");
    elements.searchResults.innerHTML = "";
    return;
  }

  const results = state.searchMode === "projects" ? state.projectResults : state.profileResults;
  elements.searchResults.classList.remove("hidden");

  if (!results.length) {
    elements.searchResults.innerHTML = `
      <div class="empty-state">
        <p>No ${state.searchMode} matched "${escapeHtml(state.searchTerm)}".</p>
      </div>
    `;
    return;
  }

  elements.searchResults.innerHTML = results
    .map((result) => {
      if (state.searchMode === "projects") {
        return `
          <div class="search-result-card">
            <div class="search-card-main">
              <strong>${escapeHtml(result.name)}</strong>
              <div class="meta">@${escapeHtml(result.owner.username)} · ${escapeHtml(result.averageRating)}/5</div>
              <p class="helper">${escapeHtml(result.description)}</p>
            </div>
            <div class="search-card-actions">
              <button class="secondary-btn" data-profile-user-id="${result.owner.id}">View Creator</button>
              <a class="secondary-btn" href="${escapeHtml(result.githubLink)}" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
        `;
      }

      const isOwnProfile = state.currentUser && state.currentUser.id === result.id;
      return `
        <div class="search-result-card profile-result-card">
          <div class="search-card-main">
            <div class="project-user">
              <div class="mini-avatar">${getInitials(result.name)}</div>
              <div>
                <strong>${escapeHtml(result.name)}</strong>
                <div class="meta">@${escapeHtml(result.username)}</div>
              </div>
            </div>
            <p class="helper">${escapeHtml(result.bio || "No bio added yet.")}</p>
          </div>
          <div class="search-card-actions">
            <button class="secondary-btn" data-profile-user-id="${result.id}">Open Profile</button>
            ${
              state.currentUser && !isOwnProfile
                ? `<button class="follow-btn ${result.isFollowing ? "is-following" : ""}" data-follow-user-id="${result.id}">
                     ${result.isFollowing ? "Following" : "Follow"}
                   </button>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  elements.searchResults.querySelectorAll("[data-profile-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openProfile(button.dataset.profileUserId);
    });
  });

  elements.searchResults.querySelectorAll("[data-follow-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleFollow(button.dataset.followUserId);
    });
  });
}

function bindProjectInteractions(container) {
  container.querySelectorAll("[data-profile-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openProfile(button.dataset.profileUserId);
    });
  });

  container.querySelectorAll("[data-follow-user-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleFollow(button.dataset.followUserId);
    });
  });

  container.querySelectorAll("[data-rating-project-id]").forEach((ratingContainer) => {
    ratingContainer.querySelectorAll("[data-star-value]").forEach((star) => {
      star.addEventListener("click", async () => {
        await handleRating(
          ratingContainer.dataset.ratingProjectId,
          Number(star.dataset.starValue)
        );
      });
    });
  });

  container.querySelectorAll("[data-comment-project-id]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = new FormData(form).get("comment").toString().trim();
      if (!text) {
        return;
      }
      await handleComment(form.dataset.commentProjectId, text);
      form.reset();
    });
  });
}

function syncTopbar() {
  const isLoggedIn = Boolean(state.currentUser);
  elements.logoutBtn.classList.toggle("hidden", !isLoggedIn);
}

async function openProfile(userId) {
  state.currentScreen = "profile";
  await loadProfile(userId);
  render();
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());

  try {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    setSession(data);
    state.currentScreen = "home";
    setFlash("Account created successfully.");
    await refreshAll();
  } catch (error) {
    setFlash(error.message, "error");
    render();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    setSession(data);
    state.currentScreen = "home";
    setFlash("Login successful.");
    await refreshAll();
  } catch (error) {
    setFlash(error.message, "error");
    render();
  }
}

async function handleProjectUpload(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.target).entries());

  try {
    await apiFetch("/projects", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    setFlash("Project uploaded successfully.");
    event.target.reset();
    await refreshAll();
    state.currentScreen = "profile";
    render();
  } catch (error) {
    setFlash(error.message, "error");
    render();
  }
}

async function handleComment(projectId, text) {
  if (!state.currentUser) {
    return;
  }

  try {
    await apiFetch(`/projects/${projectId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    setFlash("Comment posted.");
    await Promise.all([
      loadHomeFeed(),
      loadExploreFeed(),
      state.profile ? loadProfile(state.profile.user.id, true) : Promise.resolve(),
    ]);
    render();
  } catch (error) {
    setFlash(error.message, "error");
    render();
  }
}

async function handleRating(projectId, value) {
  if (!state.currentUser) {
    return;
  }

  try {
    await apiFetch(`/projects/${projectId}/rating`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
    setFlash("Rating saved.");
    await Promise.all([
      loadHomeFeed(),
      loadExploreFeed(),
      state.profile ? loadProfile(state.profile.user.id, true) : Promise.resolve(),
    ]);
    render();
  } catch (error) {
    setFlash(error.message, "error");
    render();
  }
}

async function handleFollow(userId, options = {}) {
  if (!state.currentUser) {
    return;
  }

  try {
    await apiFetch(`/users/${userId}/follow`, {
      method: "POST",
    });
    const freshUser = await apiFetch("/auth/me", { skipFlash: true });
    state.currentUser = freshUser.user;
    setFlash("Follow status updated.");
    await Promise.all([
      loadHomeFeed(),
      loadExploreFeed(),
      state.profile
        ? loadProfile(options.keepProfile ? state.profile.user.id : userId, true)
        : Promise.resolve(),
      state.searchTerm ? runSearch() : Promise.resolve(),
    ]);
    render();
  } catch (error) {
    setFlash(error.message, "error");
    render();
  }
}

async function apiFetch(path, options = {}) {
  const { skipFlash = false, ...fetchOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    method: fetchOptions.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(fetchOptions.headers || {}),
    },
    body: fetchOptions.body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (!skipFlash && data.message) {
      setFlash(data.message, "error");
    }
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function setSession(data) {
  state.token = data.token;
  state.currentUser = data.user;
  localStorage.setItem(AUTH_KEY, data.token);
}

function setFlash(message, type = "info") {
  state.flashMessage = message;
  state.flashType = type;
  clearTimeout(setFlash.timeoutId);
  setFlash.timeoutId = setTimeout(() => {
    state.flashMessage = "";
    render();
  }, 3000);
}

function getScreenSubtitle() {
  if (state.currentScreen === "home") {
    return state.currentUser ? "network-first experience" : "public discovery experience";
  }

  if (state.currentScreen === "explore") {
    return "search and discovery experience";
  }

  return "creator identity experience";
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
