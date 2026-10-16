const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// All users loaded from the API are stored here
let allUsers = [];

// Draws any array of users on the page
function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const message = document.createElement("li");
    message.textContent = "No users match your filter.";
    usersList.append(message);
    return;
  }

  for (const user of list) {
    const item = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = "Email: " + user.email;

    const city = document.createElement("p");
    city.textContent = "City: " + user.address.city;

    const company = document.createElement("p");
    company.textContent = "Company: " + user.company.name;

    item.append(name, email, city, company);
    usersList.append(item);
  }
}

// Shows only the stored users whose name contains the typed text
function applyFilter() {
  const text = filterInput.value.trim().toLowerCase();

  const matches = allUsers.filter(function (user) {
    return user.name.toLowerCase().includes(text);
  });

  renderUsers(matches);
}

// Fetches the users from the API
async function loadUsers() {
  statusMessage.textContent = "Loading users...";
  loadButton.disabled = true;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Server responded with status " + response.status);
    }

    allUsers = await response.json();
    applyFilter();
    statusMessage.textContent = "Loaded " + allUsers.length + " users.";
  } catch (error) {
    usersList.textContent = "";
    statusMessage.textContent = "Could not load users. Please try again.";
    console.error("Load failed:", error.message);
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", applyFilter);